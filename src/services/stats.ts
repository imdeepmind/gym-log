import { db } from '@/db/schema';
import { Exercise, SetEntry, Workout, PRRecord, Muscle } from '@/types';
import { calculateE1RM, calculateSetVolume } from '@/domain/calc';
import { subMonths, subYears, parseISO, isAfter } from 'date-fns';

export type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface ExerciseSessionPoint {
  date: string;
  e1rm: number;
  maxWeight: number;
  volume: number;
  totalReps: number;
  bestSet: string;
}

export interface RepPRRow {
  weightKg: number;
  reps: number;
  date: string;
}

export function getCutoffDate(range: TimeRange): Date | null {
  const now = new Date();
  switch (range) {
    case '1M':
      return subMonths(now, 1);
    case '3M':
      return subMonths(now, 3);
    case '6M':
      return subMonths(now, 6);
    case '1Y':
      return subYears(now, 1);
    case 'ALL':
    default:
      return null;
  }
}

/**
 * Computes chronological chart data and rep records for a single exercise.
 */
export async function getExerciseChartData(
  exerciseId: string,
  range: TimeRange = 'ALL',
  e1rmFormula: 'epley' | 'brzycki' = 'epley'
): Promise<{
  points: ExerciseSessionPoint[];
  repPRs: RepPRRow[];
  allTimeMaxWeight: number;
  allTimeMaxE1RM: number;
}> {
  const completedSets = await db.sets
    .where('[exerciseId+completedAt]')
    .between([exerciseId, 0], [exerciseId, Date.now()])
    .toArray();

  const workingSets = completedSets.filter((s) => s.type !== 'warmup');
  const cutoff = getCutoffDate(range);

  // Load associated workouts to get local dates
  const workoutIds = Array.from(new Set(workingSets.map((s) => s.workoutId)));
  const workouts = await db.workouts.where('id').anyOf(workoutIds).toArray();
  const workoutDateMap = new Map<string, string>();
  workouts.forEach((w) => workoutDateMap.set(w.id, w.localDate));

  // Group sets by workout
  const setsByWorkout = new Map<string, SetEntry[]>();
  for (const s of workingSets) {
    const list = setsByWorkout.get(s.workoutId) || [];
    list.push(s);
    setsByWorkout.set(s.workoutId, list);
  }

  const points: ExerciseSessionPoint[] = [];
  let allTimeMaxWeight = 0;
  let allTimeMaxE1RM = 0;

  // Track Rep PRs at each weight
  const repPRMap = new Map<number, { reps: number; date: string }>();

  for (const [wId, sets] of setsByWorkout.entries()) {
    const dateStr = workoutDateMap.get(wId) || 'Unknown';
    if (cutoff && isAfter(cutoff, parseISO(dateStr))) {
      continue;
    }

    let sessionMaxWeight = 0;
    let sessionMaxE1RM = 0;
    let sessionVolume = 0;
    let sessionReps = 0;
    let bestSetDescription = '';

    for (const s of sets) {
      const wt = s.weightKg || 0;
      const reps = s.reps || 0;

      if (wt > sessionMaxWeight) sessionMaxWeight = wt;
      if (wt > allTimeMaxWeight) allTimeMaxWeight = wt;

      const e1 = calculateE1RM(wt, reps, e1rmFormula);
      if (e1 > sessionMaxE1RM) {
        sessionMaxE1RM = e1;
        bestSetDescription = `${wt} kg × ${reps}`;
      }
      if (e1 > allTimeMaxE1RM) allTimeMaxE1RM = e1;

      sessionVolume += wt * reps;
      sessionReps += reps;

      // Check Rep PR at this specific weight
      if (wt > 0 && reps > 0) {
        const existing = repPRMap.get(wt);
        if (!existing || reps > existing.reps) {
          repPRMap.set(wt, { reps, date: dateStr });
        }
      }
    }

    points.push({
      date: dateStr,
      e1rm: Math.round(sessionMaxE1RM * 10) / 10,
      maxWeight: sessionMaxWeight,
      volume: sessionVolume,
      totalReps: sessionReps,
      bestSet: bestSetDescription,
    });
  }

  // Sort chronological
  points.sort((a, b) => a.date.localeCompare(b.date));

  const repPRs: RepPRRow[] = Array.from(repPRMap.entries())
    .map(([weightKg, info]) => ({
      weightKg,
      reps: info.reps,
      date: info.date,
    }))
    .sort((a, b) => b.weightKg - a.weightKg);

  return {
    points,
    repPRs,
    allTimeMaxWeight,
    allTimeMaxE1RM: Math.round(allTimeMaxE1RM * 10) / 10,
  };
}

/**
 * Computes overall volume trends over time across all completed workouts.
 */
export async function getOverallVolumeTrends(
  range: TimeRange = 'ALL'
): Promise<{ date: string; volume: number; duration: number }[]> {
  const cutoff = getCutoffDate(range);
  const workouts = await db.workouts
    .where('status')
    .equals('completed')
    .sortBy('localDate');

  const filtered = workouts.filter((w) => {
    if (!w.summary) return false;
    if (cutoff && isAfter(cutoff, parseISO(w.localDate))) return false;
    return true;
  });

  return filtered.map((w) => ({
    date: w.localDate,
    volume: w.summary?.totalVolumeKg || 0,
    duration: Math.round((w.summary?.durationSec || 0) / 60),
  }));
}

/**
 * Computes all personal records achieved across all exercises.
 */
export async function getAllHistoricalPRs(): Promise<
  {
    exercise: Exercise;
    maxWeight: number;
    maxE1RM: number;
    bestReps: number;
    bestRepsWeight: number;
  }[]
> {
  const allExercises = await db.exercises.toArray();
  const allCompletedSets = await db.sets
    .where('[exerciseId+completedAt]')
    .between(['', 0], ['\uffff', Date.now()])
    .toArray();

  const workingSets = allCompletedSets.filter((s) => s.type !== 'warmup');
  const setsByExercise = new Map<string, SetEntry[]>();

  for (const s of workingSets) {
    const list = setsByExercise.get(s.exerciseId) || [];
    list.push(s);
    setsByExercise.set(s.exerciseId, list);
  }

  const results: any[] = [];
  for (const ex of allExercises) {
    const sets = setsByExercise.get(ex.id);
    if (!sets || sets.length === 0) continue;

    let maxWeight = 0;
    let maxE1RM = 0;
    let bestReps = 0;
    let bestRepsWeight = 0;

    for (const s of sets) {
      const wt = s.weightKg || 0;
      const reps = s.reps || 0;
      if (wt > maxWeight) maxWeight = wt;
      const e1 = calculateE1RM(wt, reps, 'epley');
      if (e1 > maxE1RM) maxE1RM = e1;
      if (reps > bestReps) {
        bestReps = reps;
        bestRepsWeight = wt;
      }
    }

    if (maxWeight > 0 || bestReps > 0) {
      results.push({
        exercise: ex,
        maxWeight,
        maxE1RM: Math.round(maxE1RM * 10) / 10,
        bestReps,
        bestRepsWeight,
      });
    }
  }

  return results.sort((a, b) => b.maxWeight - a.maxWeight);
}
