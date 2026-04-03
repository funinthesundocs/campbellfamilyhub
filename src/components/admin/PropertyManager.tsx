import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MediaPickerModal } from '../media/MediaPickerModal';
import {
  Plus, Edit2, Trash2, Building2, MapPin, Users, Bed, Bath, X, Check, Eye, EyeOff, ImageIcon, GripVertical, Images
} from 'lucide-react';
import type { Property } from '../../types';

interface PropertyAttribute {
  id: string;
  name: string;
  key: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options: string[];
  is_required: boolean;
  display_order: number;
  is_active: boolean;
}

const PROPERTY_TYPES = [
  { value: 'lake-house', label: 'Lake House' },
  { value: 'cabin', label: 'Cabin' },
  { value: 'beach-house', label: 'Beach House' },
  { value: 'farm', label: 'Farm' },
  { value: 'city-home', label: 'City Home' },
  { value: 'other', label: 'Other' },
];

const AMENITIES_OPTIONS = [
  'Wifi', 'Parking', 'Full Kitchen', 'Pool', 'Lake Access', 'Yard', 'Fireplace',
  'BBQ Grill', 'Washer/Dryer', 'Central A/C', 'Heating', 'Hot Tub', 'Private Dock',
  'Kayaks', 'Bikes', 'Fire Pit', 'Smart TV', 'Game Room', 'Screened Porch'
];

interface PropertyFormData {
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  cover_image_url: string;
  property_type: string;
  max_guests: string;
  bedrooms: string;
  bathrooms: string;
  price_per_night: string;
  cleaning_fee: string;
  minimum_stay_days: string;
  maximum_stay_days: string;
  minimum_deposit: string;
  amenities: string[];
  gallery_order: string[];
  house_rules: string;
  is_active: boolean;
  custom_attributes: Record<string, string | number | boolean>;
}

const emptyForm: PropertyFormData = {
  name: '',
  description: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  cover_image_url: '',
  property_type: 'lake-house',
  max_guests: '',
  bedrooms: '',
  bathrooms: '',
  price_per_night: '',
  cleaning_fee: '',
  minimum_stay_days: '1',
  maximum_stay_days: '',
  minimum_deposit: '',
  amenities: [],
  gallery_order: [],
  house_rules: '',
  is_active: true,
  custom_attributes: {},
};

