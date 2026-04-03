import { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Users, FileText, AlertTriangle, DollarSign } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';

interface Property {
  id: string;
  name: string;
  max_guests?: number;
  price_per_night?: number;
  cleaning_fee?: number;
}

interface Reservation {
  id: string;
  property_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  guest_count: number;
  guests_names: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  admin_notes: string | null;
  nightly_rate?: number;
  cleaning_fee?: number;
  property?: Property;
  user?: { display_name: string };
}

interface EditReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  onSave: () => void;
}

type ReservationStatus = 'pending' | 'approved' | 'denied' | 'cancelled';

export function EditReservationModal({
  isOpen,
  onClose,
  reservation,
  onSave,
}: EditReservationModalProps) {
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [propertyDetails, setPropertyDetails] = useState<Property | null>(null);
  const [form, setForm] = useState({
    start_date: '',
    end_date: '',
    guest_count: 1,
    guests_names: '',
    notes: '',
    admin_notes: '',
    status: 'pending' as ReservationStatus,
  });

  useEffect(() => {
    if (reservation && isOpen) {
      setForm({
        start_date: reservation.start_date.split('T')[0],
        end_date: reservation.end_date.split('T')[0],
        guest_count: reservation.guest_count,
        guests_names: reservation.guests_names || '',
        notes: reservation.notes || '',
        admin_notes: reservation.admin_notes || '',
        status: reservation.status,
      });
      setConflicts([]);
      setShowCancelConfirm(false);
      fetchPropertyDetails();
    }
  }, [reservation, isOpen]);

  const fetchPropertyDetails = async () => {
    if (!reservation) return;
    const { data } = await supabase
      .from('properties')
      .select('id, name, max_guests, price_per_night, cleaning_fee')
      .eq('id', reservation.property_id)
      .maybeSingle();
    if (data) {
      setPropertyDetails(data);
    }
  };

  const pricing = useMemo(() => {
    if (!form.start_date || !form.end_date || !propertyDetails) {
      return {
        nights: 0,
        nightlyRate: reservation?.nightly_rate || 0,
        cleaningFee: reservation?.cleaning_fee || 0,
        subtotal: 0,
        total: 0,
      };
    }

    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const nightlyRate = reservation?.nightly_rate || propertyDetails.price_per_night || 0;
    const cleaningFee = reservation?.cleaning_fee || propertyDetails.cleaning_fee || 0;
    const subtotal = nights * nightlyRate;
    const total = subtotal + cleaningFee;

    return {
      nights,
      nightlyRate,
      cleaningFee,
      subtotal,
      total,
    };
  }, [form.start_date, form.end_date, propertyDetails, reservation]);

  useEffect(() => {
    if (form.start_date && form.end_date && reservation) {
      validateDates();
    }
  }, [form.start_date, form.end_date]);

  const validateDates = async () => {
    if (!reservation) return;
    setValidating(true);
    const issues: string[] = [];

    const { data: blackouts } = await supabase
      .from('blackout_dates')
      .select('*')
      .eq('property_id', reservation.property_id)
      .or(`start_date.lte.${form.end_date},end_date.gte.${form.start_date}`);

    if (blackouts && blackouts.length > 0) {
      for (const blackout of blackouts) {
        if (form.start_date <= blackout.end_date && form.end_date >= blackout.start_date) {
          issues.push(`Blackout: ${blackout.reason || 'Property unavailable'} (${blackout.start_date} - ${blackout.end_date})`);
        }
      }
    }

    const { data: overlapping } = await supabase
      .from('reservations')
      .select('*')
      .eq('property_id', reservation.property_id)
      .neq('id', reservation.id)
      .in('status', ['approved', 'pending'])
      .or(`start_date.lte.${form.end_date},end_date.gte.${form.start_date}`);

    if (overlapping && overlapping.length > 0) {
      for (const res of overlapping) {
        if (form.start_date <= res.end_date && form.end_date >= res.start_date) {
          issues.push(`Conflict with ${res.status} reservation (${res.start_date} - ${res.end_date})`);
        }
      }
    }

    setConflicts(issues);
    setValidating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservation) return;

    setLoading(true);

    const { error } = await supabase
      .from('reservations')
      .update({
        start_date: form.start_date,
        end_date: form.end_date,
        guest_count: form.guest_count,
        guests_names: form.guests_names || null,
        notes: form.notes || null,
        admin_notes: form.admin_notes || null,
        status: form.status,
        nights_count: pricing.nights,
        nightly_rate: pricing.nightlyRate,
        cleaning_fee: pricing.cleaningFee,
        subtotal: pricing.subtotal,
        total_amount: pricing.total,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservation.id);

    setLoading(false);

    if (!error) {
      if (form.status !== reservation.status) {
        const statusMessages: Record<ReservationStatus, string> = {
          pending: 'Your reservation has been moved back to pending review.',
          approved: 'Your reservation has been approved.',
          denied: 'Your reservation has been denied.',
          cancelled: 'Your reservation has been cancelled by an administrator.',
        };

        await supabase.from('notifications').insert({
          user_id: reservation.user_id,
          type: 'reservation-updated',
          title: 'Reservation Updated',
          message: `${reservation.property?.name}: ${statusMessages[form.status]}`,
          link: `/properties/${reservation.property_id}`,
        });
      }

      onSave();
      onClose();
    }
  };

  const handleCancel = async () => {
    if (!reservation) return;
    setLoading(true);

    const { error } = await supabase
      .from('reservations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservation.id);

    if (!error) {
      await supabase.from('notifications').insert({
        user_id: reservation.user_id,
        type: 'reservation-cancelled',
        title: 'Reservation Cancelled',
        message: `Your reservation at ${reservation.property?.name} (${reservation.start_date} - ${reservation.end_date}) has been cancelled by an administrator.`,
        link: `/properties/${reservation.property_id}`,
      });

      onSave();
      onClose();
    }

    setLoading(false);
  };

  if (!isOpen || !reservation) return null;

  const statusOptions: { value: ReservationStatus; label: string; color: string }[] = [
    { value: 'pending', label: 'Pending', color: 'text-yellow-400' },
    { value: 'approved', label: 'Approved', color: 'text-green-400' },
    { value: 'denied', label: 'Denied', color: 'text-red-400' },
    { value: 'cancelled', label: 'Cancelled', color: 'text-gray-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-2xl">
        <div className="sticky top-0 bg-[var(--bg-secondary)] flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <div>
            <h2 className="font-serif text-xl text-[var(--text-primary)]">Edit Reservation</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {reservation.property?.name} - {reservation.user?.display_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {showCancelConfirm ? (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-medium text-red-400">Cancel this reservation?</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  This will notify {reservation.user?.display_name} that their reservation has been cancelled.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1"
              >
                Go Back
              </Button>
              <Button
                onClick={handleCancel}
                loading={loading}
                className="flex-1 !bg-red-500 hover:!bg-red-600"
              >
                Yes, Cancel Reservation
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ReservationStatus })}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  <Calendar size={14} /> Check-in
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  <Calendar size={14} /> Check-out
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  min={form.start_date}
                  required
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                />
              </div>
            </div>

            {validating && (
              <p className="text-sm text-[var(--text-muted)]">Checking availability...</p>
            )}

            {conflicts.length > 0 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm font-medium text-yellow-400 mb-1">Date conflicts detected:</p>
                <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                  {conflicts.map((c, i) => (
                    <li key={i}>- {c}</li>
                  ))}
                </ul>
              </div>
            )}

            {form.start_date && form.end_date && pricing.nights > 0 && (
              <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 border border-[var(--border-default)]">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign size={16} className="text-[var(--accent-gold)]" />
                  <h4 className="text-sm font-medium text-[var(--text-primary)]">Pricing Breakdown</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>${pricing.nightlyRate.toFixed(2)} × {pricing.nights} night{pricing.nights > 1 ? 's' : ''}</span>
                    <span>${pricing.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Cleaning fee</span>
                    <span>${pricing.cleaningFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-[var(--border-default)] pt-2 flex justify-between font-medium text-[var(--text-primary)]">
                    <span>Total</span>
                    <span>${pricing.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                <Users size={14} /> Number of Guests
              </label>
              <input
                type="number"
                value={form.guest_count}
                onChange={(e) => setForm({ ...form, guest_count: parseInt(e.target.value) || 1 })}
                min={1}
                max={reservation.property?.max_guests || 20}
                required
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
              />
            </div>

            <Input
              label="Guest Names"
              value={form.guests_names}
              onChange={(e) => setForm({ ...form, guests_names: e.target.value })}
              placeholder="List who will be staying"
            />

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                <FileText size={14} /> Guest Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notes from the guest..."
                rows={2}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50 resize-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                <FileText size={14} /> Admin Notes
              </label>
              <textarea
                value={form.admin_notes}
                onChange={(e) => setForm({ ...form, admin_notes: e.target.value })}
                placeholder="Internal notes about this reservation..."
                rows={2}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCancelConfirm(true)}
                className="!bg-red-500/10 hover:!bg-red-500/20 !text-red-400"
                disabled={reservation.status === 'cancelled'}
              >
                Cancel Reservation
              </Button>
              <Button type="submit" loading={loading} className="flex-1">
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
