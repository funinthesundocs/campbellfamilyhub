import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { MediaPickerModal } from '../components/media/MediaPickerModal';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Image,
  Star,
  GripVertical,
  FileText,
  Calendar,
  RefreshCw,
  Copy,
  X,
} from 'lucide-react';
import type { PollTemplate, PollType } from '../types';

interface PollOptionForm {
  text: string;
  imageUrl: string | null;
}

const pollTypes: { value: PollType; label: string; description: string }[] = [
  { value: 'general', label: 'Multiple Choice', description: 'Classic poll with predefined options' },
  { value: 'image_choice', label: 'Image Choice', description: 'Visual poll with image options' },
  { value: 'rating', label: 'Rating', description: 'Star or scale-based feedback' },
  { value: 'ranking', label: 'Ranking', description: 'Drag to prioritize options' },
  { value: 'open_text', label: 'Open Text', description: 'Collect written responses' },
  { value: 'event-date', label: 'Event Date', description: 'Find the best date for an event' },
  { value: 'location', label: 'Location', description: 'Choose a venue or location' },
  { value: 'name-vote', label: 'Name Vote', description: 'Vote on names or titles' },
  { value: 'priority', label: 'Priority', description: 'Prioritize items or tasks' },
];

const recurrenceOptions = [
  { value: '', label: 'One-time poll' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const templateCategories = ['all', 'events', 'decisions', 'food', 'feedback', 'media'];

export default function PollForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<PollTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(true);
  const [templateCategory, setTemplateCategory] = useState('all');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    poll_type: 'general' as PollType,
    allow_multiple_choices: false,
    is_anonymous: false,
    show_results_before_close: true,
    allow_vote_change: false,
    rating_scale: 5,
    closes_at: '',
    starts_at: '',
    recurrence_pattern: '',
    options: [
      { text: '', imageUrl: null },
      { text: '', imageUrl: null },
    ] as PollOptionForm[],
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('poll_templates')
      .select('*')
      .eq('is_active', true)
      .order('category');
    if (data) {
      setTemplates(data as PollTemplate[]);
    }
  };

  const applyTemplate = (template: PollTemplate) => {
    const defaultOptions = Array.isArray(template.default_options)
      ? template.default_options.map((text: string) => ({ text, imageUrl: null }))
      : [{ text: '', imageUrl: null }, { text: '', imageUrl: null }];

    setForm({
      ...form,
      title: template.default_title || '',
      description: template.default_description || '',
      poll_type: template.poll_type,
      allow_multiple_choices: template.default_settings?.allow_multiple_choices ?? false,
      is_anonymous: template.default_settings?.is_anonymous ?? false,
      show_results_before_close: template.default_settings?.show_results_before_close ?? true,
      allow_vote_change: template.default_settings?.allow_vote_change ?? false,
      rating_scale: template.default_settings?.rating_scale ?? 5,
      options: defaultOptions.length >= 2 ? defaultOptions : [{ text: '', imageUrl: null }, { text: '', imageUrl: null }],
    });
    setShowTemplates(false);
  };

  const addOption = () => setForm({ ...form, options: [...form.options, { text: '', imageUrl: null }] });

  const removeOption = (index: number) => {
    if (form.options.length <= 2) return;
    setForm({ ...form, options: form.options.filter((_, i) => i !== index) });
  };

  const updateOption = (index: number, field: 'text' | 'imageUrl', value: string | null) => {
    const updated = [...form.options];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, options: updated });
  };

  const handleImageSelect = (url: string) => {
    if (editingOptionIndex !== null) {
      updateOption(editingOptionIndex, 'imageUrl', url);
    }
    setShowMediaPicker(false);
    setEditingOptionIndex(null);
  };

  const needsOptions = !['rating', 'open_text'].includes(form.poll_type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (needsOptions) {
      const validOptions = form.options.filter(o => o.text.trim());
      if (validOptions.length < 2) {
        showError('Please add at least 2 options');
        return;
      }
    }

    if (!form.closes_at) {
      showError('Please set a closing date');
      return;
    }

    if (form.starts_at && new Date(form.starts_at) >= new Date(form.closes_at)) {
      showError('Start date must be before closing date');
      return;
    }

    setLoading(true);

    const pollData = {
      title: form.title,
      description: form.description || null,
      poll_type: form.poll_type,
      allow_multiple_choices: form.allow_multiple_choices,
      is_anonymous: form.is_anonymous,
      show_results_before_close: form.show_results_before_close,
      allow_vote_change: form.allow_vote_change,
      rating_scale: form.rating_scale,
      closes_at: new Date(form.closes_at).toISOString(),
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      recurrence_pattern: form.recurrence_pattern || null,
      created_by: user.id,
    };

    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert(pollData)
      .select()
      .maybeSingle();

    if (pollError || !poll) {
      showError('Failed to create poll');
      setLoading(false);
      return;
    }

    if (needsOptions) {
      const validOptions = form.options.filter(o => o.text.trim());
      const optionsToInsert = validOptions.map((opt, index) => ({
        poll_id: poll.id,
        option_text: opt.text,
        image_url: opt.imageUrl,
        sort_order: index,
      }));

      const { error: optionsError } = await supabase.from('poll_options').insert(optionsToInsert);

      if (optionsError) {
        showError('Failed to add poll options');
        await supabase.from('polls').delete().eq('id', poll.id);
        setLoading(false);
        return;
      }
    }

    success('Poll created');
    navigate('/polls');
    setLoading(false);
  };

  const getDefaultCloseDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 16);
  };

  const filteredTemplates = templateCategory === 'all'
    ? templates
    : templates.filter(t => t.category === templateCategory);

  const selectedPollType = pollTypes.find(t => t.value === form.poll_type);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/polls')}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] mb-6"
      >
        <ArrowLeft size={20} /> Back to Polls
      </button>

      <h1 className="font-serif text-3xl text-[var(--text-primary)] mb-6">Create a Poll</h1>

      {showTemplates && templates.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Start from Template</h2>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              Skip
            </button>
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            {templateCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setTemplateCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                  templateCategory === cat
                    ? 'bg-[var(--accent-gold)] text-[#0f0f0f]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template)}
                className="p-3 rounded-lg border border-[var(--border-default)] hover:border-[var(--accent-gold)] text-left transition-colors group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Copy size={14} className="text-[var(--text-muted)] group-hover:text-[var(--accent-gold)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">{template.name}</span>
                </div>
                {template.description && (
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2">{template.description}</p>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Poll Type</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {pollTypes.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => setForm({ ...form, poll_type: type.value })}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  form.poll_type === type.value
                    ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-primary-rgb),0.1)]'
                    : 'border-[var(--border-default)] hover:border-[var(--accent-gold)]/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {type.value === 'rating' && <Star size={14} className="text-[var(--accent-gold)]" />}
                  {type.value === 'ranking' && <GripVertical size={14} className="text-[var(--accent-gold)]" />}
                  {type.value === 'open_text' && <FileText size={14} className="text-[var(--accent-gold)]" />}
                  {type.value === 'image_choice' && <Image size={14} className="text-[var(--accent-gold)]" />}
                  {type.value === 'event-date' && <Calendar size={14} className="text-[var(--accent-gold)]" />}
                  <span className="text-sm font-medium text-[var(--text-primary)]">{type.label}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">{type.description}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card className="mb-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Poll Details</h2>
          <div className="space-y-4">
            <Input
              label="Question"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={selectedPollType?.value === 'rating' ? 'What would you like rated?' : 'What would you like to ask?'}
              required
            />
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Description (optional)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                rows={2}
                placeholder="Add more context..."
              />
            </div>

            {form.poll_type === 'rating' && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Rating Scale
                </label>
                <div className="flex gap-2">
                  {[5, 10].map(scale => (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => setForm({ ...form, rating_scale: scale })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        form.rating_scale === scale
                          ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-primary-rgb),0.1)]'
                          : 'border-[var(--border-default)]'
                      }`}
                    >
                      <div className="flex">
                        {[...Array(Math.min(scale, 5))].map((_, i) => (
                          <Star key={i} size={14} className="text-[var(--accent-gold)] fill-[var(--accent-gold)]" />
                        ))}
                      </div>
                      <span className="text-sm text-[var(--text-secondary)]">1-{scale}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Opens At (optional)"
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              />
              <Input
                label="Closes At"
                type="datetime-local"
                value={form.closes_at || getDefaultCloseDate()}
                onChange={(e) => setForm({ ...form, closes_at: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Recurrence
              </label>
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="text-[var(--text-muted)]" />
                <select
                  value={form.recurrence_pattern}
                  onChange={(e) => setForm({ ...form, recurrence_pattern: e.target.value })}
                  className="flex-1 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                >
                  {recurrenceOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {needsOptions && (
          <Card className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-[var(--text-primary)]">Options</h2>
              <Button type="button" variant="secondary" onClick={addOption}>
                <Plus size={16} className="mr-1" /> Add Option
              </Button>
            </div>

            <div className="space-y-3">
              {form.options.map((option, i) => (
                <div key={i} className="flex gap-2 items-start">
                  {form.poll_type === 'ranking' && (
                    <div className="flex items-center justify-center w-8 h-10 text-[var(--text-muted)]">
                      <GripVertical size={18} />
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <Input
                      value={option.text}
                      onChange={(e) => updateOption(i, 'text', e.target.value)}
                      placeholder={`Option ${i + 1}`}
                    />

                    {form.poll_type === 'image_choice' && (
                      <div className="flex items-center gap-2">
                        {option.imageUrl ? (
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[var(--bg-tertiary)]">
                            <img
                              src={option.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => updateOption(i, 'imageUrl', null)}
                              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOptionIndex(i);
                              setShowMediaPicker(true);
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-colors"
                          >
                            <Image size={16} />
                            <span className="text-sm">Add image</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {form.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="p-2 text-[var(--text-muted)] hover:text-red-500 mt-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {form.poll_type === 'ranking' && (
              <p className="text-sm text-[var(--text-muted)] mt-3">
                Participants will drag these options to rank them by preference
              </p>
            )}
          </Card>
        )}

        {form.poll_type === 'open_text' && (
          <Card className="mb-6">
            <h2 className="text-lg font-medium text-[var(--text-primary)] mb-2">Open Text Poll</h2>
            <p className="text-[var(--text-secondary)]">
              Participants will be able to submit their own written responses. Responses will be displayed
              in a list or word cloud format.
            </p>
          </Card>
        )}

        {form.poll_type === 'rating' && (
          <Card className="mb-6">
            <h2 className="text-lg font-medium text-[var(--text-primary)] mb-2">Rating Poll Preview</h2>
            <div className="flex justify-center py-4">
              <div className="flex gap-1">
                {[...Array(form.rating_scale)].map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      size={form.rating_scale === 10 ? 24 : 32}
                      className={i < 3 ? 'text-[var(--accent-gold)] fill-[var(--accent-gold)]' : 'text-[var(--border-default)]'}
                    />
                  </button>
                ))}
              </div>
            </div>
            <p className="text-center text-sm text-[var(--text-muted)]">
              Participants will rate from 1 to {form.rating_scale}
            </p>
          </Card>
        )}

        <Card className="mb-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Settings</h2>
          <div className="space-y-3">
            {needsOptions && form.poll_type !== 'ranking' && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allow_multiple_choices}
                  onChange={(e) => setForm({ ...form, allow_multiple_choices: e.target.checked })}
                  className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                />
                <span className="text-[var(--text-secondary)]">Allow multiple selections</span>
              </label>
            )}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_anonymous}
                onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })}
                className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
              />
              <span className="text-[var(--text-secondary)]">Anonymous voting (hide who voted for what)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.show_results_before_close}
                onChange={(e) => setForm({ ...form, show_results_before_close: e.target.checked })}
                className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
              />
              <span className="text-[var(--text-secondary)]">Show results before poll closes</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allow_vote_change}
                onChange={(e) => setForm({ ...form, allow_vote_change: e.target.checked })}
                className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
              />
              <span className="text-[var(--text-secondary)]">Allow participants to change their vote</span>
            </label>
          </div>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" loading={loading}>Create Poll</Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/polls')}>Cancel</Button>
        </div>
      </form>

      {showMediaPicker && (
        <MediaPickerModal
          onSelect={handleImageSelect}
          onClose={() => {
            setShowMediaPicker(false);
            setEditingOptionIndex(null);
          }}
        />
      )}
    </div>
  );
}
