import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { PlaylistManager } from '../components/music/PlaylistManager';
import { VoiceRecorder } from '../components/shared/VoiceRecorder';
import {
  Music as MusicIcon,
  Plus,
  Play,
  ExternalLink,
  X,
  Heart,
  Trash2,
  Search,
  Filter,
  ArrowLeft,
  CheckSquare,
  Square,
  Grid3X3,
  List,
  Upload,
  Mic,
  Link,
  ListMusic,
} from 'lucide-react';
import type { MusicWithPlaylists, Playlist } from '../types';

type InputMode = 'link' | 'upload' | 'voice';
type ViewMode = 'grid' | 'list';

export default function Music() {
  const { user, profile } = useAuth();
  const { success, error: showError } = useToast();

  const [music, setMusic] = useState<MusicWithPlaylists[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistMusic, setPlaylistMusic] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('link');
  const [submitting, setSubmitting] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    artist: '',
    album: '',
    url: '',
    notes: '',
  });

  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [draggingMusicIds, setDraggingMusicIds] = useState<string[] | null>(null);

  const [likedMusic, setLikedMusic] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchLikedMusic();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchMusic(), fetchPlaylists()]);
    setLoading(false);
  };

  const fetchMusic = async () => {
    const { data } = await supabase
      .from('music_recommendations')
      .select('*, user_profiles(display_name)')
      .order('created_at', { ascending: false });

    if (data) {
      const { data: playlistItems } = await supabase
        .from('playlist_items')
        .select('music_id, playlist_id, music_playlists(name)');

      const musicPlaylistMap: Record<string, string[]> = {};
      playlistItems?.forEach((item) => {
        if (!musicPlaylistMap[item.music_id]) {
          musicPlaylistMap[item.music_id] = [];
        }
        const playlists = item.music_playlists as unknown as { name: string } | null;
        if (playlists?.name) {
          musicPlaylistMap[item.music_id].push(playlists.name);
        }
      });

      const enrichedMusic = data.map((m) => ({
        ...m,
        playlistNames: musicPlaylistMap[m.id] || [],
      }));

      setMusic(enrichedMusic);
    }
  };

  const fetchPlaylists = async () => {
    const { data: playlistsData } = await supabase
      .from('music_playlists')
      .select('*')
      .order('created_at', { ascending: false });

    setPlaylists(playlistsData || []);

    const { data: playlistItems } = await supabase
      .from('playlist_items')
      .select('playlist_id, music_id');

    const itemsMap: Record<string, string[]> = {};
    playlistItems?.forEach((item) => {
      if (!itemsMap[item.playlist_id]) {
        itemsMap[item.playlist_id] = [];
      }
      itemsMap[item.playlist_id].push(item.music_id);
    });
    setPlaylistMusic(itemsMap);
  };

  const fetchLikedMusic = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('music_likes')
      .select('music_id')
      .eq('user_id', user.id);

    if (data) {
      setLikedMusic(new Set(data.map((l) => l.music_id)));
    }
  };

  const playlistMusicCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(playlistMusic).forEach(([playlistId, musicIds]) => {
      counts[playlistId] = musicIds.length;
    });
    return counts;
  }, [playlistMusic]);

  const playlistCoverImages = useMemo(() => {
    const covers: Record<string, string> = {};
    return covers;
  }, []);

  const unclassifiedMusic = useMemo(() => {
    const musicInPlaylists = new Set(Object.values(playlistMusic).flat());
    return music.filter((m) => !musicInPlaylists.has(m.id));
  }, [music, playlistMusic]);

  const classifiedMusic = useMemo(() => {
    if (selectedPlaylist) {
      const playlistMusicIds = playlistMusic[selectedPlaylist.id] || [];
      return music.filter((m) => playlistMusicIds.includes(m.id));
    }
    const musicInPlaylists = new Set(Object.values(playlistMusic).flat());
    return music.filter((m) => musicInPlaylists.has(m.id));
  }, [music, playlistMusic, selectedPlaylist]);

  const filteredMusic = useMemo(() => {
    let filtered = classifiedMusic;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.artist?.toLowerCase().includes(query) ||
          m.album?.toLowerCase().includes(query) ||
          m.notes?.toLowerCase().includes(query)
      );
    }

    if (platformFilter !== 'all') {
      filtered = filtered.filter((m) => m.platform === platformFilter);
    }

    return filtered;
  }, [classifiedMusic, searchQuery, platformFilter]);

  const detectPlatform = (url: string): string | null => {
    if (url.includes('spotify')) return 'spotify';
    if (url.includes('apple') || url.includes('music.apple')) return 'apple';
    if (url.includes('youtube') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('soundcloud')) return 'soundcloud';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const platform = newItem.url ? detectPlatform(newItem.url) : null;

    const { error } = await supabase.from('music_recommendations').insert({
      title: newItem.title,
      artist: newItem.artist || null,
      album: newItem.album || null,
      url: newItem.url || null,
      platform,
      notes: newItem.notes || null,
      added_by: user.id,
    });

    if (error) {
      showError('Failed to add music recommendation');
    } else {
      success('Music added!');
      setNewItem({ title: '', artist: '', album: '', url: '', notes: '' });
      setShowForm(false);
      fetchData();
    }
    setSubmitting(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
      showError('Please upload an audio file (MP3, WAV, OGG, M4A, AAC)');
      return;
    }

    setUploadingFile(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, file);

    if (uploadError) {
      showError('Failed to upload file');
      setUploadingFile(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);

    const title = file.name.replace(/\.[^/.]+$/, '');

    const { error: insertError } = await supabase.from('music_recommendations').insert({
      title,
      file_url: urlData.publicUrl,
      file_type: file.type,
      file_name: file.name,
      added_by: user.id,
    });

    if (insertError) {
      showError('Failed to save music');
    } else {
      success('Music uploaded!');
      fetchData();
    }

    setUploadingFile(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVoiceTranscription = (text: string) => {
    setNewItem({ ...newItem, notes: text });
    setInputMode('link');
    success('Voice note added!');
  };

  const handleLike = async (itemId: string) => {
    if (!user) return;

    if (likedMusic.has(itemId)) {
      await supabase
        .from('music_likes')
        .delete()
        .eq('music_id', itemId)
        .eq('user_id', user.id);

      const item = music.find((m) => m.id === itemId);
      if (item) {
        await supabase
          .from('music_recommendations')
          .update({ like_count: Math.max(0, item.like_count - 1) })
          .eq('id', itemId);
      }

      setLikedMusic((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    } else {
      await supabase.from('music_likes').insert({ music_id: itemId, user_id: user.id });

      const item = music.find((m) => m.id === itemId);
      if (item) {
        await supabase
          .from('music_recommendations')
          .update({ like_count: item.like_count + 1 })
          .eq('id', itemId);
      }

      setLikedMusic((prev) => new Set([...prev, itemId]));
    }

    fetchData();
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Delete this music?')) return;

    const { error } = await supabase.from('music_recommendations').delete().eq('id', itemId);
    if (error) {
      showError('Failed to delete');
    } else {
      success('Deleted');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      fetchData();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} items?`)) return;

    const { error } = await supabase
      .from('music_recommendations')
      .delete()
      .in('id', Array.from(selectedIds));

    if (error) {
      showError('Failed to delete');
    } else {
      success(`Deleted ${selectedIds.size} items`);
      setSelectedIds(new Set());
      setSelectMode(false);
      fetchData();
    }
  };

  const handleDropMusic = async (playlistId: string, musicIds: string[]) => {
    const existingMusicIds = playlistMusic[playlistId] || [];
    const newMusicIds = musicIds.filter((id) => !existingMusicIds.includes(id));

    if (newMusicIds.length === 0) {
      showError('Music already in playlist');
      return;
    }

    const items = newMusicIds.map((musicId, index) => ({
      playlist_id: playlistId,
      music_id: musicId,
      position: existingMusicIds.length + index,
      added_by: user!.id,
    }));

    const { error } = await supabase.from('playlist_items').insert(items);

    if (error) {
      showError('Failed to add to playlist');
    } else {
      success(`Added ${newMusicIds.length} track${newMusicIds.length > 1 ? 's' : ''} to playlist`);
      setSelectedIds(new Set());
      setSelectMode(false);
      fetchData();
    }
  };

  const handleRemoveFromPlaylist = async (musicId: string) => {
    if (!selectedPlaylist) return;

    const { error } = await supabase
      .from('playlist_items')
      .delete()
      .eq('playlist_id', selectedPlaylist.id)
      .eq('music_id', musicId);

    if (error) {
      showError('Failed to remove from playlist');
    } else {
      success('Removed from playlist');
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
        const musicList = selectedPlaylist ? filteredMusic : unclassifiedMusic;

        if (shiftKey && lastSelectedIndex !== null) {
          const start = Math.min(lastSelectedIndex, index);
          const end = Math.max(lastSelectedIndex, index);
          const wasSelected = prev.has(id);

          for (let i = start; i <= end; i++) {
            const item = musicList[i];
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
    [lastSelectedIndex, selectedPlaylist, filteredMusic, unclassifiedMusic]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, musicId: string) => {
      const idsToMove = selectedIds.has(musicId)
        ? Array.from(selectedIds)
        : [musicId];

      setDraggingMusicIds(idsToMove);
      e.dataTransfer.setData('application/x-music-ids', JSON.stringify(idsToMove));
      e.dataTransfer.effectAllowed = 'copy';
    },
    [selectedIds]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingMusicIds(null);
  }, []);

  const getPlatformColor = (platform: string | null) => {
    switch (platform) {
      case 'spotify':
        return 'text-green-500';
      case 'apple':
        return 'text-pink-500';
      case 'youtube':
        return 'text-red-500';
      case 'soundcloud':
        return 'text-orange-500';
      default:
        return 'text-[var(--text-muted)]';
    }
  };

  const renderMusicCard = (item: MusicWithPlaylists, index: number, isUnclassified: boolean = false) => {
    const isSelected = selectedIds.has(item.id);
    const isDragging = draggingMusicIds?.includes(item.id);
    const isLiked = likedMusic.has(item.id);

    return (
      <div
        key={item.id}
        draggable={!selectMode}
        onDragStart={(e) => handleDragStart(e, item.id)}
        onDragEnd={handleDragEnd}
        className={`relative transition-all ${
          isDragging ? 'opacity-50 scale-95' : ''
        } ${isSelected ? 'ring-2 ring-[var(--accent-gold)]' : ''}`}
      >
        <Card className="h-full">
          <div className="flex items-start gap-4">
            {selectMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(item.id, index, e.shiftKey);
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

            <div className="w-14 h-14 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center flex-shrink-0">
              <MusicIcon size={24} className={getPlatformColor(item.platform)} />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-[var(--text-primary)] truncate">{item.title}</h3>
              {item.artist && (
                <p className="text-sm text-[var(--text-secondary)] truncate">{item.artist}</p>
              )}
              {item.album && (
                <p className="text-xs text-[var(--text-muted)] truncate">{item.album}</p>
              )}
              {item.notes && (
                <p className="text-sm text-[var(--text-secondary)] mt-2 italic line-clamp-2">
                  "{item.notes}"
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <p className="text-xs text-[var(--text-muted)]">
                  by {item.user_profiles?.display_name || 'Unknown'}
                </p>
                {!isUnclassified && item.playlistNames && item.playlistNames.length > 0 && (
                  <div className="flex gap-1">
                    {item.playlistNames.slice(0, 2).map((name) => (
                      <span
                        key={name}
                        className="px-1.5 py-0.5 text-xs bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded"
                      >
                        {name}
                      </span>
                    ))}
                    {item.playlistNames.length > 2 && (
                      <span className="px-1.5 py-0.5 text-xs bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded">
                        +{item.playlistNames.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {(item.url || item.file_url) && (
                <a
                  href={item.url || item.file_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-[var(--accent-gold)] hover:underline"
                >
                  <Play size={14} /> Listen
                  <ExternalLink size={12} />
                </a>
              )}
              <button
                onClick={() => handleLike(item.id)}
                className={`flex items-center gap-1 text-sm transition-colors ${
                  isLiked
                    ? 'text-red-500'
                    : 'text-[var(--text-muted)] hover:text-[var(--accent-gold)]'
                }`}
              >
                <Heart size={14} className={isLiked ? 'fill-current' : ''} /> {item.like_count}
              </button>
              {selectedPlaylist && (
                <button
                  onClick={() => handleRemoveFromPlaylist(item.id)}
                  className="text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors"
                >
                  Remove
                </button>
              )}
              {(item.added_by === user?.id || profile?.is_admin) && (
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-[var(--text-muted)] hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {selectedPlaylist && (
            <button
              onClick={() => setSelectedPlaylist(null)}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="font-serif text-3xl text-[var(--text-primary)]">
            {selectedPlaylist ? selectedPlaylist.name : 'Family Playlist'}
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
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <X size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
            {showForm ? 'Cancel' : 'Add Music'}
          </Button>
        </div>
      </div>

      <p className="text-[var(--text-secondary)] mb-6">
        Share songs, albums, and playlists with the family. Drag tracks to playlists to organize
        them.
      </p>

      {showForm && (
        <Card className="mb-6">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setInputMode('link')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                inputMode === 'link'
                  ? 'bg-[var(--accent-gold)] text-black'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <Link size={16} /> Add Link
            </button>
            <button
              type="button"
              onClick={() => setInputMode('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                inputMode === 'upload'
                  ? 'bg-[var(--accent-gold)] text-black'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <Upload size={16} /> Upload File
            </button>
            <button
              type="button"
              onClick={() => setInputMode('voice')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                inputMode === 'voice'
                  ? 'bg-[var(--accent-gold)] text-black'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <Mic size={16} /> Voice Note
            </button>
          </div>

          {inputMode === 'link' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Song/Album Title"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="Bohemian Rhapsody"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Artist"
                  value={newItem.artist}
                  onChange={(e) => setNewItem({ ...newItem, artist: e.target.value })}
                  placeholder="Queen"
                />
                <Input
                  label="Album"
                  value={newItem.album}
                  onChange={(e) => setNewItem({ ...newItem, album: e.target.value })}
                  placeholder="A Night at the Opera"
                />
              </div>
              <Input
                label="Link (Spotify, Apple Music, YouTube, etc.)"
                value={newItem.url}
                onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                placeholder="https://open.spotify.com/track/..."
              />
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Why do you recommend this?
                </label>
                <textarea
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  placeholder="This was Grandpa's favorite song..."
                  className="w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] resize-none"
                  rows={3}
                />
              </div>
              <Button type="submit" loading={submitting}>
                Share Music
              </Button>
            </form>
          )}

          {inputMode === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Upload an audio file (MP3, WAV, OGG, M4A, AAC)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                loading={uploadingFile}
                disabled={uploadingFile}
              >
                <Upload size={18} className="mr-2" />
                {uploadingFile ? 'Uploading...' : 'Choose File'}
              </Button>
            </div>
          )}

          {inputMode === 'voice' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Record a voice note about a song recommendation
              </p>
              <VoiceRecorder
                onTranscription={handleVoiceTranscription}
                placeholder="Click to record why you recommend this music..."
              />
            </div>
          )}
        </Card>
      )}

      {loading ? (
        renderLoadingSkeleton()
      ) : (
        <>
          {unclassifiedMusic.length > 0 && !selectedPlaylist && (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">
                Unclassified ({unclassifiedMusic.length})
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                Drag music to a playlist below to organize it
              </p>
              <div className="space-y-3">
                {unclassifiedMusic.map((item, index) => renderMusicCard(item, index, true))}
              </div>
            </div>
          )}

          <PlaylistManager
            playlists={playlists}
            playlistMusicCounts={playlistMusicCounts}
            playlistCoverImages={playlistCoverImages}
            selectedPlaylist={selectedPlaylist}
            onSelectPlaylist={setSelectedPlaylist}
            onUpdate={fetchData}
            isDraggingMusic={draggingMusicIds !== null}
            onDropMusic={handleDropMusic}
          />

          <div className="mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h2 className="text-lg font-medium text-[var(--text-primary)]">
                {selectedPlaylist ? `${selectedPlaylist.name}` : 'All Music'} (
                {filteredMusic.length})
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] w-48"
                  />
                </div>

                <div className="relative">
                  <Filter
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="pl-9 pr-8 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] appearance-none cursor-pointer"
                  >
                    <option value="all">All Platforms</option>
                    <option value="spotify">Spotify</option>
                    <option value="apple">Apple Music</option>
                    <option value="youtube">YouTube</option>
                    <option value="soundcloud">SoundCloud</option>
                  </select>
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

            {filteredMusic.length === 0 ? (
              <Card className="text-center py-12">
                <ListMusic className="mx-auto mb-4 text-[var(--text-muted)]" size={48} />
                <p className="text-[var(--text-secondary)]">
                  {selectedPlaylist ? 'No music in this playlist yet' : 'No music shared yet'}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {selectedPlaylist
                    ? 'Drag music here to add it'
                    : 'Be the first to recommend a song!'}
                </p>
              </Card>
            ) : viewMode === 'list' ? (
              <div className="space-y-3">
                {filteredMusic.map((item, index) => renderMusicCard(item, index))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMusic.map((item, index) => renderMusicCard(item, index))}
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
