import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Type, Camera, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { RecipeIngredient } from '../../types';

const COMMON_UNITS = [
  { value: '', label: 'No unit' },
  { value: 'tsp', label: 'tsp' },
  { value: 'tbsp', label: 'tbsp' },
  { value: 'cup', label: 'cup' },
  { value: 'cups', label: 'cups' },
  { value: 'oz', label: 'oz' },
  { value: 'lb', label: 'lb' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'l', label: 'L' },
  { value: 'pinch', label: 'pinch' },
  { value: 'dash', label: 'dash' },
  { value: 'clove', label: 'clove' },
  { value: 'cloves', label: 'cloves' },
  { value: 'piece', label: 'piece' },
  { value: 'pieces', label: 'pieces' },
  { value: 'slice', label: 'slice' },
  { value: 'slices', label: 'slices' },
  { value: 'can', label: 'can' },
  { value: 'package', label: 'package' },
  { value: 'bunch', label: 'bunch' },
  { value: 'head', label: 'head' },
  { value: 'stalk', label: 'stalk' },
  { value: 'stalks', label: 'stalks' },
  { value: 'sprig', label: 'sprig' },
  { value: 'sprigs', label: 'sprigs' },
  { value: 'whole', label: 'whole' },
  { value: 'large', label: 'large' },
  { value: 'medium', label: 'medium' },
  { value: 'small', label: 'small' },
];

interface IngredientInputProps {
  ingredients: RecipeIngredient[];
  onChange: (ingredients: RecipeIngredient[]) => void;
}

function parseQuantity(value: string): { quantity: number | null; display: string } {
  if (!value.trim()) return { quantity: null, display: '' };

  const fractionMap: Record<string, number> = {
    '1/8': 0.125, '1/4': 0.25, '1/3': 0.333, '3/8': 0.375,
    '1/2': 0.5, '5/8': 0.625, '2/3': 0.667, '3/4': 0.75, '7/8': 0.875,
  };

  const trimmed = value.trim();

  if (fractionMap[trimmed]) {
    return { quantity: fractionMap[trimmed], display: trimmed };
  }

  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+\/\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const frac = fractionMap[mixedMatch[2]] || 0;
    return { quantity: whole + frac, display: trimmed };
  }

  const rangeMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const avg = (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
    return { quantity: avg, display: trimmed };
  }

  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    return { quantity: num, display: trimmed };
  }

  return { quantity: null, display: trimmed };
}

function createEmptyIngredient(sortOrder: number): RecipeIngredient {
  return {
    quantity: null,
    quantity_display: '',
    unit: '',
    name: '',
    notes: '',
    is_header: false,
    sort_order: sortOrder,
  };
}

export function IngredientInput({ ingredients, onChange }: IngredientInputProps) {
  const { user } = useAuth();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    if (ingredients.length === 0) {
      onChange([createEmptyIngredient(0)]);
    }
  }, []);

  const handleImageUpload = async (index: number, file: File) => {
    if (!user) return;
    setUploadingIndex(index);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/recipes/ingredients/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
      updateIngredient(index, 'image_url', publicUrl);
    }
    setUploadingIndex(null);
  };

  const removeImage = (index: number) => {
    updateIngredient(index, 'image_url', null);
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string | number | boolean | null) => {
    const updated = [...ingredients];
    if (field === 'quantity_display' && typeof value === 'string') {
      const parsed = parseQuantity(value);
      updated[index] = { ...updated[index], quantity: parsed.quantity, quantity_display: parsed.display };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    onChange(updated);
  };

  const addIngredient = () => {
    const maxOrder = Math.max(...ingredients.map(i => i.sort_order), -1);
    onChange([...ingredients, createEmptyIngredient(maxOrder + 1)]);
  };

  const addHeader = () => {
    const maxOrder = Math.max(...ingredients.map(i => i.sort_order), -1);
    onChange([...ingredients, {
      ...createEmptyIngredient(maxOrder + 1),
      is_header: true,
      name: '',
    }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    const updated = ingredients.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverIndex.current = index;
  };

  const handleDrop = () => {
    if (draggedIndex === null || dragOverIndex.current === null) return;
    if (draggedIndex === dragOverIndex.current) {
      setDraggedIndex(null);
      return;
    }

    const updated = [...ingredients];
    const [dragged] = updated.splice(draggedIndex, 1);
    updated.splice(dragOverIndex.current, 0, dragged);

    const reordered = updated.map((ing, idx) => ({ ...ing, sort_order: idx }));
    onChange(reordered);
    setDraggedIndex(null);
    dragOverIndex.current = null;
  };

  return (
    <div className="space-y-2">
      {ingredients.map((ingredient, index) => (
        <div
          key={index}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={handleDrop}
          onDragEnd={() => setDraggedIndex(null)}
          className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
            draggedIndex === index ? 'opacity-50 bg-[var(--bg-tertiary)]' : 'bg-[var(--bg-secondary)]'
          }`}
        >
          <div className="cursor-grab text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            <GripVertical size={16} />
          </div>

          {ingredient.is_header ? (
            <div className="flex-1 flex items-center gap-2">
              <Type size={16} className="text-[var(--accent-gold)]" />
              <input
                type="text"
                value={ingredient.name}
                onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                placeholder="Section header (e.g., For the sauce:)"
                className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              />
            </div>
          ) : (
            <>
              <input
                type="text"
                value={ingredient.quantity_display || ''}
                onChange={(e) => updateIngredient(index, 'quantity_display', e.target.value)}
                placeholder="Qty"
                className="w-16 px-2 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              />
              <select
                value={ingredient.unit || ''}
                onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                className="w-24 px-2 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              >
                {COMMON_UNITS.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={ingredient.name}
                onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                placeholder="Ingredient name"
                className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              />
              <input
                type="text"
                value={ingredient.notes || ''}
                onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                placeholder="Notes"
                className="w-24 px-2 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              />
              {ingredient.image_url ? (
                <div className="relative group">
                  <img
                    src={ingredient.image_url}
                    alt=""
                    className="w-9 h-9 rounded object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ) : (
                <label className={`p-2 rounded cursor-pointer transition-colors ${uploadingIndex === index ? 'text-[var(--accent-gold)]' : 'text-[var(--text-muted)] hover:text-[var(--accent-gold)] hover:bg-[var(--bg-tertiary)]'}`}>
                  <Camera size={16} />
                  <input
                    ref={(el) => { fileInputRefs.current[index] = el; }}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(index, file);
                    }}
                    className="hidden"
                    disabled={uploadingIndex !== null}
                  />
                </label>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => removeIngredient(index)}
            className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
            disabled={ingredients.length <= 1}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={addIngredient}>
          <Plus size={16} className="mr-1" /> Add Ingredient
        </Button>
        <Button type="button" variant="secondary" onClick={addHeader}>
          <Type size={16} className="mr-1" /> Add Section
        </Button>
      </div>

      <div className="mt-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
        <p className="text-xs text-[var(--text-muted)]">
          <strong className="text-[var(--text-secondary)]">Tips:</strong> Use fractions like "1/2" or "1 1/4".
          Drag items to reorder. Add sections to group ingredients (e.g., "For the filling:").
        </p>
      </div>
    </div>
  );
}
