import { useState, useEffect } from 'react';
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
  BarChart3,
  Plus,
  Clock,
  CheckCircle2,
  Star,
  GripVertical,
  FileText,
  Image,
  Calendar,
  RefreshCw,
  Users,
} from 'lucide-react';
import { formatRelativeTime } from '../lib/utils';
import type { Poll, PollType } from '../types';

const pollTypeConfig: Record<PollType, { icon: typeof BarChart3; label: string; color: string }> = {
  'general': { icon: BarChart3, label: 'Poll', color: 'text-[var(--accent-gold)]' },
  'rating': { icon: Star, label: 'Rating', color: 'text-amber-500' },
  'ranking': { icon: GripVertical, label: 'Ranking', color: 'text-blue-500' },
  'open_text': { icon: FileText, label: 'Open', color: 'text-green-500' },
  'image_choice': { icon: Image, label: 'Image', color: 'text-pink-500' },
  'event-date': { icon: Calendar, label: 'Date', color: 'text-cyan-500' },
  'location': { icon: BarChart3, label: 'Location', color: 'text-orange-500' },
  'name-vote': { icon: BarChart3, label: 'Name', color: 'text-purple-500' },
  'priority': { icon: GripVertical, label: 'Priority', color: 'text-red-500' },
};

export default function Polls() {
  const { profile } = useAuth();
  const { trainingMode } = useTraining();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'scheduled' | 'closed'>('active');
  const [pollStats, setPollStats] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchPolls();
  }, [filter]);

  const fetchPolls = async () => {
    setLoading(true);
    const now = new Date().toISOString();
    let query = supabase.from('polls').select('*').order('created_at', { ascending: false });

    if (filter === 'active') {
      query = query.gt('closes_at', now).or(`starts_at.is.null,starts_at.lte.${now}`);
    } else if (filter === 'scheduled') {
      query = query.gt('starts_at', now);
    } else {
      query = query.lte('closes_at', now);
    }

    const { data: pollsData } = await query;
    setPolls(pollsData || []);

    if (pollsData && pollsData.length > 0) {
      const pollIds = pollsData.map(p => p.id);

      const [votesResult, ratingsResult, textResult, rankingsResult] = await Promise.all([
        supabase.from('poll_votes').select('poll_id').in('poll_id', pollIds),
        supabase.from('poll_ratings').select('poll_id').in('poll_id', pollIds),
        supabase.from('poll_text_responses').select('poll_id').in('poll_id', pollIds),
        supabase.from('poll_rankings').select('poll_id, user_id').in('poll_id', pollIds),
      ]);

      const stats: Record<string, number> = {};

      votesResult.data?.forEach(v => {
        stats[v.poll_id] = (stats[v.poll_id] || 0) + 1;
      });
      ratingsResult.data?.forEach(r => {
        stats[r.poll_id] = (stats[r.poll_id] || 0) + 1;
      });
      textResult.data?.forEach(t => {
        stats[t.poll_id] = (stats[t.poll_id] || 0) + 1;
      });

      const rankingUsers: Record<string, Set<string>> = {};
      rankingsResult.data?.forEach(r => {
        if (!rankingUsers[r.poll_id]) rankingUsers[r.poll_id] = new Set();
        rankingUsers[r.poll_id].add(r.user_id);
      });
      Object.entries(rankingUsers).forEach(([pollId, users]) => {
        stats[pollId] = (stats[pollId] || 0) + users.size;
      });

      setPollStats(stats);
    }

    setLoading(false);
  };

  const isExpired = (closesAt: string) => new Date(closesAt) < new Date();
  const hasNotStarted = (startsAt: string | null) => startsAt ? new Date(startsAt) > new Date() : false;

  const getPollTypeIcon = (pollType: PollType) => {
    const config = pollTypeConfig[pollType] || pollTypeConfig['general'];
    const IconComponent = config.icon;
    return <IconComponent size={16} className={config.color} />;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {trainingMode && <SectionWelcome sectionId="polls" />}

      <div className="flex justify-between items-center mb-6">
        <TrainingTooltip tipId="polls-title" content={TOOLTIPS['polls-title']?.content || ''} position="bottom">
          <h1 className="font-serif text-3xl text-[var(--text-primary)]">Family Polls</h1>
        </TrainingTooltip>
        {profile && (
          <TrainingTooltip tipId="polls-create" content={TOOLTIPS['polls-create']?.content || ''} position="bottom">
            <Link to="/polls/new">
              <Button>
                <Plus size={18} className="mr-2" /> Create Poll
              </Button>
            </Link>
          </TrainingTooltip>
        )}
      </div>

      <TrainingTooltip tipId="polls-filter-tabs" content={TOOLTIPS['polls-filter-tabs']?.content || ''} position="bottom">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === 'active'
                ? 'bg-[var(--accent-gold)] text-[#0f0f0f]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('scheduled')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === 'scheduled'
                ? 'bg-[var(--accent-gold)] text-[#0f0f0f]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
          >
            Scheduled
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === 'closed'
                ? 'bg-[var(--accent-gold)] text-[#0f0f0f]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
          >
            Closed
          </button>
        </div>
      </TrainingTooltip>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      ) : polls.length === 0 ? (
        <Card className="text-center py-12">
          <BarChart3 className="mx-auto mb-4 text-[var(--text-muted)]" size={48} />
          <p className="text-[var(--text-secondary)]">
            No {filter === 'scheduled' ? 'scheduled' : filter} polls
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            {filter === 'active'
              ? 'Check back for new polls'
              : filter === 'scheduled'
              ? 'No polls are scheduled to start'
              : 'No polls have closed yet'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => {
            const expired = isExpired(poll.closes_at);
            const notStarted = hasNotStarted(poll.starts_at);
            const responseCount = pollStats[poll.id] || 0;

            return (
              <Link key={poll.id} to={`/polls/${poll.id}`}>
                <Card className="flex items-center gap-4 hover:border-[var(--accent-gold)]/50 transition-colors">
                  <div
                    className={`p-3 rounded-lg ${
                      expired
                        ? 'bg-[var(--bg-tertiary)]'
                        : notStarted
                        ? 'bg-blue-500/10'
                        : 'bg-[var(--accent-gold)]/10'
                    }`}
                  >
                    {expired ? (
                      <CheckCircle2 className="text-[var(--text-muted)]" size={24} />
                    ) : notStarted ? (
                      <Clock className="text-blue-500" size={24} />
                    ) : (
                      getPollTypeIcon(poll.poll_type as PollType)
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-medium text-[var(--text-primary)] truncate">{poll.title}</h3>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          pollTypeConfig[poll.poll_type as PollType]?.color || 'text-[var(--text-muted)]'
                        } bg-[var(--bg-tertiary)]`}
                      >
                        {pollTypeConfig[poll.poll_type as PollType]?.label || 'Poll'}
                      </span>
                      {poll.recurrence_pattern && (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                          <RefreshCw size={10} />
                          {poll.recurrence_pattern}
                        </span>
                      )}
                    </div>
                    {poll.description && (
                      <p className="text-sm text-[var(--text-secondary)] line-clamp-1">
                        {poll.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] flex-shrink-0">
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {responseCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {notStarted
                        ? `Opens ${formatRelativeTime(poll.starts_at!)}`
                        : expired
                        ? 'Closed'
                        : `Closes ${formatRelativeTime(poll.closes_at)}`}
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
