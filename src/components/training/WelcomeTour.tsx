import { useEffect, useState, useRef } from 'react';
import { useTraining } from '../../contexts/TrainingContext';
import { TOUR_STEPS } from './training-content';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export function WelcomeTour() {
  const { tourActive, currentStep, nextStep, prevStep, exitTour, completeTour } = useTraining();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    if (tourActive && step?.target) {
      const updateTargetRect = () => {
        const element = document.querySelector(step.target!);
        if (element) {
          const rect = element.getBoundingClientRect();
          setTargetRect(rect);
        }
      };

      updateTargetRect();

      const observer = new ResizeObserver(updateTargetRect);
      const element = document.querySelector(step.target!);
      if (element) {
        observer.observe(element);
      }

      window.addEventListener('resize', updateTargetRect);
      window.addEventListener('scroll', updateTargetRect);

      return () => {
        observer.disconnect();
        window.removeEventListener('resize', updateTargetRect);
        window.removeEventListener('scroll', updateTargetRect);
      };
    } else {
      setTargetRect(null);
    }
  }, [tourActive, step, currentStep]);

  const handleNext = () => {
    if (isLastStep) {
      completeTour();
    } else {
      nextStep();
    }
  };

  const handleExit = () => {
    exitTour();
  };

  if (!tourActive || !step) {
    return null;
  }

  const isCentered = !step.target || step.position === 'center';

  const getModalPosition = () => {
    if (isCentered) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    if (!targetRect) return {};

    const padding = 20;
    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2;
        return { top: `${top}px`, left: `${left}px`, transform: 'translateX(-50%)' };
      case 'top':
        top = targetRect.top - padding;
        left = targetRect.left + targetRect.width / 2;
        return { top: `${top}px`, left: `${left}px`, transform: 'translate(-50%, -100%)' };
      case 'left':
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.left - padding;
        return { top: `${top}px`, left: `${left}px`, transform: 'translate(-100%, -50%)' };
      case 'right':
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.right + padding;
        return { top: `${top}px`, left: `${left}px`, transform: 'translateY(-50%)' };
      default:
        return {};
    }
  };

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9999] pointer-events-none"
        style={{ isolation: 'isolate' }}
      >
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm pointer-events-auto" onClick={handleExit} />

        {targetRect && !isCentered && (
          <div
            className="absolute pointer-events-none"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              border: '3px solid var(--accent-gold)',
              borderRadius: '8px',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.85), 0 0 20px var(--accent-gold)',
              transition: 'all 300ms ease-out'
            }}
          />
        )}

        <div
          className="absolute bg-[var(--bg-secondary)] border-2 border-[var(--accent-gold)] rounded-xl shadow-2xl pointer-events-auto animate-in fade-in zoom-in-95 duration-300"
          style={{
            ...getModalPosition(),
            maxWidth: isCentered ? '500px' : '400px',
            width: isCentered ? '90%' : 'auto'
          }}
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-serif text-[var(--accent-gold)] pr-8">
                {step.title}
              </h2>
              <button
                onClick={handleExit}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-[var(--text-primary)] leading-relaxed whitespace-pre-line mb-6">
              {step.content}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-[var(--text-muted)]">
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </div>

              <div className="flex items-center gap-2">
                {!isFirstStep && (
                  <button
                    onClick={prevStep}
                    className="flex items-center gap-1 px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 px-4 py-2 bg-[var(--accent-gold)] text-black font-medium rounded hover:opacity-90 transition-opacity"
                >
                  {step.action || (isLastStep ? 'Finish Tour' : 'Next')}
                  {!isLastStep && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isCentered && (
              <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                <button
                  onClick={handleExit}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  Skip for now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
