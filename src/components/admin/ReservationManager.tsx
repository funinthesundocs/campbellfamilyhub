import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Check, X, Clock, Calendar, Users, MessageSquare, ChevronDown, ChevronUp, Pencil, RotateCcw, Ban, CalendarRange } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { EditReservationModal } from './EditReservationModal';
import type { UserProfile, ReservationChangeRequest } from '../../types';

interface Property {
  id: string;
  name: string;
  max_guests?: number;
}

interface Reservation {
  id: string;
  property_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  guest_count: number;
  guests_names: string | null;
  purpose: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  payment_status?: string;
  nights_count?: number;
  nightly_rate?: number;
  cleaning_fee?: number;
  subtotal?: number;
  total_amount?: number;
  deposit_amount?: number;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  user?: UserProfile;
  property?: Property;
  reviewer?: UserProfile;
  changeRequests?: ReservationChangeRequest[];
}

type FilterStatus = 'pending' | 'approved' | 'denied' | 'all';

export default function ReservationManager() {
  const { profile } = useAuth();
  const { success, error: showError } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [processingChangeRequest, setProcessingChangeRequest] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);

    const { data: propertiesData } = await supabase
      .from('properties')
      .select('*')
      .order('name');

    let query = supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data: reservationsData } = await query;

    if (reservationsData && reservationsData.length > 0) {
      const { data: changeRequestsData } = await supabase
        .from('reservation_change_requests')
        .select('*')
        .eq('status', 'pending')
        .in('reservation_id', reservationsData.map(r => r.id))
        .order('created_at', { ascending: false });

      const userIds = [...new Set([
        ...reservationsData.map(r => r.user_id),
        ...reservationsData.filter(r => r.reviewed_by).map(r => r.reviewed_by)
      ])];

      const { data: users } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', userIds);

      const enriched = reservationsData.map(r => ({
        ...r,
        user: users?.find(u => u.id === r.user_id),
        property: propertiesData?.find(p => p.id === r.property_id),
        reviewer: r.reviewed_by ? users?.find(u => u.id === r.reviewed_by) : undefined,
        changeRequests: changeRequestsData?.filter(cr => cr.reservation_id === r.id) || []
      }));

      setReservations(enriched);
    } else {
      setReservations([]);
    }

    setLoading(false);
  };

  const handleDecision = async (reservationId: string, decision: 'approved' | 'denied') => {
    if (!profile) return;
    setProcessing(reservationId);

    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) return;

    const updateData: Record<string, string | null> = {
      status: decision,
      admin_notes: adminNotes[reservationId] || null,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (decision === 'approved') {
      updateData.payment_status = 'awaiting_deposit';
    }

    const { error } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', reservationId);

    if (error) {
      showError(`Failed to ${decision === 'approved' ? 'approve' : 'deny'} reservation`);
    } else {
      await supabase.from('notifications').insert({
        user_id: reservation.user_id,
        type: decision === 'approved' ? 'reservation-approved' : 'reservation-denied',
        title: decision === 'approved' ? 'Reservation Approved!' : 'Reservation Denied',
        message: decision === 'approved'
          ? `Your reservation at ${reservation.property?.name} for ${formatDate(reservation.start_date)} - ${formatDate(reservation.end_date)} has been approved.`
          : `Your reservation at ${reservation.property?.name} for ${formatDate(reservation.start_date)} - ${formatDate(reservation.end_date)} was not approved.${adminNotes[reservationId] ? ` Note: ${adminNotes[reservationId]}` : ''}`,
        link: `/properties/${reservation.property_id}`,
      });

      success(`Reservation ${decision}`);
      setAdminNotes(prev => ({ ...prev, [reservationId]: '' }));
      setExpandedId(null);
      fetchData();
    }

    setProcessing(null);
  };

  const handleQuickStatusChange = async (reservationId: string, newStatus: 'pending' | 'cancelled') => {
    if (!profile) return;
    setProcessing(reservationId);

    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) return;

    const { error } = await supabase
      .from('reservations')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId);

    if (error) {
      showError(`Failed to update reservation`);
    } else {
      const messages = {
        pending: 'Your reservation has been moved back to pending review.',
        cancelled: 'Your reservation has been cancelled by an administrator.',
      };

      await supabase.from('notifications').insert({
        user_id: reservation.user_id,
        type: newStatus === 'cancelled' ? 'reservation-cancelled' : 'reservation-updated',
        title: newStatus === 'cancelled' ? 'Reservation Cancelled' : 'Reservation Status Changed',
        message: `${reservation.property?.name}: ${messages[newStatus]}`,
        link: `/properties/${reservation.property_id}`,
      });

      success(`Reservation ${newStatus === 'pending' ? 'moved to pending' : 'cancelled'}`);
      fetchData();
    }

    setProcessing(null);
  };

  const validateDateChange = async (
    changeRequest: ReservationChangeRequest,
    propertyId: string
  ): Promise<{ valid: boolean; message?: string }> => {
    const startDate = new Date(changeRequest.requested_start_date);
    const endDate = new Date(changeRequest.requested_end_date);

    if (endDate <= startDate) {
      return { valid: false, message: 'Check-out date must be after check-in date' };
    }

    const { data: conflictingReservations } = await supabase
      .from('reservations')
      .select('id')
      .eq('property_id', propertyId)
      .eq('status', 'approved')
      .neq('id', changeRequest.reservation_id)
      .or(`start_date.lte.${changeRequest.requested_end_date},end_date.gte.${changeRequest.requested_start_date}`);

    if (conflictingReservations && conflictingReservations.length > 0) {
      return { valid: false, message: 'These dates conflict with another approved reservation' };
    }

    const { data: blackoutDates } = await supabase
      .from('blackout_dates')
      .select('id')
      .eq('property_id', propertyId)
      .or(`start_date.lte.${changeRequest.requested_end_date},end_date.gte.${changeRequest.requested_start_date}`);

    if (blackoutDates && blackoutDates.length > 0) {
      return { valid: false, message: 'These dates conflict with a blackout period' };
    }

    return { valid: true };
  };

  const handleApproveChangeRequest = async (changeRequest: ReservationChangeRequest) => {
    if (!profile) return;
    setProcessingChangeRequest(changeRequest.id);

    const reservation = reservations.find(r => r.id === changeRequest.reservation_id);
    if (!reservation) {
      showError('Reservation not found');
      setProcessingChangeRequest(null);
      return;
    }

    const validation = await validateDateChange(changeRequest, reservation.property_id);
    if (!validation.valid) {
      showError(validation.message || 'Invalid dates');
      setProcessingChangeRequest(null);
      return;
    }

    const startDate = new Date(changeRequest.requested_start_date);
    const endDate = new Date(changeRequest.requested_end_date);
    const nightsCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const subtotal = (reservation.nightly_rate || 0) * nightsCount;
    const totalAmount = subtotal + (reservation.cleaning_fee || 0);

    const { error: updateResError } = await supabase
      .from('reservations')
      .update({
        start_date: changeRequest.requested_start_date,
        end_date: changeRequest.requested_end_date,
        nights_count: nightsCount,
        subtotal,
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', changeRequest.reservation_id);

    if (updateResError) {
      showError('Failed to update reservation');
      setProcessingChangeRequest(null);
      return;
    }

    const { error: updateCRError } = await supabase
      .from('reservation_change_requests')
      .update({
        status: 'approved',
        reviewed_by: profile.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', changeRequest.id);

    if (updateCRError) {
      showError('Failed to update change request');
      setProcessingChangeRequest(null);
      return;
    }

    await supabase.from('notifications').insert({
      user_id: changeRequest.requested_by,
      type: 'reservation-updated',
      title: 'Date Change Approved',
      message: `Your date change request for ${reservation.property?.name} has been approved. New dates: ${formatDate(changeRequest.requested_start_date)} - ${formatDate(changeRequest.requested_end_date)}`,
      link: `/reservations/${changeRequest.reservation_id}`,
    });

    success('Date change request approved');
    setProcessingChangeRequest(null);
    fetchData();
  };

  const handleDenyChangeRequest = async (changeRequest: ReservationChangeRequest, adminNotes: string) => {
    if (!profile) return;
    if (!adminNotes.trim()) {
      showError('Please provide a reason for denial');
      return;
    }

    setProcessingChangeRequest(changeRequest.id);

    const reservation = reservations.find(r => r.id === changeRequest.reservation_id);

    const { error } = await supabase
      .from('reservation_change_requests')
      .update({
        status: 'denied',
        reviewed_by: profile.id,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', changeRequest.id);

    if (error) {
      showError('Failed to deny change request');
      setProcessingChangeRequest(null);
      return;
    }

    await supabase.from('notifications').insert({
      user_id: changeRequest.requested_by,
      type: 'reservation-updated',
      title: 'Date Change Request Denied',
      message: `Your date change request for ${reservation?.property?.name} was not approved. ${adminNotes}`,
      link: `/reservations/${changeRequest.reservation_id}`,
    });

    success('Date change request denied');
    setAdminNotes(prev => ({ ...prev, [changeRequest.id]: '' }));
    setProcessingChangeRequest(null);
    fetchData();
  };

  const pendingCount = reservations.filter(r => r.status === 'pending').length;

  const filterButtons: { id: FilterStatus; label: string }[] = [
    { id: 'pending', label: `Pending${filter !== 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}` },
    { id: 'approved', label: 'Approved' },
    { id: 'denied', label: 'Denied' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {filterButtons.map(btn => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === btn.id
                ? 'bg-[var(--accent-gold)] text-[#0f0f0f]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-20 bg-[var(--bg-tertiary)] rounded" />
            </Card>
          ))}
        </div>
      ) : reservations.length === 0 ? (
        <Card className="text-center py-8">
          <Clock className="mx-auto mb-3 text-[var(--text-muted)]" size={32} />
          <p className="text-[var(--text-secondary)]">
            {filter === 'pending' ? 'No pending reservations' : `No ${filter} reservations`}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reservations.map(reservation => (
            <Card key={reservation.id} className="overflow-hidden">
              <div
                className="flex items-start justify-between cursor-pointer"
                onClick={() => setExpandedId(expandedId === reservation.id ? null : reservation.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      reservation.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      reservation.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      reservation.status === 'denied' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {reservation.status}
                    </span>
                    {reservation.changeRequests && reservation.changeRequests.length > 0 && (
                      <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-blue-500/20 text-blue-400 flex items-center gap-1">
                        <CalendarRange size={12} />
                        Date Change Requested
                      </span>
                    )}
                    <span className="text-sm text-[var(--text-muted)]">
                      {formatDate(reservation.created_at)}
                    </span>
                  </div>
                  <h3 className="font-medium text-[var(--text-primary)]">
                    {reservation.property?.name || 'Unknown Property'}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Requested by {reservation.user?.display_name || 'Unknown'}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {formatDate(reservation.start_date)} - {formatDate(reservation.end_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {reservation.guest_count} guests
                    </span>
                  </div>
                </div>
                <button className="p-2 text-[var(--text-muted)]">
                  {expandedId === reservation.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              {expandedId === reservation.id && (
                <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {reservation.guests_names && (
                      <div>
                        <p className="text-xs text-[var(--text-muted)] mb-1">Guest Names</p>
                        <p className="text-sm text-[var(--text-secondary)]">{reservation.guests_names}</p>
                      </div>
                    )}
                    {reservation.purpose && (
                      <div>
                        <p className="text-xs text-[var(--text-muted)] mb-1">Purpose</p>
                        <p className="text-sm text-[var(--text-secondary)]">{reservation.purpose}</p>
                      </div>
                    )}
                    {reservation.notes && (
                      <div className="md:col-span-2">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Notes from Requester</p>
                        <p className="text-sm text-[var(--text-secondary)]">{reservation.notes}</p>
                      </div>
                    )}
                  </div>

                  {reservation.total_amount !== undefined && reservation.total_amount > 0 && (
                    <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 mb-4 border border-[var(--border-default)]">
                      <p className="text-xs text-[var(--text-muted)] mb-3 font-medium">Pricing Breakdown</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-[var(--text-secondary)]">
                          <span>${(reservation.nightly_rate || 0).toFixed(2)} × {reservation.nights_count || 0} night{(reservation.nights_count || 0) > 1 ? 's' : ''}</span>
                          <span>${(reservation.subtotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[var(--text-secondary)]">
                          <span>Cleaning fee</span>
                          <span>${(reservation.cleaning_fee || 0).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-[var(--border-default)] pt-2 flex justify-between font-medium text-[var(--text-primary)]">
                          <span>Total</span>
                          <span>${(reservation.total_amount || 0).toFixed(2)}</span>
                        </div>
                        {reservation.deposit_amount !== undefined && reservation.deposit_amount > 0 && (
                          <div className="flex justify-between text-[var(--accent-gold)] text-xs pt-1">
                            <span>Deposit required</span>
                            <span>${reservation.deposit_amount.toFixed(2)}</span>
                          </div>
                        )}
                        {reservation.payment_status && (
                          <div className="flex justify-between text-xs pt-1">
                            <span>Payment Status</span>
                            <span className={`px-2 py-0.5 rounded-full ${
                              reservation.payment_status === 'fully_paid' ? 'bg-green-500/20 text-green-400' :
                              reservation.payment_status === 'deposit_paid' ? 'bg-blue-500/20 text-blue-400' :
                              reservation.payment_status === 'awaiting_deposit' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {reservation.payment_status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {reservation.changeRequests && reservation.changeRequests.length > 0 && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CalendarRange size={16} className="text-blue-300" />
                        <h4 className="text-sm font-medium text-blue-300">Date Change Request</h4>
                      </div>
                      {reservation.changeRequests.map(changeRequest => (
                        <div key={changeRequest.id} className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-[var(--text-muted)] mb-1">Current Dates</p>
                              <p className="text-[var(--text-secondary)]">
                                {formatDate(changeRequest.original_start_date)} → {formatDate(changeRequest.original_end_date)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-[var(--text-muted)] mb-1">Requested Dates</p>
                              <p className="text-blue-300 font-medium">
                                {formatDate(changeRequest.requested_start_date)} → {formatDate(changeRequest.requested_end_date)}
                              </p>
                            </div>
                          </div>
                          {changeRequest.reason && (
                            <div>
                              <p className="text-xs text-[var(--text-muted)] mb-1">Reason</p>
                              <p className="text-sm text-[var(--text-secondary)]">{changeRequest.reason}</p>
                            </div>
                          )}
                          <div>
                            <label className="block text-xs text-[var(--text-muted)] mb-1">
                              Admin Notes (required for denial)
                            </label>
                            <textarea
                              value={adminNotes[changeRequest.id] || ''}
                              onChange={(e) => setAdminNotes(prev => ({ ...prev, [changeRequest.id]: e.target.value }))}
                              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                              rows={2}
                              placeholder="Add a note about this decision..."
                            />
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              onClick={() => handleApproveChangeRequest(changeRequest)}
                              loading={processingChangeRequest === changeRequest.id}
                              size="sm"
                              className="flex-1 min-w-[120px]"
                            >
                              <Check size={14} className="mr-1.5" /> Approve Change
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => handleDenyChangeRequest(changeRequest, adminNotes[changeRequest.id] || '')}
                              loading={processingChangeRequest === changeRequest.id}
                              size="sm"
                              className="flex-1 min-w-[120px] !bg-red-500/10 hover:!bg-red-500/20 !text-red-400"
                            >
                              <X size={14} className="mr-1.5" /> Deny Change
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {reservation.status === 'pending' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1">
                          <MessageSquare size={12} className="inline mr-1" />
                          Admin Notes (optional)
                        </label>
                        <textarea
                          value={adminNotes[reservation.id] || ''}
                          onChange={(e) => setAdminNotes(prev => ({ ...prev, [reservation.id]: e.target.value }))}
                          className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                          rows={2}
                          placeholder="Add a note about this decision..."
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={() => handleDecision(reservation.id, 'approved')}
                          loading={processing === reservation.id}
                          className="flex-1 min-w-[120px]"
                        >
                          <Check size={16} className="mr-2" /> Approve
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleDecision(reservation.id, 'denied')}
                          loading={processing === reservation.id}
                          className="flex-1 min-w-[120px] !bg-red-500/10 hover:!bg-red-500/20 !text-red-400"
                        >
                          <X size={16} className="mr-2" /> Deny
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setEditingReservation(reservation)}
                          className="min-w-[100px]"
                        >
                          <Pencil size={16} className="mr-2" /> Edit
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reservation.reviewer && (
                        <p className="text-sm text-[var(--text-muted)]">
                          Reviewed by {reservation.reviewer.display_name} on {formatDate(reservation.reviewed_at || '')}
                        </p>
                      )}
                      {reservation.admin_notes && (
                        <p className="text-sm text-[var(--text-muted)]">Note: {reservation.admin_notes}</p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        {reservation.status === 'approved' && (
                          <Button
                            variant="secondary"
                            onClick={() => handleQuickStatusChange(reservation.id, 'pending')}
                            loading={processing === reservation.id}
                            size="sm"
                          >
                            <RotateCcw size={14} className="mr-1.5" /> Revert to Pending
                          </Button>
                        )}
                        {reservation.status !== 'cancelled' && (
                          <Button
                            variant="secondary"
                            onClick={() => handleQuickStatusChange(reservation.id, 'cancelled')}
                            loading={processing === reservation.id}
                            size="sm"
                            className="!bg-red-500/10 hover:!bg-red-500/20 !text-red-400"
                          >
                            <Ban size={14} className="mr-1.5" /> Cancel
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          onClick={() => setEditingReservation(reservation)}
                          size="sm"
                        >
                          <Pencil size={14} className="mr-1.5" /> Edit
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <EditReservationModal
        isOpen={!!editingReservation}
        onClose={() => setEditingReservation(null)}
        reservation={editingReservation}
        onSave={fetchData}
      />
    </div>
  );
}
