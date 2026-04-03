import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { JokeCollectionManager } from '../components/jokes/JokeCollectionManager';
import { StoryCollectionManager } from '../components/jokes/StoryCollectionManager';
import { VoiceTextArea } from '../components/shared/VoiceTextArea';
import { ContentUpload } from '../components/shared/ContentUpload';
import { formatDate } from '../lib/utils';
import {
  Smile,
  BookOpen,
  Plus,
  ThumbsUp,
  X,
  Calendar,
  Search,
  ArrowLeft,
  CheckSquare,
  Square,
  Trash2,
  Grid3X3,
  List,
  FileText,
  Upload,
  Star,
} from 'lucide-react';
import type { JokeCollection, StoryCollection } from '../types';

type TabType = 'jokes' | 'stories';
type InputMode = 'text' | 'file';
type ViewMode = 'grid' | 'list';

const decades = ['1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];

interface JokeItem {
  id: string;
  content: string;
  category: string;
  submitted_by: string;
  upvote_count: number;
  joke_date: string | null;
  decade: string | null;
  cover_image_url: string | null;
  created_at: string;
  collectionNames?: string[];
}

interface StoryItem {
  id: string;
  title: string;
  content: string;
  story_date: string | null;
  decade: string | null;
  cover_image_url: string | null;
  is_featured: boolean;
  submitted_by: string;
  created_at: string;
  collectionNames?: string[];
  user_profiles?: {
    display_name: string;
  };
}

export default function JokesAndStories() {
  const { user, profile } = useAuth();
  const { success, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('jokes');
  const [jokes, setJokes] = useState<JokeItem[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [jokeCollections, setJokeCollections] = useState<JokeCollection[]>([]);
  const [storyCollections, setStoryCollections] = useState<StoryCollection[]>([]);
  const [jokeCollectionItems, setJokeCollectionItems] = useState<Record<string, string[]>>({});
  const [storyCollectionItems, setStoryCollectionItems] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [showStoryForm, setShowStoryForm] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newJoke, setNewJoke] = useState({ content: '', joke_date: '', decade: '', cover_image_url: '' });
  const [newStory, setNewStory] = useState({ title: '', content: '', story_date: '', decade: '', cover_image_url: '' });

  const [selectedJokeCollection, setSelectedJokeCollection] = useState<JokeCollection | null>(null);
  const [selectedStoryCollection, setSelectedStoryCollection] = useState<StoryCollection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [draggingIds, setDraggingIds] = useState<string[] | null>(null);

  const [votedJokes, setVotedJokes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (user) {
      fetchVotedJokes();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'jokes') {
      await Promise.all([fetchJokes(), fetchJokeCollections()]);
    } else {
      await Promise.all([fetchStories(), fetchStoryCollections()]);
    }
    setLoading(false);
  };

  const fetchJokes = async () => {
    const { data } = await supabase
      .from('jokes')
      .select('*')
      .order('upvote_count', { ascending: false });

    if (data) {
      const { data: collectionItems } = await supabase
        .from('joke_collection_items')
        .select('joke_id, collection_id, joke_collections(name)');

      const jokeCollectionMap: Record<string, string[]> = {};
      collectionItems?.forEach((item) => {
        if (!jokeCollectionMap[item.joke_id]) {
          jokeCollectionMap[item.joke_id] = [];
        }
        const collections = item.joke_collections as unknown as { name: string } | null;
        if (collections?.name) {
          jokeCollectionMap[item.joke_id].push(collections.name);
        }
      });

      const enrichedJokes = data.map((j) => ({
        ...j,
        collectionNames: jokeCollectionMap[j.id] || [],
      }));

      setJokes(enrichedJokes);
    }
  };

  const fetchStories = async () => {
    const { data } = await supabase
      .from('stories')
      .select('*, user_profiles(display_name)')
      .order('created_at', { ascending: false });

    if (data) {
      const { data: collectionItems } = await supabase
        .from('story_collection_items')
        .select('story_id, collection_id, story_collections(name)');

      const storyCollectionMap: Record<string, string[]> = {};
      collectionItems?.forEach((item) => {
        if (!storyCollectionMap[item.story_id]) {
          storyCollectionMap[item.story_id] = [];
        }
        const collections = item.story_collections as unknown as { name: string } | null;
        if (collections?.name) {
          storyCollectionMap[item.story_id].push(collections.name);
        }
      });

      const enrichedStories = data.map((s) => ({
        ...s,
        collectionNames: storyCollectionMap[s.id] || [],
      }));

      setStories(enrichedStories);
    }
  };

  const fetchJokeCollections = async () => {
    const { data: collectionsData } = await supabase
      .from('joke_collections')
      .select('*')
      .order('created_at', { ascending: false });

    setJokeCollections(collectionsData || []);

    const { data: items } = await supabase
      .from('joke_collection_items')
      .select('collection_id, joke_id');

    const itemsMap: Record<string, string[]> = {};
    items?.forEach((item) => {
      if (!itemsMap[item.collection_id]) {
        itemsMap[item.collection_id] = [];
      }
      itemsMap[item.collection_id].push(item.joke_id);
    });
    setJokeCollectionItems(itemsMap);
  };

  const fetchStoryCollections = async () => {
    const { data: collectionsData } = await supabase
      .from('story_collections')
      .select('*')
      .order('created_at', { ascending: false });

    setStoryCollections(collectionsData || []);

    const { data: items } = await supabase
      .from('story_collection_items')
      .select('collection_id, story_id');

    const itemsMap: Record<string, string[]> = {};
    items?.forEach((item) => {
      if (!itemsMap[item.collection_id]) {
        itemsMap[item.collection_id] = [];
      }
      itemsMap[item.collection_id].push(item.story_id);
    });
    setStoryCollectionItems(itemsMap);
  };

  const fetchVotedJokes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('joke_votes')
      .select('joke_id')
      .eq('user_id', user.id);

    if (data) {
      setVotedJokes(new Set(data.map((v) => v.joke_id)));
    }
  };

  const jokeCollectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(jokeCollectionItems).forEach(([collectionId, jokeIds]) => {
      counts[collectionId] = jokeIds.length;
    });
    return counts;
  }, [jokeCollectionItems]);

  const storyCollectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(storyCollectionItems).forEach(([collectionId, storyIds]) => {
      counts[collectionId] = storyIds.length;
    });
    return counts;
  }, [storyCollectionItems]);

  const storyCollectionCoverImages = useMemo(() => {
    const covers: Record<string, string> = {};
    storyCollections.forEach((collection) => {
      const storyIds = storyCollectionItems[collection.id] || [];
      const firstStory = stories.find((s) => storyIds.includes(s.id) && s.cover_image_url);
      if (firstStory?.cover_image_url) {
        covers[collection.id] = firstStory.cover_image_url;
      }
    });
    return covers;
  }, [storyCollections, storyCollectionItems, stories]);

  const unclassifiedJokes = useMemo(() => {
    const jokesInCollections = new Set(Object.values(jokeCollectionItems).flat());
    return jokes.filter((j) => !jokesInCollections.has(j.id));
  }, [jokes, jokeCollectionItems]);

  const classifiedJokes = useMemo(() => {
    if (selectedJokeCollection) {
      const collectionJokeIds = jokeCollectionItems[selectedJokeCollection.id] || [];
      return jokes.filter((j) => collectionJokeIds.includes(j.id));
    }
    const jokesInCollections = new Set(Object.values(jokeCollectionItems).flat());
    return jokes.filter((j) => jokesInCollections.has(j.id));
  }, [jokes, jokeCollectionItems, selectedJokeCollection]);

  const unclassifiedStories = useMemo(() => {
    const storiesInCollections = new Set(Object.values(storyCollectionItems).flat());
    return stories.filter((s) => !storiesInCollections.has(s.id));
  }, [stories, storyCollectionItems]);

  const classifiedStories = useMemo(() => {
    if (selectedStoryCollection) {
      const collectionStoryIds = storyCollectionItems[selectedStoryCollection.id] || [];
      return stories.filter((s) => collectionStoryIds.includes(s.id));
    }
    const storiesInCollections = new Set(Object.values(storyCollectionItems).flat());
    return stories.filter((s) => storiesInCollections.has(s.id));
  }, [stories, storyCollectionItems, selectedStoryCollection]);

  const filteredJokes = useMemo(() => {
    let filtered = classifiedJokes;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (j) => j.content.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [classifiedJokes, searchQuery]);

  const filteredStories = useMemo(() => {
    let filtered = classifiedStories;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.content.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [classifiedStories, searchQuery]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/jokes/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file);
    if (error) {
      showError('Failed to upload image');
    } else {
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
      setNewJoke({ ...newJoke, cover_image_url: publicUrl });
    }
    setUploading(false);
  };

  const handleSubmitJoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const { error } = await supabase.from('jokes').insert({
      content: newJoke.content,
      joke_date: newJoke.joke_date || null,
      decade: newJoke.decade || null,
      cover_image_url: newJoke.cover_image_url || null,
      submitted_by: user.id,
      source_type: 'text',
    });

    if (error) {
      showError('Failed to add joke');
    } else {
      success('Joke added!');
      setNewJoke({ content: '', joke_date: '', decade: '', cover_image_url: '' });
      setShowForm(false);
      fetchData();
    }
    setSubmitting(false);
  };

  const handleStoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setNewStory({ ...newStory, cover_image_url: publicUrl });
    }
    setUploading(false);
  };

  const handleSubmitStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const { error } = await supabase.from('stories').insert({
      title: newStory.title,
      content: newStory.content,
      story_date: newStory.story_date || null,
      decade: newStory.decade || null,
      cover_image_url: newStory.cover_image_url || null,
      submitted_by: user.id,
    });

    if (error) {
      showError('Failed to share story');
    } else {
      success('Story shared!');
      setNewStory({ title: '', content: '', story_date: '', decade: '', cover_image_url: '' });
      setShowStoryForm(false);
      fetchData();
    }
    setSubmitting(false);
  };

  const handleVote = async (jokeId: string) => {
    if (!user) return;

    if (votedJokes.has(jokeId)) {
      await supabase.from('joke_votes').delete().eq('joke_id', jokeId).eq('user_id', user.id);

      const joke = jokes.find((j) => j.id === jokeId);
      if (joke) {
        await supabase
          .from('jokes')
          .update({ upvote_count: Math.max(0, joke.upvote_count - 1) })
          .eq('id', jokeId);
      }

      setVotedJokes((prev) => {
        const next = new Set(prev);
        next.delete(jokeId);
        return next;
      });
    } else {
      await supabase.from('joke_votes').insert({ joke_id: jokeId, user_id: user.id, vote_type: 'up' });

      const joke = jokes.find((j) => j.id === jokeId);
      if (joke) {
        await supabase
          .from('jokes')
          .update({ upvote_count: joke.upvote_count + 1 })
          .eq('id', jokeId);
      }

      setVotedJokes((prev) => new Set([...prev, jokeId]));
    }

    fetchData();
  };

  const handleDeleteJoke = async (jokeId: string) => {
    if (!confirm('Delete this joke?')) return;

    const { error } = await supabase.from('jokes').delete().eq('id', jokeId);
    if (error) {
      showError('Failed to delete');
    } else {
      success('Deleted');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(jokeId);
        return next;
      });
      fetchData();
    }
  };

  const handleDropJoke = async (collectionId: string, jokeIds: string[]) => {
    const existingJokeIds = jokeCollectionItems[collectionId] || [];
    const newJokeIds = jokeIds.filter((id) => !existingJokeIds.includes(id));

    if (newJokeIds.length === 0) {
      showError('Jokes already in collection');
      return;
    }

    const items = newJokeIds.map((jokeId, index) => ({
      collection_id: collectionId,
      joke_id: jokeId,
      position: existingJokeIds.length + index,
      added_by: user!.id,
    }));

    const { error } = await supabase.from('joke_collection_items').insert(items);

    if (error) {
      showError('Failed to add to collection');
    } else {
      success(`Added ${newJokeIds.length} joke${newJokeIds.length > 1 ? 's' : ''} to collection`);
      setSelectedIds(new Set());
      setSelectMode(false);
      fetchData();
    }
  };

  const handleDropStory = async (collectionId: string, storyIds: string[]) => {
    const existingStoryIds = storyCollectionItems[collectionId] || [];
    const newStoryIds = storyIds.filter((id) => !existingStoryIds.includes(id));

    if (newStoryIds.length === 0) {
      showError('Stories already in collection');
      return;
    }

    const items = newStoryIds.map((storyId, index) => ({
      collection_id: collectionId,
      story_id: storyId,
      position: existingStoryIds.length + index,
      added_by: user!.id,
    }));

    const { error } = await supabase.from('story_collection_items').insert(items);

    if (error) {
      showError('Failed to add to collection');
    } else {
      success(`Added ${newStoryIds.length} ${newStoryIds.length > 1 ? 'stories' : 'story'} to collection`);
      setSelectedIds(new Set());
      setSelectMode(false);
      fetchData();
    }
  };

  const handleRemoveFromJokeCollection = async (jokeId: string) => {
    if (!selectedJokeCollection) return;

    const { error } = await supabase
      .from('joke_collection_items')
      .delete()
      .eq('collection_id', selectedJokeCollection.id)
      .eq('joke_id', jokeId);

    if (error) {
      showError('Failed to remove from collection');
    } else {
      success('Removed from collection');
      fetchData();
    }
  };

  const handleRemoveFromStoryCollection = async (storyId: string) => {
    if (!selectedStoryCollection) return;

    const { error } = await supabase
      .from('story_collection_items')
      .delete()
      .eq('collection_id', selectedStoryCollection.id)
      .eq('story_id', storyId);

    if (error) {
      showError('Failed to remove from collection');
    } else {
      success('Removed from collection');
      fetchData();
    }
  };

  const toggleSelectMode = useCallback(() => {
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
  }, []);

  const handleSelect = useCallback(
    (id: string, index: number, shiftKey: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        const itemList = activeTab === 'jokes'
          ? (selectedJokeCollection ? filteredJokes : unclassifiedJokes)
          : (selectedStoryCollection ? filteredStories : unclassifiedStories);

        if (shiftKey && lastSelectedIndex !== null) {
          const start = Math.min(lastSelectedIndex, index);
          const end = Math.max(lastSelectedIndex, index);
          const wasSelected = prev.has(id);

          for (let i = start; i <= end; i++) {
            const item = itemList[i];
            if (item) {
              if (wasSelected) {
                next.delete(item.id);
              } else {
                next.add(item.id);
              }
            }
          }
        } else {
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
        }

        return next;
      });
      setLastSelectedIndex(index);
    },
    [lastSelectedIndex, activeTab, selectedJokeCollection, selectedStoryCollection, filteredJokes, filteredStories, unclassifiedJokes, unclassifiedStories]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, itemId: string) => {
      const idsToMove = selectedIds.has(itemId)
        ? Array.from(selectedIds)
        : [itemId];

      setDraggingIds(idsToMove);
      const dataType = activeTab === 'jokes' ? 'application/x-joke-ids' : 'application/x-story-ids';
      e.dataTransfer.setData(dataType, JSON.stringify(idsToMove));
      e.dataTransfer.effectAllowed = 'copy';
    },
    [selectedIds, activeTab]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingIds(null);
  }, []);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} items?`)) return;

    const table = activeTab === 'jokes' ? 'jokes' : 'stories';
    const { error } = await supabase.from(table).delete().in('id', Array.from(selectedIds));

    if (error) {
      showError('Failed to delete');
    } else {
      success(`Deleted ${selectedIds.size} items`);
      setSelectedIds(new Set());
      setSelectMode(false);
      fetchData();
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedIds(new Set());
    setSelectMode(false);
    setShowForm(false);
    setShowStoryForm(false);
    setSearchQuery('');
    if (tab === 'jokes') {
      setSelectedStoryCollection(null);
    } else {
      setSelectedJokeCollection(null);
    }
  };

  const renderJokeCard = (joke: JokeItem, index: number, isUnclassified: boolean = false) => {
    const isSelected = selectedIds.has(joke.id);
    const isDragging = draggingIds?.includes(joke.id);
    const hasVoted = votedJokes.has(joke.id);

    return (
      <div
        key={joke.id}
        draggable={!selectMode}
        onDragStart={(e) => handleDragStart(e, joke.id)}
        onDragEnd={handleDragEnd}
        className={`relative transition-all ${
          isDragging ? 'opacity-50 scale-95' : ''
        } ${isSelected ? 'ring-2 ring-[var(--accent-gold)]' : ''}`}
      >
        <Card>
          <div className="flex items-start gap-3">
            {selectMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(joke.id, index, e.shiftKey);
                }}
                className="mt-1"
              >
                {isSelected ? (
                  <CheckSquare size={20} className="text-[var(--accent-gold)]" />
                ) : (
                  <Square size={20} className="text-[var(--text-muted)]" />
                )}
              </button>
            )}

            {joke.cover_image_url && (
              <img
                src={joke.cover_image_url}
                alt=""
                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
              />
            )}

            <div className="flex-1">
              {joke.decade && (
                <span className="inline-block text-xs text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded mb-2">
                  {joke.decade}
                </span>
              )}
              <p className="text-lg text-[var(--text-primary)]">{joke.content}</p>
              {joke.joke_date && (
                <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                  <Calendar size={12} /> {formatDate(joke.joke_date)}
                </p>
              )}
              {!isUnclassified && joke.collectionNames && joke.collectionNames.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {joke.collectionNames.slice(0, 2).map((name) => (
                    <span
                      key={name}
                      className="px-1.5 py-0.5 text-xs bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded"
                    >
                      {name}
                    </span>
                  ))}
                  {joke.collectionNames.length > 2 && (
                    <span className="px-1.5 py-0.5 text-xs bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded">
                      +{joke.collectionNames.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleVote(joke.id)}
                className={`flex items-center gap-2 transition-colors ${
                  hasVoted
                    ? 'text-[var(--accent-gold)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--accent-gold)]'
                }`}
              >
                <ThumbsUp size={18} className={hasVoted ? 'fill-current' : ''} /> {joke.upvote_count}
              </button>
              {selectedJokeCollection && (
                <button
                  onClick={() => handleRemoveFromJokeCollection(joke.id)}
                  className="text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors"
                >
                  Remove
                </button>
              )}
              {(joke.submitted_by === user?.id || profile?.is_admin) && (
                <button
                  onClick={() => handleDeleteJoke(joke.id)}
                  className="text-[var(--text-muted)] hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderStoryCard = (story: StoryItem, index: number, isUnclassified: boolean = false) => {
    const isSelected = selectedIds.has(story.id);
    const isDragging = draggingIds?.includes(story.id);

    return (
      <div
        key={story.id}
        draggable={!selectMode}
        onDragStart={(e) => handleDragStart(e, story.id)}
        onDragEnd={handleDragEnd}
        className={`relative transition-all ${
          isDragging ? 'opacity-50 scale-95' : ''
        } ${isSelected ? 'ring-2 ring-[var(--accent-gold)]' : ''}`}
      >
        <Link to={`/stories/${story.id}`}>
          <Card className="hover:border-[var(--accent-gold)] transition-colors">
            <div className="flex gap-4">
              {selectMode && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(story.id, index, e.shiftKey);
                  }}
                  className="mt-1"
                >
                  {isSelected ? (
                    <CheckSquare size={20} className="text-[var(--accent-gold)]" />
                  ) : (
                    <Square size={20} className="text-[var(--text-muted)]" />
                  )}
                </button>
              )}

              {story.cover_image_url ? (
                <img
                  src={story.cover_image_url}
                  alt={story.title}
                  className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-24 h-24 bg-[var(--bg-tertiary)] rounded-lg flex-shrink-0 flex items-center justify-center">
                  <BookOpen size={28} className="text-[var(--text-muted)]" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {story.is_featured && (
                    <Star size={14} className="text-[var(--accent-gold)] fill-current" />
                  )}
                  {story.decade && (
                    <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">
                      {story.decade}
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-lg text-[var(--text-primary)] mb-1 truncate">
                  {story.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-2">
                  {story.content}
                </p>
                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  {story.story_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {formatDate(story.story_date)}
                    </span>
                  )}
                  {story.user_profiles?.display_name && (
                    <span>by {story.user_profiles.display_name}</span>
                  )}
                </div>
                {!isUnclassified && story.collectionNames && story.collectionNames.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {story.collectionNames.slice(0, 2).map((name) => (
                      <span
                        key={name}
                        className="px-1.5 py-0.5 text-xs bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {selectedStoryCollection && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemoveFromStoryCollection(story.id);
                  }}
                  className="text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors self-start"
                >
                  Remove
                </button>
              )}
            </div>
          </Card>
        </Link>
      </div>
    );
  };

  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <div className="flex gap-4">
            <Skeleton className="w-24 h-24 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const currentCollection = activeTab === 'jokes' ? selectedJokeCollection : selectedStoryCollection;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {currentCollection && (
            <button
              onClick={() => {
                if (activeTab === 'jokes') {
                  setSelectedJokeCollection(null);
                } else {
                  setSelectedStoryCollection(null);
                }
              }}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="font-serif text-3xl text-[var(--text-primary)]">
            {currentCollection ? currentCollection.name : 'Jokes & Stories'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={selectMode ? 'secondary' : 'ghost'}
            onClick={toggleSelectMode}
          >
            <CheckSquare size={18} className="mr-2" />
            {selectMode ? 'Cancel' : 'Select'}
          </Button>
          {activeTab === 'jokes' ? (
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? <X size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
              {showForm ? 'Cancel' : 'Add Joke'}
            </Button>
          ) : (
            <Button onClick={() => setShowStoryForm(!showStoryForm)}>
              {showStoryForm ? <X size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
              {showStoryForm ? 'Cancel' : 'Share Story'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => handleTabChange('jokes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'jokes'
              ? 'bg-[var(--accent-gold)] text-black'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <Smile size={18} /> Jokes
        </button>
        <button
          onClick={() => handleTabChange('stories')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'stories'
              ? 'bg-[var(--accent-gold)] text-black'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <BookOpen size={18} /> Family Stories
        </button>
      </div>

      {activeTab === 'jokes' && showForm && (
        <Card className="mb-6">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                inputMode === 'text'
                  ? 'bg-[var(--accent-gold)] text-black'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <FileText size={16} /> Type
            </button>
            <button
              type="button"
              onClick={() => setInputMode('file')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                inputMode === 'file'
                  ? 'bg-[var(--accent-gold)] text-black'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <Upload size={16} /> Upload
            </button>
          </div>

          {inputMode === 'text' && (
            <form onSubmit={handleSubmitJoke} className="space-y-4">
              <VoiceTextArea
                label="Your Joke"
                value={newJoke.content}
                onChange={(value) => setNewJoke({ ...newJoke, content: value })}
                placeholder="Type or dictate your joke here... Say 'period', 'comma', 'question mark', 'new paragraph' for formatting."
                rows={6}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date (if known)"
                  type="date"
                  value={newJoke.joke_date}
                  onChange={(e) => setNewJoke({ ...newJoke, joke_date: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Decade</label>
                  <select
                    value={newJoke.decade}
                    onChange={(e) => setNewJoke({ ...newJoke, decade: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                  >
                    <option value="">Select decade</option>
                    {decades.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Cover Image (optional)</label>
                {newJoke.cover_image_url ? (
                  <div className="relative">
                    <img src={newJoke.cover_image_url} alt="Cover" className="w-full h-48 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => setNewJoke({ ...newJoke, cover_image_url: '' })}
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

              <Button type="submit" loading={submitting}>
                Submit Joke
              </Button>
            </form>
          )}

          {inputMode === 'file' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Upload a text file or document containing jokes
              </p>
              <ContentUpload
                contentType="joke"
                allowedTypes={['text', 'pdf', 'audio', 'video']}
                onUploadComplete={(_url, _type, name) => {
                  success(`File "${name}" uploaded`);
                }}
                onTextExtracted={(text) => {
                  setNewJoke({ ...newJoke, content: text });
                  setInputMode('text');
                }}
              />
            </div>
          )}
        </Card>
      )}

      {loading ? (
        renderLoadingSkeleton()
      ) : activeTab === 'jokes' ? (
        <>
          {unclassifiedJokes.length > 0 && !selectedJokeCollection && (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
                Unclassified ({unclassifiedJokes.length})
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                Drag jokes to a collection below to organize them
              </p>
              <div className="space-y-3">
                {unclassifiedJokes.map((joke, index) => renderJokeCard(joke, index, true))}
              </div>
            </div>
          )}

          <JokeCollectionManager
            collections={jokeCollections}
            collectionJokeCounts={jokeCollectionCounts}
            selectedCollection={selectedJokeCollection}
            onSelectCollection={setSelectedJokeCollection}
            onUpdate={fetchData}
            isDraggingJoke={draggingIds !== null}
            onDropJoke={handleDropJoke}
          />

          <div className="mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h2 className="text-lg font-medium text-[var(--text-primary)]">
                {selectedJokeCollection ? selectedJokeCollection.name : 'All Jokes'} ({filteredJokes.length})
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="text"
                    placeholder="Search jokes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] w-48"
                  />
                </div>

                <div className="flex rounded-lg overflow-hidden border border-[var(--border-default)]">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${
                      viewMode === 'list'
                        ? 'bg-[var(--accent-gold)] text-black'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                    }`}
                  >
                    <List size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${
                      viewMode === 'grid'
                        ? 'bg-[var(--accent-gold)] text-black'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                    }`}
                  >
                    <Grid3X3 size={16} />
                  </button>
                </div>
              </div>
            </div>

            {filteredJokes.length === 0 ? (
              <Card className="text-center py-12">
                <Smile className="mx-auto mb-4 text-[var(--text-muted)]" size={48} />
                <p className="text-[var(--text-secondary)]">
                  {selectedJokeCollection ? 'No jokes in this collection' : 'No jokes yet'}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {selectedJokeCollection ? 'Drag jokes here to add them' : 'Be the first to share a laugh!'}
                </p>
              </Card>
            ) : viewMode === 'list' ? (
              <div className="space-y-3">
                {filteredJokes.map((joke, index) => renderJokeCard(joke, index))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredJokes.map((joke, index) => renderJokeCard(joke, index))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {showStoryForm && (
            <Card className="mb-6">
              <form onSubmit={handleSubmitStory} className="space-y-4">
                <Input
                  label="Story Title"
                  value={newStory.title}
                  onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
                  placeholder="Give your story a title"
                  required
                />

                <VoiceTextArea
                  label="Your Story"
                  value={newStory.content}
                  onChange={(value) => setNewStory({ ...newStory, content: value })}
                  placeholder="Share your memory, family tale, or piece of history... Use the microphone to dictate. Say 'period', 'comma', 'new paragraph' for formatting."
                  rows={8}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Date (if known)"
                    type="date"
                    value={newStory.story_date}
                    onChange={(e) => setNewStory({ ...newStory, story_date: e.target.value })}
                  />
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Decade</label>
                    <select
                      value={newStory.decade}
                      onChange={(e) => setNewStory({ ...newStory, decade: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                    >
                      <option value="">Select decade</option>
                      {decades.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Cover Image (optional)</label>
                  {newStory.cover_image_url ? (
                    <div className="relative">
                      <img src={newStory.cover_image_url} alt="Cover" className="w-full h-48 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => setNewStory({ ...newStory, cover_image_url: '' })}
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
                      <input type="file" accept="image/*" onChange={handleStoryImageUpload} className="hidden" />
                    </label>
                  )}
                </div>

                <Button type="submit" loading={submitting}>
                  Share Story
                </Button>
              </form>
            </Card>
          )}

          {unclassifiedStories.length > 0 && !selectedStoryCollection && (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
                Unclassified ({unclassifiedStories.length})
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                Drag stories to a collection below to organize them
              </p>
              <div className="space-y-3">
                {unclassifiedStories.map((story, index) => renderStoryCard(story, index, true))}
              </div>
            </div>
          )}

          <StoryCollectionManager
            collections={storyCollections}
            collectionStoryCounts={storyCollectionCounts}
            collectionCoverImages={storyCollectionCoverImages}
            selectedCollection={selectedStoryCollection}
            onSelectCollection={setSelectedStoryCollection}
            onUpdate={fetchData}
            isDraggingStory={draggingIds !== null}
            onDropStory={handleDropStory}
          />

          <div className="mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h2 className="text-lg font-medium text-[var(--text-primary)]">
                {selectedStoryCollection ? selectedStoryCollection.name : 'All Stories'} ({filteredStories.length})
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="text"
                    placeholder="Search stories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] w-48"
                  />
                </div>

                <div className="flex rounded-lg overflow-hidden border border-[var(--border-default)]">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${
                      viewMode === 'list'
                        ? 'bg-[var(--accent-gold)] text-black'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                    }`}
                  >
                    <List size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${
                      viewMode === 'grid'
                        ? 'bg-[var(--accent-gold)] text-black'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                    }`}
                  >
                    <Grid3X3 size={16} />
                  </button>
                </div>
              </div>
            </div>

            {filteredStories.length === 0 ? (
              <Card className="text-center py-12">
                <BookOpen className="mx-auto mb-4 text-[var(--text-muted)]" size={48} />
                <p className="text-[var(--text-secondary)]">
                  {selectedStoryCollection ? 'No stories in this collection' : 'No stories shared yet'}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {selectedStoryCollection
                    ? 'Drag stories here to add them'
                    : 'Preserve family memories by sharing stories'}
                </p>
              </Card>
            ) : viewMode === 'list' ? (
              <div className="space-y-4">
                {filteredStories.map((story, index) => renderStoryCard(story, index))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredStories.map((story, index) => renderStoryCard(story, index))}
              </div>
            )}
          </div>
        </>
      )}

      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg shadow-lg px-4 py-3 flex items-center gap-4 z-50">
          <span className="text-sm text-[var(--text-secondary)]">
            {selectedIds.size} selected
          </span>
          <Button variant="secondary" size="sm" onClick={handleBulkDelete}>
            <Trash2 size={16} className="mr-1" /> Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectMode(false);
              setSelectedIds(new Set());
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
