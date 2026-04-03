import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Camera, Loader, X } from 'lucide-react';
import { getInitials } from '../../lib/utils';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  displayName: string;
  size?: 'sm' | 'md' | 'lg';
  onUploadComplete: (newUrl: string) => void;
  onRemove?: () => void;
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-20 h-20',
  lg: 'w-28 h-28',
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
};

const textSizes = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
};

export default function AvatarUpload({
  userId,
  currentAvatarUrl,
  displayName,
  size = 'md',
  onUploadComplete,
  onRemove,
}: AvatarUploadProps) {
  const { success, error: showError } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('Image must be less than 5MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    setUploading(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const path = `avatars/${userId}-${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      success('Profile picture updated');
      onUploadComplete(publicUrl);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to upload image');
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!currentAvatarUrl || !onRemove) return;

    setUploading(true);
    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (updateError) throw updateError;

      success('Profile picture removed');
      setPreview(null);
      onRemove();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to remove image');
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = preview || currentAvatarUrl;

  return (
    <div className="relative inline-block">
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`${sizeClasses[size]} rounded-full relative cursor-pointer group overflow-hidden`}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[rgba(var(--accent-primary-rgb),0.2)] flex items-center justify-center">
            <span className={`${textSizes[size]} font-medium text-[var(--accent-gold)]`}>
              {getInitials(displayName)}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader size={iconSizes[size]} className="text-white animate-spin" />
          ) : (
            <Camera size={iconSizes[size]} className="text-white" />
          )}
        </div>
      </div>

      {displayUrl && onRemove && !uploading && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors shadow-lg"
        >
          <X size={12} />
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
