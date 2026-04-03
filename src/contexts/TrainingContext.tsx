import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface TrainingProgress {
  tour_completed: boolean;
  dismissed_tips: string[];
  current_step: number;
}

export type SectionId =
  | 'media'
  | 'recipes'
  | 'properties-list'
  | 'property-detail'
  | 'reservations'
  | 'crowdfunding'
  | 'polls'
  | 'poll-detail'
  | 'admin-settings'
  | 'admin-members'
  | 'admin-properties';

interface TrainingContextType {
  trainingMode: boolean;
  tourActive: boolean;
  currentStep: number;
  dismissedTips: Set<string>;
  activeTooltipId: string | null;
  toggleTrainingMode: () => Promise<void>;
  startTour: () => void;
  exitTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  dismissTip: (tipId: string) => Promise<void>;
  isTipDismissed: (tipId: string) => boolean;
  completeTour: () => Promise<void>;
  showSectionWelcome: (sectionId: SectionId) => boolean;
  markSectionSeen: (sectionId: SectionId) => void;
  canShowTooltip: (tipId: string) => boolean;
  setActiveTooltip: (tipId: string | null) => void;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export function TrainingProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [trainingMode, setTrainingMode] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissedTips, setDismissedTips] = useState<Set<string>>(new Set());
  const [seenSections, setSeenSections] = useState<Set<SectionId>>(new Set());
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      const wasTrainingMode = trainingMode;
      const newTrainingMode = profile.training_mode ?? false;
      setTrainingMode(newTrainingMode);

      if (!wasTrainingMode && newTrainingMode) {
        setSeenSections(new Set());
      }

      const progress = profile.training_progress as TrainingProgress;
      if (progress) {
        if (profile.training_mode) {
          setDismissedTips(new Set());
        } else {
          setDismissedTips(new Set(progress.dismissed_tips || []));
        }
        setCurrentStep(progress.current_step || 0);

        if (!progress.tour_completed && profile.training_mode) {
          const hasSeenWelcome = localStorage.getItem('training_welcome_seen');
          if (!hasSeenWelcome) {
            setTimeout(() => setTourActive(true), 1000);
            localStorage.setItem('training_welcome_seen', 'true');
          }
        }
      }
    }
  }, [profile]);

  const toggleTrainingMode = async () => {
    if (!profile) return;

    const newMode = !trainingMode;

    const progress = profile.training_progress as TrainingProgress || {
      tour_completed: false,
      dismissed_tips: [],
      current_step: 0
    };

    if (newMode) {
      setDismissedTips(new Set());
      setActiveTooltipId(null);
      setSeenSections(new Set());
    } else {
      await supabase
        .from('user_profiles')
        .update({
          training_mode: false,
          training_progress: {
            ...progress,
            dismissed_tips: Array.from(dismissedTips)
          }
        })
        .eq('id', profile.id);
    }

    setTrainingMode(newMode);

    if (newMode) {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          training_mode: true,
          training_progress: {
            ...progress,
            dismissed_tips: []
          }
        })
        .eq('id', profile.id);

      if (error) {
        console.error('Error updating training mode:', error);
        setTrainingMode(false);
      }
    }
  };

  const startTour = () => {
    setTourActive(true);
    setCurrentStep(0);
  };

  const exitTour = async () => {
    setTourActive(false);
    if (profile && !trainingMode) {
      const progress = profile.training_progress as TrainingProgress || {
        tour_completed: false,
        dismissed_tips: [],
        current_step: 0
      };

      await supabase
        .from('user_profiles')
        .update({
          training_progress: {
            ...progress,
            current_step: currentStep
          }
        })
        .eq('id', profile.id);
    }
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const dismissTip = async (tipId: string) => {
    if (!profile) return;

    const newDismissed = new Set(dismissedTips);
    newDismissed.add(tipId);
    setDismissedTips(newDismissed);
    setActiveTooltipId(null);

    if (!trainingMode) {
      const progress = profile.training_progress as TrainingProgress || {
        tour_completed: false,
        dismissed_tips: [],
        current_step: 0
      };

      await supabase
        .from('user_profiles')
        .update({
          training_progress: {
            ...progress,
            dismissed_tips: Array.from(newDismissed)
          }
        })
        .eq('id', profile.id);
    }
  };

  const isTipDismissed = (tipId: string) => {
    return dismissedTips.has(tipId);
  };

  const completeTour = async () => {
    if (!profile) return;

    setTourActive(false);

    if (!trainingMode) {
      const progress = profile.training_progress as TrainingProgress || {
        tour_completed: false,
        dismissed_tips: [],
        current_step: 0
      };

      await supabase
        .from('user_profiles')
        .update({
          training_progress: {
            ...progress,
            tour_completed: true,
            current_step: 0
          }
        })
        .eq('id', profile.id);
    }
  };

  const showSectionWelcome = useCallback((sectionId: SectionId): boolean => {
    if (!trainingMode || tourActive) return false;
    return !seenSections.has(sectionId);
  }, [trainingMode, tourActive, seenSections]);

  const markSectionSeen = useCallback((sectionId: SectionId) => {
    setSeenSections(prev => {
      if (prev.has(sectionId)) return prev;
      const next = new Set(prev);
      next.add(sectionId);
      return next;
    });
  }, []);

  const canShowTooltip = useCallback((tipId: string): boolean => {
    if (!trainingMode || tourActive) return false;
    if (dismissedTips.has(tipId)) return false;
    if (activeTooltipId !== null && activeTooltipId !== tipId) return false;
    return true;
  }, [trainingMode, tourActive, dismissedTips, activeTooltipId]);

  const setActiveTooltip = useCallback((tipId: string | null) => {
    setActiveTooltipId(tipId);
  }, []);

  return (
    <TrainingContext.Provider
      value={{
        trainingMode,
        tourActive,
        currentStep,
        dismissedTips,
        activeTooltipId,
        toggleTrainingMode,
        startTour,
        exitTour,
        nextStep,
        prevStep,
        dismissTip,
        isTipDismissed,
        completeTour,
        showSectionWelcome,
        markSectionSeen,
        canShowTooltip,
        setActiveTooltip
      }}
    >
      {children}
    </TrainingContext.Provider>
  );
}

export function useTraining() {
  const context = useContext(TrainingContext);
  if (context === undefined) {
    throw new Error('useTraining must be used within a TrainingProvider');
  }
  return context;
}
