import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { UserProfile } from '../../types';

interface Reservation {
  id: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  user_id: string;
  user?: UserProfile;
}

interface BlackoutDate {
  id: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

interface PropertyCalendarProps {
  reservations: Reservation[];
  blackoutDates: BlackoutDate[];
  currentUserId?: string;
  onDateSelect: (date: string) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isDateInRange(date: Date, start: string, end: string): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return d >= s && d <= e;
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function PropertyCalendar({
  reservations,
  blackoutDates,
  currentUserId,
  onDateSelect,
}: PropertyCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const years = useMemo(() => {
    const result = [];
    for (let y = today.getFullYear(); y <= today.getFullYear() + 2; y++) {
      result.push(y);
    }
    return result;
  }, []);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startPadding = firstDay.getDay();
    const days: (Date | null)[] = [];

    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(currentYear, currentMonth, d));
    }

    return days;
  }, [currentMonth, currentYear]);

  const getDateStatus = (date: Date) => {
    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

    for (const blackout of blackoutDates) {
      if (isDateInRange(date, blackout.start_date, blackout.end_date)) {
        return { status: 'blackout' as const, reason: blackout.reason };
      }
    }

    for (const reservation of reservations) {
      if (reservation.status === 'cancelled' || reservation.status === 'denied') continue;
      if (isDateInRange(date, reservation.start_date, reservation.end_date)) {
        const isOwn = reservation.user_id === currentUserId;
        return {
          status: reservation.status === 'approved' ? 'booked' as const : 'pending' as const,
          isOwn,
          reservation,
        };
      }
    }

    return { status: isPast ? 'past' as const : 'available' as const };
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = (date: Date) => {
    const status = getDateStatus(date);
    if (status.status === 'available') {
      onDateSelect(formatDateKey(date));
    }
  };

  const hoveredInfo = useMemo(() => {
    if (!hoveredDate) return null;
    const [y, m, d] = hoveredDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return getDateStatus(date);
  }, [hoveredDate, reservations, blackoutDates]);

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border-default)]">
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex items-center gap-3">
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
              className="bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
            >
              {MONTHS.map((month, i) => (
                <option key={month} value={i}>{month}</option>
              ))}
            </select>

            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              className="bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[rgba(var(--accent-primary-rgb),0.2)] border border-[var(--accent-gold)]" />
            <span className="text-[var(--text-secondary)]">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[rgba(var(--accent-secondary-rgb),0.3)] border border-[var(--accent-sage)]" />
            <span className="text-[var(--text-secondary)]">Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500/20 border border-orange-500/50" />
            <span className="text-[var(--text-secondary)]">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/50 flex items-center justify-center">
              <X size={10} className="text-red-400" />
            </div>
            <span className="text-[var(--text-secondary)]">Unavailable</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-[var(--text-muted)] py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, i) => {
            if (!date) {
              return <div key={`empty-${i}`} className="h-10" />;
            }

            const dateKey = formatDateKey(date);
            const status = getDateStatus(date);
            const isToday = formatDateKey(today) === dateKey;

            let cellClasses = 'h-10 rounded-lg flex flex-col items-center justify-center relative transition-all text-sm ';
            let isClickable = false;

            switch (status.status) {
              case 'available':
                cellClasses += 'bg-[rgba(var(--accent-primary-rgb),0.1)] hover:bg-[rgba(var(--accent-primary-rgb),0.3)] border border-[rgba(var(--accent-primary-rgb),0.3)] hover:border-[var(--accent-gold)] cursor-pointer text-[var(--text-primary)]';
                isClickable = true;
                break;
              case 'booked':
                if (status.isOwn) {
                  cellClasses += 'bg-[rgba(var(--accent-secondary-rgb),0.2)] border border-[var(--accent-sage)] text-[var(--accent-sage)]';
                } else {
                  cellClasses += 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]';
                }
                break;
              case 'pending':
                if (status.isOwn) {
                  cellClasses += 'bg-orange-500/20 border border-orange-500/50 border-dashed text-orange-400';
                } else {
                  cellClasses += 'bg-orange-500/20 border border-orange-500/50 text-orange-400';
                }
                break;
              case 'blackout':
                cellClasses += 'bg-red-500/10 border border-red-500/30 text-red-400/50';
                break;
              case 'past':
                cellClasses += 'bg-[var(--bg-tertiary)]/50 text-[var(--text-muted)]/50';
                break;
            }

            return (
              <div
                key={dateKey}
                className={cellClasses}
                onClick={() => isClickable && handleDateClick(date)}
                onMouseEnter={() => setHoveredDate(dateKey)}
                onMouseLeave={() => setHoveredDate(null)}
              >
                <span className={isToday ? 'font-bold text-[var(--accent-gold)]' : ''}>
                  {date.getDate()}
                </span>
                {status.status === 'blackout' && (
                  <X size={12} className="absolute text-red-400/70" />
                )}
                {status.status === 'pending' && !status.isOwn && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-orange-400" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {hoveredInfo && hoveredDate && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-sm">
            {hoveredInfo.status === 'available' && (
              <p className="text-[var(--accent-gold)]">Click to book this date</p>
            )}
            {hoveredInfo.status === 'booked' && hoveredInfo.reservation && (
              <p className="text-[var(--text-secondary)]">
                Booked by {hoveredInfo.isOwn ? 'you' : hoveredInfo.reservation.user?.display_name || 'Family member'}
              </p>
            )}
            {hoveredInfo.status === 'pending' && hoveredInfo.reservation && (
              <p className="text-orange-400">
                {hoveredInfo.isOwn ? 'Your reservation pending approval' : `Pending: ${hoveredInfo.reservation.user?.display_name || 'Family member'}`}
              </p>
            )}
            {hoveredInfo.status === 'blackout' && (
              <p className="text-red-400">
                Unavailable{hoveredInfo.reason ? `: ${hoveredInfo.reason}` : ''}
              </p>
            )}
            {hoveredInfo.status === 'past' && (
              <p className="text-[var(--text-muted)]">Past date</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
