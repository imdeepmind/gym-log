import { Muscle } from '@/types';

export interface MuscleInfo {
  id: Muscle;
  name: string;
  category: 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core' | 'Cardio';
}

export const MUSCLE_DEFINITIONS: Record<Muscle, MuscleInfo> = {
  chest: { id: 'chest', name: 'Chest', category: 'Chest' },
  upper_back: { id: 'upper_back', name: 'Upper Back', category: 'Back' },
  lats: { id: 'lats', name: 'Lats', category: 'Back' },
  lower_back: { id: 'lower_back', name: 'Lower Back', category: 'Back' },
  traps: { id: 'traps', name: 'Traps', category: 'Back' },
  shoulders: { id: 'shoulders', name: 'Shoulders', category: 'Shoulders' },
  biceps: { id: 'biceps', name: 'Biceps', category: 'Arms' },
  triceps: { id: 'triceps', name: 'Triceps', category: 'Arms' },
  forearms: { id: 'forearms', name: 'Forearms', category: 'Arms' },
  abs: { id: 'abs', name: 'Abs', category: 'Core' },
  obliques: { id: 'obliques', name: 'Obliques', category: 'Core' },
  glutes: { id: 'glutes', name: 'Glutes', category: 'Legs' },
  quads: { id: 'quads', name: 'Quadriceps', category: 'Legs' },
  hamstrings: { id: 'hamstrings', name: 'Hamstrings', category: 'Legs' },
  calves: { id: 'calves', name: 'Calves', category: 'Legs' },
  adductors: { id: 'adductors', name: 'Adductors', category: 'Legs' },
  abductors: { id: 'abductors', name: 'Abductors', category: 'Legs' },
  cardio: { id: 'cardio', name: 'Cardio / Full Body', category: 'Cardio' },
};

export const ALL_MUSCLES = Object.keys(MUSCLE_DEFINITIONS) as Muscle[];

export function getMuscleName(m: Muscle): string {
  return MUSCLE_DEFINITIONS[m]?.name || m;
}

/**
 * Calculates weighted set count for primary (1.0) and secondary (0.5) muscles.
 */
export function addMuscleSets(
  acc: Partial<Record<Muscle, number>>,
  primary: Muscle,
  secondaries: Muscle[] = []
): Partial<Record<Muscle, number>> {
  const next = { ...acc };
  next[primary] = (next[primary] || 0) + 1.0;
  for (const s of secondaries) {
    next[s] = (next[s] || 0) + 0.5;
  }
  return next;
}
