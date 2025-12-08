'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';

interface TutorialContextValue {
  isOpen: boolean;
  currentStep: number;
  openTutorial: (startStep?: number, options?: { replay?: boolean }) => void;
  closeTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepIndex: number) => void;
  resetProgress: () => void;
  markAsCompleted: () => Promise<void>;
  skipTutorial: () => Promise<void>;
  hasCompleted: boolean;
  statusLoading: boolean;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const { userData, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(() => Boolean(userData?.tutorialCompleted));
  const [statusChecked, setStatusChecked] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [dismissedThisSession, setDismissedThisSession] = useState(false);

  const userDocPath = userData?.userDocPath;

  useEffect(() => {
    setIsOpen(false);
    setCurrentStep(0);
    setHasCompleted(Boolean(userData?.tutorialCompleted));
    setStatusChecked(false);
    setStatusLoading(false);
    setDismissedThisSession(false);
  }, [userDocPath, userData?.tutorialCompleted]);

  useEffect(() => {
    let active = true;

    if (!userDocPath || loading || statusChecked) {
      return;
    }

    const fetchStatus = async () => {
      setStatusLoading(true);
      try {
        const docRef = doc(db, userDocPath);
        const snapshot = await getDoc(docRef);
        const data = snapshot.exists() ? snapshot.data() as { tutorialCompleted?: boolean } : {};
        const completed = Boolean(data?.tutorialCompleted);

        if (!active) return;

        setHasCompleted(completed);
        if (!completed && !dismissedThisSession) {
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Erro ao buscar status do tutorial:', error);
      } finally {
        if (active) {
          setStatusLoading(false);
          setStatusChecked(true);
        }
      }
    };

    fetchStatus();

    return () => {
      active = false;
    };
  }, [userDocPath, loading, statusChecked, dismissedThisSession]);

  const openTutorial = useCallback((startStep = 0, options?: { replay?: boolean }) => {
    setCurrentStep(Math.max(0, startStep));
    if (options?.replay) {
      setDismissedThisSession(false);
    }
    setIsOpen(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setIsOpen(false);
    setDismissedThisSession(true);
  }, []);

  const resetProgress = useCallback(() => {
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => prev + 1);
  }, []);

  const previousStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    setCurrentStep(Math.max(0, stepIndex));
  }, []);

  const persistCompletion = useCallback(async () => {
    if (!userDocPath) {
      return;
    }

    try {
      await setDoc(
        doc(db, userDocPath),
        {
          tutorialCompleted: true,
          tutorialCompletedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Erro ao salvar status do tutorial:', error);
    }
  }, [userDocPath]);

  const markAsCompleted = useCallback(async () => {
    await persistCompletion();
    setHasCompleted(true);
    setDismissedThisSession(true);
    setIsOpen(false);
  }, [persistCompletion]);

  const skipTutorial = useCallback(async () => {
    await markAsCompleted();
  }, [markAsCompleted]);

  const value = useMemo<TutorialContextValue>(() => ({
    isOpen,
    currentStep,
    openTutorial,
    closeTutorial,
    nextStep,
    previousStep,
    goToStep,
    resetProgress,
    markAsCompleted,
    skipTutorial,
    hasCompleted,
    statusLoading,
  }), [
    isOpen,
    currentStep,
    openTutorial,
    closeTutorial,
    nextStep,
    previousStep,
    goToStep,
    resetProgress,
    markAsCompleted,
    skipTutorial,
    hasCompleted,
    statusLoading,
  ]);

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial deve ser usado dentro de um TutorialProvider');
  }
  return context;
}

