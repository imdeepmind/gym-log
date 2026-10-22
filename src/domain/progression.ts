import { PlanExercise, ProgressionRule, DeloadRule, SetEntry } from '@/types';
import { roundToIncrement } from './calc';

export interface ResolvedTarget {
  weightKg?: number;
  repMin?: number;
  repMax?: number;
  isDeload: boolean;
  reason: string;
}

/**
 * Resolves target weight and reps for a Plan exercise when starting a workout (Spec 8.6).
 */
export function resolveProgressionTarget(
  planExercise: PlanExercise,
  lastSessionSets: SetEntry[] = [],
  currentWeekNumber: number = 1,
  programDeload?: DeloadRule,
  roundingIncrement: number = 2.5
): ResolvedTarget {
  let targetWeight = planExercise.targetWeightKg;
  let repMin = planExercise.repMin ?? 8;
  let repMax = planExercise.repMax ?? 10;
  let isDeload = false;
  let reason = 'Standard plan targets';

  const workingSets = lastSessionSets.filter((s) => s.completed && s.type !== 'warmup');

  // Check Progression Rule if defined
  if (planExercise.progression && workingSets.length > 0) {
    const rule = planExercise.progression;
    const lastWeight = Math.max(...workingSets.map((s) => s.weightKg || 0));

    if (rule.kind === 'linear') {
      const allSetsHit =
        !rule.requireAllSetsCompleted ||
        (workingSets.length >= planExercise.targetSets &&
          workingSets.every((s) => (s.reps || 0) >= repMin));

      if (allSetsHit && lastWeight > 0) {
        targetWeight = roundToIncrement(lastWeight + rule.incrementKg, roundingIncrement);
        reason = `Linear progression: +${rule.incrementKg} kg applied`;
      } else {
        targetWeight = lastWeight || targetWeight;
        reason = `Linear progression: held weight at ${targetWeight} kg`;
      }
    } else if (rule.kind === 'double') {
      const ruleRepMax = rule.repMax || repMax;
      const ruleRepMin = rule.repMin || repMin;
      const allHitMax = workingSets.every((s) => (s.reps || 0) >= ruleRepMax);

      if (allHitMax && lastWeight > 0) {
        targetWeight = roundToIncrement(lastWeight + rule.incrementKg, roundingIncrement);
        repMin = ruleRepMin;
        repMax = ruleRepMin;
        reason = `Double progression: reached ${ruleRepMax} reps! Increased weight to ${targetWeight} kg for ${ruleRepMin} reps`;
      } else {
        targetWeight = lastWeight || targetWeight;
        reason = `Double progression: hold ${targetWeight} kg until all sets reach ${ruleRepMax} reps`;
      }
    }
  }

  // Check Program Deload Rule
  if (
    programDeload &&
    programDeload.everyNWeeks > 0 &&
    currentWeekNumber % programDeload.everyNWeeks === 0
  ) {
    isDeload = true;
    if (targetWeight && targetWeight > 0) {
      const reduced = targetWeight * (1 - programDeload.percent / 100);
      targetWeight = roundToIncrement(reduced, roundingIncrement);
      reason = `Deload week (${programDeload.percent}% load reduction applied)`;
    }
  }

  return {
    weightKg: targetWeight,
    repMin,
    repMax,
    isDeload,
    reason,
  };
}
