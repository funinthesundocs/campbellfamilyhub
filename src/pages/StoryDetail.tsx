import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ArrowLeft, Calendar, Clock, Edit, Trash2, BookOpen } from 'lucide-react';
import { formatDate, getInitials } from '../lib/utils';
import type { UserProfile } from '../types';

interface Story {
  id: string;
  title: string;
  content: string;
  story_date: string | null;
  decade: string | null;
  cover_image_url: string | null;
  is_featured: boolean;
  submitted_by: string;
  created_at: string;
}

export default function StoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { success, error: showError } = useToast();
  const [story, setStory] = useState<Story | null>(null);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchStory();
  }, [id]);

  const fetchStory = async () => {
    const { data } = await supabase.from('stories').select('*').eq('id', id).maybeSingle();
    if (data) {
      setStory(data);
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.submitted_by)
        .maybeSingle();
      setAuthor(userData);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this story?')) return;
    const { error } = await supabase.from('stories').delete().eq('id', id);
    if (error) {
      showError('Failed to delete story');
    } else {
      success('Story deleted');
      navigate('/stories');
    }
  };

  const isOwner = story?.submitted_by === user?.id;
  const canEdit = isOwner || profile?.is_admin;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Skeleton className="h-64 mb-6 rounded-lg" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <BookOpen className="mx-auto mb-4 text-[var(--text-muted)]" size={48} />
        <p className="text-[var(--text-secondary)] mb-4">Story not found</p>
        <Link to="/stories" className="text-[var(--accent-gold)] hover:underline">Back to stories</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/stories')}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] mb-6"
      >
        <ArrowLeft size={20} /> Back to Stories
      </button>

      {story.cover_image_url && (
        <img
          src={story.cover_image_url}
          alt={story.title}
          className="w-full h-64 object-cover rounded-lg mb-6"
        />
      )}

      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {story.is_featured && (
              <span className="px-3 py-1 text-sm bg-[rgba(var(--accent-primary-rgb),0.20)] text-[var(--accent-gold)] rounded-full">Featured</span>
            )}
            {story.decade && (
              <span className="px-3 py-1 text-sm bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-full">
                {story.decade}
              </span>
            )}
          </div>
          <h1 className="font-serif text-3xl text-[var(--text-primary)]">{story.title}</h1>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Link to={`/stories/${id}/edit`}>
              <Button variant="secondary">
                <Edit size={16} className="mr-2" /> Edit
              </Button>
            </Link>
            <Button variant="secondary" onClick={handleDelete}>
              <Trash2 size={16} />
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mb-8 text-sm text-[var(--text-muted)]">
        {author && (
          <div className="flex items-center gap-2">
            {author.avatar_url ? (
              <img src={author.avatar_url} alt={author.display_name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[rgba(var(--accent-primary-rgb),0.20)] flex items-center justify-center">
                <span className="text-xs text-[var(--accent-gold)]">{getInitials(author.display_name)}</span>
              </div>
            )}
            <span>{author.display_name}</span>
          </div>
        )}
        {story.story_date && (
          <span className="flex items-center gap-1">
            <Calendar size={14} /> {formatDate(story.story_date)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock size={14} /> {formatDate(story.created_at)}
        </span>
      </div>

      <Card>
        <div className="prose prose-invert max-w-none">
          {story.content.split('\n').map((paragraph, i) => (
            paragraph.trim() && <p key={i} className="text-[var(--text-secondary)] mb-4 last:mb-0">{paragraph}</p>
          ))}
        </div>
      </Card>
    </div>
  );
}
