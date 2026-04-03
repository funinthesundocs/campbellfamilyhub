import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import AvatarUpload from '../profile/AvatarUpload';
import { X } from 'lucide-react';
import type { UserProfile } from '../../types';

interface EditMemberModalProps {
  member: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RELATIONSHIP_TYPES = [
  { value: 'patriarch', label: 'Patriarch' },
  { value: 'matriarch', label: 'Matriarch' },
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'aunt', label: 'Aunt' },
  { value: 'uncle', label: 'Uncle' },
  { value: 'cousin', label: 'Cousin' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'in-law', label: 'In-Law' },
  { value: 'friend-of-family', label: 'Friend of Family' },
  { value: 'other', label: 'Other' },
];

const USER_TYPES = [
  { value: 'family', label: 'Family Member', description: 'Full access to all family features' },
  { value: 'guest', label: 'Guest', description: 'Limited access, can view but not edit' },
  { value: 'admin', label: 'Admin', description: 'Can manage members and settings' },
] as const;

type UserType = typeof USER_TYPES[number]['value'];

export default function EditMemberModal({ member, isOpen, onClose, onSuccess }: EditMemberModalProps) {
  const { profile: currentUser } = useAuth();
  const { success } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [birthday, setBirthday] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [userType, setUserType] = useState<UserType>('family');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (member) {
      setDisplayName(member.display_name || '');
      setBio(member.bio || '');
      setPhone(member.phone || '');
      setLocation(member.location || '');
      setBirthday(member.birthday || '');
      setRelationshipType(member.relationship_type || '');
      setUserType(member.user_type || 'family');
      setAvatarUrl(member.avatar_url || null);
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setError('');
    setSaving(true);

    try {
      const updates: Record<string, unknown> = {
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        phone: phone.trim() || null,
        location: location.trim() || null,
        birthday: birthday.trim() === '' ? null : birthday.trim(),
        relationship_type: relationshipType.trim() || null,
      };

      if (currentUser?.is_super_admin && !member.is_super_admin) {
        updates.user_type = userType;
        updates.is_admin = userType === 'admin';
      }

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', member.id);

      if (updateError) throw updateError;

      success('Member updated successfully');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[var(--bg-tertiary)]">
          <h2 className="text-xl font-display text-[var(--text-primary)]">Edit Member</h2>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center gap-4 p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <AvatarUpload
              userId={member.id}
              currentAvatarUrl={avatarUrl}
              displayName={displayName || member.display_name}
              size="md"
              onUploadComplete={(newUrl) => setAvatarUrl(newUrl)}
              onRemove={() => setAvatarUrl(null)}
            />
            <div>
              <p className="text-sm text-[var(--text-muted)]">Email (cannot be changed)</p>
              <p className="text-[var(--text-primary)]">{member.email}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Click photo to change</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Display Name <span className="text-red-400">*</span>
            </label>
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Short bio..."
              rows={3}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Phone
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Location
            </label>
            <Input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Birthday
            </label>
            <Input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Relationship
            </label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
            >
              <option value="">Select relationship...</option>
              {RELATIONSHIP_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {currentUser?.is_super_admin && !member.is_super_admin && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                User Type
              </label>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value as UserType)}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
              >
                {USER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {USER_TYPES.find(t => t.value === userType)?.description}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
