import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Upload, X, Image, Video, CheckCircle, AlertCircle, Loader, Plus, Music } from 'lucide-react';
import type { Album } from '../../types';

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

interface MediaUploadProps {
  albums: Album[];
  onClose: () => void;
  onComplete: () => void;
  initialFiles?: File[];
}

export function MediaUpload({ albums, onClose, onComplete, initialFiles }: MediaUploadProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const initialFilesProcessedRef = useRef(false);

  const processFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const validFiles: UploadFile[] = [];
      const fileArray = Array.from(newFiles);

      for (const file of fileArray) {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
          showError(`${file.name} is not a supported format`);
          continue;
        }

        const maxSize = file.type.startsWith('video/')
          ? 100 * 1024 * 1024
          : file.type.startsWith('audio/')
          ? 50 * 1024 * 1024
          : 20 * 1024 * 1024;
        if (file.size > maxSize) {
          const sizeLimit = file.type.startsWith('video/') ? '100MB' : file.type.startsWith('audio/') ? '50MB' : '20MB';
          showError(`${file.name} is too large (max ${sizeLimit})`);
          continue;
        }

        validFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
          progress: 0,
          status: 'pending',
        });
      }

      setFiles((prev) => [...prev, ...validFiles]);
    },
    [showError]
  );

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0 && !initialFilesProcessedRef.current) {
      initialFilesProcessedRef.current = true;
      processFiles(initialFiles);
    }
  }, [initialFiles, processFiles]);

  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
    };
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setDragActive(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        e.target.value = '';
      }
    },
    [processFiles]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => {
        if (f.status === 'complete' && f.preview) {
          URL.revokeObjectURL(f.preview);
        }
      });
      return prev.filter((f) => f.status !== 'complete');
    });
  }, []);

  const generateVideoThumbnail = useCallback(async (videoFile: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          resolve(null);
          return;
        }

        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = () => {
          video.currentTime = Math.min(1, video.duration / 2);
        };

        video.onseeked = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(video.src);
              resolve(blob);
            },
            'image/jpeg',
            0.85
          );
        };

        video.onerror = () => {
          URL.revokeObjectURL(video.src);
          resolve(null);
        };

        video.src = URL.createObjectURL(videoFile);
      } catch (error) {
        resolve(null);
      }
    });
  }, []);

  const uploadFiles = async () => {
    if (!user || files.length === 0) return;
    setUploading(true);

    let successCount = 0;
    let errorCount = 0;

    const filesToUpload = files.filter(
      (f) => f.status === 'pending' || f.status === 'error'
    );

    for (const uploadFile of filesToUpload) {
      const fileIndex = files.findIndex((f) => f.id === uploadFile.id);
      if (fileIndex === -1) continue;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f
        )
      );

      try {
        const ext = uploadFile.file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const path = `${user.id}/${uniqueId}.${ext}`;

        setFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: 30 } : f))
        );

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(path, uploadFile.file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        setFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: 70 } : f))
        );

        const {
          data: { publicUrl },
        } = supabase.storage.from('media').getPublicUrl(path);

        const mediaType = uploadFile.file.type.startsWith('video/')
          ? 'video'
          : uploadFile.file.type.startsWith('audio/')
          ? 'audio'
          : 'photo';

        let thumbnailUrl = mediaType === 'photo' ? publicUrl : null;

        if (mediaType === 'video') {
          try {
            const thumbnailBlob = await generateVideoThumbnail(uploadFile.file);
            if (thumbnailBlob) {
              const thumbnailPath = `${user.id}/thumbnails/${uniqueId}.jpg`;
              const { error: thumbUploadError } = await supabase.storage
                .from('media')
                .upload(thumbnailPath, thumbnailBlob, {
                  cacheControl: '3600',
                  upsert: false,
                  contentType: 'image/jpeg',
                });

              if (!thumbUploadError) {
                const {
                  data: { publicUrl: thumbPublicUrl },
                } = supabase.storage.from('media').getPublicUrl(thumbnailPath);
                thumbnailUrl = thumbPublicUrl;
              }
            }
          } catch (error) {
            console.error('Thumbnail generation failed:', error);
          }
        }

        const { data: mediaData, error: dbError } = await supabase
          .from('media_files')
          .insert({
            title: caption || uploadFile.file.name.replace(/\.[^/.]+$/, ''),
            description: null,
            file_url: publicUrl,
            thumbnail_url: thumbnailUrl,
            media_type: mediaType,
            file_size: uploadFile.file.size,
            mime_type: uploadFile.file.type,
            location_name: location || null,
            uploaded_by: user.id,
          })
          .select('id')
          .single();

        if (dbError) throw dbError;

        if (selectedAlbum && mediaData) {
          await supabase.from('media_album_items').insert({
            album_id: selectedAlbum,
            media_id: mediaData.id,
          });
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'complete', progress: 100 } : f
          )
        );

        successCount++;
      } catch (err) {
        console.error('Upload error:', err);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: 'error',
                  progress: 0,
                  error: err instanceof Error ? err.message : 'Upload failed',
                }
              : f
          )
        );
        errorCount++;
      }
    }

    setUploading(false);

    if (successCount > 0) {
      success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded`);
      onComplete();
    }
    if (errorCount > 0) {
      showError(`${errorCount} file${errorCount > 1 ? 's' : ''} failed`);
    }
  };

  const pendingFiles = files.filter((f) => f.status === 'pending' || f.status === 'error');
  const completedFiles = files.filter((f) => f.status === 'complete');

  return (
    <Card className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-[var(--text-primary)]">Upload Media</h2>
        <button
          onClick={onClose}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X size={20} />
        </button>
      </div>

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          dragActive
            ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-primary-rgb),0.1)]'
            : 'border-[var(--border-default)] hover:border-[var(--border-hover)]'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto mb-3 text-[var(--text-muted)]" size={40} />
        <p className="text-[var(--text-secondary)] mb-1">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Images up to 20MB | Videos up to 100MB | Audio up to 50MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-[var(--text-secondary)]">
              {pendingFiles.length > 0 && `${pendingFiles.length} ready to upload`}
              {pendingFiles.length > 0 && completedFiles.length > 0 && ' | '}
              {completedFiles.length > 0 && `${completedFiles.length} uploaded`}
            </p>
            <div className="flex gap-2">
              {completedFiles.length > 0 && (
                <button
                  onClick={clearCompleted}
                  className="text-xs text-[var(--accent-gold)] hover:underline"
                >
                  Clear completed
                </button>
              )}
              {files.length > 0 && !uploading && (
                <button
                  onClick={() => {
                    files.forEach((f) => {
                      if (f.preview) URL.revokeObjectURL(f.preview);
                    });
                    setFiles([]);
                  }}
                  className="text-xs text-[var(--text-muted)] hover:text-red-500"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 mb-4">
            {files.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className="relative aspect-square rounded-lg overflow-hidden bg-[var(--bg-tertiary)]"
              >
                {uploadFile.file.type.startsWith('image/') ? (
                  <img
                    src={uploadFile.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : uploadFile.file.type.startsWith('video/') ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <Video size={20} className="text-[var(--text-muted)] mb-1" />
                    <span className="text-[10px] text-[var(--text-muted)] px-1 truncate max-w-full">
                      {uploadFile.file.name}
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <Music size={20} className="text-[var(--text-muted)] mb-1" />
                    <span className="text-[10px] text-[var(--text-muted)] px-1 truncate max-w-full">
                      {uploadFile.file.name}
                    </span>
                  </div>
                )}

                {uploadFile.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                    <Loader size={20} className="text-white animate-spin mb-2" />
                    <div className="w-3/4 h-1 bg-white/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-gold)] transition-all duration-300"
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {uploadFile.status === 'complete' && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <CheckCircle size={24} className="text-green-500" />
                  </div>
                )}

                {uploadFile.status === 'error' && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-1">
                    <AlertCircle size={20} className="text-red-500 mb-1" />
                    <span className="text-[10px] text-red-400 text-center line-clamp-2">
                      {uploadFile.error || 'Failed'}
                    </span>
                  </div>
                )}

                {uploadFile.status !== 'uploading' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(uploadFile.id);
                    }}
                    className="absolute top-1 right-1 p-0.5 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <X size={12} />
                  </button>
                )}

                <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="flex items-center gap-1">
                    {uploadFile.file.type.startsWith('image/') ? (
                      <Image size={10} className="text-white/80" />
                    ) : uploadFile.file.type.startsWith('video/') ? (
                      <Video size={10} className="text-white/80" />
                    ) : (
                      <Music size={10} className="text-white/80" />
                    )}
                    <span className="text-[9px] text-white/80">
                      {(uploadFile.file.size / (1024 * 1024)).toFixed(1)}MB
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-[var(--border-default)] hover:border-[var(--accent-gold)] hover:bg-[rgba(var(--accent-primary-rgb),0.05)] flex flex-col items-center justify-center transition-colors"
            >
              <Plus size={24} className="text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)] mt-1">Add more</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Input
              label="Caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              disabled={uploading}
            />
            <Input
              label="Location (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where was this taken?"
              disabled={uploading}
            />
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Add to Album
              </label>
              <select
                value={selectedAlbum}
                onChange={(e) => setSelectedAlbum(e.target.value)}
                disabled={uploading}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              >
                <option value="">No album</option>
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={uploadFiles}
              loading={uploading}
              disabled={pendingFiles.length === 0}
            >
              {uploading
                ? 'Uploading...'
                : `Upload ${pendingFiles.length} File${pendingFiles.length !== 1 ? 's' : ''}`}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              {completedFiles.length > 0 ? 'Done' : 'Cancel'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
