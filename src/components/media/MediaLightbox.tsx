import { useEffect, useCallback, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2, Calendar, MapPin, Download, Loader, Share2, ImageIcon, FolderMinus } from 'lucide-react';
import { formatDate, getInitials } from '../../lib/utils';
import type { MediaFile, UserProfile } from '../../types';

interface MediaLightboxProps {
  file: MediaFile;
  files: MediaFile[];
  currentIndex: number;
  uploaders: Record<string, UserProfile>;
  canDelete: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDelete: (id: string) => void;
  onSetAsCover?: (mediaId: string) => void;
  onRemoveFromAlbum?: (mediaId: string) => void;
}

export function MediaLightbox({
  file,
  files,
  currentIndex,
  uploaders,
  canDelete,
  onClose,
  onNavigate,
  onDelete,
  onSetAsCover,
  onRemoveFromAlbum,
}: MediaLightboxProps) {
  const [downloading, setDownloading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && files.length > 1) {
        const newIndex = (currentIndex - 1 + files.length) % files.length;
        onNavigate(newIndex);
      }
      if (e.key === 'ArrowRight' && files.length > 1) {
        const newIndex = (currentIndex + 1) % files.length;
        onNavigate(newIndex);
      }
    },
    [currentIndex, files.length, onClose, onNavigate]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  useEffect(() => {
    setImageLoaded(false);
  }, [file.id]);

  const navigatePrev = () => {
    const newIndex = (currentIndex - 1 + files.length) % files.length;
    onNavigate(newIndex);
  };

  const navigateNext = () => {
    const newIndex = (currentIndex + 1) % files.length;
    onNavigate(newIndex);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(file.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const extension = file.mime_type?.split('/')[1] || 'jpg';
      link.download = `${file.title || 'download'}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      window.open(file.file_url, '_blank');
    }
    setDownloading(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: file.title || 'Family Photo',
          url: file.file_url,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(file.file_url);
        }
      }
    } else {
      navigator.clipboard.writeText(file.file_url);
    }
  };

  const handleDeleteClick = () => {
    onDelete(file.id);
  };

  const uploader = uploaders[file.uploaded_by];

  const visibleThumbnails = files.length > 7
    ? files.slice(
        Math.max(0, Math.min(currentIndex - 3, files.length - 7)),
        Math.max(7, Math.min(currentIndex + 4, files.length))
      )
    : files;

  const thumbnailStartIndex = files.length > 7
    ? Math.max(0, Math.min(currentIndex - 3, files.length - 7))
    : 0;

  return (
    <div
      className="fixed inset-0 bg-black/95 flex flex-col z-50"
      onClick={onClose}
    >
      <div className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center gap-4 text-white/60 text-sm">
          <span>
            {currentIndex + 1} / {files.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onSetAsCover && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetAsCover(file.id);
              }}
              className="p-2 text-white/70 hover:text-[var(--accent-gold)] hover:bg-white/10 rounded-lg transition-colors"
              title="Set as album cover"
            >
              <ImageIcon size={20} />
            </button>
          )}
          {onRemoveFromAlbum && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromAlbum(file.id);
              }}
              className="p-2 text-white/70 hover:text-orange-400 hover:bg-white/10 rounded-lg transition-colors"
              title="Move to unclassified"
            >
              <FolderMinus size={20} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Share"
          >
            <Share2 size={20} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            disabled={downloading}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            title="Download"
          >
            {downloading ? (
              <Loader size={20} className="animate-spin" />
            ) : (
              <Download size={20} />
            )}
          </button>
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick();
              }}
              className="p-2 text-white/70 hover:text-red-500 hover:bg-white/10 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-2"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {files.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigatePrev();
            }}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
          >
            <ChevronLeft size={28} className="sm:w-8 sm:h-8" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateNext();
            }}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
          >
            <ChevronRight size={28} className="sm:w-8 sm:h-8" />
          </button>
        </>
      )}

      <div
        className="flex-1 flex items-center justify-center p-4 pt-16 pb-32 sm:p-16 sm:pb-40"
        onClick={(e) => e.stopPropagation()}
      >
        {file.media_type === 'video' ? (
          <video
            key={file.id}
            src={file.file_url}
            controls
            autoPlay
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        ) : (
          <div className="relative max-w-full max-h-full">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader size={32} className="text-white/50 animate-spin" />
              </div>
            )}
            <img
              key={file.id}
              src={file.file_url}
              alt={file.title || 'Media'}
              className={`max-w-full max-h-full object-contain rounded-lg transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>
        )}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 sm:p-6 pt-12 sm:pt-16"
        onClick={(e) => e.stopPropagation()}
      >
        {files.length > 1 && (
          <div className="flex justify-center gap-1 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            {visibleThumbnails.map((f, i) => {
              const actualIndex = thumbnailStartIndex + i;
              return (
                <button
                  key={f.id}
                  onClick={() => onNavigate(actualIndex)}
                  className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    actualIndex === currentIndex
                      ? 'border-[var(--accent-gold)] scale-110'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={f.thumbnail_url || f.file_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          {file.title && (
            <h3 className="text-white text-lg sm:text-xl font-medium mb-1">{file.title}</h3>
          )}
          {file.description && (
            <p className="text-white/80 text-sm sm:text-base mb-2">{file.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-1 text-white/60 text-xs sm:text-sm">
            {uploader && (
              <div className="flex items-center gap-2">
                {uploader.avatar_url ? (
                  <img
                    src={uploader.avatar_url}
                    alt=""
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[rgba(var(--accent-primary-rgb),0.2)] flex items-center justify-center">
                    <span className="text-[10px] sm:text-xs text-[var(--accent-gold)]">
                      {getInitials(uploader.display_name)}
                    </span>
                  </div>
                )}
                <span>{uploader.display_name}</span>
              </div>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={12} className="sm:w-3.5 sm:h-3.5" />
              {formatDate(file.created_at)}
            </span>
            {file.location_name && (
              <span className="flex items-center gap-1">
                <MapPin size={12} className="sm:w-3.5 sm:h-3.5" />
                {file.location_name}
              </span>
            )}
            {file.file_size && (
              <span className="text-white/40">
                {(file.file_size / (1024 * 1024)).toFixed(1)} MB
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
