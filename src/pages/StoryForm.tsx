import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { VoiceTextArea } from '../components/shared/VoiceTextArea';
import { ArrowLeft, Upload, Trash2 } from 'lucide-react';

const decades = ['1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];

export default function StoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    story_date: '',
    decade: '',
    cover_image_url: '',
  });

  useEffect(() => {
    if (id) fetchStory();
  }, [id]);

  const fetchStory = async () => {
    const { data } = await supabase.from('stories').select('*').eq('id', id).maybeSingle();
    if (data) {
      setForm({
        title: data.title,
        content: data.content,
        story_date: data.story_date || '',
        decade: data.decade || '',
        cover_image_url: data.cover_image_url || '',
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/stories/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file);
    if (error) {
      showError('Failed to upload image');
    } else {
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
      setForm({ ...form, cover_image_url: publicUrl });
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const payload = {
      title: form.title,
      content: form.content,
      story_date: form.story_date || null,
      decade: form.decade || null,
      cover_image_url: form.cover_image_url || null,
    };

    let error;
    if (id) {
      ({ error } = await supabase.from('stories').update(payload).eq('id', id));
    } else {
      ({ error } = await supabase.from('stories').insert({ ...payload, submitted_by: user.id }));
    }

    if (error) {
      showError('Failed to save story');
    } else {
      success(id ? 'Story updated' : 'Story shared');
      navigate('/jokes');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/jokes')}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] mb-6"
      >
        <ArrowLeft size={20} /> Back to Jokes & Stories
      </button>

      <h1 className="font-serif text-3xl text-[var(--text-primary)] mb-6">
        {id ? 'Edit Story' : 'Share a Story'}
      </h1>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <div className="space-y-4">
            <Input
              label="Story Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Give your story a title"
              required
            />

            <VoiceTextArea
              label="Your Story"
              value={form.content}
              onChange={(value) => setForm({ ...form, content: value })}
              placeholder="Share your memory, family tale, or piece of history... Use the microphone to dictate. Say 'period', 'comma', 'new paragraph' for formatting."
              rows={12}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date (if known)"
                type="date"
                value={form.story_date}
                onChange={(e) => setForm({ ...form, story_date: e.target.value })}
              />
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Decade</label>
                <select
                  value={form.decade}
                  onChange={(e) => setForm({ ...form, decade: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                >
                  <option value="">Select decade</option>
                  {decades.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Cover Image (optional)</label>
              {form.cover_image_url ? (
                <div className="relative">
                  <img src={form.cover_image_url} alt="Cover" className="w-full h-48 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, cover_image_url: '' })}
                    className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--border-default)] rounded-lg cursor-pointer hover:border-[var(--accent-gold)]/50">
                  <Upload className="text-[var(--text-muted)] mb-2" size={24} />
                  <span className="text-sm text-[var(--text-muted)]">
                    {uploading ? 'Uploading...' : 'Click to upload'}
                  </span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" loading={loading}>
            {id ? 'Save Changes' : 'Share Story'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/jokes')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
