import { useTraining } from '../../contexts/TrainingContext';
import { GraduationCap, Play } from 'lucide-react';

interface TrainingToggleProps {
  variant?: 'dropdown' | 'standalone';
  onStartTour?: () => void;
}

export function TrainingToggle({ variant = 'dropdown', onStartTour }: TrainingToggleProps) {
  const { trainingMode, toggleTrainingMode, startTour } = useTraining();

  const handleToggle = async () => {
    await toggleTrainingMode();
  };

  const handleStartTour = () => {
    startTour();
    onStartTour?.();
  };

  if (variant === 'standalone') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[var(--accent-gold)]" />
            <span className="text-[var(--text-primary)] font-medium">Explanation Mode</span>
          </div>
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              trainingMode ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-tertiary)]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                trainingMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {trainingMode && (
          <button
            onClick={handleStartTour}
            className="flex items-center gap-2 px-3 py-2 w-full text-left text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors"
          >
            <Play className="w-4 h-4" />
            Restart Welcome Tour
          </button>
        )}

        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          {trainingMode
            ? 'Helpful tips will appear as you explore. Hover over pulsing indicators to learn more.'
            : 'Enable explanation mode to see helpful tips and guidance throughout the site.'}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="text-xs text-[var(--text-secondary)]">Help</span>
      </div>
      <button
        onClick={handleToggle}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          trainingMode ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-tertiary)]'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            trainingMode ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
