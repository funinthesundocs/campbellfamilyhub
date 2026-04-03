import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTraining } from '../contexts/TrainingContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { SectionWelcome } from '../components/training/SectionWelcome';
import { TrainingTooltip } from '../components/training/TrainingTooltip';
import { TOOLTIPS } from '../components/training/training-content';
import {
  Heart, Plus, Target, Clock, Search, Star, Check,
  Stethoscope, GraduationCap, Flower2, PartyPopper, Home, Plane, MoreHorizontal
} from 'lucide-react';
import { formatCurrency, formatRelativeTime } from '../lib/utils';
import type { CrowdfundingCampaign, CampaignCategory } from '../types';

const CATEGORIES: { value: CampaignCategory | 'all'; label: string; icon: typeof Heart }[] = [
  { value: 'all', label: 'All', icon: Heart },
  { value: 'medical', label: 'Medical', icon: Stethoscope },
  { value: 'education', label: 'Education', icon: GraduationCap },
  { value: 'memorial', label: 'Memorial', icon: Flower2 },
  { value: 'event', label: 'Event', icon: PartyPopper },
  { value: 'home_repair', label: 'Home', icon: Home },
  { value: 'travel', label: 'Travel', icon: Plane },
  { value: 'other', label: 'Other', icon: MoreHorizontal },
];

type StatusFilter = 'all' | 'active' | 'successful' | 'ended';

export default function Crowdfunding() {
  const { profile } = useAuth();
  const { trainingMode } = useTraining();
  const [campaigns, setCampaigns] = useState<CrowdfundingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CampaignCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from('crowdfunding_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;

      const isExpired = new Date(c.deadline) < new Date();
      if (statusFilter === 'active' && (c.status !== 'active' || isExpired)) return false;
      if (statusFilter === 'successful' && c.status !== 'successful') return false;
      if (statusFilter === 'ended' && !isExpired && c.status !== 'successful') return false;

      return true;
    });
  }, [campaigns, search, categoryFilter, statusFilter]);

  const getProgress = (current: number, goal: number) => Math.min((current / goal) * 100, 100);

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.icon || Heart;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {trainingMode && <SectionWelcome sectionId="crowdfunding" />}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="font-serif text-3xl text-[var(--text-primary)]">Family Fundraising</h1>
        {profile?.is_admin && (
          <TrainingTooltip tipId="crowdfunding-new" content={TOOLTIPS['crowdfunding-new']?.content || ''} position="bottom">
            <Link to="/crowdfunding/new">
              <Button>
                <Plus size={18} className="mr-2" /> New Campaign
              </Button>
            </Link>
          </TrainingTooltip>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'active', 'successful', 'ended'] as StatusFilter[]).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-[var(--accent-gold)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                categoryFilter === cat.value
                  ? 'bg-[rgba(var(--accent-primary-rgb),0.20)] text-[var(--accent-gold)] border border-[var(--accent-gold)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-transparent hover:border-[var(--border-default)]'
              }`}
            >
              <Icon size={16} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-40 mb-4 rounded-lg" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-2 w-full rounded-full" />
            </Card>
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <Card className="text-center py-12">
          <Heart className="mx-auto mb-4 text-[var(--text-muted)]" size={48} />
          <p className="text-[var(--text-secondary)]">
            {search || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'No campaigns match your filters'
              : 'No campaigns yet'}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            {search || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Check back for family fundraising projects'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => {
            const CategoryIcon = getCategoryIcon(campaign.category);
            const isExpired = new Date(campaign.deadline) < new Date();

            return (
              <Link key={campaign.id} to={`/crowdfunding/${campaign.id}`}>
                <Card className="h-full hover:border-[var(--accent-gold)]/50 transition-colors">
                  {campaign.cover_image_url ? (
                    <img
                      src={campaign.cover_image_url}
                      alt={campaign.title}
                      className="w-full h-40 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div className="w-full h-40 bg-[var(--bg-tertiary)] rounded-lg mb-4 flex items-center justify-center">
                      <Heart size={48} className="text-[var(--text-muted)]" />
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-2 py-0.5 text-xs bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-full flex items-center gap-1">
                      <CategoryIcon size={12} />
                      {CATEGORIES.find(c => c.value === campaign.category)?.label || 'Other'}
                    </span>
                    {campaign.is_featured && (
                      <span className="px-2 py-0.5 text-xs bg-[rgba(var(--accent-primary-rgb),0.20)] text-[var(--accent-gold)] rounded-full flex items-center gap-1">
                        <Star size={12} /> Featured
                      </span>
                    )}
                    {campaign.funding_type === 'all_or_nothing' && (
                      <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
                        All or Nothing
                      </span>
                    )}
                    {campaign.status === 'successful' ? (
                      <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
                        <Check size={12} /> Funded
                      </span>
                    ) : isExpired ? (
                      <span className="px-2 py-0.5 text-xs bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded-full">
                        Ended
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        <Clock size={12} /> {formatRelativeTime(campaign.deadline)}
                      </span>
                    )}
                  </div>

                  <h3 className="font-medium text-lg text-[var(--text-primary)] mb-2 line-clamp-1">{campaign.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4">{campaign.description}</p>

                  <div className="mb-2">
                    <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-sage)] rounded-full transition-all"
                        style={{ width: `${getProgress(campaign.current_amount, campaign.goal_amount)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--accent-sage)] font-medium">{formatCurrency(campaign.current_amount)}</span>
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <Target size={14} /> {formatCurrency(campaign.goal_amount)}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
