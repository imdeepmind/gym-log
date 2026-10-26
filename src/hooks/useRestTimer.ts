import { create } from 'zustand';
import {
  scheduleRestNotification,
  cancelRestNotification,
  playTimerChime,
} from '@/services/notifications';

interface RestTimerState {
  active: boolean;
  endsAt: number | null;
  initialSec: number;
  exerciseName?: string;
  isBetweenExercise?: boolean;
  start: (seconds: number, exerciseName?: string, isBetweenExercise?: boolean) => void;
  adjust: (deltaSec: number) => void;
  skip: () => void;
}

export const useRestTimerStore = create<RestTimerState>((set, get) => ({
  active: false,
  endsAt: null,
  initialSec: 90,
  exerciseName: undefined,
  isBetweenExercise: false,

  start: (seconds: number, exerciseName?: string, isBetweenExercise: boolean = false) => {
    const endsAt = Date.now() + seconds * 1000;
    set({
      active: true,
      endsAt,
      initialSec: seconds,
      exerciseName,
      isBetweenExercise,
    });
    scheduleRestNotification(endsAt, exerciseName, isBetweenExercise);
  },

  adjust: (deltaSec: number) => {
    const { endsAt, exerciseName, isBetweenExercise } = get();
    if (!endsAt) return;
    const newEndsAt = Math.max(Date.now(), endsAt + deltaSec * 1000);
    set({ endsAt: newEndsAt });
    scheduleRestNotification(newEndsAt, exerciseName, isBetweenExercise);
  },

  skip: () => {
    cancelRestNotification();
    set({ active: false, endsAt: null });
  },
}));

export const playRestEndBeep = playTimerChime;

