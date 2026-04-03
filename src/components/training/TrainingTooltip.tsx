import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useTraining } from '../../contexts/TrainingContext';
import { Check } from 'lucide-react';

interface TrainingTooltipProps {
  tipId: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
}

export function TrainingTooltip({ tipId, content, position = 'bottom', children }: TrainingTooltipProps) {
  const { trainingMode, dismissTip, isTipDismissed, tourActive, canShowTooltip, setActiveTooltip } = useTraining();
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDismissed = isTipDismissed(tipId);

  useEffect(() => {
    if (!trainingMode || isDismissed || tourActive) {
      setIsVisible(false);
      setActiveTooltip(null);
    }
  }, [trainingMode, isDismissed, tourActive, setActiveTooltip]);

  useEffect(() => {
    setHasShown(false);
  }, [trainingMode]);

  const showTooltip = useCallback(() => {
    if (canShowTooltip(tipId) && !hasShown) {
      setIsVisible(true);
      setHasShown(true);
      setActiveTooltip(tipId);
    }
  }, [canShowTooltip, tipId, hasShown, setActiveTooltip]);

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (!trainingMode || isDismissed || tourActive) return;

    if (isVisible) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    showTooltip();
  };

  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setIsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isVisible]);

  const handleDismiss = async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    await dismissTip(tipId);
    setIsVisible(false);
  };

  if (!trainingMode || isDismissed || tourActive) {
    return <>{children}</>;
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
    left: 'right-full top-1/2 -translate-y-1/2 mr-3',
    right: 'left-full top-1/2 -translate-y-1/2 ml-3'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-[var(--accent-gold)]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-[var(--accent-gold)]',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[var(--accent-gold)]',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[var(--accent-gold)]'
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block cursor-pointer"
      onClick={handleClick}
      onTouchEnd={handleClick}
    >
      {!hasShown && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[var(--accent-gold)] animate-pulse z-10 pointer-events-none" />
      )}

      {children}

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 ${positionClasses[position]} animate-in fade-in zoom-in-95 duration-200`}
          style={{ minWidth: '280px', maxWidth: '320px' }}
        >
          <div className="relative bg-[var(--bg-secondary)] border-2 border-[var(--accent-gold)] rounded-lg shadow-2xl p-4 backdrop-blur-sm">
            <div
              className={`absolute w-0 h-0 border-8 ${arrowClasses[position]}`}
            />

            <div className="text-[var(--text-primary)] text-sm leading-relaxed mb-3">
              {content}
            </div>

            <button
              onClick={handleDismiss}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-gold)] text-black text-sm font-medium rounded hover:opacity-90 transition-opacity"
            >
              <Check className="w-4 h-4" />
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
