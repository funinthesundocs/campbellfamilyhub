import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTraining } from '../contexts/TrainingContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { MediaUpload } from '../components/media/MediaUpload';
import { MediaLightbox } from '../components/media/MediaLightbox';
import { AlbumManager } from '../components/media/AlbumManager';
import { SectionWelcome } from '../components/training/SectionWelcome';
import { TrainingTooltip } from '../components/training/TrainingTooltip';
import { TOOLTIPS } from '../components/training/training-content';
import { Image, Plus, Grid3x2 as Grid3X3, LayoutGrid, ListFilter as Filter, Video, ChevronDown, FolderPlus, Check, X, Upload, ArrowLeft, FolderOpen, Image as ImageIcon, Eye, MousePointer2, Music, Trash2, Search } from 'lucide-react';
import type { MediaFile, UserProfile, Album } from '../types';

type ViewMode = 'grid' | 'masonry';
type FilterMode = 'all' | 'photos' | 'videos' | 'audio';
type SortMode = 'newest' | 'oldest' | 'alphabetical' | 'dateTaken';

interface MediaWithAlbums extends MediaFile {
  albumNames?: string[];
}

export default function Media() {
  const { user, profile } = useAuth();
  const { success, error: showError } = useToast();
  const { trainingMode } = useTraining();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumMedia, setAlbumMedia] = useState<Record<string, string[]>>({});
  const [mediaAlbums, setMediaAlbums] = useState<Record<string, string[]>>({});
  const [albumFirstPhotos, setAlbumFirstPhotos] = useState<Record<string, string>>({});
  const [uploaders, setUploaders] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showUpload, setShowUpload] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [allPhotosSelectMode, setAllPhotosSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allPhotosSelectedIds, setAllPhotosSelectedIds] = useState<Set<string>>(new Set());
  const [addToAlbumId, setAddToAlbumId] = useState<string>('');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const dragCounterRef = useRef(0);
  const [draggingMediaIds, setDraggingMediaIds] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [allPhotosLastSelectedIndex, setAllPhotosLastSelectedIndex] = useState<number | null>(null);
  const [allPhotosSearchQuery, setAllPhotosSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'u' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          openUpload();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const preventDefaultDrag = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventDefaultDrag);
    window.addEventListener('drop', preventDefaultDrag);
    return () => {
      window.removeEventListener('dragover', preventDefaultDrag);
      window.removeEventListener('drop', preventDefaultDrag);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchMedia(), fetchAlbums()]);
    setLoading(false);
  };

  const fetchMedia = async () => {
    const { data } = await supabase
      .from('media_files')
      .select('*')
      .order('created_at', { ascending: false });

    setFiles(data || []);

    if (data && data.length > 0) {
      const uploaderIds = [...new Set(data.map((f) => f.uploaded_by))];
      const { data: users } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', uploaderIds);

      if (users) {
        const map: Record<string, UserProfile> = {};
        users.forEach((u) => (map[u.id] = u));
        setUploaders(map);
      }
    }
  };

  const fetchAlbums = async () => {
    const { data: albumData } = await supabase
      .from('albums')
      .select('*')
      .order('created_at', { ascending: false });

    setAlbums(albumData || []);

    const { data: albumItems } = await supabase
      .from('media_album_items')
      .select('album_id, media_id')
      .order('added_at', { ascending: true });

    if (albumItems) {
      const albumMap: Record<string, string[]> = {};
      const mediaMap: Record<string, string[]> = {};

      albumItems.forEach((item) => {
        if (!albumMap[item.album_id]) albumMap[item.album_id] = [];
        albumMap[item.album_id].push(item.media_id);

        if (!mediaMap[item.media_id]) mediaMap[item.media_id] = [];
        mediaMap[item.media_id].push(item.album_id);
      });

      setAlbumMedia(albumMap);
      setMediaAlbums(mediaMap);

      const firstPhotosMap: Record<string, string> = {};
      const { data: mediaFiles } = await supabase
        .from('media_files')
        .select('id, thumbnail_url, file_url')
        .in(
          'id',
          albumItems.map((item) => item.media_id)
        );

      if (mediaFiles) {
        const fileMap: Record<string, { thumbnail_url: string | null; file_url: string }> = {};
        mediaFiles.forEach((m) => {
          fileMap[m.id] = { thumbnail_url: m.thumbnail_url, file_url: m.file_url };
        });

        Object.entries(albumMap).forEach(([albumId, mediaIds]) => {
          if (mediaIds.length > 0) {
            const firstMedia = fileMap[mediaIds[0]];
            if (firstMedia) {
              firstPhotosMap[albumId] = firstMedia.thumbnail_url || firstMedia.file_url;
            }
          }
        });
      }
      setAlbumFirstPhotos(firstPhotosMap);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Delete this file permanently?')) return;

    await supabase.from('media_album_items').delete().eq('media_id', fileId);
    await supabase.from('media_tags').delete().eq('media_id', fileId);
    const { error } = await supabase.from('media_files').delete().eq('id', fileId);

    if (error) {
      showError('Failed to delete');
    } else {
      success('File deleted');
      setSelectedFile(null);
      await fetchMedia();
      await fetchAlbums();
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (!confirm(`Delete ${ids.length} file${ids.length > 1 ? 's' : ''} permanently?`)) return;

    for (const fileId of ids) {
      await supabase.from('media_album_items').delete().eq('media_id', fileId);
      await supabase.from('media_tags').delete().eq('media_id', fileId);
      await supabase.from('media_files').delete().eq('id', fileId);
    }

    success(`Deleted ${ids.length} file${ids.length > 1 ? 's' : ''}`);
    setSelectMode(false);
    setAllPhotosSelectMode(false);
    setSelectedIds(new Set());
    setAllPhotosSelectedIds(new Set());
    await fetchMedia();
    await fetchAlbums();
  };

  const handleSetAsCover = async (mediaId: string) => {
    if (!selectedAlbum) return;

    const file = files.find((f) => f.id === mediaId);
    if (!file) return;

    const coverUrl = file.thumbnail_url || file.file_url;

    const { error } = await supabase
      .from('albums')
      .update({
        cover_image_url: coverUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedAlbum.id);

    if (error) {
      showError('Failed to set cover');
    } else {
      success('Album cover updated');
      fetchAlbums();
    }
  };

  const allMediaInAlbums = useMemo(() => {
    const set = new Set<string>();
    Object.values(albumMedia).forEach((mediaIds) => {
      mediaIds.forEach((id) => set.add(id));
    });
    return set;
  }, [albumMedia]);

  const albumMediaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    albums.forEach((album) => {
      counts[album.id] = albumMedia[album.id]?.length || 0;
    });
    return counts;
  }, [albums, albumMedia]);

  const unclassifiedFiles = useMemo(() => {
    return files.filter((file) => !allMediaInAlbums.has(file.id));
  }, [files, allMediaInAlbums]);

  const classifiedFiles = useMemo(() => {
    return files.filter((file) => allMediaInAlbums.has(file.id));
  }, [files, allMediaInAlbums]);

  const filteredUnclassified = useMemo(() => {
    return unclassifiedFiles.filter((file) => {
      if (filterMode === 'photos' && file.media_type !== 'photo') return false;
      if (filterMode === 'videos' && file.media_type !== 'video') return false;
      if (filterMode === 'audio' && file.media_type !== 'audio') return false;
      return true;
    });
  }, [unclassifiedFiles, filterMode]);

  const filteredClassified = useMemo(() => {
    return classifiedFiles.filter((file) => {
      if (filterMode === 'photos' && file.media_type !== 'photo') return false;
      if (filterMode === 'videos' && file.media_type !== 'video') return false;
      if (filterMode === 'audio' && file.media_type !== 'audio') return false;
      return true;
    });
  }, [classifiedFiles, filterMode]);

  const filteredAlbumFiles = useMemo(() => {
    if (!selectedAlbum) return [];
    const albumFiles = albumMedia[selectedAlbum.id] || [];
    return files.filter((file) => {
      if (!albumFiles.includes(file.id)) return false;
      if (filterMode === 'photos' && file.media_type !== 'photo') return false;
      if (filterMode === 'videos' && file.media_type !== 'video') return false;
      if (filterMode === 'audio' && file.media_type !== 'audio') return false;
      return true;
    });
  }, [files, selectedAlbum, albumMedia, filterMode]);

  const sortFiles = useCallback((fileList: MediaFile[]) => {
    return [...fileList].sort((a, b) => {
      switch (sortMode) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'alphabetical':
          return (a.title || '').localeCompare(b.title || '');
        case 'dateTaken':
          const dateA = a.taken_at ? new Date(a.taken_at).getTime() : new Date(a.created_at).getTime();
          const dateB = b.taken_at ? new Date(b.taken_at).getTime() : new Date(b.created_at).getTime();
          return dateB - dateA;
        default:
          return 0;
      }
    });
  }, [sortMode]);

  const sortedUnclassified = useMemo(() => sortFiles(filteredUnclassified), [filteredUnclassified, sortFiles]);
  const sortedClassified = useMemo(() => sortFiles(filteredClassified), [filteredClassified, sortFiles]);
  const sortedAlbumFiles = useMemo(() => sortFiles(filteredAlbumFiles), [filteredAlbumFiles, sortFiles]);

  const classifiedWithAlbums: MediaWithAlbums[] = useMemo(() => {
    return sortedClassified.map(file => ({
      ...file,
      albumNames: (mediaAlbums[file.id] || []).map(albumId => {
        const album = albums.find(a => a.id === albumId);
        return album?.title || '';
      }).filter(Boolean)
    }));
  }, [sortedClassified, mediaAlbums, albums]);

  const searchFilteredClassified = useMemo(() => {
    if (!allPhotosSearchQuery.trim()) return classifiedWithAlbums;

    const query = allPhotosSearchQuery.toLowerCase().trim();
    return classifiedWithAlbums.filter(file => {
      const titleMatch = file.title?.toLowerCase().includes(query);
      const descMatch = file.description?.toLowerCase().includes(query);
      const locationMatch = file.location_name?.toLowerCase().includes(query);
      const albumMatch = file.albumNames?.some(name => name.toLowerCase().includes(query));
      const uploaderMatch = uploaders[file.uploaded_by]?.display_name?.toLowerCase().includes(query);

      return titleMatch || descMatch || locationMatch || albumMatch || uploaderMatch;
    });
  }, [classifiedWithAlbums, allPhotosSearchQuery, uploaders]);

  const handleNavigate = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  useEffect(() => {
    const currentFiles = selectedAlbum ? sortedAlbumFiles : sortedUnclassified;
    if (selectedFile && currentFiles[selectedIndex]) {
      setSelectedFile(currentFiles[selectedIndex]);
    }
  }, [selectedIndex, sortedAlbumFiles, sortedUnclassified, selectedAlbum]);

  const canDelete = (file: MediaFile) =>
    file.uploaded_by === user?.id || profile?.is_admin === true;

  const toggleSelect = (id: string, index: number, shiftKey?: boolean) => {
    if (shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const newSelected = new Set(selectedIds);
      for (let i = start; i <= end; i++) {
        newSelected.add(sortedUnclassified[i].id);
      }
      setSelectedIds(newSelected);
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      setLastSelectedIndex(index);
    }
  };

  const toggleAllPhotosSelect = (id: string, index: number, shiftKey?: boolean) => {
    if (shiftKey && allPhotosLastSelectedIndex !== null) {
      const start = Math.min(allPhotosLastSelectedIndex, index);
      const end = Math.max(allPhotosLastSelectedIndex, index);
      const newSelected = new Set(allPhotosSelectedIds);
      for (let i = start; i <= end; i++) {
        newSelected.add(sortedClassified[i].id);
      }
      setAllPhotosSelectedIds(newSelected);
    } else {
      setAllPhotosSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      setAllPhotosLastSelectedIndex(index);
    }
  };

  const handlePhotoClick = (file: MediaFile, index: number, e: React.MouseEvent, isAllPhotos: boolean = false) => {
    if (isAllPhotos && allPhotosSelectMode) {
      toggleAllPhotosSelect(file.id, index, e.shiftKey);
      return;
    }
    if (!isAllPhotos && selectMode) {
      toggleSelect(file.id, index, e.shiftKey);
      return;
    }
    setSelectedFile(file);
    setSelectedIndex(index);
  };

  const enterSelectModeWithPhoto = (file: MediaFile, index: number, isAllPhotos: boolean = false) => {
    if (isAllPhotos) {
      setAllPhotosSelectMode(true);
      setAllPhotosSelectedIds(new Set([file.id]));
      setAllPhotosLastSelectedIndex(index);
    } else {
      setSelectMode(true);
      setSelectedIds(new Set([file.id]));
      setLastSelectedIndex(index);
    }
  };

  const openLightbox = (file: MediaFile, index: number) => {
    setSelectedFile(file);
    setSelectedIndex(index);
  };

  const handleAddToAlbum = async () => {
    if (!addToAlbumId || selectedIds.size === 0) return;

    const existingInAlbum = albumMedia[addToAlbumId] || [];
    const toAdd = Array.from(selectedIds).filter((id) => !existingInAlbum.includes(id));

    if (toAdd.length === 0) {
      showError('Selected items are already in this album');
      return;
    }

    const { error } = await supabase.from('media_album_items').insert(
      toAdd.map((media_id) => ({
        album_id: addToAlbumId,
        media_id,
      }))
    );

    if (error) {
      showError('Failed to add to album');
    } else {
      success(`Added ${toAdd.length} item${toAdd.length > 1 ? 's' : ''} to album`);
      setSelectMode(false);
      setSelectedIds(new Set());
      setAddToAlbumId('');
      setLastSelectedIndex(null);
      fetchAlbums();
      fetchMedia();
    }
  };

  const handleRemoveFromAlbum = async () => {
    if (!selectedAlbum || selectedIds.size === 0) return;

    const { error } = await supabase
      .from('media_album_items')
      .delete()
      .eq('album_id', selectedAlbum.id)
      .in('media_id', Array.from(selectedIds));

    if (error) {
      showError('Failed to remove from album');
    } else {
      success(`Removed ${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''} from album`);
      setSelectMode(false);
      setSelectedIds(new Set());
      setLastSelectedIndex(null);
      fetchAlbums();
      fetchMedia();
    }
  };

  const handleRemoveSingleFromAlbum = async (mediaId: string) => {
    if (!selectedAlbum) return;

    const { error } = await supabase
      .from('media_album_items')
      .delete()
      .eq('album_id', selectedAlbum.id)
      .eq('media_id', mediaId);

    if (error) {
      showError('Failed to remove from album');
    } else {
      success('Moved to unclassified');
      setSelectedFile(null);
      fetchAlbums();
      fetchMedia();
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === sortedUnclassified.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedUnclassified.map((f) => f.id)));
    }
  };

  const handleAllPhotosSelectAll = () => {
    if (allPhotosSelectedIds.size === sortedClassified.length) {
      setAllPhotosSelectedIds(new Set());
    } else {
      setAllPhotosSelectedIds(new Set(sortedClassified.map((f) => f.id)));
    }
  };

  const handleImageError = (id: string) => {
    setImageErrors((prev) => new Set(prev).add(id));
  };

  const handleMediaDragStart = (e: React.DragEvent, fileId: string, isAllPhotos: boolean = false) => {
    const activeIds = isAllPhotos ? allPhotosSelectedIds : selectedIds;
    const ids = activeIds.size > 0 && activeIds.has(fileId) ? Array.from(activeIds) : [fileId];
    setDraggingMediaIds(ids);
    e.dataTransfer.setData('application/x-media-ids', JSON.stringify(ids));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleMediaDragEnd = () => {
    setDraggingMediaIds([]);
  };

  const handleDropOnAlbum = async (albumId: string, mediaIds: string[]) => {
    const existingInAlbum = albumMedia[albumId] || [];
    const toAdd = mediaIds.filter((id) => !existingInAlbum.includes(id));

    if (toAdd.length === 0) {
      showError('Selected items are already in this album');
      return;
    }

    const { error } = await supabase.from('media_album_items').insert(
      toAdd.map((media_id) => ({
        album_id: albumId,
        media_id,
      }))
    );

    if (error) {
      showError('Failed to add to album');
    } else {
      success(`Added ${toAdd.length} item${toAdd.length > 1 ? 's' : ''} to album`);
      fetchAlbums();
      fetchMedia();
    }
  };

  const isInternalMediaDrag = (e: React.DragEvent) => {
    return e.dataTransfer.types.includes('application/x-media-ids');
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInternalMediaDrag(e)) return;
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInternalMediaDrag(e)) return;
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setDragOver(false);

    if (isInternalMediaDrag(e)) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      const validFiles = filesArray.filter(
        (f) => f.type.startsWith('image/') || f.type.startsWith('video/') || f.type.startsWith('audio/')
      );

      if (validFiles.length === 0) {
        showError('No valid media files found');
        return;
      }

      setDroppedFiles(validFiles);
      setShowUpload(true);
      setSelectMode(false);
      setAllPhotosSelectMode(false);
    }
  };

  const openUpload = () => {
    setDroppedFiles([]);
    setShowUpload(true);
    setSelectMode(false);
    setAllPhotosSelectMode(false);
  };

  const handleUploadClose = () => {
    setShowUpload(false);
    setDroppedFiles([]);
  };

  const renderMediaItem = (file: MediaFile, index: number, isSelected: boolean, isAllPhotos: boolean = false, albumNames?: string[]) => {
    const isAudio = file.media_type === 'audio';

    return (
      <div
        key={file.id}
        onClick={(e) => handlePhotoClick(file, index, e, isAllPhotos)}
        draggable={(!isAllPhotos && !selectMode) || (isAllPhotos && !allPhotosSelectMode) || isSelected}
        onDragStart={(e) => handleMediaDragStart(e, file.id, isAllPhotos)}
        onDragEnd={handleMediaDragEnd}
        className={`group relative overflow-hidden rounded-lg cursor-pointer bg-[var(--bg-tertiary)] ${
          viewMode === 'masonry' ? 'break-inside-avoid mb-3' : 'aspect-square'
        } ${isSelected ? 'ring-2 ring-[var(--accent-gold)]' : ''} ${
          draggingMediaIds.includes(file.id) ? 'opacity-50' : ''
        }`}
      >
        {isAudio ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <Music size={32} className="text-[var(--text-muted)] mb-2" />
            <span className="text-xs text-[var(--text-secondary)] text-center line-clamp-2">
              {file.title || file.file_url.split('/').pop()}
            </span>
          </div>
        ) : imageErrors.has(file.id) ? (
          <div className="w-full h-full flex items-center justify-center aspect-square">
            <Image size={32} className="text-[var(--text-muted)]" />
          </div>
        ) : (
          <img
            src={file.thumbnail_url || file.file_url}
            alt={file.title || 'Media'}
            className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              viewMode === 'masonry' ? '' : 'h-full'
            }`}
            loading="lazy"
            onError={() => handleImageError(file.id)}
          />
        )}

        {file.media_type === 'video' && !imageErrors.has(file.id) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <div className="w-0 h-0 border-t-[8px] border-b-[8px] border-l-[12px] border-transparent border-l-white ml-1" />
            </div>
          </div>
        )}

        {((isAllPhotos && allPhotosSelectMode) || (!isAllPhotos && selectMode)) && (
          <div
            className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)]'
                : 'bg-black/30 border-white/70'
            }`}
          >
            {isSelected && <Check size={14} className="text-black" />}
          </div>
        )}

        {isAllPhotos && albumNames && albumNames.length > 0 && !(allPhotosSelectMode) && (
          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
            {albumNames.slice(0, 2).map((name, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 text-[10px] bg-black/70 text-white rounded-full backdrop-blur-sm"
              >
                {name}
              </span>
            ))}
            {albumNames.length > 2 && (
              <span className="px-2 py-0.5 text-[10px] bg-black/70 text-white rounded-full backdrop-blur-sm">
                +{albumNames.length - 2}
              </span>
            )}
          </div>
        )}

        {!isAllPhotos && !selectMode && selectedAlbum && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSetAsCover(file.id);
            }}
            className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-sm text-white hover:bg-[var(--accent-gold)] hover:text-black rounded-md opacity-0 group-hover:opacity-100 transition-all"
            title="Set as album cover"
          >
            <ImageIcon size={14} />
          </button>
        )}

        {!isAllPhotos && !selectMode && !allPhotosSelectMode && (
          <>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 hover-only">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  enterSelectModeWithPhoto(file, index, isAllPhotos);
                }}
                className="flex flex-col items-center gap-1 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/80 transition-colors"
              >
                <MousePointer2 size={20} className="text-white" />
                <span className="text-xs text-white font-medium">Select</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openLightbox(file, index);
                }}
                className="flex flex-col items-center gap-1 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-[var(--accent-gold)] hover:text-black transition-colors"
              >
                <Eye size={20} className="text-white group-hover:text-inherit" />
                <span className="text-xs text-white font-medium group-hover:text-inherit">View</span>
              </button>
            </div>
            <div className="absolute bottom-2 right-2 touch-only">
              <div className="p-1.5 bg-black/50 backdrop-blur-sm rounded-full">
                <Eye size={14} className="text-white" />
              </div>
            </div>
          </>
        )}

        {isAllPhotos && !allPhotosSelectMode && (
          <>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 hover-only">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  enterSelectModeWithPhoto(file, index, true);
                }}
                className="flex flex-col items-center gap-1 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/80 transition-colors"
              >
                <MousePointer2 size={20} className="text-white" />
                <span className="text-xs text-white font-medium">Select</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openLightbox(file, index);
                }}
                className="flex flex-col items-center gap-1 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-[var(--accent-gold)] hover:text-black transition-colors"
              >
                <Eye size={20} className="text-white group-hover:text-inherit" />
                <span className="text-xs text-white font-medium group-hover:text-inherit">View</span>
              </button>
            </div>
            <div className="absolute bottom-2 right-2 touch-only">
              <div className="p-1.5 bg-black/50 backdrop-blur-sm rounded-full">
                <Eye size={14} className="text-white" />
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (selectedAlbum) {
    return (
      <div
        className="max-w-6xl mx-auto px-4 py-8 min-h-screen relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {dragOver && (
          <div className="fixed inset-0 bg-[rgba(var(--accent-primary-rgb),0.2)] backdrop-blur-sm z-40 flex items-center justify-center">
            <div
              className="bg-[var(--bg-primary)] border-2 border-dashed border-[var(--accent-gold)] rounded-2xl p-12 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload size={64} className="mx-auto mb-4 text-[var(--accent-gold)]" />
              <p className="text-xl text-[var(--text-primary)]">Drop files to upload</p>
              <p className="text-sm text-[var(--text-muted)] mt-2">Images, videos, and audio</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-3xl text-[var(--text-primary)]">{selectedAlbum.title}</h1>
            {selectedAlbum.description && (
              <p className="text-sm text-[var(--text-muted)] mt-1">{selectedAlbum.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!selectMode ? (
              <Button onClick={openUpload}>
                <Plus size={18} className="mr-2" /> Upload
              </Button>
            ) : (
              <>
                <span className="text-sm text-[var(--text-secondary)]">
                  {selectedIds.size} selected
                </span>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectMode(false);
                    setSelectedIds(new Set());
                    setAddToAlbumId('');
                    setLastSelectedIndex(null);
                  }}
                >
                  <X size={18} className="mr-1" /> Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {selectMode && selectedIds.size > 0 && (
          <Card className="mb-6 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-[var(--accent-gold)] hover:underline"
              >
                {selectedIds.size === sortedAlbumFiles.length ? 'Deselect All' : 'Select All'}
              </button>

              <Button variant="secondary" size="sm" onClick={handleRemoveFromAlbum}>
                <ArrowLeft size={16} className="mr-1" /> Remove from Album
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBulkDelete(Array.from(selectedIds))}
              >
                <Trash2 size={16} className="mr-1" /> Delete Selected
              </Button>

              <p className="text-xs text-[var(--text-muted)] ml-auto hover-only">
                Tip: Hold Shift and click to select a range
              </p>
            </div>
          </Card>
        )}

        {showUpload && (
          <MediaUpload
            albums={albums}
            onClose={handleUploadClose}
            onComplete={() => {
              fetchMedia();
              fetchAlbums();
            }}
            initialFiles={droppedFiles.length > 0 ? droppedFiles : undefined}
          />
        )}

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={() => setSelectedAlbum(null)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(var(--accent-primary-rgb),0.1)] text-[var(--accent-gold)] hover:bg-[rgba(var(--accent-primary-rgb),0.2)] transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to All Sections</span>
          </button>

          <div className="flex-1" />

          <div className="flex items-center bg-[var(--bg-secondary)] rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
              title="Grid view"
            >
              <Grid3X3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('masonry')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'masonry'
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
              title="Masonry view"
            >
              <LayoutGrid size={18} />
            </button>
          </div>

          {!selectMode && sortedAlbumFiles.length > 0 && (
            <TrainingTooltip tipId="media-album-select-button" content={TOOLTIPS['media-album-select-button']?.content || ''} position="bottom">
              <button
                onClick={() => setSelectMode(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <Check size={18} />
                <span className="text-sm">Select</span>
              </button>
            </TrainingTooltip>
          )}
        </div>

        {sortedAlbumFiles.length === 0 ? (
          <Card className="text-center py-16">
            <Image className="mx-auto mb-4 text-[var(--text-muted)]" size={64} />
            <h2 className="text-xl font-medium text-[var(--text-primary)] mb-2">
              This album is empty
            </h2>
            <p className="text-[var(--text-muted)] mb-6">
              Drag and drop media here to add them to this album
            </p>
            <Button onClick={openUpload}>
              <Plus size={18} className="mr-2" /> Upload Media
            </Button>
          </Card>
        ) : (
          <div
            className={
              viewMode === 'masonry'
                ? 'columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3'
                : 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3'
            }
          >
            {sortedAlbumFiles.map((file, index) =>
              renderMediaItem(file, index, selectedIds.has(file.id), false)
            )}

            <button
              onClick={openUpload}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--border-default)] hover:border-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/5 transition-colors ${
                viewMode === 'masonry' ? 'break-inside-avoid mb-3 py-12' : 'aspect-square'
              }`}
            >
              <Plus size={32} className="text-[var(--text-muted)] mb-2" />
              <span className="text-sm text-[var(--text-muted)]">Add Media</span>
            </button>
          </div>
        )}

        {!showUpload && !selectMode && (
          <button
            onClick={openUpload}
            className="fixed bottom-6 right-6 w-14 h-14 bg-[var(--accent-gold)] text-black rounded-full shadow-lg hover:bg-[var(--accent-gold)]/90 transition-colors flex items-center justify-center z-30"
            title="Upload media (U)"
          >
            <Plus size={28} />
          </button>
        )}

        {selectedFile && !selectMode && (
          <MediaLightbox
            file={selectedFile}
            files={sortedAlbumFiles}
            currentIndex={selectedIndex}
            uploaders={uploaders}
            canDelete={canDelete(selectedFile)}
            onClose={() => setSelectedFile(null)}
            onNavigate={handleNavigate}
            onDelete={handleDelete}
            onSetAsCover={handleSetAsCover}
            onRemoveFromAlbum={handleRemoveSingleFromAlbum}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="max-w-6xl mx-auto px-4 py-8 min-h-screen relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {trainingMode && <SectionWelcome sectionId="media" />}

      {dragOver && (
        <div className="fixed inset-0 bg-[rgba(var(--accent-primary-rgb),0.2)] backdrop-blur-sm z-40 flex items-center justify-center">
          <div
            className="bg-[var(--bg-primary)] border-2 border-dashed border-[var(--accent-gold)] rounded-2xl p-12 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <Upload size={64} className="mx-auto mb-4 text-[var(--accent-gold)]" />
            <p className="text-xl text-[var(--text-primary)]">Drop files to upload</p>
            <p className="text-sm text-[var(--text-muted)] mt-2">Images, videos, and audio</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <TrainingTooltip tipId="media-gallery-title" content={TOOLTIPS['media-gallery-title']?.content || ''} position="bottom">
            <h1 className="font-serif text-3xl text-[var(--text-primary)]">Media Gallery</h1>
          </TrainingTooltip>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {files.length} total items across {albums.length} albums
          </p>
        </div>
        <TrainingTooltip tipId="media-upload" content={TOOLTIPS['media-upload']?.content || ''} position="bottom">
          <Button onClick={openUpload}>
            <Plus size={18} className="mr-2" /> Upload
          </Button>
        </TrainingTooltip>
      </div>

      {showUpload && (
        <MediaUpload
          albums={albums}
          onClose={handleUploadClose}
          onComplete={() => {
            fetchMedia();
            fetchAlbums();
          }}
          initialFiles={droppedFiles.length > 0 ? droppedFiles : undefined}
        />
      )}

      {unclassifiedFiles.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <TrainingTooltip tipId="media-unclassified" content={TOOLTIPS['media-unclassified']?.content || ''} position="top">
              <div className="flex items-center gap-2">
                <FolderOpen size={20} className="text-[var(--text-muted)]" />
                <h2 className="text-xl font-medium text-[var(--text-primary)]">Unclassified</h2>
                <span className="text-sm text-[var(--text-muted)]">
                  ({unclassifiedFiles.length} item{unclassifiedFiles.length !== 1 ? 's' : ''})
                </span>
              </div>
            </TrainingTooltip>

            <div className="flex items-center gap-2">
              {selectMode ? (
                <>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {selectedIds.size} selected
                  </span>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-[var(--accent-gold)] hover:underline"
                  >
                    {selectedIds.size === sortedUnclassified.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectMode(false);
                      setSelectedIds(new Set());
                      setAddToAlbumId('');
                      setLastSelectedIndex(null);
                    }}
                  >
                    <X size={18} className="mr-1" /> Cancel
                  </Button>
                </>
              ) : (
                sortedUnclassified.length > 0 && (
                  <TrainingTooltip tipId="media-select-mode" content={TOOLTIPS['media-select-mode']?.content || ''} position="bottom">
                    <button
                      onClick={() => setSelectMode(true)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                      <Check size={18} />
                      <span className="text-sm">Select</span>
                    </button>
                  </TrainingTooltip>
                )
              )}
            </div>
          </div>

          {selectMode && selectedIds.size > 0 && (
            <Card className="mb-4 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <FolderPlus size={18} className="text-[var(--text-muted)]" />
                  <select
                    value={addToAlbumId}
                    onChange={(e) => setAddToAlbumId(e.target.value)}
                    className="px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                  >
                    <option value="">Add to album...</option>
                    {albums.map((album) => (
                      <option key={album.id} value={album.id}>
                        {album.title}
                      </option>
                    ))}
                  </select>
                  {addToAlbumId && (
                    <Button size="sm" onClick={handleAddToAlbum}>
                      <Check size={16} className="mr-1" /> Add
                    </Button>
                  )}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleBulkDelete(Array.from(selectedIds))}
                >
                  <Trash2 size={16} className="mr-1" /> Delete Selected
                </Button>

                <p className="text-xs text-[var(--text-muted)] ml-auto hover-only">
                  Tip: Hold Shift and click to select a range
                </p>
              </div>
            </Card>
          )}

          <div
            className={
              viewMode === 'masonry'
                ? 'columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3'
                : 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3'
            }
          >
            {sortedUnclassified.map((file, index) =>
              renderMediaItem(file, index, selectedIds.has(file.id), false)
            )}

            <button
              onClick={openUpload}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--border-default)] hover:border-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/5 transition-colors ${
                viewMode === 'masonry' ? 'break-inside-avoid mb-3 py-12' : 'aspect-square'
              }`}
            >
              <Plus size={32} className="text-[var(--text-muted)] mb-2" />
              <span className="text-sm text-[var(--text-muted)]">Add Media</span>
            </button>
          </div>
        </div>
      )}

      <div className="mb-8">
        <AlbumManager
          albums={albums}
          albumMediaCounts={albumMediaCounts}
          albumFirstPhotos={albumFirstPhotos}
          selectedAlbum={selectedAlbum}
          onSelectAlbum={setSelectedAlbum}
          onUpdate={fetchAlbums}
          isDraggingMedia={draggingMediaIds.length > 0}
          onDropMedia={handleDropOnAlbum}
        />
      </div>

      {classifiedFiles.length > 0 && (
        <div className="mb-8">
          <div className="mb-4">
            <TrainingTooltip tipId="media-search" content={TOOLTIPS['media-search']?.content || ''} position="bottom">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={allPhotosSearchQuery}
                  onChange={(e) => setAllPhotosSearchQuery(e.target.value)}
                  placeholder="Search photos by name, description, location, album, or uploader..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                />
                {allPhotosSearchQuery && (
                  <button
                    onClick={() => setAllPhotosSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </TrainingTooltip>
          </div>

          <div className="flex items-center justify-between mb-4">
            <TrainingTooltip tipId="media-all-photos" content={TOOLTIPS['media-all-photos']?.content || ''} position="top">
              <div className="flex items-center gap-2">
                <ImageIcon size={20} className="text-[var(--text-muted)]" />
                <h2 className="text-xl font-medium text-[var(--text-primary)]">All Photos</h2>
                <span className="text-sm text-[var(--text-muted)]">
                  ({searchFilteredClassified.length} item{searchFilteredClassified.length !== 1 ? 's' : ''})
                </span>
              </div>
            </TrainingTooltip>

            <div className="flex flex-wrap items-center gap-2">
              <TrainingTooltip tipId="media-filters" content={TOOLTIPS['media-filters']?.content || ''} position="bottom">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    showFilters || filterMode !== 'all'
                      ? 'bg-[rgba(var(--accent-primary-rgb),0.2)] text-[var(--accent-gold)]'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <Filter size={18} />
                  <span className="text-sm">Filters</span>
                </button>
              </TrainingTooltip>

              <TrainingTooltip tipId="media-sort" content={TOOLTIPS['media-sort']?.content || ''} position="bottom">
                <div className="relative">
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    <span className="text-sm">Sort</span>
                    <ChevronDown size={16} />
                  </button>
                {showSortMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-lg z-50">
                    <button
                      onClick={() => {
                        setSortMode('newest');
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors ${
                        sortMode === 'newest' ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      Newest
                    </button>
                    <button
                      onClick={() => {
                        setSortMode('oldest');
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors ${
                        sortMode === 'oldest' ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      Oldest
                    </button>
                    <button
                      onClick={() => {
                        setSortMode('alphabetical');
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors ${
                        sortMode === 'alphabetical' ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      Alphabetical
                    </button>
                    <button
                      onClick={() => {
                        setSortMode('dateTaken');
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors rounded-b-lg ${
                        sortMode === 'dateTaken' ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      Date Taken
                    </button>
                  </div>
                )}
                </div>
              </TrainingTooltip>

              {allPhotosSelectMode ? (
                <>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {allPhotosSelectedIds.size} selected
                  </span>
                  <button
                    onClick={handleAllPhotosSelectAll}
                    className="text-sm text-[var(--accent-gold)] hover:underline"
                  >
                    {allPhotosSelectedIds.size === sortedClassified.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAllPhotosSelectMode(false);
                      setAllPhotosSelectedIds(new Set());
                      setAllPhotosLastSelectedIndex(null);
                    }}
                  >
                    <X size={18} className="mr-1" /> Cancel
                  </Button>
                </>
              ) : (
                sortedClassified.length > 0 && (
                  <TrainingTooltip tipId="media-all-photos-select" content={TOOLTIPS['media-all-photos-select']?.content || ''} position="bottom">
                    <button
                      onClick={() => setAllPhotosSelectMode(true)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                      <Check size={18} />
                      <span className="text-sm">Select</span>
                    </button>
                  </TrainingTooltip>
                )
              )}
            </div>
          </div>

          {allPhotosSelectMode && allPhotosSelectedIds.size > 0 && (
            <Card className="mb-4 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleBulkDelete(Array.from(allPhotosSelectedIds))}
                >
                  <Trash2 size={16} className="mr-1" /> Delete Selected
                </Button>

                <p className="text-xs text-[var(--text-muted)] ml-auto hover-only">
                  Tip: Hold Shift and click to select a range
                </p>
              </div>
            </Card>
          )}

          {showFilters && (
            <Card className="mb-4 p-4">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-2">Media Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterMode('all')}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        filterMode === 'all'
                          ? 'bg-[var(--accent-gold)] text-black'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterMode('photos')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        filterMode === 'photos'
                          ? 'bg-[var(--accent-gold)] text-black'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <Image size={14} /> Photos
                    </button>
                    <button
                      onClick={() => setFilterMode('videos')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        filterMode === 'videos'
                          ? 'bg-[var(--accent-gold)] text-black'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <Video size={14} /> Videos
                    </button>
                    <button
                      onClick={() => setFilterMode('audio')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        filterMode === 'audio'
                          ? 'bg-[var(--accent-gold)] text-black'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <Music size={14} /> Audio
                    </button>
                  </div>
                </div>

                {filterMode !== 'all' && (
                  <div className="flex items-end">
                    <button
                      onClick={() => setFilterMode('all')}
                      className="text-sm text-[var(--accent-gold)] hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            </Card>
          )}

          <div
            className={
              viewMode === 'masonry'
                ? 'columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3'
                : 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3'
            }
          >
            {searchFilteredClassified.map((file, index) =>
              renderMediaItem(file, index, allPhotosSelectedIds.has(file.id), true, file.albumNames)
            )}
          </div>
        </div>
      )}

      {!showUpload && !selectMode && !allPhotosSelectMode && (
        <TrainingTooltip tipId="media-upload-fab" content={TOOLTIPS['media-upload-fab']?.content || ''} position="left">
          <button
            onClick={openUpload}
            className="fixed bottom-6 right-6 w-14 h-14 bg-[var(--accent-gold)] text-black rounded-full shadow-lg hover:bg-[var(--accent-gold)]/90 transition-colors flex items-center justify-center z-30"
            title="Upload media (U)"
          >
            <Plus size={28} />
          </button>
        </TrainingTooltip>
      )}

      {selectedFile && !selectMode && !allPhotosSelectMode && (
        <MediaLightbox
          file={selectedFile}
          files={sortedUnclassified}
          currentIndex={selectedIndex}
          uploaders={uploaders}
          canDelete={canDelete(selectedFile)}
          onClose={() => setSelectedFile(null)}
          onNavigate={handleNavigate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
