import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTraining } from '../contexts/TrainingContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { SectionWelcome } from '../components/training/SectionWelcome';
import { TrainingTooltip } from '../components/training/TrainingTooltip';
import { TOOLTIPS } from '../components/training/training-content';
import {
  ArrowLeft,
  Clock,
  Users,
  Check,
  Trash2,
  BarChart3,
  Star,
  MessageCircle,
  Send,
  Download,
  RefreshCw,
  GripVertical,
  Edit2,
  AlertCircle,
} from 'lucide-react';
import { formatRelativeTime, getInitials } from '../lib/utils';
import type { Poll, PollOption, PollVote, PollComment, PollRating, PollTextResponse, PollRanking, UserProfile } from '../types';

export default function PollDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { success, error: showError } = useToast();
  const { trainingMode } = useTraining();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [ratings, setRatings] = useState<PollRating[]>([]);
  const [textResponses, setTextResponses] = useState<PollTextResponse[]>([]);
  const [rankings, setRankings] = useState<PollRanking[]>([]);
  const [comments, setComments] = useState<PollComment[]>([]);
  const [voters, setVoters] = useState<Record<string, UserProfile>>({});
  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [textResponse, setTextResponse] = useState('');
  const [rankingOrder, setRankingOrder] = useState<string[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchPoll();
  }, [id]);

  const fetchPoll = async () => {
    const { data: pollData } = await supabase.from('polls').select('*').eq('id', id).maybeSingle();
    if (!pollData) {
      setLoading(false);
      return;
    }
    setPoll(pollData);

    const { data: creatorData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', pollData.created_by)
      .maybeSingle();
    setCreator(creatorData);

    const { data: optionsData } = await supabase
      .from('poll_options')
      .select('*')
      .eq('poll_id', id)
      .order('sort_order');
    setOptions(optionsData || []);

    if (optionsData && optionsData.length > 0) {
      setRankingOrder(optionsData.map(o => o.id));
    }

    const [votesResult, ratingsResult, textResult, rankingsResult, commentsResult] = await Promise.all([
      supabase.from('poll_votes').select('*').eq('poll_id', id),
      supabase.from('poll_ratings').select('*').eq('poll_id', id),
      supabase.from('poll_text_responses').select('*').eq('poll_id', id),
      supabase.from('poll_rankings').select('*').eq('poll_id', id),
      supabase.from('poll_comments').select('*').eq('poll_id', id).order('created_at', { ascending: false }),
    ]);

    setVotes(votesResult.data || []);
    setRatings(ratingsResult.data || []);
    setTextResponses(textResult.data || []);
    setRankings(rankingsResult.data || []);
    setComments(commentsResult.data || []);

    const allUserIds = new Set<string>();
    votesResult.data?.forEach(v => allUserIds.add(v.user_id));
    ratingsResult.data?.forEach(r => allUserIds.add(r.user_id));
    textResult.data?.forEach(t => allUserIds.add(t.user_id));
    rankingsResult.data?.forEach(r => allUserIds.add(r.user_id));
    commentsResult.data?.forEach(c => allUserIds.add(c.user_id));

    if (allUserIds.size > 0) {
      const { data: votersData } = await supabase.from('user_profiles').select('*').in('id', [...allUserIds]);
      if (votersData) {
        const map: Record<string, UserProfile> = {};
        votersData.forEach(v => map[v.id] = v);
        setVoters(map);
      }
    }

    setLoading(false);
  };

  const isExpired = poll ? new Date(poll.closes_at) < new Date() : false;
  const hasNotStarted = poll?.starts_at ? new Date(poll.starts_at) > new Date() : false;

  const hasVotedChoice = votes.some(v => v.user_id === user?.id);
  const hasRated = ratings.some(r => r.user_id === user?.id);
  const hasSubmittedText = textResponses.some(t => t.user_id === user?.id);
  const hasRanked = rankings.some(r => r.user_id === user?.id);

  const hasVoted = poll?.poll_type === 'rating'
    ? hasRated
    : poll?.poll_type === 'open_text'
    ? hasSubmittedText
    : poll?.poll_type === 'ranking'
    ? hasRanked
    : hasVotedChoice;

  const canVote = !isExpired && !hasNotStarted && user && (!hasVoted || poll?.allow_vote_change);
  const showResults = isExpired || hasVoted || poll?.show_results_before_close;

  const getVoteCount = (optionId: string) => votes.filter(v => v.option_id === optionId).length;
  const totalVotes = votes.length;
  const getPercentage = (optionId: string) => totalVotes > 0 ? (getVoteCount(optionId) / totalVotes) * 100 : 0;

  const averageRating = useMemo(() => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating_value, 0);
    return sum / ratings.length;
  }, [ratings]);

  const aggregatedRankings = useMemo(() => {
    if (rankings.length === 0 || options.length === 0) return [];

    const scores: Record<string, number> = {};
    options.forEach(o => scores[o.id] = 0);

    const uniqueUsers = [...new Set(rankings.map(r => r.user_id))];
    uniqueUsers.forEach(userId => {
      const userRankings = rankings.filter(r => r.user_id === userId);
      userRankings.forEach(r => {
        scores[r.option_id] += (options.length - r.rank_position + 1);
      });
    });

    return options
      .map(o => ({ option: o, score: scores[o.id] || 0 }))
      .sort((a, b) => b.score - a.score);
  }, [rankings, options]);

  const toggleOption = (optionId: string) => {
    if (!poll?.allow_multiple_choices) {
      setSelectedOptions([optionId]);
    } else {
      setSelectedOptions(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    }
  };

  const handleVote = async () => {
    if (!user || !poll) return;
    setVoting(true);

    if (poll.allow_vote_change && hasVoted) {
      await supabase.from('poll_votes').delete().eq('poll_id', id).eq('user_id', user.id);
      await supabase.from('poll_ratings').delete().eq('poll_id', id).eq('user_id', user.id);
      await supabase.from('poll_text_responses').delete().eq('poll_id', id).eq('user_id', user.id);
      await supabase.from('poll_rankings').delete().eq('poll_id', id).eq('user_id', user.id);
    }

    let error = null;

    if (poll.poll_type === 'rating') {
      if (selectedRating === 0) {
        showError('Please select a rating');
        setVoting(false);
        return;
      }
      const { error: e } = await supabase.from('poll_ratings').insert({
        poll_id: id,
        user_id: user.id,
        rating_value: selectedRating,
      });
      error = e;
    } else if (poll.poll_type === 'open_text') {
      if (!textResponse.trim()) {
        showError('Please enter a response');
        setVoting(false);
        return;
      }
      const { error: e } = await supabase.from('poll_text_responses').insert({
        poll_id: id,
        user_id: user.id,
        response_text: textResponse.trim(),
      });
      error = e;
    } else if (poll.poll_type === 'ranking') {
      const rankingsToInsert = rankingOrder.map((optionId, index) => ({
        poll_id: id,
        user_id: user.id,
        option_id: optionId,
        rank_position: index + 1,
      }));
      const { error: e } = await supabase.from('poll_rankings').insert(rankingsToInsert);
      error = e;
    } else {
      if (selectedOptions.length === 0) {
        showError('Please select an option');
        setVoting(false);
        return;
      }
      const votesToInsert = selectedOptions.map(optionId => ({
        poll_id: id,
        option_id: optionId,
        user_id: user.id,
      }));
      const { error: e } = await supabase.from('poll_votes').insert(votesToInsert);
      error = e;
    }

    if (error) {
      showError('Failed to submit vote');
    } else {
      success(hasVoted ? 'Vote updated' : 'Vote submitted');
      fetchPoll();
    }
    setVoting(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this poll and all votes?')) return;
    await Promise.all([
      supabase.from('poll_votes').delete().eq('poll_id', id),
      supabase.from('poll_ratings').delete().eq('poll_id', id),
      supabase.from('poll_text_responses').delete().eq('poll_id', id),
      supabase.from('poll_rankings').delete().eq('poll_id', id),
      supabase.from('poll_comments').delete().eq('poll_id', id),
      supabase.from('poll_options').delete().eq('poll_id', id),
    ]);
    const { error } = await supabase.from('polls').delete().eq('id', id);
    if (error) {
      showError('Failed to delete poll');
    } else {
      success('Poll deleted');
      navigate('/polls');
    }
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;
    setSubmittingComment(true);
    const { error } = await supabase.from('poll_comments').insert({
      poll_id: id,
      user_id: user.id,
      content: newComment.trim(),
    });
    if (error) {
      showError('Failed to add comment');
    } else {
      setNewComment('');
      fetchPoll();
    }
    setSubmittingComment(false);
  };

  const handleDragStart = (optionId: string) => {
    setDraggedItem(optionId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const newOrder = [...rankingOrder];
    const draggedIndex = newOrder.indexOf(draggedItem);
    const targetIndex = newOrder.indexOf(targetId);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);
    setRankingOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const exportResults = () => {
    if (!poll) return;

    let csvContent = `Poll: ${poll.title}\n`;
    csvContent += `Created: ${new Date(poll.created_at).toLocaleDateString()}\n`;
    csvContent += `Closes: ${new Date(poll.closes_at).toLocaleDateString()}\n\n`;

    if (poll.poll_type === 'rating') {
      csvContent += `Average Rating: ${averageRating.toFixed(2)}/${poll.rating_scale}\n`;
      csvContent += `Total Ratings: ${ratings.length}\n\n`;
      csvContent += `User,Rating\n`;
      ratings.forEach(r => {
        const voter = voters[r.user_id];
        csvContent += `${voter?.display_name || 'Anonymous'},${r.rating_value}\n`;
      });
    } else if (poll.poll_type === 'open_text') {
      csvContent += `Total Responses: ${textResponses.length}\n\n`;
      csvContent += `User,Response\n`;
      textResponses.forEach(t => {
        const voter = voters[t.user_id];
        csvContent += `"${voter?.display_name || 'Anonymous'}","${t.response_text.replace(/"/g, '""')}"\n`;
      });
    } else if (poll.poll_type === 'ranking') {
      csvContent += `Aggregated Rankings (Borda Count)\n`;
      csvContent += `Rank,Option,Score\n`;
      aggregatedRankings.forEach((item, index) => {
        csvContent += `${index + 1},"${item.option.option_text}",${item.score}\n`;
      });
    } else {
      csvContent += `Option,Votes,Percentage\n`;
      options.forEach(o => {
        const count = getVoteCount(o.id);
        const pct = getPercentage(o.id);
        csvContent += `"${o.option_text}",${count},${pct.toFixed(1)}%\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poll-${poll.title.toLowerCase().replace(/\s+/g, '-')}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getUniqueVoterCount = () => {
    const userIds = new Set<string>();
    votes.forEach(v => userIds.add(v.user_id));
    ratings.forEach(r => userIds.add(r.user_id));
    textResponses.forEach(t => userIds.add(t.user_id));
    const rankingUsers = [...new Set(rankings.map(r => r.user_id))];
    rankingUsers.forEach(u => userIds.add(u));
    return userIds.size;
  };

  const canDelete = poll?.created_by === user?.id || profile?.is_admin;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-6" />
        <Card>
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </Card>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <BarChart3 className="mx-auto mb-4 text-[var(--text-muted)]" size={48} />
        <p className="text-[var(--text-secondary)] mb-4">Poll not found</p>
        <Link to="/polls" className="text-[var(--accent-gold)] hover:underline">Back to polls</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {trainingMode && <SectionWelcome sectionId="poll-detail" />}

      <TrainingTooltip tipId="poll-back" content={TOOLTIPS['poll-back']?.content || ''} position="bottom">
        <button
          onClick={() => navigate('/polls')}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] mb-6"
        >
          <ArrowLeft size={20} /> Back to Polls
        </button>
      </TrainingTooltip>

      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {hasNotStarted && (
              <span className="px-3 py-1 text-sm bg-blue-500/10 text-blue-500 rounded-full flex items-center gap-1">
                <Clock size={12} /> Scheduled
              </span>
            )}
            {isExpired ? (
              <span className="px-3 py-1 text-sm bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded-full">Closed</span>
            ) : !hasNotStarted && (
              <span className="px-3 py-1 text-sm bg-[rgba(var(--accent-primary-rgb),0.20)] text-[var(--accent-gold)] rounded-full">Active</span>
            )}
            {poll.recurrence_pattern && (
              <span className="px-3 py-1 text-sm bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-full flex items-center gap-1">
                <RefreshCw size={12} /> {poll.recurrence_pattern}
              </span>
            )}
            {poll.allow_vote_change && (
              <span className="px-3 py-1 text-sm bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-full flex items-center gap-1">
                <Edit2 size={12} /> Can change vote
              </span>
            )}
          </div>
          <h1 className="font-serif text-3xl text-[var(--text-primary)] mb-2">{poll.title}</h1>
          {poll.description && (
            <p className="text-[var(--text-secondary)]">{poll.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {showResults && (
            <TrainingTooltip tipId="poll-export" content={TOOLTIPS['poll-export']?.content || ''} position="left">
              <Button variant="secondary" onClick={exportResults} title="Export results">
                <Download size={16} />
              </Button>
            </TrainingTooltip>
          )}
          {canDelete && (
            <Button variant="secondary" onClick={handleDelete}>
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6 text-sm text-[var(--text-muted)] flex-wrap">
        {creator && (
          <div className="flex items-center gap-2">
            {creator.avatar_url ? (
              <img src={creator.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[rgba(var(--accent-primary-rgb),0.20)] flex items-center justify-center">
                <span className="text-xs text-[var(--accent-gold)]">{getInitials(creator.display_name)}</span>
              </div>
            )}
            <span>{creator.display_name}</span>
          </div>
        )}
        <span className="flex items-center gap-1">
          <Clock size={14} />
          {hasNotStarted
            ? `Opens ${formatRelativeTime(poll.starts_at!)}`
            : isExpired
            ? `Closed ${formatRelativeTime(poll.closes_at)}`
            : `Closes ${formatRelativeTime(poll.closes_at)}`}
        </span>
        <span className="flex items-center gap-1">
          <Users size={14} /> {getUniqueVoterCount()} voters
        </span>
      </div>

      {hasNotStarted && (
        <Card className="mb-6 bg-blue-500/5 border-blue-500/20">
          <div className="flex items-center gap-3 text-blue-500">
            <AlertCircle size={20} />
            <p>This poll hasn't started yet. Voting opens {formatRelativeTime(poll.starts_at!)}.</p>
          </div>
        </Card>
      )}

      <Card className="mb-6">
        {poll.poll_type === 'rating' ? (
          <div>
            {canVote && !hasVoted ? (
              <div>
                <p className="text-[var(--text-secondary)] mb-4">Rate from 1 to {poll.rating_scale}</p>
                <div className="flex justify-center gap-1 mb-6">
                  {[...Array(poll.rating_scale)].map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedRating(i + 1)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        size={poll.rating_scale === 10 ? 28 : 36}
                        className={`transition-colors ${
                          i < selectedRating
                            ? 'text-[var(--accent-gold)] fill-[var(--accent-gold)]'
                            : 'text-[var(--border-default)]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <Button onClick={handleVote} loading={voting} disabled={selectedRating === 0} className="w-full">
                  Submit Rating
                </Button>
              </div>
            ) : (
              <div>
                <div className="text-center mb-4">
                  <div className="flex justify-center gap-1 mb-2">
                    {[...Array(poll.rating_scale)].map((_, i) => (
                      <Star
                        key={i}
                        size={poll.rating_scale === 10 ? 24 : 32}
                        className={`${
                          i < Math.round(averageRating)
                            ? 'text-[var(--accent-gold)] fill-[var(--accent-gold)]'
                            : 'text-[var(--border-default)]'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {averageRating.toFixed(1)} <span className="text-sm text-[var(--text-muted)]">/ {poll.rating_scale}</span>
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">{ratings.length} ratings</p>
                </div>
                {hasRated && (
                  <p className="text-sm text-[var(--accent-sage)] flex items-center justify-center gap-2">
                    <Check size={16} /> You rated {ratings.find(r => r.user_id === user?.id)?.rating_value}/{poll.rating_scale}
                  </p>
                )}
                {poll.allow_vote_change && hasRated && !isExpired && (
                  <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                    <p className="text-sm text-[var(--text-muted)] mb-3">Change your rating:</p>
                    <div className="flex justify-center gap-1 mb-4">
                      {[...Array(poll.rating_scale)].map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedRating(i + 1)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            size={poll.rating_scale === 10 ? 24 : 28}
                            className={`transition-colors ${
                              i < selectedRating
                                ? 'text-[var(--accent-gold)] fill-[var(--accent-gold)]'
                                : 'text-[var(--border-default)]'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <Button onClick={handleVote} loading={voting} disabled={selectedRating === 0} variant="secondary" className="w-full">
                      Update Rating
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : poll.poll_type === 'open_text' ? (
          <div>
            {canVote && !hasSubmittedText ? (
              <div>
                <p className="text-[var(--text-secondary)] mb-4">Share your thoughts</p>
                <textarea
                  value={textResponse}
                  onChange={(e) => setTextResponse(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50 mb-4"
                  rows={4}
                  placeholder="Enter your response..."
                />
                <Button onClick={handleVote} loading={voting} disabled={!textResponse.trim()} className="w-full">
                  Submit Response
                </Button>
              </div>
            ) : (
              <div>
                <h3 className="font-medium text-[var(--text-primary)] mb-4">
                  {textResponses.length} Response{textResponses.length !== 1 ? 's' : ''}
                </h3>
                {textResponses.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-center py-4">No responses yet</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {textResponses.map(response => {
                      const voter = voters[response.user_id];
                      const isOwn = response.user_id === user?.id;
                      return (
                        <div
                          key={response.id}
                          className={`p-3 rounded-lg ${isOwn ? 'bg-[rgba(var(--accent-primary-rgb),0.1)] border border-[var(--accent-gold)]/30' : 'bg-[var(--bg-secondary)]'}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {voter?.avatar_url ? (
                              <img src={voter.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-[rgba(var(--accent-primary-rgb),0.20)] flex items-center justify-center">
                                <span className="text-xs text-[var(--accent-gold)]">
                                  {getInitials(poll.is_anonymous && !isOwn ? '?' : voter?.display_name || '?')}
                                </span>
                              </div>
                            )}
                            <span className="text-sm text-[var(--text-secondary)]">
                              {poll.is_anonymous && !isOwn ? 'Anonymous' : voter?.display_name || 'Unknown'}
                              {isOwn && ' (you)'}
                            </span>
                          </div>
                          <p className="text-[var(--text-primary)]">{response.response_text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
                {poll.allow_vote_change && hasSubmittedText && !isExpired && (
                  <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                    <p className="text-sm text-[var(--text-muted)] mb-3">Update your response:</p>
                    <textarea
                      value={textResponse}
                      onChange={(e) => setTextResponse(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50 mb-4"
                      rows={3}
                      placeholder="Enter new response..."
                    />
                    <Button onClick={handleVote} loading={voting} disabled={!textResponse.trim()} variant="secondary" className="w-full">
                      Update Response
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : poll.poll_type === 'ranking' ? (
          <div>
            {canVote && !hasRanked ? (
              <div>
                <p className="text-[var(--text-secondary)] mb-4">Drag to rank by preference (top = most preferred)</p>
                <div className="space-y-2 mb-6">
                  {rankingOrder.map((optionId, index) => {
                    const option = options.find(o => o.id === optionId);
                    if (!option) return null;
                    return (
                      <div
                        key={optionId}
                        draggable
                        onDragStart={() => handleDragStart(optionId)}
                        onDragOver={(e) => handleDragOver(e, optionId)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-colors ${
                          draggedItem === optionId
                            ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-primary-rgb),0.1)]'
                            : 'border-[var(--border-default)] bg-[var(--bg-secondary)]'
                        }`}
                      >
                        <GripVertical size={18} className="text-[var(--text-muted)]" />
                        <span className="w-6 h-6 rounded-full bg-[var(--accent-gold)] text-[#0f0f0f] flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        {option.image_url && (
                          <img src={option.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                        )}
                        <span className="text-[var(--text-primary)]">{option.option_text}</span>
                      </div>
                    );
                  })}
                </div>
                <Button onClick={handleVote} loading={voting} className="w-full">
                  Submit Ranking
                </Button>
              </div>
            ) : (
              <div>
                <h3 className="font-medium text-[var(--text-primary)] mb-4">Aggregated Results</h3>
                <div className="space-y-2">
                  {aggregatedRankings.map((item, index) => (
                    <div key={item.option.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)]">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                        index === 0 ? 'bg-[var(--accent-gold)] text-[#0f0f0f]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                      }`}>
                        {index + 1}
                      </span>
                      {item.option.image_url && (
                        <img src={item.option.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                      )}
                      <span className="flex-1 text-[var(--text-primary)]">{item.option.option_text}</span>
                      <span className="text-sm text-[var(--text-muted)]">{item.score} pts</span>
                    </div>
                  ))}
                </div>
                {hasRanked && (
                  <p className="mt-4 text-sm text-[var(--accent-sage)] flex items-center gap-2">
                    <Check size={16} /> You've submitted your ranking
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {options.map(option => {
              const voteCount = getVoteCount(option.id);
              const percentage = getPercentage(option.id);
              const isSelected = selectedOptions.includes(option.id);
              const userVotedThis = votes.some(v => v.option_id === option.id && v.user_id === user?.id);
              const isImagePoll = poll.poll_type === 'image_choice';

              return (
                <div key={option.id}>
                  {canVote && !hasVotedChoice ? (
                    <button
                      type="button"
                      onClick={() => toggleOption(option.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-primary-rgb),0.10)]'
                          : 'border-[var(--border-default)] hover:border-[var(--accent-gold)]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]' : 'border-[var(--border-default)]'
                        }`}>
                          {isSelected && <Check size={12} className="text-[#0f0f0f]" />}
                        </div>
                        {option.image_url && (
                          <img src={option.image_url} alt="" className={`rounded object-cover ${isImagePoll ? 'w-20 h-20' : 'w-10 h-10'}`} />
                        )}
                        <span className="text-[var(--text-primary)]">{option.option_text}</span>
                      </div>
                    </button>
                  ) : (
                    <div className="relative p-4 rounded-lg bg-[var(--bg-tertiary)] overflow-hidden">
                      {showResults && (
                        <div
                          className="absolute inset-y-0 left-0 bg-[rgba(var(--accent-primary-rgb),0.20)] transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      )}
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {userVotedThis && (
                            <Check size={16} className="text-[var(--accent-gold)]" />
                          )}
                          {option.image_url && (
                            <img src={option.image_url} alt="" className={`rounded object-cover ${isImagePoll ? 'w-16 h-16' : 'w-10 h-10'}`} />
                          )}
                          <span className="text-[var(--text-primary)]">{option.option_text}</span>
                        </div>
                        {showResults && (
                          <span className="text-[var(--text-secondary)]">
                            {voteCount} ({percentage.toFixed(0)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {canVote && !hasVotedChoice && (
              <div className="mt-6 pt-4 border-t border-[var(--border-default)]">
                <Button onClick={handleVote} loading={voting} disabled={selectedOptions.length === 0}>
                  Submit Vote
                </Button>
                {poll.allow_multiple_choices && (
                  <p className="text-sm text-[var(--text-muted)] mt-2">You can select multiple options</p>
                )}
              </div>
            )}

            {poll.allow_vote_change && hasVotedChoice && !isExpired && (
              <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                <Button onClick={() => {
                  const userVotes = votes.filter(v => v.user_id === user?.id);
                  setSelectedOptions(userVotes.map(v => v.option_id));
                }} variant="secondary">
                  <Edit2 size={16} className="mr-2" /> Change Vote
                </Button>
              </div>
            )}

            {hasVotedChoice && !poll.allow_vote_change && !isExpired && (
              <p className="mt-4 text-sm text-[var(--accent-sage)] flex items-center gap-2">
                <Check size={16} /> You've already voted
              </p>
            )}
          </div>
        )}
      </Card>

      {showResults && !poll.is_anonymous && getUniqueVoterCount() > 0 && poll.poll_type !== 'open_text' && (
        <Card className="mb-6">
          <h3 className="font-medium text-[var(--text-primary)] mb-4">Voters</h3>
          <div className="flex flex-wrap gap-2">
            {[...new Set([
              ...votes.map(v => v.user_id),
              ...ratings.map(r => r.user_id),
              ...new Set(rankings.map(r => r.user_id)),
            ])].map(userId => {
              const voter = voters[userId];
              if (!voter) return null;
              return (
                <div key={userId} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-full">
                  {voter.avatar_url ? (
                    <img src={voter.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[rgba(var(--accent-primary-rgb),0.20)] flex items-center justify-center">
                      <span className="text-xs text-[var(--accent-gold)]">{getInitials(voter.display_name)}</span>
                    </div>
                  )}
                  <span className="text-sm text-[var(--text-secondary)]">{voter.display_name}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <TrainingTooltip tipId="poll-comments" content={TOOLTIPS['poll-comments']?.content || ''} position="top">
        <Card>
          <button
            onClick={() => setShowComments(!showComments)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="font-medium text-[var(--text-primary)] flex items-center gap-2">
              <MessageCircle size={18} />
              Discussion ({comments.length})
            </h3>
            <span className="text-[var(--text-muted)]">{showComments ? '−' : '+'}</span>
          </button>

        {showComments && (
          <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
            {user && (
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                />
                <Button onClick={handleAddComment} loading={submittingComment} disabled={!newComment.trim()}>
                  <Send size={16} />
                </Button>
              </div>
            )}

            {comments.length === 0 ? (
              <p className="text-[var(--text-muted)] text-center py-4">No comments yet. Start the conversation!</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {comments.map(comment => {
                  const commenter = voters[comment.user_id];
                  return (
                    <div key={comment.id} className="flex gap-3">
                      {commenter?.avatar_url ? (
                        <img src={commenter.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[rgba(var(--accent-primary-rgb),0.20)] flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-[var(--accent-gold)]">{getInitials(commenter?.display_name || '?')}</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {commenter?.display_name || 'Unknown'}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {formatRelativeTime(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-[var(--text-secondary)]">{comment.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        </Card>
      </TrainingTooltip>
    </div>
  );
}
