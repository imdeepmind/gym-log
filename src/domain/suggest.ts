import { SetEntry } from '@/types';
import { roundToIncrement } from './calc';

export interface OverloadSuggestion {
  text: string;
  suggestedWeightKg?: number;
  suggestedReps?: number;
  type: 'increase_weight' | 'increase_reps' | 'deload' | 'maintain';
}

export interface SuggestionConfig {
  repMin: number;
  repMax: number;
  incrementKg: number;
  roundingIncrement: number;
  isBodyweight?: boolean;
}

/**
 * Pure function computing rule-based progressive overload suggestion (Section 8.5)
 */
export function suggestNext(
  historySessions: SetEntry[][], // Array of previous workouts, each having array of working sets
  config: SuggestionConfig
): OverloadSuggestion | null {
  if (!historySessions || historySessions.length === 0) {
    return null;
  }

  const lastSessionSets = historySessions[0].filter((s) => s.completed && s.type !== 'warmup');
  if (lastSessionSets.length === 0) {
    return null;
  }

  const { repMin, repMax, incrementKg, roundingIncrement, isBodyweight } = config;

  // Check 3 consecutive sessions missed repMin
  if (historySessions.length >= 3) {
    const missedAll3 = historySessions.slice(0, 3).every((sessionSets) => {
      const working = sessionSets.filter((s) => s.completed && s.type !== 'warmup');
      return working.length > 0 && working.some((s) => (s.reps || 0) < repMin);
    });

    if (missedAll3) {
      const lastWeight = lastSessionSets[0].weightKg || 0;
      const reducedWeight = roundToIncrement(lastWeight * 0.9, roundingIncrement);
      return {
        text: `Missed ${repMin} reps in 3 sessions: suggest 10% deload to ${reducedWeight} kg to rebuild form`,
        suggestedWeightKg: reducedWeight,
        suggestedReps: repMin,
        type: 'deload',
      };
    }
  }

  // Bodyweight progression
  if (isBodyweight) {
    const allExceededTarget = lastSessionSets.every((s) => (s.reps || 0) >= repMax);
    if (allExceededTarget) {
      return {
        text: `Target ${repMax} reps hit across all sets! Suggest adding weight (+${incrementKg} kg)`,
        suggestedWeightKg: incrementKg,
        suggestedReps: repMin,
        type: 'increase_weight',
      };
    } else {
      return {
        text: `Suggest pushing for +1 rep on your top set`,
        suggestedReps: Math.min(repMax, (lastSessionSets[0].reps || 0) + 1),
        type: 'increase_reps',
      };
    }
  }

  // Weight progression
  const allReachedTop = lastSessionSets.every((s) => (s.reps || 0) >= repMax);
  const lastTopWeight = Math.max(...lastSessionSets.map((s) => s.weightKg || 0));

  if (allReachedTop) {
    const nextWeight = roundToIncrement(lastTopWeight + incrementKg, roundingIncrement);
    return {
      text: `All sets hit top of range (${repMax} reps)! Increase weight to ${nextWeight} kg for ${repMin} reps`,
      suggestedWeightKg: nextWeight,
      suggestedReps: repMin,
      type: 'increase_weight',
    };
  }

  // If some sets were within range: suggest +1 rep on weakest set
  const minRepsHit = Math.min(...lastSessionSets.map((s) => s.reps || 0));
  return {
    text: `Keep weight at ${lastTopWeight} kg and aim for +1 rep on your lowest set (${minRepsHit} → ${minRepsHit + 1} reps)`,
    suggestedWeightKg: lastTopWeight,
    suggestedReps: minRepsHit + 1,
    type: 'increase_reps',
  };
}
