import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import {
  ArrowLeft, Heart, Target, Clock, Users, Trash2, Check, Trophy, Gift,
  Megaphone, TrendingUp, Award, Banknote
} from 'lucide-react';
import { formatCurrency, formatDate, formatRelativeTime, getInitials } from '../lib/utils';
import type {
  CrowdfundingCampaign, UserProfile, CampaignMilestone, CampaignGivingTier,
  CampaignUpdate, CampaignMatchingPledge, CampaignContribution
} from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  medical: 'Medical & Health',
  education: 'Education',
  memorial: 'Memorial',
  event: 'Family Event',
  home_repair: 'Home & Property',
  travel: 'Travel',
  other: 'Other',
};

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { success, error: showError } = useToast();

  const [campaign, setCampaign] = useState<CrowdfundingCampaign | null>(null);
  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [contributions, setContributions] = useState<CampaignContribution[]>([]);
  const [milestones, setMilestones] = useState<CampaignMilestone[]>([]);
  const [tiers, setTiers] = useState<CampaignGivingTier[]>([]);
  const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
  const [matchingPledges, setMatchingPledges] = useState<CampaignMatchingPledge[]>([]);
  const [loading, setLoading] = useState(true);

  const [showContributeForm, setShowContributeForm] = useState(false);
  const [contributing, setContributing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [contributionForm, setContributionForm] = useState({
    amount: '',
    message: '',
    is_anonymous: false,
  });

  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [postingUpdate, setPostingUpdate] = useState(false);
  const [updateForm, setUpdateForm] = useState({ title: '', content: '' });

  const [showOfflineForm, setShowOfflineForm] = useState(false);
  const [addingOffline, setAddingOffline] = useState(false);
  const [offlineForm, setOfflineForm] = useState({
    contributor_name: '',
    amount: '',
    contribution_method: 'cash',
    notes: '',
  });

  const [activeTab, setActiveTab] = useState<'about' | 'updates' | 'contributors'>('about');

  useEffect(() => {
    if (id) fetchCampaign();
  }, [id]);

  const fetchCampaign = async () => {
    const { data: campaignData } = await supabase
      .from('crowdfunding_campaigns')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!campaignData) {
      setLoading(false);
      return;
    }
    setCampaign(campaignData);

    const [
      { data: creatorData },
      { data: contributionsData },
      { data: milestonesData },
      { data: tiersData },
      { data: updatesData },
      { data: pledgesData },
    ] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', campaignData.created_by).maybeSingle(),
      supabase.from('campaign_contributions').select('*').eq('campaign_id', id).order('contributed_at', { ascending: false }),
      supabase.from('campaign_milestones').select('*').eq('campaign_id', id).order('target_amount', { ascending: true }),
      supabase.from('campaign_giving_tiers').select('*').eq('campaign_id', id).order('amount', { ascending: true }),
      supabase.from('campaign_updates').select('*').eq('campaign_id', id).order('created_at', { ascending: false }),
      supabase.from('campaign_matching_pledges').select('*').eq('campaign_id', id).eq('is_active', true),
    ]);

    setCreator(creatorData);
    setMilestones(milestonesData || []);
    setTiers(tiersData || []);

    if (contributionsData && contributionsData.length > 0) {
      const userIds = [...new Set(contributionsData.map(c => c.user_id))];
      const { data: users } = await supabase.from('user_profiles').select('*').in('id', userIds);
      setContributions(contributionsData.map(c => ({ ...c, user: users?.find(u => u.id === c.user_id) })));
    }

    if (updatesData && updatesData.length > 0) {
      const userIds = [...new Set(updatesData.map(u => u.posted_by))];
      const { data: users } = await supabase.from('user_profiles').select('*').in('id', userIds);
      setUpdates(updatesData.map(u => ({ ...u, user: users?.find(user => user.id === u.posted_by) })));
    }

    if (pledgesData && pledgesData.length > 0) {
      const userIds = [...new Set(pledgesData.map(p => p.user_id))];
      const { data: users } = await supabase.from('user_profiles').select('*').in('id', userIds);
      setMatchingPledges(pledgesData.map(p => ({ ...p, user: users?.find(u => u.id === p.user_id) })));
    }

    setLoading(false);
  };

  const isExpired = campaign ? new Date(campaign.deadline) < new Date() : false;
  const progress = campaign ? Math.min((campaign.current_amount / campaign.goal_amount) * 100, 100) : 0;
  const canContribute = !isExpired && campaign?.status === 'active' && user;
  const canDelete = campaign?.created_by === user?.id || profile?.is_admin;
  const canPostUpdate = campaign?.created_by === user?.id || profile?.is_admin;
  const canAddOffline = campaign?.allow_offline_contributions && (campaign?.created_by === user?.id || profile?.is_admin);

  const leaderboard = useMemo(() => {
    const nonAnonymous = contributions.filter(c => !c.is_anonymous);
    const byUser = nonAnonymous.reduce((acc, c) => {
      const key = c.user_id;
      if (!acc[key]) acc[key] = { user: c.user, total: 0, count: 0 };
      acc[key].total += c.amount;
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { user?: UserProfile; total: number; count: number }>);
    return Object.values(byUser).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [contributions]);

  const totalMatchingAvailable = useMemo(() =>
    matchingPledges.reduce((sum, p) => sum + (p.max_match - p.amount_matched), 0),
    [matchingPledges]
  );

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !campaign) return;

    const amount = parseFloat(contributionForm.amount);
    if (isNaN(amount) || amount < campaign.minimum_contribution) {
      showError(`Minimum contribution is ${formatCurrency(campaign.minimum_contribution)}`);
      return;
    }

    setContributing(true);

    const { error: contributionError } = await supabase.from('campaign_contributions').insert({
      campaign_id: campaign.id,
      user_id: user.id,
      amount,
      message: contributionForm.message || null,
      is_anonymous: contributionForm.is_anonymous,
      tier_id: selectedTier,
    });

    if (contributionError) {
      showError('Failed to submit contribution');
      setContributing(false);
      return;
    }

    if (selectedTier) {
      const tier = tiers.find(t => t.id === selectedTier);
      if (tier) {
        await supabase.from('campaign_giving_tiers')
          .update({ current_contributors: tier.current_contributors + 1 })
          .eq('id', selectedTier);
      }
    }

    const newAmount = campaign.current_amount + amount;
    const newStatus = newAmount >= campaign.goal_amount ? 'successful' : campaign.status;

    await supabase.from('crowdfunding_campaigns').update({
      current_amount: newAmount,
      status: newStatus,
    }).eq('id', campaign.id);

    for (const milestone of milestones) {
      if (!milestone.reached_at && newAmount >= milestone.target_amount) {
        await supabase.from('campaign_milestones')
          .update({ reached_at: new Date().toISOString() })
          .eq('id', milestone.id);
      }
    }

    success('Thank you for your contribution!');
    setShowContributeForm(false);
    setContributionForm({ amount: '', message: '', is_anonymous: false });
    setSelectedTier(null);
    fetchCampaign();
    setContributing(false);
  };

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !campaign) return;

    setPostingUpdate(true);
    const { error } = await supabase.from('campaign_updates').insert({
      campaign_id: campaign.id,
      title: updateForm.title,
      content: updateForm.content,
      posted_by: user.id,
    });

    if (error) {
      showError('Failed to post update');
    } else {
      success('Update posted');
      setShowUpdateForm(false);
      setUpdateForm({ title: '', content: '' });
      fetchCampaign();
    }
    setPostingUpdate(false);
  };

  const handleAddOffline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !campaign) return;

    const amount = parseFloat(offlineForm.amount);
    if (isNaN(amount) || amount <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    setAddingOffline(true);
    const { error } = await supabase.from('offline_contributions').insert({
      campaign_id: campaign.id,
      recorded_by: user.id,
      contributor_name: offlineForm.contributor_name,
      amount,
      contribution_method: offlineForm.contribution_method,
      notes: offlineForm.notes || null,
    });

    if (error) {
      showError('Failed to record contribution');
    } else {
      const newAmount = campaign.current_amount + amount;
      await supabase.from('crowdfunding_campaigns').update({ current_amount: newAmount }).eq('id', campaign.id);
      success('Offline contribution recorded');
      setShowOfflineForm(false);
      setOfflineForm({ contributor_name: '', amount: '', contribution_method: 'cash', notes: '' });
      fetchCampaign();
    }
    setAddingOffline(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return;
    await supabase.from('campaign_contributions').delete().eq('campaign_id', id);
    const { error } = await supabase.from('crowdfunding_campaigns').delete().eq('id', id);
    if (error) {
      showError('Failed to delete campaign');
    } else {
      success('Campaign deleted');
      navigate('/crowdfunding');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-64 mb-6 rounded-lg" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <Heart className="mx-auto mb-4 text-[var(--text-muted)]" size={48} />
        <p className="text-[var(--text-secondary)] mb-4">Campaign not found</p>
        <Link to="/crowdfunding" className="text-[var(--accent-gold)] hover:underline">Back to campaigns</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/crowdfunding')}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] mb-6"
      >
        <ArrowLeft size={20} /> Back to Campaigns
      </button>

      {campaign.cover_image_url ? (
        <img src={campaign.cover_image_url} alt={campaign.title} className="w-full h-64 object-cover rounded-lg mb-6" />
      ) : (
        <div className="w-full h-64 bg-[var(--bg-tertiary)] rounded-lg mb-6 flex items-center justify-center">
          <Heart size={64} className="text-[var(--text-muted)]" />
        </div>
      )}

      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-full">
              {CATEGORY_LABELS[campaign.category] || 'Other'}
            </span>
            {campaign.funding_type === 'all_or_nothing' && (
              <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">All or Nothing</span>
            )}
            {campaign.status === 'successful' ? (
              <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
                <Check size={12} /> Funded
              </span>
            ) : isExpired ? (
              <span className="px-2 py-0.5 text-xs bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded-full">Ended</span>
            ) : (
              <span className="px-2 py-0.5 text-xs bg-[rgba(var(--accent-secondary-rgb),0.20)] text-[var(--accent-sage)] rounded-full">Active</span>
            )}
          </div>
          <h1 className="font-serif text-3xl text-[var(--text-primary)]">{campaign.title}</h1>
        </div>
        {canDelete && (
          <Button variant="secondary" onClick={handleDelete}>
            <Trash2 size={16} />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex border-b border-[var(--border-default)]">
            {(['about', 'updates', 'contributors'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab
                    ? 'border-[var(--accent-gold)] text-[var(--accent-gold)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab === 'about' && 'About'}
                {tab === 'updates' && `Updates (${updates.length})`}
                {tab === 'contributors' && `Contributors (${contributions.length})`}
              </button>
            ))}
          </div>

          {activeTab === 'about' && (
            <Card>
              <div className="text-[var(--text-secondary)] whitespace-pre-wrap mb-6">{campaign.description}</div>
              {creator && (
                <div className="flex items-center gap-3 pt-6 border-t border-[var(--border-default)]">
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[rgba(var(--accent-primary-rgb),0.20)] flex items-center justify-center">
                      <span className="text-sm text-[var(--accent-gold)]">{getInitials(creator.display_name)}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Organized by</p>
                    <p className="font-medium text-[var(--text-primary)]">{creator.display_name}</p>
                  </div>
                </div>
              )}
            </Card>
          )}

          {activeTab === 'updates' && (
            <div className="space-y-4">
              {canPostUpdate && (
                <Button variant="secondary" onClick={() => setShowUpdateForm(!showUpdateForm)} className="w-full">
                  <Megaphone size={16} className="mr-2" /> Post Update
                </Button>
              )}
              {showUpdateForm && (
                <Card>
                  <form onSubmit={handlePostUpdate} className="space-y-4">
                    <Input
                      label="Title"
                      value={updateForm.title}
                      onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })}
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Content</label>
                      <textarea
                        value={updateForm.content}
                        onChange={(e) => setUpdateForm({ ...updateForm, content: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                        rows={4}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" loading={postingUpdate}>Post</Button>
                      <Button type="button" variant="secondary" onClick={() => setShowUpdateForm(false)}>Cancel</Button>
                    </div>
                  </form>
                </Card>
              )}
              {updates.length === 0 ? (
                <Card className="text-center py-8">
                  <Megaphone className="mx-auto mb-2 text-[var(--text-muted)]" size={32} />
                  <p className="text-[var(--text-muted)]">No updates yet</p>
                </Card>
              ) : (
                updates.map(update => (
                  <Card key={update.id}>
                    <div className="flex items-center gap-3 mb-3">
                      {update.user?.avatar_url ? (
                        <img src={update.user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[rgba(var(--accent-primary-rgb),0.20)] flex items-center justify-center">
                          <span className="text-xs text-[var(--accent-gold)]">{getInitials(update.user?.display_name || '')}</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text-primary)]">{update.title}</p>
                        <p className="text-xs text-[var(--text-muted)]">{formatDate(update.created_at)}</p>
                      </div>
                    </div>
                    <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{update.content}</p>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'contributors' && (
            <div className="space-y-4">
              {leaderboard.length > 0 && (
                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="text-[var(--accent-gold)]" size={20} />
                    <h3 className="font-medium text-[var(--text-primary)]">Top Contributors</h3>
                  </div>
                  <div className="space-y-3">
                    {leaderboard.slice(0, 5).map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-yellow-500 text-white' :
                          idx === 1 ? 'bg-gray-400 text-white' :
                          idx === 2 ? 'bg-amber-600 text-white' :
                          'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                        }`}>
                          {idx + 1}
                        </span>
                        {entry.user?.avatar_url ? (
                          <img src={entry.user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[rgba(var(--accent-primary-rgb),0.20)] flex items-center justify-center">
                            <span className="text-xs text-[var(--accent-gold)]">{getInitials(entry.user?.display_name || '')}</span>
                          </div>
                        )}
                        <span className="flex-1 text-[var(--text-primary)]">{entry.user?.display_name}</span>
                        <span className="text-[var(--accent-sage)] font-medium">{formatCurrency(entry.total)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {contributions.length === 0 ? (
                <Card className="text-center py-8">
                  <Users className="mx-auto mb-2 text-[var(--text-muted)]" size={32} />
                  <p className="text-[var(--text-muted)]">No contributions yet</p>
                </Card>
              ) : (
                <Card>
                  <h3 className="font-medium text-[var(--text-primary)] mb-4">All Contributions</h3>
                  <div className="space-y-4">
                    {contributions.map(contribution => (
                      <div key={contribution.id} className="flex items-start gap-3 pb-4 border-b border-[var(--border-default)] last:border-0 last:pb-0">
                        {contribution.is_anonymous ? (
                          <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                            <Heart size={16} className="text-[var(--text-muted)]" />
                          </div>
                        ) : contribution.user?.avatar_url ? (
                          <img src={contribution.user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[rgba(var(--accent-primary-rgb),0.20)] flex items-center justify-center">
                            <span className="text-sm text-[var(--accent-gold)]">{getInitials(contribution.user?.display_name || '')}</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-[var(--text-primary)]">
                              {contribution.is_anonymous ? 'Anonymous' : contribution.user?.display_name}
                            </span>
                            <span className="text-[var(--accent-sage)] font-medium">{formatCurrency(contribution.amount)}</span>
                          </div>
                          {contribution.message && (
                            <p className="text-sm text-[var(--text-secondary)] mt-1">{contribution.message}</p>
                          )}
                          <p className="text-xs text-[var(--text-muted)] mt-1">{formatDate(contribution.contributed_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <div className="text-3xl font-bold text-[var(--accent-sage)] mb-1">{formatCurrency(campaign.current_amount)}</div>
            <div className="flex items-center gap-1 text-sm text-[var(--text-muted)] mb-4">
              <Target size={14} /> of {formatCurrency(campaign.goal_amount)} goal
            </div>
            <div className="h-3 bg-[var(--bg-tertiary)] rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-[var(--accent-sage)] rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            {milestones.length > 0 && (
              <div className="relative h-2 mb-4">
                {milestones.map(m => (
                  <div
                    key={m.id}
                    className={`absolute top-0 w-3 h-3 rounded-full -translate-x-1/2 ${
                      m.reached_at ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-default)]'
                    }`}
                    style={{ left: `${Math.min((m.target_amount / campaign.goal_amount) * 100, 100)}%` }}
                    title={`${m.title}: ${formatCurrency(m.target_amount)}`}
                  />
                ))}
              </div>
            )}
            <div className="flex justify-between text-sm text-[var(--text-muted)] mb-4">
              <span className="flex items-center gap-1">
                <Users size={14} /> {contributions.length} contributors
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} /> {isExpired ? 'Ended' : formatRelativeTime(campaign.deadline)}
              </span>
            </div>
            {canContribute && (
              <Button onClick={() => setShowContributeForm(true)} className="w-full">
                <Heart size={18} className="mr-2" /> Contribute
              </Button>
            )}
          </Card>

          {totalMatchingAvailable > 0 && (
            <Card className="bg-[rgba(var(--accent-primary-rgb),0.10)] border-[var(--accent-gold)]/30">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-[var(--accent-gold)]" size={18} />
                <span className="font-medium text-[var(--text-primary)]">Matching Available</span>
              </div>
              <p className="text-2xl font-bold text-[var(--accent-gold)]">{formatCurrency(totalMatchingAvailable)}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Your contribution could be matched!</p>
            </Card>
          )}

          {milestones.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Target className="text-[var(--accent-gold)]" size={18} />
                <h3 className="font-medium text-[var(--text-primary)]">Milestones</h3>
              </div>
              <div className="space-y-3">
                {milestones.map(m => (
                  <div key={m.id} className={`p-3 rounded-lg ${m.reached_at ? 'bg-green-500/10' : 'bg-[var(--bg-tertiary)]'}`}>
                    <div className="flex items-center gap-2">
                      {m.reached_at ? (
                        <Check size={16} className="text-green-400" />
                      ) : (
                        <Target size={16} className="text-[var(--text-muted)]" />
                      )}
                      <span className={`font-medium ${m.reached_at ? 'text-green-400' : 'text-[var(--text-primary)]'}`}>
                        {m.title}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{formatCurrency(m.target_amount)}</p>
                    {m.description && <p className="text-xs text-[var(--text-secondary)] mt-1">{m.description}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {tiers.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Gift className="text-[var(--accent-gold)]" size={18} />
                <h3 className="font-medium text-[var(--text-primary)]">Giving Tiers</h3>
              </div>
              <div className="space-y-3">
                {tiers.map(tier => (
                  <button
                    key={tier.id}
                    onClick={() => {
                      setSelectedTier(tier.id);
                      setContributionForm({ ...contributionForm, amount: tier.amount.toString() });
                      setShowContributeForm(true);
                    }}
                    disabled={!canContribute || (tier.max_contributors !== null && tier.current_contributors >= tier.max_contributors)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      tier.max_contributors !== null && tier.current_contributors >= tier.max_contributors
                        ? 'opacity-50 cursor-not-allowed border-[var(--border-default)]'
                        : 'border-[var(--border-default)] hover:border-[var(--accent-gold)]'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-[var(--text-primary)]">{tier.name}</span>
                      <span className="text-[var(--accent-gold)] font-bold">{formatCurrency(tier.amount)}</span>
                    </div>
                    {tier.description && <p className="text-xs text-[var(--text-muted)] mt-1">{tier.description}</p>}
                    {tier.perks && (
                      <p className="text-xs text-[var(--accent-sage)] mt-1 flex items-center gap-1">
                        <Award size={12} /> {tier.perks}
                      </p>
                    )}
                    {tier.max_contributors !== null && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {tier.current_contributors}/{tier.max_contributors} claimed
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {canAddOffline && (
            <Button variant="secondary" onClick={() => setShowOfflineForm(!showOfflineForm)} className="w-full">
              <Banknote size={16} className="mr-2" /> Record Offline Contribution
            </Button>
          )}
        </div>
      </div>

      {showContributeForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <h3 className="font-medium text-lg text-[var(--text-primary)] mb-4">Make a Contribution</h3>
            <form onSubmit={handleContribute} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                  <input
                    type="number"
                    value={contributionForm.amount}
                    onChange={(e) => setContributionForm({ ...contributionForm, amount: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                    placeholder={campaign.minimum_contribution.toString()}
                    min={campaign.minimum_contribution}
                    step="1"
                    required
                  />
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">Minimum: {formatCurrency(campaign.minimum_contribution)}</p>
              </div>
              <Input
                label="Message (optional)"
                value={contributionForm.message}
                onChange={(e) => setContributionForm({ ...contributionForm, message: e.target.value })}
                placeholder="Add a supportive message..."
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contributionForm.is_anonymous}
                  onChange={(e) => setContributionForm({ ...contributionForm, is_anonymous: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-[var(--text-secondary)]">Contribute anonymously</span>
              </label>
              <div className="flex gap-2">
                <Button type="submit" loading={contributing}>Contribute</Button>
                <Button type="button" variant="secondary" onClick={() => { setShowContributeForm(false); setSelectedTier(null); }}>Cancel</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {showOfflineForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <h3 className="font-medium text-lg text-[var(--text-primary)] mb-4">Record Offline Contribution</h3>
            <form onSubmit={handleAddOffline} className="space-y-4">
              <Input
                label="Contributor Name"
                value={offlineForm.contributor_name}
                onChange={(e) => setOfflineForm({ ...offlineForm, contributor_name: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                  <input
                    type="number"
                    value={offlineForm.amount}
                    onChange={(e) => setOfflineForm({ ...offlineForm, amount: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Method</label>
                <select
                  value={offlineForm.contribution_method}
                  onChange={(e) => setOfflineForm({ ...offlineForm, contribution_method: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Input
                label="Notes (optional)"
                value={offlineForm.notes}
                onChange={(e) => setOfflineForm({ ...offlineForm, notes: e.target.value })}
              />
              <div className="flex gap-2">
                <Button type="submit" loading={addingOffline}>Record</Button>
                <Button type="button" variant="secondary" onClick={() => setShowOfflineForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {campaign.thank_you_message && contributions.some(c => c.user_id === user?.id) && (
        <Card className="mt-6 bg-[rgba(var(--accent-secondary-rgb),0.10)] border-[var(--accent-sage)]/30">
          <h3 className="font-medium text-[var(--accent-sage)] mb-2">Thank you!</h3>
          <p className="text-[var(--text-secondary)]">{campaign.thank_you_message}</p>
        </Card>
      )}
    </div>
  );
}
