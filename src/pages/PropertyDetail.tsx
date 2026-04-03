import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTraining } from '../contexts/TrainingContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { PropertyCalendar } from '../components/property/PropertyCalendar';
import { PropertyHeroGallery } from '../components/property/PropertyHeroGallery';
import { ReservationModal, type ReservationFormData } from '../components/property/ReservationModal';
import { SectionWelcome } from '../components/training/SectionWelcome';
import { TrainingTooltip } from '../components/training/TrainingTooltip';
import { TOOLTIPS } from '../components/training/training-content';
import {
  ArrowLeft, Building2, MapPin, Users, Bed, Bath, Calendar, Check, Clock,
  Wifi, Car, ChefHat, Droplets, Waves, TreeDeciduous, Flame, Beef, WashingMachine,
  Snowflake, Thermometer, Anchor, Ship, Bike, CircleDot, Tv, Gamepad2, PanelTop
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import type { Property, UserProfile, PropertyAttribute } from '../types';

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
  created_at: string;
  user?: UserProfile;
}

interface BlackoutDate {
  id: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

const amenityIcons: Record<string, typeof Wifi> = {
  wifi: Wifi,
  parking: Car,
  'full kitchen': ChefHat,
  pool: Droplets,
  'lake access': Waves,
  lake: Waves,
  yard: TreeDeciduous,
  fireplace: Flame,
  'bbq grill': Beef,
  'washer/dryer': WashingMachine,
  'central a/c': Snowflake,
  heating: Thermometer,
  'hot tub': Bath,
  'private dock': Anchor,
  kayaks: Ship,
  bikes: Bike,
  'fire pit': CircleDot,
  'smart tv': Tv,
  'game room': Gamepad2,
  'screened porch': PanelTop,
  paddleboards: Ship,
};

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const { trainingMode } = useTraining();
  const [property, setProperty] = useState<Property | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [propertyAttributes, setPropertyAttributes] = useState<PropertyAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>();

  useEffect(() => {
    if (id) fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    const { data: propertyData } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!propertyData) {
      setLoading(false);
      return;
    }
    setProperty(propertyData);

    const [reservationsResult, blackoutResult, attributesResult] = await Promise.all([
      supabase
        .from('reservations')
        .select('*')
        .eq('property_id', id)
        .in('status', ['approved', 'pending'])
        .order('start_date'),
      supabase
        .from('property_blackout_dates')
        .select('*')
        .eq('property_id', id),
      supabase
        .from('property_attributes')
        .select('*')
        .eq('is_active', true)
        .order('display_order'),
    ]);

    if (attributesResult.data) {
      setPropertyAttributes(attributesResult.data);
    }

    if (reservationsResult.data) {
      const userIds = [...new Set(reservationsResult.data.map(r => r.user_id))];
      const { data: users } = await supabase.from('user_profiles').select('*').in('id', userIds);

      const reservationsWithUsers = reservationsResult.data.map(r => ({
        ...r,
        user: users?.find(u => u.id === r.user_id),
      }));
      setReservations(reservationsWithUsers);
      setMyReservations(reservationsWithUsers.filter(r => r.user_id === user?.id));
    }

    if (blackoutResult.data) {
      setBlackoutDates(blackoutResult.data);
    }

    setLoading(false);
  };

  const handleReservationSubmit = async (data: ReservationFormData) => {
    if (!user || !property) return;

    if (!data.start_date || !data.end_date) {
      showError('Please select dates');
      return;
    }

    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (startDate >= endDate) {
      showError('End date must be after start date');
      return;
    }

    if (startDate < new Date()) {
      showError('Start date cannot be in the past');
      return;
    }

    const { error } = await supabase.from('reservations').insert({
      property_id: property.id,
      user_id: user.id,
      start_date: data.start_date,
      end_date: data.end_date,
      guest_count: data.guest_count,
      guests_names: data.guests_names || null,
      notes: data.notes || null,
      status: 'pending',
      payment_status: 'pending',
      nights_count: data.nights_count || 0,
      nightly_rate: data.nightly_rate || 0,
      cleaning_fee: data.cleaning_fee || 0,
      subtotal: data.subtotal || 0,
      total_amount: data.total_amount || 0,
      deposit_amount: data.deposit_amount || 0,
    });

    if (error) {
      showError('Failed to submit reservation request');
    } else {
      success('Reservation request submitted! You will be notified when it is reviewed.');
      setShowReservationModal(false);
      setSelectedDate(undefined);
      fetchProperty();
    }
  };

  const cancelReservation = async (reservationId: string) => {
    if (!confirm('Cancel this reservation?')) return;
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', reservationId);
    if (error) {
      showError('Failed to cancel reservation');
    } else {
      success('Reservation cancelled');
      fetchProperty();
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setShowReservationModal(true);
  };

  const handleCheckAvailability = () => {
    setSelectedDate(undefined);
    setShowReservationModal(true);
  };

  const galleryImages = property?.gallery_order?.length
    ? property.gallery_order
    : property?.cover_image_url
      ? [property.cover_image_url, ...(property.photo_urls || [])]
      : property?.photo_urls || [];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Skeleton className="h-80 mb-6 rounded-lg" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <Building2 className="mx-auto mb-4 text-[var(--text-muted)]" size={48} />
        <p className="text-[var(--text-secondary)] mb-4">Property not found</p>
        <Link to="/properties" className="text-[var(--accent-gold)] hover:underline">Back to properties</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {trainingMode && <SectionWelcome sectionId="property-detail" />}

      <TrainingTooltip tipId="property-back" content={TOOLTIPS['property-back']?.content || ''} position="bottom">
        <button
          onClick={() => navigate('/properties')}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] mb-6"
        >
          <ArrowLeft size={20} /> Back to Properties
        </button>
      </TrainingTooltip>

