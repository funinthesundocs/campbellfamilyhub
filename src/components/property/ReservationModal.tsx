import { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Users, FileText, DollarSign } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReservationFormData) => Promise<void>;
  propertyName: string;
  maxGuests?: number;
  initialDate?: string;
  pricePerNight?: number;
  cleaningFee?: number;
  minimumStayDays?: number;
  maximumStayDays?: number;
  minimumDeposit?: number;
}

export interface ReservationFormData {
  start_date: string;
  end_date: string;
  guest_count: number;
  guests_names: string;
  notes: string;
  nights_count?: number;
  nightly_rate?: number;
  cleaning_fee?: number;
  subtotal?: number;
  total_amount?: number;
  deposit_amount?: number;
}

export function ReservationModal({
  isOpen,
  onClose,
  onSubmit,
  propertyName,
  maxGuests = 20,
  initialDate,
  pricePerNight = 0,
  cleaningFee = 0,
  minimumStayDays = 1,
  maximumStayDays,
  minimumDeposit = 0,
}: ReservationModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ReservationFormData>({
    start_date: '',
    end_date: '',
    guest_count: 2,
    guests_names: '',
    notes: '',
  });

  const pricing = useMemo(() => {
    if (!form.start_date || !form.end_date) {
      return {
        nights: 0,
        subtotal: 0,
        total: 0,
        deposit: minimumDeposit,
        valid: false,
        error: null,
      };
    }

    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (nights < minimumStayDays) {
      return {
        nights,
        subtotal: 0,
        total: 0,
        deposit: minimumDeposit,
        valid: false,
        error: `Minimum stay is ${minimumStayDays} night${minimumStayDays > 1 ? 's' : ''}`,
      };
    }

    if (maximumStayDays && nights > maximumStayDays) {
      return {
        nights,
        subtotal: 0,
        total: 0,
        deposit: minimumDeposit,
        valid: false,
        error: `Maximum stay is ${maximumStayDays} night${maximumStayDays > 1 ? 's' : ''}`,
      };
    }

    const subtotal = nights * pricePerNight;
    const total = subtotal + cleaningFee;

    return {
      nights,
      subtotal,
      total,
      deposit: minimumDeposit,
      valid: true,
      error: null,
    };
  }, [form.start_date, form.end_date, pricePerNight, cleaningFee, minimumStayDays, maximumStayDays, minimumDeposit]);

  useEffect(() => {
    if (initialDate) {
      setForm((prev) => ({ ...prev, start_date: initialDate }));
    }
  }, [initialDate]);

  useEffect(() => {
    if (!isOpen) {
      setForm({
        start_date: '',
        end_date: '',
        guest_count: 2,
        guests_names: '',
        notes: '',
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pricing.valid) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        ...form,
        nights_count: pricing.nights,
        nightly_rate: pricePerNight,
        cleaning_fee: cleaningFee,
        subtotal: pricing.subtotal,
        total_amount: pricing.total,
        deposit_amount: pricing.deposit,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const minEndDate = form.start_date || new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <div>
            <h2 className="font-serif text-xl text-[var(--text-primary)]">Request Reservation</h2>
            <p className="text-sm text-[var(--text-secondary)]">{propertyName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                <Calendar size={14} /> Check-in
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
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
                min={minEndDate}
                required
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              <Users size={14} /> Number of Guests
            </label>
            <input
              type="number"
              value={form.guest_count}
              onChange={(e) => setForm({ ...form, guest_count: parseInt(e.target.value) || 1 })}
              min={1}
              max={maxGuests}
              required
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">Maximum {maxGuests} guests</p>
          </div>

          <Input
            label="Guest Names"
            value={form.guests_names}
            onChange={(e) => setForm({ ...form, guests_names: e.target.value })}
            placeholder="List who will be staying"
          />

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              <FileText size={14} /> Additional Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any special requests or information..."
              rows={3}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)} focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50 resize-none"
            />
          </div>

          {form.start_date && form.end_date && (
            <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 border border-[var(--border-default)]">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={16} className="text-[var(--accent-gold)]" />
                <h4 className="text-sm font-medium text-[var(--text-primary)]">Pricing Breakdown</h4>
              </div>

              {pricing.error ? (
                <div className="text-sm text-red-400 py-2">
                  {pricing.error}
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>${pricePerNight.toFixed(2)} × {pricing.nights} night{pricing.nights > 1 ? 's' : ''}</span>
                    <span>${pricing.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Cleaning fee</span>
                    <span>${cleaningFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-[var(--border-default)] pt-2 flex justify-between font-medium text-[var(--text-primary)]">
                    <span>Total</span>
                    <span>${pricing.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--accent-gold)] text-xs pt-1">
                    <span>Deposit required upon approval</span>
                    <span>${pricing.deposit.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={!pricing.valid && !!(form.start_date && form.end_date)}
              className="flex-1"
            >
              Submit Request
            </Button>
          </div>

          <p className="text-xs text-center text-[var(--text-muted)]">
            Your reservation request will be reviewed by a family administrator
          </p>
        </form>
      </div>
    </div>
  );
}
