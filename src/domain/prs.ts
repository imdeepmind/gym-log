import { SetEntry, PRRecord, PRKind } from '@/types';
import { calculateE1RM, calculateSetVolume } from './calc';

export interface PRCheckResult {
  isPR: boolean;
  records: PRRecord[];
}

/**
 * Checks if a newly completed set breaks any personal records compared to prior history sets.
 * 
 * Strict PR Rules (Section 8.3):
 * 1. A PR is awarded only if it strictly beats an earlier record.
 * 2. It requires prior history (first set ever for an exercise does NOT trigger a PR).
 * 3. Warm-up sets are excluded from PR detection.
 */
export function checkSetPRs(
  currentSet: SetEntry,
  priorCompletedSets: SetEntry[],
  e1rmFormula: 'epley' | 'brzycki' = 'epley'
): PRCheckResult {
  // Warmups do not count for PRs
  if (currentSet.type === 'warmup') {
    return { isPR: false, records: [] };
  }

  // Must have prior completed working sets to have records to beat
  const eligiblePriorSets = priorCompletedSets.filter(
    (s) => s.completed && s.type !== 'warmup' && (s.completedAt || 0) < (currentSet.completedAt || Date.now())
  );

  if (eligiblePriorSets.length === 0) {
    return { isPR: false, records: [] };
  }

  const records: PRRecord[] = [];
  const exerciseId = currentSet.exerciseId;
  const currentWeight = currentSet.weightKg || 0;
  const currentReps = currentSet.reps || 0;

  // 1. Max Weight PR
  if (currentWeight > 0) {
    let maxPriorWeight = 0;
    for (const s of eligiblePriorSets) {
      if ((s.weightKg || 0) > maxPriorWeight) {
        maxPriorWeight = s.weightKg || 0;
      }
    }

    if (maxPriorWeight > 0 && currentWeight > maxPriorWeight) {
      records.push({
        exerciseId,
        kind: 'max_weight',
        value: currentWeight,
        previousValue: maxPriorWeight,
        reps: currentReps,
        weightKg: currentWeight,
      });
    }
  }

  // 2. Max e1RM PR (1 to 12 reps)
  if (currentWeight > 0 && currentReps >= 1 && currentReps <= 12) {
    const currentE1RM = calculateE1RM(currentWeight, currentReps, e1rmFormula);
    let maxPriorE1RM = 0;

    for (const s of eligiblePriorSets) {
      const reps = s.reps || 0;
      const wt = s.weightKg || 0;
      if (reps >= 1 && reps <= 12 && wt > 0) {
        const e1 = calculateE1RM(wt, reps, e1rmFormula);
        if (e1 > maxPriorE1RM) {
          maxPriorE1RM = e1;
        }
      }
    }

    if (maxPriorE1RM > 0 && currentE1RM > maxPriorE1RM + 0.1) {
      records.push({
        exerciseId,
        kind: 'max_e1rm',
        value: Math.round(currentE1RM * 10) / 10,
        previousValue: Math.round(maxPriorE1RM * 10) / 10,
        reps: currentReps,
        weightKg: currentWeight,
      });
    }
  }

  // 3. Rep PR at this specific weight
  if (currentWeight > 0 && currentReps > 0) {
    let maxPriorRepsAtWeight = 0;
    let foundSameWeight = false;

    for (const s of eligiblePriorSets) {
      // Within 0.1kg tolerance for same weight
      if (Math.abs((s.weightKg || 0) - currentWeight) < 0.1) {
        foundSameWeight = true;
        if ((s.reps || 0) > maxPriorRepsAtWeight) {
          maxPriorRepsAtWeight = s.reps || 0;
        }
      }
    }

    if (foundSameWeight && currentReps > maxPriorRepsAtWeight) {
      records.push({
        exerciseId,
        kind: 'rep_pr',
        value: currentReps,
        previousValue: maxPriorRepsAtWeight,
        reps: currentReps,
        weightKg: currentWeight,
      });
    }
  }

  return {
    isPR: records.length > 0,
    records,
  };
}
