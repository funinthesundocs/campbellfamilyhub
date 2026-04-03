import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Search, Image, FolderOpen, Check, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import type { MediaFile, Album } from '../../types';

interface MediaPickerModalProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function MediaPickerModal({ onSelect, onClose }: MediaPickerModalProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumMedia, setAlbumMedia] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const [mediaResult, albumsResult, albumItemsResult] = await Promise.all([
      supabase
        .from('media_files')
        .select('*')
        .eq('media_type', 'photo')
        .order('created_at', { ascending: false }),
      supabase
        .from('albums')
        .select('*')
        .order('title'),
      supabase
        .from('media_album_items')
        .select('album_id, media_id'),
    ]);

    setFiles(mediaResult.data || []);
    setAlbums(albumsResult.data || []);

    if (albumItemsResult.data) {
      const map: Record<string, string[]> = {};
      albumItemsResult.data.forEach((item) => {
        if (!map[item.album_id]) map[item.album_id] = [];
        map[item.album_id].push(item.media_id);
      });
      setAlbumMedia(map);
    }

    setLoading(false);
  };

  const allMediaInAlbums = useMemo(() => {
    const set = new Set<string>();
    Object.values(albumMedia).forEach((mediaIds) => {
      mediaIds.forEach((id) => set.add(id));
    });
    return set;
  }, [albumMedia]);

  const filteredFiles = useMemo(() => {
    let result = files;

    if (selectedAlbum) {
      const albumFiles = albumMedia[selectedAlbum.id] || [];
      result = result.filter((f) => albumFiles.includes(f.id));
    } else {
      result = result.filter((f) => !allMediaInAlbums.has(f.id));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.title?.toLowerCase().includes(query) ||
          f.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [files, selectedAlbum, albumMedia, allMediaInAlbums, searchQuery]);

  const handleSelect = () => {
    if (selectedFile) {
      onSelect(selectedFile.file_url);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--bg-primary)] rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col m-4 overflow-hidden border border-[var(--border-default)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <h2 className="text-lg font-medium text-[var(--text-primary)]">
            Select Image from Gallery
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-[var(--border-default)] space-y-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedAlbum ? (
              <button
                onClick={() => setSelectedAlbum(null)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(var(--accent-primary-rgb),0.1)] text-[var(--accent-gold)] hover:bg-[rgba(var(--accent-primary-rgb),0.2)] transition-colors text-sm"
              >
                <ArrowLeft size={16} />
                Back to Unclassified
              </button>
            ) : (
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                <FolderOpen size={16} />
                Unclassified Photos
              </div>
            )}

            {!selectedAlbum && albums.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-[var(--text-muted)]">Album:</span>
                <select
                  value=""
                  onChange={(e) => {
                    const album = albums.find((a) => a.id === e.target.value);
                    if (album) setSelectedAlbum(album);
                  }}
                  className="px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                >
                  <option value="">Browse albums...</option>
                  {albums.map((album) => (
                    <option key={album.id} value={album.id}>
                      {album.title} ({albumMedia[album.id]?.length || 0})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <Image
                className="mx-auto mb-3 text-[var(--text-muted)]"
                size={48}
              />
              <p className="text-[var(--text-secondary)]">
                {searchQuery
                  ? 'No images match your search'
                  : selectedAlbum
                  ? 'This album is empty'
                  : 'No unclassified photos'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  className={`relative aspect-square rounded-lg overflow-hidden bg-[var(--bg-tertiary)] transition-all ${
                    selectedFile?.id === file.id
                      ? 'ring-2 ring-[var(--accent-gold)]'
                      : 'hover:ring-2 hover:ring-[var(--accent-gold)]'
                  }`}
                >
                  <img
                    src={file.thumbnail_url || file.file_url}
                    alt={file.title || 'Photo'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {selectedFile?.id === file.id && (
                    <div className="absolute inset-0 bg-[rgba(var(--accent-primary-rgb),0.2)] flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-[var(--accent-gold)] flex items-center justify-center">
                        <Check size={18} className="text-black" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--border-default)] flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            {filteredFiles.length} image{filteredFiles.length !== 1 ? 's' : ''}{' '}
            available
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSelect} disabled={!selectedFile}>
              <Check size={16} className="mr-2" />
              Select Image
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
