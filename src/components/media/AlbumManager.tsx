import { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { TrainingTooltip } from '../training/TrainingTooltip';
import { TOOLTIPS } from '../training/training-content';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FolderPlus, Trash2, CreditCard as Edit2, Check, ImagePlus, X } from 'lucide-react';
import type { Album } from '../../types';

const ALBUM_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'event', label: 'Event' },
  { value: 'thanksgiving', label: 'Thanksgiving' },
  { value: 'reunion', label: 'Family Reunion' },
  { value: 'property', label: 'Property' },
  { value: 'memories', label: 'Memories' },
];

interface AlbumManagerProps {
  albums: Album[];
  albumMediaCounts: Record<string, number>;
  albumFirstPhotos: Record<string, string>;
  selectedAlbum: Album | null;
  onSelectAlbum: (album: Album | null) => void;
  onUpdate: () => void;
  isDraggingMedia?: boolean;
  onDropMedia?: (albumId: string, mediaIds: string[]) => void;
}

export function AlbumManager({
  albums,
  albumMediaCounts,
  albumFirstPhotos,
  selectedAlbum,
  onSelectAlbum,
  onUpdate,
  isDraggingMedia,
  onDropMedia,
}: AlbumManagerProps) {
  const { user, profile } = useAuth();
  const { success, error: showError } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [dropTargetAlbumId, setDropTargetAlbumId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    album_type: 'general',
    event_date: '',
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

  const handleAlbumDragOver = (e: React.DragEvent, albumId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/x-media-ids')) {
      e.dataTransfer.dropEffect = 'copy';
      setDropTargetAlbumId(albumId);
    }
  };

  const handleAlbumDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetAlbumId(null);
  };

  const handleAlbumDrop = (e: React.DragEvent, albumId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetAlbumId(null);

    const mediaIdsJson = e.dataTransfer.getData('application/x-media-ids');
    if (mediaIdsJson && onDropMedia) {
      try {
        const mediaIds = JSON.parse(mediaIdsJson) as string[];
        onDropMedia(albumId, mediaIds);
      } catch {
        showError('Failed to add photos to album');
      }
    }
  };

  const resetForm = () => {
    setForm({ title: '', description: '', album_type: 'general', event_date: '' });
    setShowCreate(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!user || !form.title.trim()) {
      showError('Please enter an album title');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('albums').insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      album_type: form.album_type,
      event_date: form.event_date || null,
      created_by: user.id,
    });

    if (error) {
      showError('Failed to create album');
    } else {
      success('Album created');
      resetForm();
      onUpdate();
    }
    setLoading(false);
  };

  const handleUpdate = async (id: string) => {
    if (!form.title.trim()) {
      showError('Please enter an album title');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('albums')
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        album_type: form.album_type,
        event_date: form.event_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      showError('Failed to update album');
    } else {
      success('Album updated');
      resetForm();
      onUpdate();
    }
    setLoading(false);
  };

  const handleInlineSave = async (albumId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      const album = albums.find((a) => a.id === albumId);
      setInlineEditValue(album?.title || '');
      return;
    }

    const { error } = await supabase
      .from('albums')
      .update({
        title: newTitle.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', albumId);

    if (error) {
      showError('Failed to save');
    } else {
      onUpdate();
    }
  };

  const handleInlineChange = (value: string, albumId: string) => {
    setInlineEditValue(value);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleInlineSave(albumId, value);
    }, 500);
  };

  const handleInlineBlur = (albumId: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    handleInlineSave(albumId, inlineEditValue);
    setInlineEditingId(null);
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent, albumId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      handleInlineSave(albumId, inlineEditValue);
      setInlineEditingId(null);
    } else if (e.key === 'Escape') {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      setInlineEditingId(null);
    }
  };

  const startInlineEdit = (e: React.MouseEvent, album: Album) => {
    e.stopPropagation();
    setInlineEditingId(album.id);
    setInlineEditValue(album.title);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this album? Media files will not be deleted.')) return;

    setLoading(true);
    await supabase.from('media_album_items').delete().eq('album_id', id);
    const { error } = await supabase.from('albums').delete().eq('id', id);

    if (error) {
      showError('Failed to delete album');
    } else {
      success('Album deleted');
      if (selectedAlbum?.id === id) {
        onSelectAlbum(null);
      }
      onUpdate();
    }
    setLoading(false);
  };

  const startEdit = (e: React.MouseEvent, album: Album) => {
    e.stopPropagation();
    setForm({
      title: album.title,
      description: album.description || '',
      album_type: album.album_type,
      event_date: album.event_date || '',
    });
    setEditingId(album.id);
    setShowCreate(false);
  };

  const handleAlbumClick = (album: Album) => {
    if (editingId === album.id || inlineEditingId === album.id) return;
    onSelectAlbum(album);
  };

  const canManage = (album: Album) =>
    album.created_by === user?.id || profile?.is_admin;

  const sortedAlbums = useMemo(() => {
    return [...albums].sort((a, b) => {
      const countA = albumMediaCounts[a.id] || 0;
      const countB = albumMediaCounts[b.id] || 0;
      if (countB !== countA) return countB - countA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [albums, albumMediaCounts]);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <TrainingTooltip tipId="media-albums-heading" content={TOOLTIPS['media-albums-heading']?.content || ''} position="top">
          <h2 className="text-lg font-medium text-[var(--text-primary)]">Albums</h2>
        </TrainingTooltip>
        <div className="flex gap-2">
          {!showCreate && !editingId && (
            <TrainingTooltip tipId="media-new-album-button" content={TOOLTIPS['media-new-album-button']?.content || ''} position="bottom">
              <Button
                onClick={() => setShowCreate(true)}
              >
                <FolderPlus size={18} className="mr-2" /> New Album
              </Button>
            </TrainingTooltip>
          )}
        </div>
      </div>

      {(showCreate || editingId) && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4 mb-4 border border-[var(--border-default)]">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
            {editingId ? 'Edit Album' : 'Create New Album'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Album Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Thanksgiving 2024"
              required
            />
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Album Type
              </label>
              <select
                value={form.album_type}
                onChange={(e) => setForm({ ...form, album_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              >
                {ALBUM_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What's this album about?"
            />
            <Input
              label="Event Date (optional)"
              type="date"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => (editingId ? handleUpdate(editingId) : handleCreate())}
              loading={loading}
            >
              {editingId ? 'Save Changes' : 'Create Album'}
            </Button>
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="max-h-[240px] overflow-y-auto pr-1 scrollbar-thin">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {sortedAlbums.map((album) => {
          const isDropTarget = dropTargetAlbumId === album.id;
          const isSelected = selectedAlbum?.id === album.id;
          const photoCount = albumMediaCounts[album.id] || 0;
          const coverImage = album.cover_image_url || albumFirstPhotos[album.id];

          return (
            <div
              key={album.id}
              onClick={() => handleAlbumClick(album)}
              onDragOver={(e) => handleAlbumDragOver(e, album.id)}
              onDragLeave={handleAlbumDragLeave}
              onDrop={(e) => handleAlbumDrop(e, album.id)}
              className={`group relative cursor-pointer rounded-lg overflow-hidden transition-all ${
                isDropTarget
                  ? 'ring-2 ring-[var(--accent-gold)] scale-105'
                  : isSelected
                  ? 'ring-2 ring-[var(--accent-gold)]'
                  : isDraggingMedia
                  ? 'ring-1 ring-dashed ring-[var(--border-default)] hover:ring-[var(--accent-gold)]'
                  : 'hover:ring-1 hover:ring-[var(--border-default)]'
              }`}
            >
              <div className="h-[96px] bg-[var(--bg-tertiary)]">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)]">
                    <FolderPlus size={20} className="text-[var(--text-muted)]" />
                  </div>
                )}
              </div>

              {isDropTarget && (
                <div className="absolute inset-0 bg-[rgba(var(--accent-primary-rgb),0.20)] flex items-center justify-center">
                  <div className="bg-[var(--bg-primary)] rounded px-2 py-1 flex items-center gap-1 text-[var(--accent-gold)]">
                    <ImagePlus size={14} />
                    <span className="text-xs font-medium">Drop</span>
                  </div>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-2 py-1">
                {inlineEditingId === album.id ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={inlineInputRef}
                      type="text"
                      value={inlineEditValue}
                      onChange={(e) => handleInlineChange(e.target.value, album.id)}
                      onBlur={() => handleInlineBlur(album.id)}
                      onKeyDown={(e) => handleInlineKeyDown(e, album.id)}
                      className="flex-1 bg-black/50 text-white text-xs font-medium px-1.5 py-0.5 rounded border border-[var(--accent-gold)] focus:outline-none focus:border-[var(--accent-gold)]"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInlineBlur(album.id);
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
                      if (canManage(album)) {
                        startInlineEdit(e, album);
                      }
                    }}
                    title={album.title}
                  >
                    {album.title}
                  </p>
                )}
                <p className="text-white/70 text-[10px]">
                  {photoCount} {photoCount === 1 ? 'item' : 'items'}
                </p>
              </div>

              {canManage(album) && !isDropTarget && inlineEditingId !== album.id && (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                  <button
                    onClick={(e) => startEdit(e, album)}
                    className="p-1 bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 rounded"
                    title="Edit details"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(album.id);
                    }}
                    className="p-1 bg-black/60 backdrop-blur-sm text-white hover:bg-red-600 rounded"
                    title="Delete album"
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

        {albums.length === 0 && !showCreate && (
          <div
            onClick={() => setShowCreate(true)}
            className="h-[96px] rounded-lg border-2 border-dashed border-[var(--border-default)] hover:border-[var(--accent-gold)] hover:bg-[rgba(var(--accent-primary-rgb),0.05)] transition-colors cursor-pointer flex flex-col items-center justify-center"
          >
            <FolderPlus size={20} className="text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">Create Album</span>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
