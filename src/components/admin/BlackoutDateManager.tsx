import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Trash2, Calendar, X, Building2 } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import type { Property } from '../../types';

interface BlackoutDate {
  id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  property?: Property;
}

export default function BlackoutDateManager() {
  const { profile } = useAuth();
  const { success, error: showError } = useToast();
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    property_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: propertiesData }, { data: blackoutData }] = await Promise.all([
      supabase.from('properties').select('*').order('name'),
      supabase.from('property_blackout_dates').select('*').order('start_date', { ascending: true }),
    ]);

    setProperties(propertiesData || []);

    if (blackoutData) {
      const enriched = blackoutData.map(bd => ({
        ...bd,
        property: propertiesData?.find(p => p.id === bd.property_id),
      }));
      setBlackoutDates(enriched);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.property_id) {
      showError('Please select a property');
      return;
    }
    if (!form.start_date || !form.end_date) {
      showError('Please select dates');
      return;
    }

    const startDate = new Date(form.start_date);
    const endDate = new Date(form.end_date);

    if (startDate > endDate) {
      showError('End date must be after start date');
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('property_blackout_dates').insert({
      property_id: form.property_id,
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason.trim() || null,
      created_by: profile?.id,
    });

    if (error) {
      showError('Failed to add blackout dates');
    } else {
      success('Blackout dates added');
      setShowForm(false);
      setForm({ property_id: '', start_date: '', end_date: '', reason: '' });
      fetchData();
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove these blackout dates?')) return;

    const { error } = await supabase.from('property_blackout_dates').delete().eq('id', id);
    if (error) {
      showError('Failed to delete blackout dates');
    } else {
      success('Blackout dates removed');
      fetchData();
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const upcomingBlackouts = blackoutDates.filter(bd => bd.end_date >= today);
  const pastBlackouts = blackoutDates.filter(bd => bd.end_date < today);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-16 bg-[var(--bg-tertiary)] rounded" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showForm ? (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-[var(--text-primary)]">Add Blackout Dates</h3>
            <button
              onClick={() => setShowForm(false)}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Property *</label>
              <select
                value={form.property_id}
                onChange={(e) => setForm({ ...form, property_id: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                required
              >
                <option value="">Select property...</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date *"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
              />
              <Input
                label="End Date *"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                min={form.start_date || undefined}
                required
              />
            </div>

            <Input
              label="Reason (optional)"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Maintenance, family hold, renovation..."
            />

            <div className="flex gap-2">
              <Button type="submit" loading={saving} className="flex-1">
                <Calendar size={16} className="mr-2" /> Add Blackout Dates
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button onClick={() => setShowForm(true)}>
          <Plus size={18} className="mr-2" /> Add Blackout Dates
        </Button>
      )}

      {properties.length === 0 ? (
        <Card className="text-center py-8">
          <Building2 className="mx-auto mb-3 text-[var(--text-muted)]" size={32} />
          <p className="text-[var(--text-secondary)]">No properties available</p>
          <p className="text-sm text-[var(--text-muted)]">Add a property first to manage blackout dates</p>
        </Card>
      ) : upcomingBlackouts.length === 0 && pastBlackouts.length === 0 ? (
        <Card className="text-center py-8">
          <Calendar className="mx-auto mb-3 text-[var(--text-muted)]" size={32} />
          <p className="text-[var(--text-secondary)]">No blackout dates</p>
          <p className="text-sm text-[var(--text-muted)]">Properties are available for booking</p>
        </Card>
      ) : (
        <>
          {upcomingBlackouts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Active & Upcoming</h3>
              <div className="space-y-2">
                {upcomingBlackouts.map(bd => (
                  <Card key={bd.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{bd.property?.name}</p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {formatDate(bd.start_date)} - {formatDate(bd.end_date)}
                      </p>
                      {bd.reason && (
                        <p className="text-xs text-[var(--text-muted)] mt-1">{bd.reason}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(bd.id)}
                      className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {pastBlackouts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">Past</h3>
              <div className="space-y-2 opacity-60">
                {pastBlackouts.slice(0, 5).map(bd => (
                  <Card key={bd.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{bd.property?.name}</p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {formatDate(bd.start_date)} - {formatDate(bd.end_date)}
                      </p>
                      {bd.reason && (
                        <p className="text-xs text-[var(--text-muted)] mt-1">{bd.reason}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(bd.id)}
                      className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
