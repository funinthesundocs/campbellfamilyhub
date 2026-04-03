import { Minus, Plus, Users } from 'lucide-react';
import type { RecipeIngredient } from '../../types';

interface ServingScalerProps {
  baseServings: number;
  currentServings: number;
  onChange: (servings: number) => void;
}

export function ServingScaler({ baseServings, currentServings, onChange }: ServingScalerProps) {
  const decrease = () => {
    if (currentServings > 1) {
      onChange(currentServings - 1);
    }
  };

  const increase = () => {
    if (currentServings < 100) {
      onChange(currentServings + 1);
    }
  };

  const scaleFactor = currentServings / baseServings;
  const isScaled = currentServings !== baseServings;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Users size={20} className="text-[var(--accent-gold)]" />
        <span className="text-[var(--text-primary)] font-medium">Servings:</span>
      </div>
      <div className="flex items-center gap-4">
        {isScaled && (
          <span className="text-sm text-[var(--accent-gold)] font-medium">
            {scaleFactor > 1 ? `${scaleFactor.toFixed(1)}x` : `${scaleFactor.toFixed(2)}x`} original
          </span>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={decrease}
            disabled={currentServings <= 1}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[var(--border-default)] disabled:hover:text-[var(--text-secondary)] transition-colors"
          >
            <Minus size={18} />
          </button>
          <div className="w-14 h-10 flex items-center justify-center rounded-lg border border-[var(--accent-gold)] bg-[rgba(var(--accent-primary-rgb),0.1)]">
            <span className="text-[var(--accent-gold)] font-semibold text-lg">{currentServings}</span>
          </div>
          <button
            type="button"
            onClick={increase}
            disabled={currentServings >= 100}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[var(--border-default)] disabled:hover:text-[var(--text-secondary)] transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

const FRACTION_MAP: [number, string][] = [
  [0.125, '1/8'],
  [0.25, '1/4'],
  [0.333, '1/3'],
  [0.375, '3/8'],
  [0.5, '1/2'],
  [0.625, '5/8'],
  [0.667, '2/3'],
  [0.75, '3/4'],
  [0.875, '7/8'],
];

function toFraction(decimal: number): string {
  if (decimal === 0) return '';

  const whole = Math.floor(decimal);
  const remainder = decimal - whole;

  if (remainder < 0.05) {
    return whole.toString();
  }

  let closestFraction = '';
  let closestDiff = 1;

  for (const [value, frac] of FRACTION_MAP) {
    const diff = Math.abs(remainder - value);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestFraction = frac;
    }
  }

  if (closestDiff > 0.1) {
    return decimal.toFixed(1).replace(/\.0$/, '');
  }

  if (whole === 0) {
    return closestFraction;
  }

  return `${whole} ${closestFraction}`;
}

export function scaleQuantity(
  quantity: number | null,
  displayOriginal: string | null,
  scaleFactor: number
): string {
  if (quantity === null || quantity === 0) {
    return displayOriginal || '';
  }

  const scaled = quantity * scaleFactor;
  return toFraction(scaled);
}

export function formatIngredientDisplay(
  ingredient: RecipeIngredient,
  scaleFactor: number
): string {
  if (ingredient.is_header) {
    return ingredient.name;
  }

  const parts: string[] = [];

  const scaledQty = scaleQuantity(ingredient.quantity, ingredient.quantity_display, scaleFactor);
  if (scaledQty) {
    parts.push(scaledQty);
  }

  if (ingredient.unit) {
    parts.push(ingredient.unit);
  }

  parts.push(ingredient.name);

  if (ingredient.notes) {
    parts.push(`(${ingredient.notes})`);
  }

  return parts.join(' ');
}
