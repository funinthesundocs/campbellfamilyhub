import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Calendar, MapPin, Users, ArrowLeft, X,
  Clock, CheckCircle, XCircle, Ban, AlertCircle,
  Home, MessageSquare, DollarSign, CreditCard, CalendarRange
} from 'lucide-react';
import type { Reservation, Property, ReservationChangeRequest } from '../types';

interface ReservationWithDetails extends Reservation {
  properties: Property;
}

export default function ReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState<ReservationWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeRequest, setChangeRequest] = useState<{
    start_date: string;
    end_date: string;
    reason: string;
  }>({ start_date: '', end_date: '', reason: '' });
  const [submittingChange, setSubmittingChange] = useState(false);
  const [pendingChangeRequest, setPendingChangeRequest] = useState<ReservationChangeRequest | null>(null);
  const [deniedChangeRequests, setDeniedChangeRequests] = useState<ReservationChangeRequest[]>([]);

  useEffect(() => {
    loadReservation();
  }, [id, user]);

  const loadReservation = async () => {
    if (!id || !user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reservations')
        .select('*, properties(*)')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error('Reservation not found');
        navigate('/reservations');
        return;
      }

      setReservation(data);
      loadPendingChangeRequest(id);
    } catch (error) {
      console.error('Error loading reservation:', error);
      toast.error('Failed to load reservation');
      navigate('/reservations');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingChangeRequest = async (reservationId: string) => {
    try {
      const { data: pendingData, error: pendingError } = await supabase
        .from('reservation_change_requests')
        .select('*')
        .eq('reservation_id', reservationId)
        .eq('status', 'pending')
        .maybeSingle();

      if (pendingError) throw pendingError;
      setPendingChangeRequest(pendingData);

      const { data: deniedData, error: deniedError } = await supabase
        .from('reservation_change_requests')
        .select('*')
        .eq('reservation_id', reservationId)
        .eq('status', 'denied')
        .order('created_at', { ascending: false });

      if (deniedError) throw deniedError;
      setDeniedChangeRequests(deniedData || []);
    } catch (error) {
      console.error('Error loading change requests:', error);
    }
  };

  const handleSubmitChangeRequest = async () => {
    if (!reservation || !user) return;

    if (!changeRequest.start_date || !changeRequest.end_date) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    const startDate = new Date(changeRequest.start_date);
    const endDate = new Date(changeRequest.end_date);

    if (endDate <= startDate) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    try {
      setSubmittingChange(true);

      const { error: changeRequestError } = await supabase
        .from('reservation_change_requests')
        .insert({
          reservation_id: reservation.id,
          requested_by: user.id,
          original_start_date: reservation.start_date,
          original_end_date: reservation.end_date,
          requested_start_date: changeRequest.start_date,
          requested_end_date: changeRequest.end_date,
          reason: changeRequest.reason || null,
        });

      if (changeRequestError) throw changeRequestError;

      const { error: statusUpdateError } = await supabase
        .from('reservations')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservation.id);

      if (statusUpdateError) throw statusUpdateError;

      toast.success('Date change request submitted successfully');
      setShowChangeModal(false);
      setChangeRequest({ start_date: '', end_date: '', reason: '' });
      loadReservation();
    } catch (error) {
      console.error('Error submitting change request:', error);
      toast.error('Failed to submit change request');
    } finally {
      setSubmittingChange(false);
    }
  };

  const handleCancel = async () => {
    if (!reservation) return;

    try {
      setCancelling(true);
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservation.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Reservation cancelled successfully');
      setShowCancelModal(false);
      loadReservation();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      toast.error('Failed to cancel reservation');
    } finally {
      setCancelling(false);
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
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${styles[status]}`}>
        <Icon className="w-4 h-4" />
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
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
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

  const canCancel = reservation &&
    isUpcoming(reservation.start_date) &&
    (reservation.status === 'pending' || reservation.status === 'approved');

  const canRequestChange = reservation &&
    isUpcoming(reservation.start_date) &&
    (reservation.status === 'pending' || reservation.status === 'approved') &&
    !pendingChangeRequest;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: Reservation['payment_status']) => {
    const styles = {
      pending: 'bg-neutral-500/20 text-neutral-300',
      awaiting_deposit: 'bg-yellow-500/20 text-yellow-300',
      deposit_paid: 'bg-blue-500/20 text-blue-300',
      fully_paid: 'bg-green-500/20 text-green-300',
      refunded: 'bg-red-500/20 text-red-300'
    };

    const labels = {
      pending: 'Pending Approval',
      awaiting_deposit: 'Deposit Due',
      deposit_paid: 'Deposit Paid',
      fully_paid: 'Fully Paid',
      refunded: 'Refunded'
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-300 mb-2">
            Reservation not found
          </h3>
          <p className="text-neutral-400 mb-6">
            This reservation doesn't exist or you don't have permission to view it
          </p>
          <Link to="/reservations">
            <Button variant="primary">
              Back to Reservations
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const nights = calculateNights(reservation.start_date, reservation.end_date);
  const upcoming = isUpcoming(reservation.start_date);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        to="/reservations"
        className="inline-flex items-center gap-2 text-neutral-400 hover:text-neutral-200 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Reservations
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-neutral-50 mb-2">
            Reservation Details
          </h1>
          <p className="text-neutral-400">
            Confirmation #{reservation.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        {getStatusBadge(reservation.status)}
      </div>

      <div className="grid gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-neutral-50 mb-4 flex items-center gap-2">
            <Home className="w-5 h-5 text-gold" />
            Property Information
          </h2>

          <div className="flex gap-6 mb-6">
            <div className="flex-shrink-0 w-48 h-48 bg-neutral-800 rounded-lg overflow-hidden">
              {reservation.properties.cover_image_url ? (
                <img
                  src={reservation.properties.cover_image_url}
                  alt={reservation.properties.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-neutral-600" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <h3 className="text-2xl font-semibold text-neutral-50 mb-2">
                {reservation.properties.name}
              </h3>
              <div className="flex items-center gap-2 text-neutral-400 mb-4">
                <MapPin className="w-4 h-4" />
                {getPropertyLocation(reservation.properties)}
              </div>
              {reservation.properties.description && (
                <p className="text-neutral-300 text-sm line-clamp-3">
                  {reservation.properties.description}
                </p>
              )}
              <Link
                to={`/properties/${reservation.properties.id}`}
                className="inline-block mt-4 text-gold hover:text-gold/80 text-sm font-medium transition-colors"
              >
                View property details →
              </Link>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-neutral-50 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gold" />
            Booking Details
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-sm text-neutral-400 mb-1">Check-in</div>
              <div className="text-lg font-semibold text-neutral-50">
                {formatDate(reservation.start_date)}
              </div>
              <div className="text-sm text-neutral-400 mt-1">After 3:00 PM</div>
            </div>
            <div>
              <div className="text-sm text-neutral-400 mb-1">Check-out</div>
              <div className="text-lg font-semibold text-neutral-50">
                {formatDate(reservation.end_date)}
              </div>
              <div className="text-sm text-neutral-400 mt-1">Before 11:00 AM</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-6 border-t border-neutral-700">
            <div>
              <div className="text-sm text-neutral-400 mb-1">Duration</div>
              <div className="text-neutral-50 font-medium">
                {nights} {nights === 1 ? 'night' : 'nights'}
              </div>
            </div>
            <div>
              <div className="text-sm text-neutral-400 mb-1">Guests</div>
              <div className="text-neutral-50 font-medium flex items-center gap-1">
                <Users className="w-4 h-4" />
                {reservation.guest_count}
              </div>
            </div>
            <div>
              <div className="text-sm text-neutral-400 mb-1">Booked on</div>
              <div className="text-neutral-50 font-medium">
                {new Date(reservation.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            </div>
          </div>

          {reservation.guests_names && (
            <div className="pt-6 border-t border-neutral-700 mt-6">
              <div className="text-sm text-neutral-400 mb-2">Guest Names</div>
              <div className="text-neutral-50">{reservation.guests_names}</div>
            </div>
          )}

          {reservation.notes && (
            <div className="pt-6 border-t border-neutral-700 mt-6">
              <div className="text-sm text-neutral-400 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Your Notes
              </div>
              <div className="text-neutral-300 bg-neutral-800/50 p-4 rounded-lg">
                {reservation.notes}
              </div>
            </div>
          )}
        </Card>

        {reservation.status === 'approved' && (
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-semibold text-neutral-50 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gold" />
                Payment Schedule
              </h2>
              {getPaymentStatusBadge(reservation.payment_status)}
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between py-3 border-b border-neutral-700">
                <span className="text-neutral-400">
                  {formatCurrency(reservation.nightly_rate)} × {reservation.nights_count} {reservation.nights_count === 1 ? 'night' : 'nights'}
                </span>
                <span className="text-neutral-50 font-medium">
                  {formatCurrency(reservation.subtotal)}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-neutral-700">
                <span className="text-neutral-400">Cleaning fee</span>
                <span className="text-neutral-50 font-medium">
                  {formatCurrency(reservation.cleaning_fee)}
                </span>
              </div>
              <div className="flex justify-between py-3 text-lg font-semibold">
                <span className="text-neutral-50">Total</span>
                <span className="text-gold">
                  {formatCurrency(reservation.total_amount)}
                </span>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-50 mb-4">Payment Breakdown</h3>

              <div className="bg-neutral-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-neutral-50 font-medium">Deposit Payment</div>
                    <div className="text-sm text-neutral-400">
                      {reservation.deposit_due_date
                        ? `Due by ${formatDate(reservation.deposit_due_date)}`
                        : 'Due within 7 days of approval'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-neutral-50 font-semibold">
                      {formatCurrency(reservation.deposit_amount)}
                    </div>
                    {reservation.deposit_paid_at && (
                      <div className="text-sm text-green-400 flex items-center gap-1 justify-end">
                        <CheckCircle className="w-3 h-3" />
                        Paid {new Date(reservation.deposit_paid_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {reservation.payment_status === 'awaiting_deposit' && (
                  <Button
                    variant="primary"
                    className="w-full mt-3"
                    onClick={() => toast.info('Stripe payment integration coming soon. Visit https://bolt.new/setup/stripe to configure.')}
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay Deposit
                  </Button>
                )}
              </div>

              <div className="bg-neutral-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-neutral-50 font-medium">Balance Payment</div>
                    <div className="text-sm text-neutral-400">
                      {reservation.balance_due_date
                        ? `Due by ${formatDate(reservation.balance_due_date)}`
                        : 'Due 30 days before check-in'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-neutral-50 font-semibold">
                      {formatCurrency(reservation.total_amount - reservation.deposit_amount)}
                    </div>
                    {reservation.balance_paid_at && (
                      <div className="text-sm text-green-400 flex items-center gap-1 justify-end">
                        <CheckCircle className="w-3 h-3" />
                        Paid {new Date(reservation.balance_paid_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {reservation.payment_status === 'deposit_paid' && (
                  <div className="space-y-2 mt-3">
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => toast.info('Stripe payment integration coming soon. Visit https://bolt.new/setup/stripe to configure.')}
                    >
                      <CreditCard className="w-4 h-4" />
                      Pay Balance
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => toast.info('Stripe payment integration coming soon. Visit https://bolt.new/setup/stripe to configure.')}
                    >
                      <CreditCard className="w-4 h-4" />
                      Pay in Full
                    </Button>
                  </div>
                )}

                {reservation.payment_status === 'awaiting_deposit' && (
                  <Button
                    variant="secondary"
                    className="w-full mt-3"
                    onClick={() => toast.info('Stripe payment integration coming soon. Visit https://bolt.new/setup/stripe to configure.')}
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay in Full ({formatCurrency(reservation.total_amount)})
                  </Button>
                )}
              </div>

              {(reservation.payment_status === 'awaiting_deposit' || reservation.payment_status === 'deposit_paid') && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-blue-300 font-medium mb-1">Stripe Integration Required</p>
                      <p className="text-neutral-300">
                        Payment processing requires Stripe configuration. Visit{' '}
                        <a
                          href="https://bolt.new/setup/stripe"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold hover:text-gold/80 underline"
                        >
                          https://bolt.new/setup/stripe
                        </a>
                        {' '}to set up your payment gateway.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {pendingChangeRequest && (
          <Card className="p-6 bg-blue-500/5 border-blue-500/20">
            <div className="flex items-start gap-3">
              <CalendarRange className="w-5 h-5 text-blue-300 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-300 mb-2">
                  Date Change Request Pending
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-neutral-400 mb-1">Current Dates</div>
                      <div className="text-neutral-200">
                        {formatDate(pendingChangeRequest.original_start_date)} →{' '}
                        {formatDate(pendingChangeRequest.original_end_date)}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-400 mb-1">Requested Dates</div>
                      <div className="text-blue-300 font-medium">
                        {formatDate(pendingChangeRequest.requested_start_date)} →{' '}
                        {formatDate(pendingChangeRequest.requested_end_date)}
                      </div>
                    </div>
                  </div>
                  {pendingChangeRequest.reason && (
                    <div className="mt-3 pt-3 border-t border-blue-500/20">
                      <div className="text-neutral-400 mb-1">Reason for Change</div>
                      <div className="text-neutral-200">{pendingChangeRequest.reason}</div>
                    </div>
                  )}
                </div>
                <p className="text-neutral-300 text-sm mt-3">
                  Your date change request is awaiting admin review. You'll be notified once it's processed.
                </p>
              </div>
            </div>
          </Card>
        )}

        {deniedChangeRequests.length > 0 && (
          <Card className="p-6 bg-red-500/5 border-red-500/20">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-300 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-300 mb-2">
                  Previous Date Change Request{deniedChangeRequests.length > 1 ? 's' : ''} Denied
                </h3>
                <div className="space-y-4">
                  {deniedChangeRequests.map(deniedRequest => (
                    <div key={deniedRequest.id} className="bg-neutral-800/50 rounded-lg p-4">
                      <div className="grid md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-neutral-400 mb-1">Requested Dates</div>
                          <div className="text-neutral-200">
                            {formatDate(deniedRequest.requested_start_date)} →{' '}
                            {formatDate(deniedRequest.requested_end_date)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-400 mb-1">Requested On</div>
                          <div className="text-neutral-200">
                            {new Date(deniedRequest.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                      {deniedRequest.admin_notes && (
                        <div className="pt-3 border-t border-neutral-700">
                          <div className="text-xs text-neutral-400 mb-1">Admin Response</div>
                          <div className="text-neutral-200 text-sm">{deniedRequest.admin_notes}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {canRequestChange && (
                  <p className="text-neutral-300 text-sm mt-4">
                    You can submit a new date change request if needed.
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {reservation.status === 'pending' && upcoming && (
          <Card className="p-6 bg-yellow-500/5 border-yellow-500/20">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-300 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-300 mb-1">
                  Awaiting Approval
                </h3>
                <p className="text-neutral-300 text-sm">
                  Your reservation request has been submitted and is pending admin approval.
                  You'll be notified once it's reviewed.
                </p>
              </div>
            </div>
          </Card>
        )}

        {reservation.status === 'approved' && upcoming && (
          <Card className="p-6 bg-green-500/5 border-green-500/20">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-green-300 mb-1">
                  Reservation Confirmed
                </h3>
                <p className="text-neutral-300 text-sm">
                  Your reservation has been approved! Check your email for additional details
                  and check-in instructions.
                </p>
              </div>
            </div>
          </Card>
        )}

        {reservation.status === 'denied' && (
          <Card className="p-6 bg-red-500/5 border-red-500/20">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-300 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-red-300 mb-1">
                  Reservation Denied
                </h3>
                <p className="text-neutral-300 text-sm mb-3">
                  Unfortunately, your reservation request was not approved.
                </p>
                {reservation.admin_notes && (
                  <div className="bg-neutral-800/50 p-3 rounded-lg">
                    <div className="text-xs text-neutral-400 mb-1">Admin Notes:</div>
                    <div className="text-neutral-300 text-sm">{reservation.admin_notes}</div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {reservation.status === 'cancelled' && (
          <Card className="p-6 bg-neutral-500/5 border-neutral-500/20">
            <div className="flex items-start gap-3">
              <Ban className="w-5 h-5 text-neutral-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-neutral-300 mb-1">
                  Reservation Cancelled
                </h3>
                <p className="text-neutral-400 text-sm">
                  This reservation has been cancelled.
                </p>
              </div>
            </div>
          </Card>
        )}

        {(canCancel || canRequestChange) && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-neutral-50 mb-4">
              Manage Reservation
            </h2>

            {canRequestChange && (
              <div className="mb-6 pb-6 border-b border-neutral-700">
                <h3 className="font-medium text-neutral-200 mb-2">Need to Change Dates?</h3>
                <p className="text-neutral-400 text-sm mb-4">
                  If you need to adjust your check-in or check-out dates, submit a change request for admin review.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => setShowChangeModal(true)}
                  className="border-gold/30 text-gold hover:bg-gold/10"
                >
                  <CalendarRange className="w-4 h-4" />
                  Request Date Change
                </Button>
              </div>
            )}

            {canCancel && (
              <div>
                <h3 className="font-medium text-neutral-200 mb-2">Need to Cancel?</h3>
                <p className="text-neutral-400 text-sm mb-4">
                  If your plans have changed, you can cancel this reservation.
                  This action cannot be undone.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => setShowCancelModal(true)}
                  className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                >
                  Cancel Reservation
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-semibold text-neutral-50">
                Cancel Reservation?
              </h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-neutral-300 mb-6">
              Are you sure you want to cancel this reservation? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1"
              >
                Keep Reservation
              </Button>
              <Button
                variant="danger"
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showChangeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-semibold text-neutral-50">
                Request Date Change
              </h3>
              <button
                onClick={() => {
                  setShowChangeModal(false);
                  setChangeRequest({ start_date: '', end_date: '', reason: '' });
                }}
                className="text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-neutral-800/50 rounded-lg p-4 mb-4">
                <div className="text-sm text-neutral-400 mb-1">Current Dates</div>
                <div className="text-neutral-200 font-medium">
                  {formatDate(reservation.start_date)} → {formatDate(reservation.end_date)}
                </div>
                <div className="text-sm text-neutral-400 mt-1">
                  ({nights} {nights === 1 ? 'night' : 'nights'})
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    New Check-in Date
                  </label>
                  <input
                    type="date"
                    value={changeRequest.start_date}
                    onChange={(e) =>
                      setChangeRequest({ ...changeRequest, start_date: e.target.value })
                    }
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    New Check-out Date
                  </label>
                  <input
                    type="date"
                    value={changeRequest.end_date}
                    onChange={(e) =>
                      setChangeRequest({ ...changeRequest, end_date: e.target.value })
                    }
                    min={changeRequest.start_date || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Reason for Change (Optional)
                  </label>
                  <textarea
                    value={changeRequest.reason}
                    onChange={(e) =>
                      setChangeRequest({ ...changeRequest, reason: e.target.value })
                    }
                    rows={3}
                    placeholder="Let us know why you need to change your dates..."
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold/50 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-6">
              <p className="text-sm text-yellow-300">
                Your date change request will be reviewed by an admin. You'll be notified once it's approved or denied.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowChangeModal(false);
                  setChangeRequest({ start_date: '', end_date: '', reason: '' });
                }}
                disabled={submittingChange}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitChangeRequest}
                disabled={submittingChange || !changeRequest.start_date || !changeRequest.end_date}
                className="flex-1"
              >
                {submittingChange ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
