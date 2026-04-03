import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTraining } from '../contexts/TrainingContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { SectionWelcome } from '../components/training/SectionWelcome';
import { TrainingTooltip } from '../components/training/TrainingTooltip';
import { TOOLTIPS } from '../components/training/training-content';
import { Building2, MapPin, Users, Bed, Bath } from 'lucide-react';
import type { Property } from '../types';

export default function Properties() {
  const { trainingMode } = useTraining();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setProperties(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-48 mb-4 rounded-lg" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {trainingMode && <SectionWelcome sectionId="properties-list" />}

      <div className="flex justify-between items-center mb-6">
        <h1 className="font-serif text-3xl text-[var(--text-primary)]">Family Properties</h1>
      </div>

      {properties.length === 0 ? (
        <TrainingTooltip tipId="properties-empty" content={TOOLTIPS['properties-empty']?.content || ''} position="top">
          <Card className="text-center py-12">
            <Building2 className="mx-auto mb-4 text-[var(--text-muted)]" size={48} />
            <p className="text-[var(--text-secondary)]">No properties available</p>
            <p className="text-sm text-[var(--text-muted)]">Check back later for family properties to book</p>
          </Card>
        </TrainingTooltip>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {properties.map((property, index) => (
            <TrainingTooltip
              key={property.id}
              tipId={index === 0 ? 'properties-card' : `properties-card-${index}`}
              content={index === 0 ? TOOLTIPS['properties-card']?.content || '' : ''}
              position="top"
            >
              <Link to={`/properties/${property.id}`}>
                <Card className="h-full">
                  {property.cover_image_url ? (
                    <img
                      src={property.cover_image_url}
                      alt={property.name}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div className="w-full h-48 bg-[var(--bg-tertiary)] rounded-lg mb-4 flex items-center justify-center">
                      <Building2 size={48} className="text-[var(--text-muted)]" />
                    </div>
                  )}
                  <h3 className="font-serif text-xl text-[var(--text-primary)] mb-2">{property.name}</h3>
                  {(property.city || property.state) && (
                    <p className="flex items-center gap-1 text-sm text-[var(--text-secondary)] mb-3">
                      <MapPin size={14} /> {property.city}{property.city && property.state && ', '}{property.state}
                    </p>
                  )}
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4">{property.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
                    {property.max_guests && (
                      <span className="flex items-center gap-1">
                        <Users size={14} /> Up to {property.max_guests}
                      </span>
                    )}
                    {property.bedrooms && (
                      <span className="flex items-center gap-1">
                        <Bed size={14} /> {property.bedrooms} beds
                      </span>
                    )}
                    {property.bathrooms && (
                      <span className="flex items-center gap-1">
                        <Bath size={14} /> {property.bathrooms} baths
                      </span>
                    )}
                  </div>
                  <Button className="w-full mt-4">Book Now</Button>
                </Card>
              </Link>
            </TrainingTooltip>
          ))}
        </div>
      )}
    </div>
  );
}
