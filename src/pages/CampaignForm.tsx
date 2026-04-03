import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft, Upload, Trash2, Plus, GripVertical, Target, Gift, Info } from 'lucide-react';
import type { CampaignCategory, CampaignFundingType } from '../types';

interface MilestoneInput {
  id: string;
  title: string;
  description: string;
  target_amount: string;
}

interface TierInput {
  id: string;
  name: string;
  amount: string;
  description: string;
  perks: string;
}

const CATEGORIES: { value: CampaignCategory; label: string; description: string }[] = [
  { value: 'medical', label: 'Medical & Health', description: 'Medical expenses, treatments, health emergencies' },
  { value: 'education', label: 'Education', description: 'Tuition, school supplies, learning opportunities' },
  { value: 'memorial', label: 'Memorial', description: 'Funeral costs, memorial funds, tributes' },
  { value: 'event', label: 'Family Event', description: 'Reunions, celebrations, gatherings' },
  { value: 'home_repair', label: 'Home & Property', description: 'Repairs, renovations, property maintenance' },
  { value: 'travel', label: 'Travel', description: 'Family trips, visits, transportation' },
  { value: 'other', label: 'Other', description: 'Other family needs' },
];

const SUGGESTED_TIERS = [
  { name: 'Supporter', amount: '25', description: 'Every bit helps!', perks: 'Thank you message' },
  { name: 'Champion', amount: '50', description: 'Make a real difference', perks: 'Name on thank you list' },
  { name: 'Hero', amount: '100', description: 'Lead the way', perks: 'Special recognition' },
  { name: 'Guardian', amount: '250', description: 'Above and beyond', perks: 'Top supporter badge' },
];

