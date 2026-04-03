import { useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import {
  Upload,
  FileText,
  Video,
  Music,
  File,
  X,
  Loader2,
  Check,
} from 'lucide-react';

interface ContentUploadProps {
  contentType: 'joke' | 'story';
  contentId?: string | null;
  onUploadComplete: (fileUrl: string, fileType: string, fileName: string) => void;
  onTextExtracted?: (text: string) => void;
  allowedTypes?: ('text' | 'pdf' | 'video' | 'audio')[];
  className?: string;
}

const FILE_TYPE_CONFIG = {
  text: {
    accept: '.txt,.md,.doc,.docx',
    mimeTypes: ['text/plain', 'text/markdown', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    icon: FileText,
    label: 'Text',
    maxSize: 10 * 1024 * 1024,
  },
  pdf: {
    accept: '.pdf',
    mimeTypes: ['application/pdf'],
    icon: FileText,
    label: 'PDF',
    maxSize: 50 * 1024 * 1024,
  },
  video: {
    accept: '.mp4,.mov,.avi,.webm,.mkv',
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'],
    icon: Video,
    label: 'Video',
    maxSize: 500 * 1024 * 1024,
  },
  audio: {
    accept: '.mp3,.wav,.ogg,.m4a,.aac',
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/mp4'],
    icon: Music,
    label: 'Audio',
    maxSize: 100 * 1024 * 1024,
  },
};

export function ContentUpload({
  contentType,
  contentId,
  onUploadComplete,
  onTextExtracted,
  allowedTypes = ['text', 'pdf', 'video', 'audio'],
  className = '',
}: ContentUploadProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = allowedTypes
    .map((type) => FILE_TYPE_CONFIG[type].accept)
    .join(',');

  const getFileCategory = (file: File): keyof typeof FILE_TYPE_CONFIG | null => {
    for (const [key, config] of Object.entries(FILE_TYPE_CONFIG)) {
      if (config.mimeTypes.includes(file.type)) {
        return key as keyof typeof FILE_TYPE_CONFIG;
      }
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext && config.accept.includes(`.${ext}`)) {
        return key as keyof typeof FILE_TYPE_CONFIG;
      }
    }
    return null;
  };

  const validateFile = useCallback((file: File): boolean => {
    const category = getFileCategory(file);

    if (!category || !allowedTypes.includes(category)) {
      showError(`File type not allowed. Accepted types: ${allowedTypes.join(', ')}`);
      return false;
    }

    const config = FILE_TYPE_CONFIG[category];
    if (file.size > config.maxSize) {
      const maxMB = config.maxSize / (1024 * 1024);
      showError(`File too large. Maximum size for ${category}: ${maxMB}MB`);
      return false;
    }

    return true;
  }, [allowedTypes, showError]);

  const extractTextFromFile = async (file: File): Promise<string | null> => {
    const category = getFileCategory(file);

    if (category === 'text') {
      return await file.text();
    }

    return null;
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    if (!validateFile(file)) return;

    setUploading(true);
    setProgress(0);

    try {
      if (onTextExtracted) {
        const text = await extractTextFromFile(file);
        if (text) {
          onTextExtracted(text);
          setProgress(50);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${contentType}/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setProgress(80);

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);

      if (contentId) {
        await supabase.from('content_files').insert({
          content_type: contentType,
          content_id: contentId,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user.id,
        });
      }

      setProgress(100);
      onUploadComplete(urlData.publicUrl, file.type, file.name);
      success('File uploaded successfully');
      setSelectedFile(null);
    } catch (err) {
      showError('Failed to upload file');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        setSelectedFile(file);
      }
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const FileIcon = selectedFile
    ? FILE_TYPE_CONFIG[getFileCategory(selectedFile) || 'text']?.icon || File
    : File;

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileSelect}
        className="hidden"
      />

      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-primary-rgb),0.1)]'
              : 'border-[var(--border-default)] hover:border-[var(--accent-gold)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <Upload
            size={32}
            className={`mx-auto mb-3 ${
              dragOver ? 'text-[var(--accent-gold)]' : 'text-[var(--text-muted)]'
            }`}
          />
          <p className="text-[var(--text-primary)] font-medium mb-1">
            {dragOver ? 'Drop file here' : 'Click or drag file to upload'}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Supports: {allowedTypes.map((t) => FILE_TYPE_CONFIG[t].label).join(', ')}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 border border-[var(--border-default)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center">
              <FileIcon size={24} className="text-[var(--accent-gold)]" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-primary)] font-medium truncate">
                {selectedFile.name}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>

            {uploading ? (
              <div className="flex items-center gap-2">
                <Loader2 size={20} className="animate-spin text-[var(--accent-gold)]" />
                <span className="text-sm text-[var(--text-muted)]">{progress}%</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                >
                  <X size={20} />
                </button>
                <Button onClick={() => handleUpload(selectedFile)} size="sm">
                  <Check size={16} className="mr-1" /> Upload
                </Button>
              </div>
            )}
          </div>

          {uploading && (
            <div className="mt-3 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent-gold)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {allowedTypes.map((type) => {
          const config = FILE_TYPE_CONFIG[type];
          const Icon = config.icon;
          return (
            <div
              key={type}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-1 rounded"
            >
              <Icon size={12} />
              <span>{config.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
