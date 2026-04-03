import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useHub } from '../contexts/HubContext';
import { useToast } from '../contexts/ToastContext';
import { useTraining } from '../contexts/TrainingContext';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import ReservationManager from '../components/admin/ReservationManager';
import PropertyManager from '../components/admin/PropertyManager';
import BlackoutDateManager from '../components/admin/BlackoutDateManager';
import PropertyAttributeManager from '../components/admin/PropertyAttributeManager';
import MemberManager from '../components/admin/MemberManager';
import ThemeManager from '../components/admin/ThemeManager';
import { SectionWelcome } from '../components/training/SectionWelcome';
import { TrainingTooltip } from '../components/training/TrainingTooltip';
import { TOOLTIPS } from '../components/training/training-content';
import { Settings, Users, Building2, ClipboardList, CalendarOff, SlidersHorizontal } from 'lucide-react';

type PropertySubTab = 'reservations' | 'properties' | 'blackouts' | 'attributes';

export default function Admin() {
  const { profile } = useAuth();
  const { settings, refreshSettings } = useHub();
  const { success, error: showError } = useToast();
  const { trainingMode } = useTraining();
  const [activeTab, setActiveTab] = useState<'settings' | 'members' | 'properties'>('settings');
  const [propertySubTab, setPropertySubTab] = useState<PropertySubTab>('reservations');
  const [pendingCount, setPendingCount] = useState(0);
  const [hubSettings, setHubSettings] = useState({
    hub_name: settings?.hub_name || 'Family Hub',
    tagline: settings?.tagline || '',
    associated_family_names: settings?.associated_family_names || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setHubSettings({
        hub_name: settings.hub_name,
        tagline: settings.tagline || '',
        associated_family_names: settings.associated_family_names || '',
      });
    }
  }, [settings]);

  useEffect(() => {
    fetchPendingCount();
  }, []);

  const fetchPendingCount = async () => {
    const { count } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPendingCount(count || 0);
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from('hub_settings').update(hubSettings).eq('id', settings.id);
    if (error) {
      showError('Failed to save settings');
    } else {
      success('Settings saved');
      await refreshSettings();
    }
    setSaving(false);
  };

  if (!profile?.is_admin && !profile?.is_super_admin) {
    return <Navigate to="/" replace />;
  }

  const tabs: { id: 'settings' | 'members' | 'properties'; label: string; icon: typeof Settings; badge?: number }[] = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'properties', label: 'Properties', icon: Building2, badge: pendingCount > 0 ? pendingCount : undefined },
  ];

  const propertySubTabs = [
    { id: 'reservations', label: 'Reservations', icon: ClipboardList },
    { id: 'properties', label: 'Properties', icon: Building2 },
    { id: 'blackouts', label: 'Blackout Dates', icon: CalendarOff },
    { id: 'attributes', label: 'Custom Attributes', icon: SlidersHorizontal },
  ] as const;

  const getSectionId = () => {
    if (activeTab === 'settings') return 'admin-settings';
    if (activeTab === 'members') return 'admin-members';
    return 'admin-properties';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {trainingMode && <SectionWelcome sectionId={getSectionId()} />}

      <h1 className="font-serif text-3xl text-[var(--text-primary)] mb-6">Admin Dashboard</h1>

      <TrainingTooltip tipId="admin-tabs" content={TOOLTIPS['admin-tabs']?.content || ''} position="bottom">
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors relative ${
                activeTab === tab.id
                  ? 'bg-[var(--accent-gold)] text-[#0f0f0f]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
            <tab.icon size={18} /> {tab.label}
            {tab.badge && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                activeTab === tab.id
                  ? 'bg-[#0f0f0f]/20 text-[#0f0f0f]'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {tab.badge}
              </span>
            )}
            </button>
          ))}
        </div>
      </TrainingTooltip>

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-medium text-[var(--text-primary)] mb-4">Hub Settings</h2>
            <div className="space-y-4">
              <Input
                label="Hub Name"
                value={hubSettings.hub_name}
                onChange={(e) => setHubSettings({ ...hubSettings, hub_name: e.target.value })}
              />
              <Input
                label="Tagline"
                value={hubSettings.tagline}
                onChange={(e) => setHubSettings({ ...hubSettings, tagline: e.target.value })}
              />
              <div>
                <Input
                  label="Associated Family Names"
                  value={hubSettings.associated_family_names}
                  onChange={(e) => setHubSettings({ ...hubSettings, associated_family_names: e.target.value })}
                  placeholder="Enter family names separated by commas (e.g., Smith, Johnson, Williams)"
                />
                <p className="text-sm text-[var(--text-tertiary)] mt-1">
                  These names will rotate in the logo with visual effects
                </p>
              </div>
              <Button onClick={handleSaveSettings} loading={saving}>Save Settings</Button>
            </div>
          </Card>
          <ThemeManager />
        </div>
      )}

      {activeTab === 'members' && <MemberManager />}

      {activeTab === 'properties' && (
        <div className="space-y-6">
          <div className="flex gap-2 flex-wrap">
            {propertySubTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPropertySubTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  propertySubTab === tab.id
                    ? 'bg-[var(--accent-sage)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>

          {propertySubTab === 'reservations' && <ReservationManager />}
          {propertySubTab === 'properties' && <PropertyManager />}
          {propertySubTab === 'blackouts' && <BlackoutDateManager />}
          {propertySubTab === 'attributes' && <PropertyAttributeManager />}
        </div>
      )}
    </div>
  );
}