export default function CampaignForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    title: '',
    description: '',
    goal_amount: '',
    minimum_contribution: '5',
    deadline: '',
    cover_image_url: '',
    video_url: '',
    thank_you_message: '',
    category: 'other' as CampaignCategory,
    funding_type: 'flexible' as CampaignFundingType,
    allow_offline_contributions: true,
  });

  const [milestones, setMilestones] = useState<MilestoneInput[]>([]);
  const [tiers, setTiers] = useState<TierInput[]>([]);
  const [useTiers, setUseTiers] = useState(false);
  const [useMilestones, setUseMilestones] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/campaigns/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file);
    if (error) {
      showError('Failed to upload image');
    } else {
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
      setForm({ ...form, cover_image_url: publicUrl });
    }
    setUploading(false);
  };

  const addMilestone = () => {
    setMilestones([...milestones, {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      target_amount: '',
    }]);
  };

  const updateMilestone = (id: string, field: keyof MilestoneInput, value: string) => {
    setMilestones(milestones.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const addTier = () => {
    setTiers([...tiers, {
      id: crypto.randomUUID(),
      name: '',
      amount: '',
      description: '',
      perks: '',
    }]);
  };

  const updateTier = (id: string, field: keyof TierInput, value: string) => {
    setTiers(tiers.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTier = (id: string) => {
    setTiers(tiers.filter(t => t.id !== id));
  };

  const applySuggestedTiers = () => {
    setTiers(SUGGESTED_TIERS.map(t => ({ ...t, id: crypto.randomUUID() })));
    setUseTiers(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!form.goal_amount || parseFloat(form.goal_amount) <= 0) {
      showError('Please enter a valid goal amount');
      return;
    }

    if (!form.deadline) {
      showError('Please set a deadline');
      return;
    }

    setLoading(true);

    const { data: campaignData, error: campaignError } = await supabase
      .from('crowdfunding_campaigns')
      .insert({
        title: form.title,
        description: form.description,
        goal_amount: parseFloat(form.goal_amount),
        minimum_contribution: parseFloat(form.minimum_contribution) || 5,
        deadline: new Date(form.deadline).toISOString(),
        cover_image_url: form.cover_image_url || null,
        video_url: form.video_url || null,
        thank_you_message: form.thank_you_message || null,
        category: form.category,
        funding_type: form.funding_type,
        allow_offline_contributions: form.allow_offline_contributions,
        created_by: user.id,
        status: 'active',
      })
      .select('id')
      .maybeSingle();

    if (campaignError || !campaignData) {
      showError('Failed to create campaign');
      setLoading(false);
      return;
    }

    if (useMilestones && milestones.length > 0) {
      const validMilestones = milestones.filter(m => m.title && m.target_amount);
      if (validMilestones.length > 0) {
        await supabase.from('campaign_milestones').insert(
          validMilestones.map((m, i) => ({
            campaign_id: campaignData.id,
            title: m.title,
            description: m.description || null,
            target_amount: parseFloat(m.target_amount),
            display_order: i,
          }))
        );
      }
    }

    if (useTiers && tiers.length > 0) {
      const validTiers = tiers.filter(t => t.name && t.amount);
      if (validTiers.length > 0) {
        await supabase.from('campaign_giving_tiers').insert(
          validTiers.map((t, i) => ({
            campaign_id: campaignData.id,
            name: t.name,
            amount: parseFloat(t.amount),
            description: t.description || null,
            perks: t.perks || null,
            display_order: i,
          }))
        );
      }
    }

    success('Campaign created');
    navigate('/crowdfunding');
    setLoading(false);
  };

  const getDefaultDeadline = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().slice(0, 10);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/crowdfunding')}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] mb-6"
      >
        <ArrowLeft size={20} /> Back to Campaigns
      </button>

      <h1 className="font-serif text-3xl text-[var(--text-primary)] mb-6">Create Campaign</h1>

      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-tertiary)]'}`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <>
            <Card className="mb-6">
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Campaign Category</h2>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat.value })}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      form.category === cat.value
                        ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-primary-rgb),0.10)]'
                        : 'border-[var(--border-default)] hover:border-[var(--accent-gold)]/50'
                    }`}
                  >
                    <p className="font-medium text-[var(--text-primary)]">{cat.label}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{cat.description}</p>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="mb-6">
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Basic Details</h2>
              <div className="space-y-4">
                <Input
                  label="Campaign Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="What are you raising funds for?"
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                    rows={5}
                    placeholder="Explain why this matters and how the funds will be used..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Cover Image</label>
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
                <Input
                  label="Video URL (optional)"
                  value={form.video_url}
                  onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  placeholder="YouTube or Vimeo URL"
                />
              </div>
            </Card>

            <div className="flex justify-end">
              <Button type="button" onClick={() => setStep(2)}>Continue</Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Card className="mb-6">
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Funding Goals</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Goal Amount ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                      <input
                        type="number"
                        value={form.goal_amount}
                        onChange={(e) => setForm({ ...form, goal_amount: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                        placeholder="1000"
                        required
                        min="1"
                        step="1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Min Contribution ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                      <input
                        type="number"
                        value={form.minimum_contribution}
                        onChange={(e) => setForm({ ...form, minimum_contribution: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                        placeholder="5"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
                <Input
                  label="Deadline"
                  type="date"
                  value={form.deadline || getDefaultDeadline()}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  required
                />
              </div>
            </Card>

            <Card className="mb-6">
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Funding Type</h2>
              <div className="space-y-3">
                <label
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer ${
                    form.funding_type === 'flexible'
                      ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-primary-rgb),0.10)]'
                      : 'border-[var(--border-default)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="funding_type"
                    checked={form.funding_type === 'flexible'}
                    onChange={() => setForm({ ...form, funding_type: 'flexible' })}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Flexible Funding</p>
                    <p className="text-sm text-[var(--text-muted)]">Keep all contributions regardless of whether goal is met</p>
                  </div>
                </label>
                <label
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer ${
                    form.funding_type === 'all_or_nothing'
                      ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-primary-rgb),0.10)]'
                      : 'border-[var(--border-default)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="funding_type"
                    checked={form.funding_type === 'all_or_nothing'}
                    onChange={() => setForm({ ...form, funding_type: 'all_or_nothing' })}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">All or Nothing</p>
                    <p className="text-sm text-[var(--text-muted)]">Only receive funds if goal is fully met by deadline</p>
                  </div>
                </label>
              </div>
            </Card>

            <Card className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target size={20} className="text-[var(--accent-gold)]" />
                  <h2 className="text-lg font-medium text-[var(--text-primary)]">Stretch Goals</h2>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useMilestones}
                    onChange={(e) => setUseMilestones(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">Enable</span>
                </label>
              </div>

              {useMilestones && (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                    <Info size={14} />
                    Add milestones to unlock at specific funding amounts
                  </p>
                  {milestones.map((milestone, idx) => (
                    <div key={milestone.id} className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <GripVertical size={16} className="text-[var(--text-muted)]" />
                        <span className="text-sm font-medium text-[var(--text-secondary)]">Milestone {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeMilestone(milestone.id)}
                          className="ml-auto text-[var(--text-muted)] hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={milestone.title}
                          onChange={(e) => updateMilestone(milestone.id, 'title', e.target.value)}
                          placeholder="Milestone title"
                          className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] text-sm"
                        />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                          <input
                            type="number"
                            value={milestone.target_amount}
                            onChange={(e) => updateMilestone(milestone.id, 'target_amount', e.target.value)}
                            placeholder="Target amount"
                            className="w-full pl-8 pr-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] text-sm"
                          />
                        </div>
                      </div>
                      <textarea
                        value={milestone.description}
                        onChange={(e) => updateMilestone(milestone.id, 'description', e.target.value)}
                        placeholder="What happens when this milestone is reached?"
                        className="w-full mt-3 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] text-sm"
                        rows={2}
                      />
                    </div>
                  ))}
                  <Button type="button" variant="secondary" onClick={addMilestone} className="w-full">
                    <Plus size={16} className="mr-2" /> Add Milestone
                  </Button>
                </div>
              )}
            </Card>

            <div className="flex justify-between">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button type="button" onClick={() => setStep(3)}>Continue</Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <Card className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Gift size={20} className="text-[var(--accent-gold)]" />
                  <h2 className="text-lg font-medium text-[var(--text-primary)]">Giving Tiers</h2>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useTiers}
                    onChange={(e) => setUseTiers(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">Enable</span>
                </label>
              </div>

              {useTiers && (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                    <Info size={14} />
                    Suggested giving levels make contributing easier
                  </p>
                  {tiers.length === 0 && (
                    <button
                      type="button"
                      onClick={applySuggestedTiers}
                      className="w-full p-4 border border-dashed border-[var(--accent-gold)]/50 rounded-lg text-[var(--accent-gold)] hover:bg-[rgba(var(--accent-primary-rgb),0.10)]"
                    >
                      Use Suggested Tiers
                    </button>
                  )}
                  {tiers.map((tier, idx) => (
                    <div key={tier.id} className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <GripVertical size={16} className="text-[var(--text-muted)]" />
                        <span className="text-sm font-medium text-[var(--text-secondary)]">Tier {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeTier(tier.id)}
                          className="ml-auto text-[var(--text-muted)] hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <input
                          type="text"
                          value={tier.name}
                          onChange={(e) => updateTier(tier.id, 'name', e.target.value)}
                          placeholder="Tier name"
                          className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] text-sm"
                        />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                          <input
                            type="number"
                            value={tier.amount}
                            onChange={(e) => updateTier(tier.id, 'amount', e.target.value)}
                            placeholder="Amount"
                            className="w-full pl-8 pr-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] text-sm"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        value={tier.description}
                        onChange={(e) => updateTier(tier.id, 'description', e.target.value)}
                        placeholder="Description"
                        className="w-full mb-3 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] text-sm"
                      />
                      <input
                        type="text"
                        value={tier.perks}
                        onChange={(e) => updateTier(tier.id, 'perks', e.target.value)}
                        placeholder="Perks (optional)"
                        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] text-sm"
                      />
                    </div>
                  ))}
                  <Button type="button" variant="secondary" onClick={addTier} className="w-full">
                    <Plus size={16} className="mr-2" /> Add Tier
                  </Button>
                </div>
              )}
            </Card>

            <Card className="mb-6">
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Settings</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allow_offline_contributions}
                    onChange={(e) => setForm({ ...form, allow_offline_contributions: e.target.checked })}
                    className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Allow offline contributions</p>
                    <p className="text-xs text-[var(--text-muted)]">Track cash/check contributions given in person</p>
                  </div>
                </label>
              </div>
            </Card>

            <Card className="mb-6">
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Thank You Message</h2>
              <textarea
                value={form.thank_you_message}
                onChange={(e) => setForm({ ...form, thank_you_message: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                rows={3}
                placeholder="Thank you for supporting our family project..."
              />
            </Card>

            <div className="flex justify-between">
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>Back</Button>
              <Button type="submit" loading={loading}>Launch Campaign</Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
