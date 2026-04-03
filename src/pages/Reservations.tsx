import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTraining } from '../contexts/TrainingContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { SectionWelcome } from '../components/training/SectionWelcome';
import { TrainingTooltip } from '../components/training/TrainingTooltip';
import { TOOLTIPS } from '../components/training/training-content';
import {
  Calendar, MapPin, Users,
  Clock, AlertCircle, CheckCircle, XCircle, Ban
} from 'lucide-react';
import type { Reservation, Property } from '../types';

interface ReservationWithProperty extends Reservation {
  properties: Property;
}

export default function Reservations() {
  const { user } = useAuth();
  const toast = useToast();
  const { trainingMode } = useTraining();
  const [reservations, setReservations] = useState<ReservationWithProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    loadReservations();
  }, [user]);

  const loadReservations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reservations')
        .select('*, properties(*)')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error('Error loading reservations:', error);
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Reservation['status']) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-300',
      approved: 'bg-green-500/20 text-green-300',
      denied: 'bg-red-500/20 text-red-300',
      cancelled: 'bg-neutral-500/20 text-neutral-300'
    };

    const icons = {
      pending: Clock,
      approved: CheckCircle,
      denied: XCircle,
      cancelled: Ban
    };

    const Icon = icons[status];

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        <Icon className="w-3.5 h-3.5" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const calculateNights = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isUpcoming = (startDate: string) => {
    return new Date(startDate) >= new Date();
  };

  const getPropertyLocation = (property: Property) => {
    const parts = [property.city, property.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Location not specified';
  };

  const filteredReservations = reservations.filter(reservation => {
    if (filter === 'upcoming') {
      return isUpcoming(reservation.start_date) && reservation.status !== 'denied' && reservation.status !== 'cancelled';
    } else if (filter === 'past') {
      return !isUpcoming(reservation.start_date) || reservation.status === 'denied' || reservation.status === 'cancelled';
    }
    return true;
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {trainingMode && <SectionWelcome sectionId="reservations" />}

      <div className="mb-8">
        <h1 className="text-4xl font-serif font-bold text-[var(--text-primary)] mb-2">
          Your Reservations
        </h1>
        <p className="text-[var(--text-secondary)]">
          View and manage your property bookings
        </p>
      </div>

      <TrainingTooltip tipId="reservations-filter" content={TOOLTIPS['reservations-filter']?.content || ''} position="bottom">
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={filter === 'all' ? 'primary' : 'secondary'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filter === 'upcoming' ? 'primary' : 'secondary'}
            onClick={() => setFilter('upcoming')}
            size="sm"
          >
            Upcoming
          </Button>
          <Button
            variant={filter === 'past' ? 'primary' : 'secondary'}
            onClick={() => setFilter('past')}
            size="sm"
          >
          Past
          </Button>
        </div>
      </TrainingTooltip>

      {filteredReservations.length === 0 ? (
        <Card className="text-center py-12">
          <Calendar className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No reservations found
          </h3>
          <p className="text-[var(--text-secondary)] mb-6">
            {filter === 'upcoming'
              ? "You don't have any upcoming reservations"
              : filter === 'past'
              ? "You don't have any past reservations"
              : "You haven't made any reservations yet"}
          </p>
          <Link to="/properties">
            <Button variant="primary">
              Browse Properties
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredReservations.map(reservation => {
            const nights = calculateNights(reservation.start_date, reservation.end_date);
            const upcoming = isUpcoming(reservation.start_date);

            return (
              <Link
                key={reservation.id}
                to={`/reservations/${reservation.id}`}
                className="block transition-transform hover:scale-[1.01]"
              >
                <Card className="p-6 hover:border-gold transition-colors">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-32 h-32 bg-[var(--bg-tertiary)] rounded-lg overflow-hidden">
                      {reservation.properties.cover_image_url ? (
                        <img
                          src={reservation.properties.cover_image_url}
                          alt={reservation.properties.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-8 h-8 text-[var(--text-muted)]" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
                            {reservation.properties.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                            <MapPin className="w-4 h-4" />
                            {getPropertyLocation(reservation.properties)}
                          </div>
                        </div>
                        {getStatusBadge(reservation.status)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-[var(--text-muted)] mb-1">Check-in</div>
                          <div className="text-[var(--text-primary)] font-medium">
                            {formatDate(reservation.start_date)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[var(--text-muted)] mb-1">Check-out</div>
                          <div className="text-[var(--text-primary)] font-medium">
                            {formatDate(reservation.end_date)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[var(--text-muted)] mb-1">Duration</div>
                          <div className="text-[var(--text-primary)] font-medium">
                            {nights} {nights === 1 ? 'night' : 'nights'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[var(--text-muted)] mb-1">Guests</div>
                          <div className="text-[var(--text-primary)] font-medium flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {reservation.guest_count}
                          </div>
                        </div>
                      </div>

                      {reservation.status === 'pending' && upcoming && (
                        <div className="mt-4 flex items-start gap-2 text-sm text-yellow-300 bg-yellow-500/10 p-3 rounded-lg">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>Awaiting admin approval</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