      <div className="mb-6">
        <PropertyHeroGallery images={galleryImages} propertyName={property.name} />
      </div>

      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl text-[var(--text-primary)] mb-2">{property.name}</h1>
        {(property.city || property.state) && (
          <p className="flex items-center gap-1 text-[var(--text-secondary)] text-lg">
            <MapPin size={18} /> {property.address && `${property.address}, `}
            {property.city}{property.city && property.state && ', '}{property.state} {property.zip_code}
          </p>
        )}

        <div className="flex flex-wrap gap-3 mt-4">
          {property.max_guests && (
            <span className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)]">
              <Users size={18} /> Up to {property.max_guests} guests
            </span>
          )}
          {property.bedrooms && (
            <span className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)]">
              <Bed size={18} /> {property.bedrooms} bedrooms
            </span>
          )}
          {property.bathrooms && (
            <span className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)]">
              <Bath size={18} /> {property.bathrooms} bathrooms
            </span>
          )}
        </div>
      </div>

      <div className="mb-8">
        <TrainingTooltip tipId="property-calendar" content={TOOLTIPS['property-calendar']?.content || ''} position="bottom">
          <h2 className="font-serif text-xl text-[var(--text-primary)] mb-4">Availability Calendar</h2>
        </TrainingTooltip>
        <PropertyCalendar
          reservations={reservations}
          blackoutDates={blackoutDates}
          currentUserId={user?.id}
          onDateSelect={handleDateSelect}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {property.description && (
            <Card>
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-3">About this property</h2>
              <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{property.description}</p>
            </Card>
          )}

          {property.amenities && property.amenities.length > 0 && (
            <Card>
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-3">Amenities</h2>
              <div className="grid grid-cols-2 gap-3">
                {property.amenities.map((amenity, i) => {
                  const Icon = amenityIcons[amenity.toLowerCase()] || Check;
                  return (
                    <div key={i} className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Icon size={16} className="text-[var(--accent-gold)]" />
                      <span className="capitalize">{amenity}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {property.custom_attributes && propertyAttributes.length > 0 && (
            <Card>
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-3">Property Details</h2>
              <div className="grid grid-cols-2 gap-3">
                {propertyAttributes.map((attr) => {
                  const value = property.custom_attributes?.[attr.key];
                  if (value === undefined || value === null || value === '') return null;
                  return (
                    <div key={attr.id} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                      <span className="text-[var(--text-secondary)]">{attr.name}</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {attr.type === 'boolean' ? (value ? 'Yes' : 'No') : value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {property.house_rules && (
            <Card>
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-3">House Rules</h2>
              <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{property.house_rules}</p>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <TrainingTooltip tipId="property-book-box" content={TOOLTIPS['property-book-box']?.content || ''} position="top">
              <Card>
                <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Book this property</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Select a date on the calendar above or click below to request a reservation.
                </p>
                <Button onClick={handleCheckAvailability} className="w-full">
                  <Calendar size={18} className="mr-2" /> Check Availability
                </Button>
              </Card>
            </TrainingTooltip>

            {myReservations.length > 0 && (
              <TrainingTooltip tipId="property-your-reservations" content={TOOLTIPS['property-your-reservations']?.content || ''} position="top">
                <Card>
                  <h3 className="font-medium text-[var(--text-primary)] mb-3">Your Reservations</h3>
                  <div className="space-y-3">
                    {myReservations.map(r => (
                      <div key={r.id} className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {formatDate(r.start_date)} - {formatDate(r.end_date)}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            r.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                            r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                        {r.status === 'pending' && (
                          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                            <Clock size={12} /> Awaiting approval
                          </div>
                        )}
                        {r.status !== 'cancelled' && (
                          <div className="flex items-center gap-3 mt-2">
                            <button
                              onClick={() => navigate(`/reservations/${r.id}`)}
                              className="text-xs text-blue-400 hover:underline"
                            >
                              View / Edit Reservation
                            </button>
                            <button
                              onClick={() => cancelReservation(r.id)}
                              className="text-xs text-red-400 hover:underline"
                            >
                              Cancel reservation
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </TrainingTooltip>
            )}
          </div>
        </div>
      </div>

      <ReservationModal
        isOpen={showReservationModal}
        onClose={() => {
          setShowReservationModal(false);
          setSelectedDate(undefined);
        }}
        onSubmit={handleReservationSubmit}
        propertyName={property.name}
        maxGuests={property.max_guests || 20}
        initialDate={selectedDate}
        pricePerNight={(property as Property & { price_per_night?: number }).price_per_night || 0}
        cleaningFee={(property as Property & { cleaning_fee?: number }).cleaning_fee || 0}
        minimumStayDays={(property as Property & { minimum_stay_days?: number }).minimum_stay_days || 1}
        maximumStayDays={(property as Property & { maximum_stay_days?: number }).maximum_stay_days}
        minimumDeposit={(property as Property & { minimum_deposit?: number }).minimum_deposit || 0}
      />
    </div>
  );
}
