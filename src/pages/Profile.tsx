import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import AvatarUpload from '../components/profile/AvatarUpload';
import { TrainingToggle } from '../components/training/TrainingToggle';
import { User, Mail, Phone, MapPin, Calendar, Sun, Moon, Star, CalendarCheck } from 'lucide-react';
import { formatDateOnly } from '../lib/utils';

export default function Profile() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { success, error: showError } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    phone: profile?.phone || '',
    location: profile?.location || '',
    birthday: profile?.birthday || '',
  });

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('user_profiles').update(form).eq('id', profile.id);
    if (error) {
      showError('Failed to update profile');
    } else {
      success('Profile updated');
      await refreshProfile();
      setEditing(false);
    }
    setSaving(false);
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-serif text-3xl text-[var(--text-primary)] mb-6">Your Profile</h1>

      <Card className="mb-6">
        <div className="flex items-center gap-4 mb-6">
          <AvatarUpload
            userId={profile.id}
            currentAvatarUrl={profile.avatar_url}
            displayName={profile.display_name}
            size="lg"
            onUploadComplete={() => refreshProfile()}
            onRemove={() => refreshProfile()}
          />
          <div>
            <h2 className="text-xl font-medium text-[var(--text-primary)]">{profile.display_name}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{profile.email}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Click photo to change</p>
            {profile.is_admin && (
              <span className="inline-block px-2 py-0.5 text-xs bg-[rgba(var(--accent-primary-rgb),0.2)] text-[var(--accent-gold)] rounded-full mt-1">Admin</span>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <Input
              label="Display Name"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                rows={3}
              />
            </div>
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <Input
              label="Birthday"
              type="date"
              value={form.birthday}
              onChange={(e) => setForm({ ...form, birthday: e.target.value })}
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} loading={saving}>Save Changes</Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {profile.bio && <p className="text-[var(--text-secondary)]">{profile.bio}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Mail size={16} /> {profile.email}
              </div>
              {profile.phone && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Phone size={16} /> {profile.phone}
                </div>
              )}
              {profile.location && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <MapPin size={16} /> {profile.location}
                </div>
              )}
              {profile.birthday && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Calendar size={16} /> {formatDateOnly(profile.birthday)}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <User size={18} className="mr-2" /> Edit Profile
              </Button>
              <Button variant="secondary" onClick={() => navigate('/reservations')}>
                <CalendarCheck size={18} className="mr-2" /> My Reservations
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <h3 className="font-medium text-[var(--text-primary)] mb-4">Theme Preference</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setTheme('original')}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              theme === 'original' ? 'bg-[var(--accent-gold)] text-[#0f0f0f]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
            }`}
          >
            <Star size={18} /> Gray
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'bg-[var(--accent-gold)] text-[#0f0f0f]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
            }`}
          >
            <Moon size={18} /> Dark
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              theme === 'light' ? 'bg-[var(--accent-gold)] text-[#0f0f0f]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
            }`}
          >
            <Sun size={18} /> Light
          </button>
        </div>
      </Card>

      <Card>
        <h3 className="font-medium text-[var(--text-primary)] mb-4">Explanation & Help</h3>
        <TrainingToggle variant="standalone" />
      </Card>
    </div>
  );
}
