import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Timer, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Recipe, RecipeIngredient } from '../../types';
import { formatIngredientDisplay } from './ServingScaler';

interface CookModeProps {
  recipe: Recipe;
  ingredients: RecipeIngredient[];
  scaleFactor: number;
  onClose: () => void;
}

function parseTimerFromText(text: string): number | null {
  const minuteMatch = text.match(/(\d+)\s*(?:minute|min)s?/i);
  if (minuteMatch) return parseInt(minuteMatch[1]) * 60;

  const hourMatch = text.match(/(\d+)\s*(?:hour|hr)s?/i);
  if (hourMatch) return parseInt(hourMatch[1]) * 3600;

  const secondMatch = text.match(/(\d+)\s*(?:second|sec)s?/i);
  if (secondMatch) return parseInt(secondMatch[1]);

  return null;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function StepTimer({ duration }: { duration: number }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsComplete(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const reset = () => {
    setTimeLeft(duration);
    setIsRunning(false);
    setIsComplete(false);
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg mt-4 ${
      isComplete ? 'bg-[rgba(var(--accent-secondary-rgb),0.2)] animate-pulse' : 'bg-[var(--bg-tertiary)]'
    }`}>
      <Timer size={20} className={isComplete ? 'text-[var(--accent-sage)]' : 'text-[var(--accent-gold)]'} />
      <span className={`font-mono text-2xl font-bold ${
        isComplete ? 'text-[var(--accent-sage)]' : 'text-[var(--text-primary)]'
      }`}>
        {formatTime(timeLeft)}
      </span>
      <div className="flex gap-2 ml-auto">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="p-2 rounded-lg bg-[rgba(var(--accent-primary-rgb),0.2)] text-[var(--accent-gold)] hover:bg-[rgba(var(--accent-primary-rgb),0.3)] transition-colors"
        >
          {isRunning ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          onClick={reset}
          className="p-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <RotateCcw size={18} />
        </button>
      </div>
      {isComplete && (
        <span className="text-[var(--accent-sage)] font-medium">Done!</span>
      )}
    </div>
  );
}

export function CookMode({ recipe, ingredients, scaleFactor, onClose }: CookModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const instructions = recipe.instructions as string[];
  const totalSteps = instructions.length;

  const goToPrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  }, [currentStep]);

  const goToNext = useCallback(() => {
    if (currentStep < totalSteps - 1) setCurrentStep(currentStep + 1);
  }, [currentStep, totalSteps]);

  const toggleComplete = () => {
    const updated = new Set(completedSteps);
    if (updated.has(currentStep)) {
      updated.delete(currentStep);
    } else {
      updated.add(currentStep);
    }
    setCompletedSteps(updated);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        toggleComplete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext, onClose, currentStep]);

  const currentInstruction = instructions[currentStep];
  const timerDuration = parseTimerFromText(currentInstruction);

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-primary)] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
        <div>
          <h1 className="font-serif text-xl text-[var(--text-primary)]">{recipe.title}</h1>
          <p className="text-sm text-[var(--text-muted)]">Cook Mode</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-[var(--border-default)] p-4 overflow-y-auto hidden lg:block">
          <h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-4">
            Ingredients
          </h2>
          <ul className="space-y-2">
            {ingredients.map((ing, i) => (
              <li
                key={i}
                className={`text-sm ${
                  ing.is_header
                    ? 'font-medium text-[var(--accent-gold)] mt-4 first:mt-0'
                    : 'text-[var(--text-secondary)] pl-2'
                }`}
              >
                {ing.is_header ? ing.name : (
                  <span className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-[var(--accent-gold)] flex-shrink-0" />
                    {formatIngredientDisplay(ing, scaleFactor)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex gap-1">
                {instructions.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`w-3 h-3 rounded-full cursor-pointer transition-all ${
                      i === currentStep
                        ? 'bg-[var(--accent-gold)] scale-125'
                        : completedSteps.has(i)
                        ? 'bg-[var(--accent-sage)]'
                        : 'bg-[var(--bg-tertiary)]'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[var(--text-muted)] text-sm">
                Step {currentStep + 1} of {totalSteps}
              </span>
            </div>

            <div
              className={`p-8 rounded-2xl border-2 transition-colors ${
                completedSteps.has(currentStep)
                  ? 'border-[var(--accent-sage)] bg-[rgba(var(--accent-secondary-rgb),0.05)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-secondary)]'
              }`}
            >
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-[rgba(var(--accent-primary-rgb),0.2)] flex items-center justify-center">
                  <span className="text-2xl font-bold text-[var(--accent-gold)]">{currentStep + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-2xl text-[var(--text-primary)] leading-relaxed">
                    {currentInstruction}
                  </p>
                  {timerDuration && <StepTimer duration={timerDuration} />}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-8">
              <Button
                variant="secondary"
                onClick={goToPrev}
                disabled={currentStep === 0}
              >
                <ChevronLeft size={20} className="mr-2" /> Previous
              </Button>

              <Button
                variant={completedSteps.has(currentStep) ? 'secondary' : 'primary'}
                onClick={toggleComplete}
              >
                <Check size={20} className="mr-2" />
                {completedSteps.has(currentStep) ? 'Completed' : 'Mark Complete'}
              </Button>

              <Button
                variant="secondary"
                onClick={goToNext}
                disabled={currentStep === totalSteps - 1}
              >
                Next <ChevronRight size={20} className="ml-2" />
              </Button>
            </div>

            <p className="text-center text-sm text-[var(--text-muted)] mt-6">
              Use arrow keys to navigate, spacebar to mark complete, Esc to exit
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[var(--border-default)]">
        <div className="flex justify-center">
          <div className="bg-[var(--bg-secondary)] rounded-full px-4 py-2">
            <span className="text-sm text-[var(--text-secondary)]">
              {completedSteps.size} of {totalSteps} steps completed
            </span>
            <div className="w-48 h-2 bg-[var(--bg-tertiary)] rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-[var(--accent-sage)] transition-all duration-300"
                style={{ width: `${(completedSteps.size / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
