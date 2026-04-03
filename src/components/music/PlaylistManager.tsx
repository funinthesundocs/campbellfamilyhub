import { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ListMusic, Trash2, CreditCard as Edit2, Check, Plus, X, Music } from 'lucide-react';
import type { Playlist } from '../../types';

interface PlaylistManagerProps {
  playlists: Playlist[];
  playlistMusicCounts: Record<string, number>;
  playlistCoverImages: Record<string, string>;
  selectedPlaylist: Playlist | null;
  onSelectPlaylist: (playlist: Playlist | null) => void;
  onUpdate: () => void;
  isDraggingMusic?: boolean;
  onDropMusic?: (playlistId: string, musicIds: string[]) => void;
}

export function PlaylistManager({
  playlists,
  playlistMusicCounts,
  playlistCoverImages,
  selectedPlaylist,
  onSelectPlaylist,
  onUpdate,
  isDraggingMusic,
  onDropMusic,
}: PlaylistManagerProps) {
  const { user, profile } = useAuth();
  const { success, error: showError } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [dropTargetPlaylistId, setDropTargetPlaylistId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
  });
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (inlineEditingId && inlineInputRef.current) {
      inlineInputRef.current.focus();
      inlineInputRef.current.select();
    }
  }, [inlineEditingId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handlePlaylistDragOver = (e: React.DragEvent, playlistId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/x-music-ids')) {
      e.dataTransfer.dropEffect = 'copy';
      setDropTargetPlaylistId(playlistId);
    }
  };

  const handlePlaylistDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetPlaylistId(null);
  };

  const handlePlaylistDrop = (e: React.DragEvent, playlistId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetPlaylistId(null);

    const musicIdsJson = e.dataTransfer.getData('application/x-music-ids');
    if (musicIdsJson && onDropMusic) {
      try {
        const musicIds = JSON.parse(musicIdsJson) as string[];
        onDropMusic(playlistId, musicIds);
      } catch {
        showError('Failed to add music to playlist');
      }
    }
  };

  const resetForm = () => {
    setForm({ name: '', description: '' });
    setShowCreate(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!user || !form.name.trim()) {
      showError('Please enter a playlist name');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('music_playlists').insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
      created_by: user.id,
    });

    if (error) {
      showError('Failed to create playlist');
    } else {
      success('Playlist created');
      resetForm();
      onUpdate();
    }
    setLoading(false);
  };

  const handleUpdate = async (id: string) => {
    if (!form.name.trim()) {
      showError('Please enter a playlist name');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('music_playlists')
      .update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      showError('Failed to update playlist');
    } else {
      success('Playlist updated');
      resetForm();
      onUpdate();
    }
    setLoading(false);
  };

  const handleInlineSave = async (playlistId: string, newName: string) => {
    if (!newName.trim()) {
      const playlist = playlists.find((p) => p.id === playlistId);
      setInlineEditValue(playlist?.name || '');
      return;
    }

    const { error } = await supabase
      .from('music_playlists')
      .update({
        name: newName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', playlistId);

    if (error) {
      showError('Failed to save');
    } else {
      onUpdate();
    }
  };

  const handleInlineChange = (value: string, playlistId: string) => {
    setInlineEditValue(value);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleInlineSave(playlistId, value);
    }, 500);
  };

  const handleInlineBlur = (playlistId: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    handleInlineSave(playlistId, inlineEditValue);
    setInlineEditingId(null);
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent, playlistId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      handleInlineSave(playlistId, inlineEditValue);
      setInlineEditingId(null);
    } else if (e.key === 'Escape') {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      setInlineEditingId(null);
    }
  };

  const startInlineEdit = (e: React.MouseEvent, playlist: Playlist) => {
    e.stopPropagation();
    setInlineEditingId(playlist.id);
    setInlineEditValue(playlist.name);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this playlist? Music will not be deleted.')) return;

    setLoading(true);
    await supabase.from('playlist_items').delete().eq('playlist_id', id);
    const { error } = await supabase.from('music_playlists').delete().eq('id', id);

    if (error) {
      showError('Failed to delete playlist');
    } else {
      success('Playlist deleted');
      if (selectedPlaylist?.id === id) {
        onSelectPlaylist(null);
      }
      onUpdate();
    }
    setLoading(false);
  };

  const startEdit = (e: React.MouseEvent, playlist: Playlist) => {
    e.stopPropagation();
    setForm({
      name: playlist.name,
      description: playlist.description || '',
    });
    setEditingId(playlist.id);
    setShowCreate(false);
  };

  const handlePlaylistClick = (playlist: Playlist) => {
    if (editingId === playlist.id || inlineEditingId === playlist.id) return;
    if (selectedPlaylist?.id === playlist.id) {
      onSelectPlaylist(null);
    } else {
      onSelectPlaylist(playlist);
    }
  };

  const canManage = (playlist: Playlist) =>
    playlist.created_by === user?.id || profile?.is_admin;

  const sortedPlaylists = useMemo(() => {
    return [...playlists].sort((a, b) => {
      const countA = playlistMusicCounts[a.id] || 0;
      const countB = playlistMusicCounts[b.id] || 0;
      if (countB !== countA) return countB - countA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [playlists, playlistMusicCounts]);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-[var(--text-primary)]">Playlists</h2>
        {!showCreate && !editingId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} className="mr-1" /> New Playlist
          </Button>
        )}
      </div>

      {(showCreate || editingId) && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4 mb-4 border border-[var(--border-default)]">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
            {editingId ? 'Edit Playlist' : 'Create New Playlist'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Playlist Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Sunday Chill"
              required
            />
            <Input
              label="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What's this playlist about?"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => (editingId ? handleUpdate(editingId) : handleCreate())}
              loading={loading}
            >
              {editingId ? 'Save Changes' : 'Create Playlist'}
            </Button>
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="max-h-[240px] overflow-y-auto pr-1 scrollbar-thin">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {sortedPlaylists.map((playlist) => {
            const isSelected = selectedPlaylist?.id === playlist.id;
            const musicCount = playlistMusicCounts[playlist.id] || 0;
            const coverImage = playlist.cover_image_url || playlistCoverImages[playlist.id];
            const isDropTarget = dropTargetPlaylistId === playlist.id;

            return (
              <div
                key={playlist.id}
                onClick={() => handlePlaylistClick(playlist)}
                onDragOver={(e) => handlePlaylistDragOver(e, playlist.id)}
                onDragLeave={handlePlaylistDragLeave}
                onDrop={(e) => handlePlaylistDrop(e, playlist.id)}
                className={`group relative cursor-pointer rounded-lg overflow-hidden transition-all ${
                  isDropTarget
                    ? 'ring-2 ring-[var(--accent-gold)] scale-105'
                    : isSelected
                    ? 'ring-2 ring-[var(--accent-gold)]'
                    : isDraggingMusic
                    ? 'ring-1 ring-dashed ring-[var(--border-default)] hover:ring-[var(--accent-gold)]'
                    : 'hover:ring-1 hover:ring-[var(--border-default)]'
                }`}
              >
                <div className="h-[86px] bg-[var(--bg-tertiary)]">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)]">
                      <ListMusic size={20} className="text-[var(--text-muted)]" />
                    </div>
                  )}
                </div>

                {isDropTarget && (
                  <div className="absolute inset-0 bg-[rgba(var(--accent-primary-rgb),0.20)] flex items-center justify-center">
                    <div className="bg-[var(--bg-primary)] rounded px-2 py-1 flex items-center gap-1 text-[var(--accent-gold)]">
                      <Music size={14} />
                      <span className="text-xs font-medium">Drop</span>
                    </div>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-2 py-1">
                  {inlineEditingId === playlist.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        ref={inlineInputRef}
                        type="text"
                        value={inlineEditValue}
                        onChange={(e) => handleInlineChange(e.target.value, playlist.id)}
                        onBlur={() => handleInlineBlur(playlist.id)}
                        onKeyDown={(e) => handleInlineKeyDown(e, playlist.id)}
                        className="flex-1 bg-black/50 text-white text-xs font-medium px-1.5 py-0.5 rounded border border-[var(--accent-gold)] focus:outline-none focus:border-[var(--accent-gold)]"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInlineBlur(playlist.id);
                        }}
                        className="p-0.5 text-[var(--accent-gold)] hover:bg-white/10 rounded"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                          setInlineEditingId(null);
                        }}
                        className="p-0.5 text-white/70 hover:bg-white/10 rounded"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <p
                      className="text-white text-xs font-medium truncate transition-colors"
                      onDoubleClick={(e) => {
                        if (canManage(playlist)) {
                          startInlineEdit(e, playlist);
                        }
                      }}
                      title={playlist.name}
                    >
                      {playlist.name}
                    </p>
                  )}
                  <p className="text-white/70 text-[10px]">
                    {musicCount} {musicCount === 1 ? 'track' : 'tracks'}
                  </p>
                </div>

                {canManage(playlist) && !isDropTarget && inlineEditingId !== playlist.id && (
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                    <button
                      onClick={(e) => startEdit(e, playlist)}
                      className="p-1 bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 rounded"
                      title="Edit details"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(playlist.id);
                      }}
                      className="p-1 bg-black/60 backdrop-blur-sm text-white hover:bg-red-600 rounded"
                      title="Delete playlist"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}

                {isSelected && (
                  <div className="absolute top-1 left-1">
                    <div className="w-4 h-4 rounded-full bg-[var(--accent-gold)] flex items-center justify-center">
                      <Check size={10} className="text-black" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {playlists.length === 0 && !showCreate && (
            <div
              onClick={() => setShowCreate(true)}
              className="h-[86px] rounded-lg border-2 border-dashed border-[var(--border-default)] hover:border-[var(--accent-gold)] hover:bg-[rgba(var(--accent-primary-rgb),0.05)] transition-colors cursor-pointer flex flex-col items-center justify-center"
            >
              <ListMusic size={20} className="text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Create Playlist</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
