import { useEffect, useState } from 'react';
import { useTraining, type SectionId } from '../../contexts/TrainingContext';
import { SECTION_WELCOMES } from './training-content';
import { X } from 'lucide-react';

interface SectionWelcomeProps {
  sectionId: SectionId;
}

export function SectionWelcome({ sectionId }: SectionWelcomeProps) {
  const { showSectionWelcome, markSectionSeen, trainingMode } = useTraining();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!trainingMode) {
      setIsVisible(false);
      return;
    }

    if (showSectionWelcome(sectionId)) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [sectionId, showSectionWelcome, trainingMode]);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      markSectionSeen(sectionId);
    }, 200);
  };

  if (!isVisible) return null;

  const welcome = SECTION_WELCOMES[sectionId];
  if (!welcome) return null;

  const Icon = welcome.icon;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      onClick={handleDismiss}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        className={`relative bg-[var(--bg-secondary)] border-2 border-[var(--accent-gold)] rounded-xl shadow-2xl max-w-md w-full transition-all duration-200 ${
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="w-10 h-10 rounded-lg bg-[var(--accent-gold)]/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[var(--accent-gold)]" />
                </div>
              )}
              <h2 className="text-xl font-serif text-[var(--accent-gold)]">
                {welcome.title}
              </h2>
            </div>
            <button
              onClick={handleDismiss}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-[var(--text-primary)] leading-relaxed whitespace-pre-line mb-6">
            {welcome.content}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-[var(--accent-gold)] text-black font-medium rounded hover:opacity-90 transition-opacity"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
