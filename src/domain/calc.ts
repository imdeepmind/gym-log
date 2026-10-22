import { TrackingType, SetType } from '@/types';

/**
 * Calculates Estimated 1 Rep Max (e1RM).
 * Epley formula: w * (1 + reps / 30), w when reps = 1.
 * Brzycki formula: w * (36 / (37 - reps)).
 * Only sets with 1 to 12 reps are considered reliable.
 */
export function calculateE1RM(
  weightKg: number,
  reps: number,
  formula: 'epley' | 'brzycki' = 'epley'
): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  if (reps > 12) return 0; // Unreliable above 12 reps per spec

  if (formula === 'brzycki') {
    if (reps >= 37) return 0;
    return weightKg * (36 / (37 - reps));
  }

  // Epley
  return weightKg * (1 + reps / 30);
}

/**
 * Calculates volume (in kg) for a single completed set based on tracking type.
 */
export function calculateSetVolume(
  trackingType: TrackingType,
  setType: SetType,
  weightKg: number = 0,
  reps: number = 0,
  bodyweightKg: number = 0,
  includeBodyweight: boolean = false,
  includeWarmups: boolean = false
): number {
  if (setType === 'warmup' && !includeWarmups) {
    return 0;
  }

  const safeReps = Math.max(0, reps || 0);
  const safeWeight = Math.max(0, weightKg || 0);
  const safeBodyweight = Math.max(0, bodyweightKg || 0);

  switch (trackingType) {
    case 'weight_reps':
      return safeWeight * safeReps;

    case 'bodyweight_reps':
      return includeBodyweight ? safeBodyweight * safeReps : 0;

    case 'weighted_bodyweight':
      return includeBodyweight
        ? (safeBodyweight + safeWeight) * safeReps
        : safeWeight * safeReps;

    case 'assisted_bodyweight':
      // Assisted load is not counted in total positive volume
      return 0;

    case 'duration':
    case 'distance_time':
      // Duration & distance are tracked separately, not in kg volume
      return 0;

    default:
      return 0;
  }
}

/**
 * Rounds a number to the nearest increment (e.g. 2.5 kg or 5 lb).
 */
export function roundToIncrement(val: number, increment: number): number {
  if (increment <= 0 || isNaN(val)) return val;
  return Math.round(val / increment) * increment;
}
