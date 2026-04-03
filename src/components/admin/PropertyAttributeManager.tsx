import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Trash2, Edit2, X, Check, GripVertical, Settings } from 'lucide-react';

interface PropertyAttribute {
  id: string;
  name: string;
  key: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options: string[];
  is_required: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const ATTRIBUTE_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'select', label: 'Dropdown' },
];

export default function PropertyAttributeManager() {
  const { success, error: showError } = useToast();
  const [attributes, setAttributes] = useState<PropertyAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    key: '',
    type: 'text' as 'text' | 'number' | 'boolean' | 'select',
    options: '',
    is_required: false,
  });

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    const { data } = await supabase
      .from('property_attributes')
      .select('*')
      .order('display_order');
    setAttributes(data || []);
    setLoading(false);
  };

  const generateKey = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  };

  const handleNameChange = (name: string) => {
    setForm(prev => ({
      ...prev,
      name,
      key: editingId ? prev.key : generateKey(name),
    }));
  };

  const handleEdit = (attr: PropertyAttribute) => {
    setForm({
      name: attr.name,
      key: attr.key,
      type: attr.type,
      options: attr.options?.join(', ') || '',
      is_required: attr.is_required,
    });
    setEditingId(attr.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.key.trim()) {
      showError('Name and key are required');
      return;
    }

    if (form.type === 'select' && !form.options.trim()) {
      showError('Please provide options for dropdown');
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      key: form.key.trim().toLowerCase().replace(/\s+/g, '_'),
      type: form.type,
      options: form.type === 'select'
        ? form.options.split(',').map(o => o.trim()).filter(Boolean)
        : [],
      is_required: form.is_required,
      display_order: editingId
        ? attributes.find(a => a.id === editingId)?.display_order || 0
        : attributes.length,
    };

    let error;
    if (editingId) {
      const result = await supabase
        .from('property_attributes')
        .update(payload)
        .eq('id', editingId);
      error = result.error;
    } else {
      const result = await supabase.from('property_attributes').insert(payload);
      error = result.error;
    }

    if (error) {
      if (error.code === '23505') {
        showError('An attribute with this key already exists');
      } else {
        showError(`Failed to ${editingId ? 'update' : 'create'} attribute`);
      }
    } else {
      success(`Attribute ${editingId ? 'updated' : 'created'}`);
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', key: '', type: 'text', options: '', is_required: false });
      fetchAttributes();
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this attribute? This will remove it from all properties.')) return;

    const { error } = await supabase.from('property_attributes').delete().eq('id', id);
    if (error) {
      showError('Failed to delete attribute');
    } else {
      success('Attribute deleted');
      fetchAttributes();
    }
  };

  const toggleActive = async (attr: PropertyAttribute) => {
    const { error } = await supabase
      .from('property_attributes')
      .update({ is_active: !attr.is_active })
      .eq('id', attr.id);

    if (error) {
      showError('Failed to update attribute');
    } else {
      success(`Attribute ${attr.is_active ? 'disabled' : 'enabled'}`);
      fetchAttributes();
    }
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
            {editingId ? 'Edit Attribute' : 'New Attribute'}
          </h3>
          <button
            onClick={() => {
              setShowForm(false);
              setEditingId(null);
              setForm({ name: '', key: '', type: 'text', options: '', is_required: false });
            }}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Display Name *"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Square Footage"
            required
          />

          <Input
            label="Key *"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            placeholder="square_footage"
            disabled={!!editingId}
          />
          <p className="text-xs text-[var(--text-muted)] -mt-2">
            Used internally. Cannot be changed after creation.
          </p>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Type *
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50"
            >
              {ATTRIBUTE_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {form.type === 'select' && (
            <Input
              label="Options (comma-separated) *"
              value={form.options}
              onChange={(e) => setForm({ ...form, options: e.target.value })}
              placeholder="Option 1, Option 2, Option 3"
            />
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_required}
              onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
              className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
            />
            <span className="text-sm text-[var(--text-secondary)]">Required for all properties</span>
          </label>

          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={saving} className="flex-1">
              <Check size={16} className="mr-2" />
              {editingId ? 'Save Changes' : 'Create Attribute'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm({ name: '', key: '', type: 'text', options: '', is_required: false });
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setShowForm(true)}>
        <Plus size={18} className="mr-2" /> Add Attribute
      </Button>

      {attributes.length === 0 ? (
        <Card className="text-center py-8">
          <Settings className="mx-auto mb-3 text-[var(--text-muted)]" size={32} />
          <p className="text-[var(--text-secondary)]">No custom attributes</p>
          <p className="text-sm text-[var(--text-muted)]">
            Create attributes to track additional property details
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {attributes.map(attr => (
            <Card key={attr.id} className={`flex items-center gap-3 ${!attr.is_active ? 'opacity-50' : ''}`}>
              <GripVertical size={16} className="text-[var(--text-muted)] cursor-grab" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">{attr.name}</span>
                  <span className="text-xs px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded">
                    {attr.type}
                  </span>
                  {attr.is_required && (
                    <span className="text-xs px-2 py-0.5 bg-[rgba(var(--accent-primary-rgb),0.2)] text-[var(--accent-gold)] rounded">
                      Required
                    </span>
                  )}
                  {!attr.is_active && (
                    <span className="text-xs px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)]">{attr.key}</p>
                {attr.type === 'select' && attr.options?.length > 0 && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Options: {attr.options.join(', ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => toggleActive(attr)}
                  className={`p-2 transition-colors ${attr.is_active ? 'text-[var(--accent-gold)]' : 'text-[var(--text-muted)]'} hover:text-[var(--accent-gold)]`}
                  title={attr.is_active ? 'Disable' : 'Enable'}
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => handleEdit(attr)}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-gold)] transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(attr.id)}
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
