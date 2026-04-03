import { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Pipette } from 'lucide-react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const pickerRef = useRef<HTMLDivElement>(null);
  const supportsEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    }
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (/^#[0-9A-F]{6}$/i.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleEyeDropper = async () => {
    if (!supportsEyeDropper) return;
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      onChange(result.sRGBHex);
      setInputValue(result.sRGBHex);
    } catch (err) {
      console.error('EyeDropper error:', err);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--text-secondary)]">{label}</label>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="w-12 h-12 rounded-lg border-2 border-[var(--border-default)] hover:border-[var(--border-interactive)] transition-colors shadow-sm"
          style={{ backgroundColor: value }}
          title="Click to open color picker"
        />
        <div className="flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={() => {
              if (!/^#[0-9A-F]{6}$/i.test(inputValue)) {
                setInputValue(value);
              }
            }}
            className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]/50 font-mono text-sm"
            placeholder="#000000"
          />
        </div>
        {supportsEyeDropper && (
          <button
            onClick={handleEyeDropper}
            className="p-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            title="Pick color from screen"
          >
            <Pipette size={20} className="text-[var(--text-secondary)]" />
          </button>
        )}
      </div>
      {showPicker && (
        <div ref={pickerRef} className="absolute z-50 mt-2 p-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-xl">
          <HexColorPicker color={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