export default function PropertyManager() {
  const { success, error: showError } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PropertyFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [customAmenities, setCustomAmenities] = useState<string[]>([]);
  const [newAmenityInput, setNewAmenityInput] = useState('');
  const [showNewAmenityInput, setShowNewAmenityInput] = useState(false);
  const [propertyAttributes, setPropertyAttributes] = useState<PropertyAttribute[]>([]);

  useEffect(() => {
    fetchProperties();
    fetchCustomAmenities();
    fetchPropertyAttributes();
  }, []);

  const fetchProperties = async () => {
    const { data } = await supabase
      .from('properties')
      .select('*')
      .order('name');
    setProperties(data || []);
    setLoading(false);
  };

  const fetchCustomAmenities = async () => {
    const { data } = await supabase
      .from('properties')
      .select('amenities');

    if (data) {
      const allAmenities = new Set<string>();
      data.forEach((p) => {
        (p.amenities || []).forEach((a: string) => {
          if (!AMENITIES_OPTIONS.includes(a)) {
            allAmenities.add(a);
          }
        });
      });
      setCustomAmenities(Array.from(allAmenities));
    }
  };

  const fetchPropertyAttributes = async () => {
    const { data } = await supabase
      .from('property_attributes')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    setPropertyAttributes(data || []);
  };

  const handleAddNewAmenity = () => {
    const trimmed = newAmenityInput.trim();
    if (!trimmed) return;

    const allCurrentAmenities = [...AMENITIES_OPTIONS, ...customAmenities];
    if (allCurrentAmenities.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
      showError('This amenity already exists');
      return;
    }

    setCustomAmenities((prev) => [...prev, trimmed]);
    setForm((prev) => ({
      ...prev,
      amenities: [...prev.amenities, trimmed],
    }));
    setNewAmenityInput('');
    setShowNewAmenityInput(false);
    success('Amenity added');
  };

  const handleEdit = (property: Property) => {
    setForm({
      name: property.name,
      description: property.description || '',
      address: property.address || '',
      city: property.city || '',
      state: property.state || '',
      zip_code: property.zip_code || '',
      cover_image_url: property.cover_image_url || '',
      property_type: property.property_type || 'lake-house',
      max_guests: property.max_guests?.toString() || '',
      bedrooms: property.bedrooms?.toString() || '',
      bathrooms: property.bathrooms?.toString() || '',
      price_per_night: (property as Property & { price_per_night?: number }).price_per_night?.toString() || '',
      cleaning_fee: (property as Property & { cleaning_fee?: number }).cleaning_fee?.toString() || '',
      minimum_stay_days: (property as Property & { minimum_stay_days?: number }).minimum_stay_days?.toString() || '1',
      maximum_stay_days: (property as Property & { maximum_stay_days?: number }).maximum_stay_days?.toString() || '',
      minimum_deposit: (property as Property & { minimum_deposit?: number }).minimum_deposit?.toString() || '',
      amenities: property.amenities || [],
      gallery_order: property.gallery_order || [],
      house_rules: property.house_rules || '',
      is_active: property.is_active ?? true,
      custom_attributes: (property as Property & { custom_attributes?: Record<string, string | number | boolean> }).custom_attributes || {},
    });
    setEditingId(property.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showError('Property name is required');
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      zip_code: form.zip_code.trim() || null,
      cover_image_url: form.cover_image_url.trim() || null,
      property_type: form.property_type,
      max_guests: form.max_guests ? parseInt(form.max_guests) : null,
      bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
      bathrooms: form.bathrooms ? parseFloat(form.bathrooms) : null,
      price_per_night: form.price_per_night ? parseFloat(form.price_per_night) : 0,
      cleaning_fee: form.cleaning_fee ? parseFloat(form.cleaning_fee) : 0,
      minimum_stay_days: form.minimum_stay_days ? parseInt(form.minimum_stay_days) : 1,
      maximum_stay_days: form.maximum_stay_days ? parseInt(form.maximum_stay_days) : null,
      minimum_deposit: form.minimum_deposit ? parseFloat(form.minimum_deposit) : 0,
      amenities: form.amenities,
      gallery_order: form.gallery_order.length > 0 ? form.gallery_order : null,
      house_rules: form.house_rules.trim() || null,
      is_active: form.is_active,
      custom_attributes: form.custom_attributes,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingId) {
      const result = await supabase.from('properties').update(payload).eq('id', editingId);
      error = result.error;
    } else {
      const result = await supabase.from('properties').insert(payload);
      error = result.error;
    }

    if (error) {
      if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
        showError('Session expired. Please refresh the page and try again.');
      } else {
        showError(`Failed to ${editingId ? 'update' : 'create'} property`);
      }
    } else {
      success(`Property ${editingId ? 'updated' : 'created'}`);
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchProperties();
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property? This cannot be undone.')) return;

    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) {
      showError('Failed to delete property. It may have existing reservations.');
    } else {
      success('Property deleted');
      fetchProperties();
    }
  };

  const toggleActive = async (property: Property) => {
    const { error } = await supabase
      .from('properties')
      .update({ is_active: !property.is_active, updated_at: new Date().toISOString() })
      .eq('id', property.id);

    if (error) {
      showError('Failed to update property');
    } else {
      success(`Property ${property.is_active ? 'hidden' : 'visible'}`);
      fetchProperties();
    }
  };

  const toggleAmenity = (amenity: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

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

  if (showForm) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">
            {editingId ? 'Edit Property' : 'New Property'}
          </h3>
          <button
            onClick={() => {
              setShowForm(false);
              setEditingId(null);
              setForm(emptyForm);
              setShowNewAmenityInput(false);
              setNewAmenityInput('');
            }}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Property Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Lake House"
            required
          />

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
              rows={3}
              placeholder="Describe the property..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Property Type</label>
              <select
                value={form.property_type}
                onChange={(e) => setForm({ ...form, property_type: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
              >
                {PROPERTY_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Cover Image URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.cover_image_url}
                  onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-gold)] hover:border-[var(--accent-gold)] transition-colors flex items-center gap-2"
                  title="Browse gallery"
                >
                  <ImageIcon size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="123 Lake Rd"
            />
            <Input
              label="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Laketown"
            />
            <Input
              label="State"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              placeholder="TX"
            />
            <Input
              label="ZIP"
              value={form.zip_code}
              onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
              placeholder="75001"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Max Guests"
              type="number"
              value={form.max_guests}
              onChange={(e) => setForm({ ...form, max_guests: e.target.value })}
              placeholder="10"
              min="1"
            />
            <Input
              label="Bedrooms"
              type="number"
              value={form.bedrooms}
              onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
              placeholder="4"
              min="0"
            />
            <Input
              label="Bathrooms"
              type="number"
              value={form.bathrooms}
              onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
              placeholder="2.5"
              min="0"
              step="0.5"
            />
          </div>

          <div className="border-t border-[var(--border-default)] pt-4 mt-2">
            <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Pricing & Reservation Policies</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input
                label="Price Per Night *"
                type="number"
                value={form.price_per_night}
                onChange={(e) => setForm({ ...form, price_per_night: e.target.value })}
                placeholder="150"
                min="0"
                step="0.01"
                required
              />
              <Input
                label="Cleaning Fee *"
                type="number"
                value={form.cleaning_fee}
                onChange={(e) => setForm({ ...form, cleaning_fee: e.target.value })}
                placeholder="75"
                min="0"
                step="0.01"
                required
              />
              <Input
                label="Minimum Deposit *"
                type="number"
                value={form.minimum_deposit}
                onChange={(e) => setForm({ ...form, minimum_deposit: e.target.value })}
                placeholder="100"
                min="0"
                step="0.01"
                required
              />
              <Input
                label="Minimum Stay (Days) *"
                type="number"
                value={form.minimum_stay_days}
                onChange={(e) => setForm({ ...form, minimum_stay_days: e.target.value })}
                placeholder="1"
                min="1"
                required
              />
              <Input
                label="Maximum Stay (Days)"
                type="number"
                value={form.maximum_stay_days}
                onChange={(e) => setForm({ ...form, maximum_stay_days: e.target.value })}
                placeholder="Optional"
                min="1"
              />
            </div>
          </div>

          {propertyAttributes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Additional Details
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {propertyAttributes.map(attr => (
                  <div key={attr.id}>
                    {attr.type === 'boolean' ? (
                      <label className="flex items-center gap-2 cursor-pointer p-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg">
                        <input
                          type="checkbox"
                          checked={!!form.custom_attributes[attr.key]}
                          onChange={(e) => setForm({
                            ...form,
                            custom_attributes: {
                              ...form.custom_attributes,
                              [attr.key]: e.target.checked,
                            },
                          })}
                          className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                        />
                        <span className="text-sm text-[var(--text-secondary)]">
                          {attr.name}
                          {attr.is_required && <span className="text-[var(--accent-gold)] ml-1">*</span>}
                        </span>
                      </label>
                    ) : attr.type === 'select' ? (
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                          {attr.name}
                          {attr.is_required && <span className="text-[var(--accent-gold)] ml-1">*</span>}
                        </label>
                        <select
                          value={(form.custom_attributes[attr.key] as string) || ''}
                          onChange={(e) => setForm({
                            ...form,
                            custom_attributes: {
                              ...form.custom_attributes,
                              [attr.key]: e.target.value,
                            },
                          })}
                          className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                          required={attr.is_required}
                        >
                          <option value="">Select...</option>
                          {attr.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <Input
                        label={`${attr.name}${attr.is_required ? ' *' : ''}`}
                        type={attr.type === 'number' ? 'number' : 'text'}
                        value={(form.custom_attributes[attr.key] as string | number) ?? ''}
                        onChange={(e) => setForm({
                          ...form,
                          custom_attributes: {
                            ...form.custom_attributes,
                            [attr.key]: attr.type === 'number'
                              ? (e.target.value === '' ? '' : Number(e.target.value))
                              : e.target.value,
                          },
                        })}
                        required={attr.is_required}
                        min={attr.type === 'number' ? '0' : undefined}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES_OPTIONS.map(amenity => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    form.amenities.includes(amenity)
                      ? 'bg-[var(--accent-gold)] text-[#0f0f0f]'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {amenity}
                </button>
              ))}
              {customAmenities.map(amenity => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    form.amenities.includes(amenity)
                      ? 'bg-[var(--accent-sage)] text-[#0f0f0f]'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {amenity}
                </button>
              ))}
              {showNewAmenityInput ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newAmenityInput}
                    onChange={(e) => setNewAmenityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewAmenity();
                      } else if (e.key === 'Escape') {
                        setShowNewAmenityInput(false);
                        setNewAmenityInput('');
                      }
                    }}
                    placeholder="New amenity..."
                    className="px-2 py-1 text-sm bg-[var(--bg-secondary)] border border-[var(--accent-gold)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none w-32"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddNewAmenity}
                    className="p-1.5 text-[var(--accent-gold)] hover:bg-[rgba(var(--accent-primary-rgb),0.1)] rounded-lg transition-colors"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewAmenityInput(false);
                      setNewAmenityInput('');
                    }}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewAmenityInput(true)}
                  className="px-3 py-1.5 rounded-lg text-sm border border-dashed border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-colors flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add New
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              <span className="flex items-center gap-2">
                <Images size={16} />
                Photo Gallery
              </span>
            </label>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              First image becomes the default hero. Auto-advances every 5 seconds.
            </p>
            {form.gallery_order.length > 0 ? (
              <div className="space-y-2 mb-3">
                {form.gallery_order.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-[var(--bg-tertiary)] rounded-lg"
                  >
                    <GripVertical size={16} className="text-[var(--text-muted)] cursor-grab flex-shrink-0" />
                    <img
                      src={url}
                      alt={`Gallery ${index + 1}`}
                      className="w-16 h-12 object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-[var(--text-secondary)] truncate block">
                        {index === 0 ? 'Default Hero' : `Image ${index + 1}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newOrder = [...form.gallery_order];
                            [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                            setForm({ ...form, gallery_order: newOrder });
                          }}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-gold)]"
                          title="Move up"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 19V5M5 12l7-7 7 7" />
                          </svg>
                        </button>
                      )}
                      {index < form.gallery_order.length - 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newOrder = [...form.gallery_order];
                            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                            setForm({ ...form, gallery_order: newOrder });
                          }}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-gold)]"
                          title="Move down"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12l7 7 7-7" />
                          </svg>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setForm({
                            ...form,
                            gallery_order: form.gallery_order.filter((_, i) => i !== index),
                          });
                        }}
                        className="p-1.5 text-[var(--text-muted)] hover:text-red-500"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg text-center mb-3">
                <Images size={24} className="mx-auto mb-2 text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-muted)]">No gallery photos configured</p>
              </div>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowGalleryPicker(true)}
              className="w-full"
            >
              <Plus size={16} className="mr-2" />
              Add Gallery Photos
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">House Rules</label>
            <textarea
              value={form.house_rules}
              onChange={(e) => setForm({ ...form, house_rules: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
              rows={3}
              placeholder="No smoking, quiet hours after 10pm..."
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
            />
            <span className="text-sm text-[var(--text-secondary)]">Property is visible and bookable</span>
          </label>

          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={saving} className="flex-1">
              <Check size={16} className="mr-2" />
              {editingId ? 'Save Changes' : 'Create Property'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(emptyForm);
                setShowNewAmenityInput(false);
                setNewAmenityInput('');
              }}
            >
              Cancel
            </Button>
          </div>
        </form>

        {showMediaPicker && (
          <MediaPickerModal
            onSelect={(url) => setForm({ ...form, cover_image_url: url })}
            onClose={() => setShowMediaPicker(false)}
          />
        )}

        {showGalleryPicker && (
          <MediaPickerModal
            onSelect={(url) => {
              if (!form.gallery_order.includes(url)) {
                setForm({ ...form, gallery_order: [...form.gallery_order, url] });
              }
            }}
            onClose={() => setShowGalleryPicker(false)}
          />
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setShowForm(true)}>
        <Plus size={18} className="mr-2" /> Add Property
      </Button>

      {properties.length === 0 ? (
        <Card className="text-center py-8">
          <Building2 className="mx-auto mb-3 text-[var(--text-muted)]" size={32} />
          <p className="text-[var(--text-secondary)]">No properties yet</p>
          <p className="text-sm text-[var(--text-muted)]">Add your first family property</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {properties.map(property => (
            <Card key={property.id} className="flex items-center gap-4">
              {property.cover_image_url ? (
                <img
                  src={property.cover_image_url}
                  alt={property.name}
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 size={24} className="text-[var(--text-muted)]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-[var(--text-primary)] truncate">{property.name}</h3>
                  {!property.is_active && (
                    <span className="px-2 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded-full">Hidden</span>
                  )}
                </div>
                {(property.city || property.state) && (
                  <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
                    <MapPin size={12} />
                    {property.city}{property.city && property.state && ', '}{property.state}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                  {property.max_guests && (
                    <span className="flex items-center gap-1"><Users size={12} /> {property.max_guests}</span>
                  )}
                  {property.bedrooms && (
                    <span className="flex items-center gap-1"><Bed size={12} /> {property.bedrooms}</span>
                  )}
                  {property.bathrooms && (
                    <span className="flex items-center gap-1"><Bath size={12} /> {property.bathrooms}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleActive(property)}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-gold)] transition-colors"
                  title={property.is_active ? 'Hide property' : 'Show property'}
                >
                  {property.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <button
                  onClick={() => handleEdit(property)}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-gold)] transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(property.id)}
                  className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
