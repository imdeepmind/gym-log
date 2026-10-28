import { Workout, SetEntry, Exercise, Muscle } from '@/types';
import { MUSCLE_DEFINITIONS } from './muscles';
import { kgToLb } from './units';

export type ChallengeCategory =
  | 'frequency'
  | 'legs'
  | 'shoulders'
  | 'chest'
  | 'back'
  | 'arms'
  | 'volume'
  | 'prs'
  | 'reps'
  | 'consistency';

export interface ChallengeDefinition {
  id: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  pool: 1 | 2 | 3;
  baseTarget: number;
  unit: string;
  iconName: 'dumbbell' | 'flame' | 'trophy' | 'target' | 'zap' | 'award' | 'calendar' | 'layers';
  getTarget: (userUnit: 'kg' | 'lb') => number;
  calculateProgress: (params: {
    monthlyWorkouts: Workout[];
    monthlySets: SetEntry[];
    exerciseMap: Map<string, Exercise>;
    userUnit: 'kg' | 'lb';
  }) => number;
  formatProgress: (current: number, target: number, userUnit: 'kg' | 'lb') => string;
}

export interface ActiveChallenge {
  definition: ChallengeDefinition;
  current: number;
  target: number;
  progressPercent: number;
  isCompleted: boolean;
  displayText: string;
}

// Muscle category groupings based on domain/muscles.ts
const LEG_MUSCLES: Set<Muscle> = new Set([
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'adductors',
  'abductors',
]);

const SHOULDER_MUSCLES: Set<Muscle> = new Set(['shoulders']);

const CHEST_MUSCLES: Set<Muscle> = new Set(['chest']);

const BACK_MUSCLES: Set<Muscle> = new Set([
  'upper_back',
  'lats',
  'lower_back',
  'traps',
]);

const ARM_MUSCLES: Set<Muscle> = new Set(['biceps', 'triceps', 'forearms']);

/**
 * Checks whether a completed workout involved training a specific muscle category
 * by examining either the precomputed summary.muscleSets or individual completed sets.
 */
function workoutTrainedCategory(
  w: Workout,
  monthlySets: SetEntry[],
  categoryMuscles: Set<Muscle>,
  exerciseMap: Map<string, Exercise>,
  minThresholdSets: number = 2
): boolean {
  // If summary muscleSets snapshot exists
  if (w.summary?.muscleSets) {
    let setsForCategory = 0;
    for (const [m, count] of Object.entries(w.summary.muscleSets)) {
      if (categoryMuscles.has(m as Muscle)) {
        setsForCategory += count || 0;
      }
    }
    if (setsForCategory >= minThresholdSets) return true;
  }

  // Fallback to inspecting completed sets of this workout
  const workoutSets = monthlySets.filter((s) => s.workoutId === w.id && s.completed && s.type !== 'warmup');
  let setCount = 0;
  for (const s of workoutSets) {
    const ex = exerciseMap.get(s.exerciseId);
    if (!ex) continue;
    if (categoryMuscles.has(ex.primaryMuscle) || ex.secondaryMuscles.some((m) => categoryMuscles.has(m))) {
      setCount++;
    }
  }

  return setCount >= minThresholdSets;
}

/**
 * Counts total completed working sets in the month targeting a specific muscle category.
 */
function countMonthlyMuscleSets(
  monthlyWorkouts: Workout[],
  monthlySets: SetEntry[],
  categoryMuscles: Set<Muscle>,
  exerciseMap: Map<string, Exercise>
): number {
  let totalSets = 0;

  for (const w of monthlyWorkouts) {
    if (w.summary?.muscleSets) {
      for (const [m, count] of Object.entries(w.summary.muscleSets)) {
        if (categoryMuscles.has(m as Muscle)) {
          totalSets += Math.round(count || 0);
        }
      }
    } else {
      const workoutSets = monthlySets.filter((s) => s.workoutId === w.id && s.completed && s.type !== 'warmup');
      for (const s of workoutSets) {
        const ex = exerciseMap.get(s.exerciseId);
        if (ex && (categoryMuscles.has(ex.primaryMuscle) || ex.secondaryMuscles.some((m) => categoryMuscles.has(m)))) {
          totalSets++;
        }
      }
    }
  }

  return totalSets;
}

/**
 * Checks how many calendar weeks in the month have at least 2 logged workouts.
 */
function calculateWeeklyConsistency(monthlyWorkouts: Workout[]): number {
  const weekCounts = [0, 0, 0, 0];

  for (const w of monthlyWorkouts) {
    const day = parseInt(w.localDate.slice(8, 10), 10);
    if (isNaN(day)) continue;

    if (day <= 7) weekCounts[0]++;
    else if (day <= 14) weekCounts[1]++;
    else if (day <= 21) weekCounts[2]++;
    else weekCounts[3]++;
  }

  return weekCounts.filter((count) => count >= 2).length;
}

// --- CURATED HIGH-VALUE CHALLENGE DEFINITIONS ---

export const CHALLENGE_DEFINITIONS: ChallengeDefinition[] = [
  // --- POOL 1: Consistency & Workout Frequency ---
  {
    id: 'monthly_workouts_12',
    title: 'Monthly Dedication',
    description: 'Complete 12 workouts this month (~3 per week)',
    category: 'frequency',
    pool: 1,
    baseTarget: 12,
    unit: 'workouts',
    iconName: 'calendar',
    getTarget: () => 12,
    calculateProgress: ({ monthlyWorkouts }) => monthlyWorkouts.length,
    formatProgress: (curr, target) => `${curr} / ${target} workouts`,
  },
  {
    id: 'monthly_workouts_16',
    title: 'Iron Consistency',
    description: 'Complete 16 workouts this month (~4 per week)',
    category: 'frequency',
    pool: 1,
    baseTarget: 16,
    unit: 'workouts',
    iconName: 'flame',
    getTarget: () => 16,
    calculateProgress: ({ monthlyWorkouts }) => monthlyWorkouts.length,
    formatProgress: (curr, target) => `${curr} / ${target} workouts`,
  },
  {
    id: 'monthly_workouts_20',
    title: 'Beast Mode',
    description: 'Complete 20 workouts this month (~5 per week)',
    category: 'frequency',
    pool: 1,
    baseTarget: 20,
    unit: 'workouts',
    iconName: 'zap',
    getTarget: () => 20,
    calculateProgress: ({ monthlyWorkouts }) => monthlyWorkouts.length,
    formatProgress: (curr, target) => `${curr} / ${target} workouts`,
  },
  {
    id: 'weekly_consistency_4',
    title: '4-Week Habit',
    description: 'Log at least 2 workouts in each of the 4 calendar weeks',
    category: 'consistency',
    pool: 1,
    baseTarget: 4,
    unit: 'weeks',
    iconName: 'target',
    getTarget: () => 4,
    calculateProgress: ({ monthlyWorkouts }) => calculateWeeklyConsistency(monthlyWorkouts),
    formatProgress: (curr, target) => `${curr} / ${target} weeks`,
  },

  // --- POOL 2: Targeted Muscle Training (Legs, Shoulders, Chest, Back, Arms) ---
  {
    id: 'leg_workouts_6',
    title: "Don't Skip Leg Day",
    description: 'Train legs (quads, hamstrings, glutes, or calves) in 6 workouts',
    category: 'legs',
    pool: 2,
    baseTarget: 6,
    unit: 'leg days',
    iconName: 'dumbbell',
    getTarget: () => 6,
    calculateProgress: ({ monthlyWorkouts, monthlySets, exerciseMap }) =>
      monthlyWorkouts.filter((w) => workoutTrainedCategory(w, monthlySets, LEG_MUSCLES, exerciseMap)).length,
    formatProgress: (curr, target) => `${curr} / ${target} leg days`,
  },
  {
    id: 'leg_workouts_8',
    title: 'Quad & Glute Power',
    description: 'Train legs in 8 workouts this month (~2 per week)',
    category: 'legs',
    pool: 2,
    baseTarget: 8,
    unit: 'leg days',
    iconName: 'award',
    getTarget: () => 8,
    calculateProgress: ({ monthlyWorkouts, monthlySets, exerciseMap }) =>
      monthlyWorkouts.filter((w) => workoutTrainedCategory(w, monthlySets, LEG_MUSCLES, exerciseMap)).length,
    formatProgress: (curr, target) => `${curr} / ${target} leg days`,
  },
  {
    id: 'leg_sets_50',
    title: 'Wheel Builder',
    description: 'Log 50 completed working sets of leg movements this month',
    category: 'legs',
    pool: 2,
    baseTarget: 50,
    unit: 'sets',
    iconName: 'layers',
    getTarget: () => 50,
    calculateProgress: ({ monthlyWorkouts, monthlySets, exerciseMap }) =>
      countMonthlyMuscleSets(monthlyWorkouts, monthlySets, LEG_MUSCLES, exerciseMap),
    formatProgress: (curr, target) => `${curr} / ${target} leg sets`,
  },
  {
    id: 'shoulder_workouts_6',
    title: 'Boulder Shoulders',
    description: 'Train shoulders in 6 workouts this month',
    category: 'shoulders',
    pool: 2,
    baseTarget: 6,
    unit: 'sessions',
    iconName: 'dumbbell',
    getTarget: () => 6,
    calculateProgress: ({ monthlyWorkouts, monthlySets, exerciseMap }) =>
      monthlyWorkouts.filter((w) => workoutTrainedCategory(w, monthlySets, SHOULDER_MUSCLES, exerciseMap)).length,
    formatProgress: (curr, target) => `${curr} / ${target} sessions`,
  },
  {
    id: 'shoulder_workouts_8',
    title: 'Cannonball Delts',
    description: 'Train shoulders in 8 workouts this month',
    category: 'shoulders',
    pool: 2,
    baseTarget: 8,
    unit: 'sessions',
    iconName: 'award',
    getTarget: () => 8,
    calculateProgress: ({ monthlyWorkouts, monthlySets, exerciseMap }) =>
      monthlyWorkouts.filter((w) => workoutTrainedCategory(w, monthlySets, SHOULDER_MUSCLES, exerciseMap)).length,
    formatProgress: (curr, target) => `${curr} / ${target} sessions`,
  },
  {
    id: 'shoulder_sets_40',
    title: 'Overhead Mastery',
    description: 'Log 40 completed working sets of shoulder exercises',
    category: 'shoulders',
    pool: 2,
    baseTarget: 40,
    unit: 'sets',
    iconName: 'target',
    getTarget: () => 40,
    calculateProgress: ({ monthlyWorkouts, monthlySets, exerciseMap }) =>
      countMonthlyMuscleSets(monthlyWorkouts, monthlySets, SHOULDER_MUSCLES, exerciseMap),
    formatProgress: (curr, target) => `${curr} / ${target} shoulder sets`,
  },
  {
    id: 'chest_workouts_6',
    title: 'Bench Specialist',
    description: 'Train chest in 6 workouts this month',
    category: 'chest',
    pool: 2,
    baseTarget: 6,
    unit: 'sessions',
    iconName: 'dumbbell',
    getTarget: () => 6,
    calculateProgress: ({ monthlyWorkouts, monthlySets, exerciseMap }) =>
      monthlyWorkouts.filter((w) => workoutTrainedCategory(w, monthlySets, CHEST_MUSCLES, exerciseMap)).length,
    formatProgress: (curr, target) => `${curr} / ${target} sessions`,
  },
  {
    id: 'chest_sets_45',
    title: 'Pec Dominance',
    description: 'Log 45 completed working sets of chest movements',
    category: 'chest',
    pool: 2,
    baseTarget: 45,
    unit: 'sets',
    iconName: 'flame',
    getTarget: () => 45,
    calculateProgress: ({ monthlyWorkouts, monthlySets, exerciseMap }) =>
      countMonthlyMuscleSets(monthlyWorkouts, monthlySets, CHEST_MUSCLES, exerciseMap),
    formatProgress: (curr, target) => `${curr} / ${target} chest sets`,
  },
  {
    id: 'back_workouts_6',
    title: 'V-Taper Hunter',
    description: 'Train back (lats, upper back, or traps) in 6 workouts',
    category: 'back',
    pool: 2,
    baseTarget: 6,
    unit: 'sessions',
    iconName: 'dumbbell',
    getTarget: () => 6,
    calculateProgress: ({ monthlyWorkouts, monthlySets, exerciseMap }) =>
      monthlyWorkouts.filter((w) => workoutTrainedCategory(w, monthlySets, BACK_MUSCLES, exerciseMap)).length,
    formatProgress: (curr, target) => `${curr} / ${target} sessions`,
  },
  {
    id: 'back_sets_50',
    title: 'Barn Door Back',
    description: 'Log 50 completed working sets of back movements',
    category: 'back',
    pool: 2,
    baseTarget: 50,
    unit: 'sets',
    iconName: 'target',
    getTarget: () => 50,
    calculateProgress: ({ monthlyWorkouts, monthlySets, exerciseMap }) =>
      countMonthlyMuscleSets(monthlyWorkouts, monthlySets, BACK_MUSCLES, exerciseMap),
    formatProgress: (curr, target) => `${curr} / ${target} back sets`,
  },
  {
    id: 'arms_workouts_6',
    title: 'The Gun Show',
    description: 'Train biceps or triceps in 6 workouts this month',
    category: 'arms',
    pool: 2,
    baseTarget: 6,
    unit: 'sessions',
    iconName: 'dumbbell',
    getTarget: () => 6,
    calculateProgress: ({ monthlyWorkouts, monthlySets, exerciseMap }) =>
      monthlyWorkouts.filter((w) => workoutTrainedCategory(w, monthlySets, ARM_MUSCLES, exerciseMap)).length,
    formatProgress: (curr, target) => `${curr} / ${target} sessions`,
  },

  // --- POOL 3: Volume Milestones, PRs & Work Capacity ---
  {
    id: 'volume_35k',
    title: 'Volume Crusher',
    description: 'Accumulate total working volume this month',
    category: 'volume',
    pool: 3,
    baseTarget: 35000,
    unit: 'volume',
    iconName: 'trophy',
    getTarget: (unit) => (unit === 'lb' ? 77000 : 35000),
    calculateProgress: ({ monthlyWorkouts, userUnit }) => {
      const totalKg = monthlyWorkouts.reduce(
        (acc, w) => acc + (w.summary?.totalVolumeKg || 0),
        0
      );
      return userUnit === 'lb' ? Math.round(kgToLb(totalKg)) : Math.round(totalKg);
    },
    formatProgress: (curr, target, unit) =>
      `${curr.toLocaleString()} / ${target.toLocaleString()} ${unit}`,
  },
  {
    id: 'volume_75k',
    title: 'Heavy Hauler',
    description: 'Accumulate total working volume this month',
    category: 'volume',
    pool: 3,
    baseTarget: 75000,
    unit: 'volume',
    iconName: 'trophy',
    getTarget: (unit) => (unit === 'lb' ? 165000 : 75000),
    calculateProgress: ({ monthlyWorkouts, userUnit }) => {
      const totalKg = monthlyWorkouts.reduce(
        (acc, w) => acc + (w.summary?.totalVolumeKg || 0),
        0
      );
      return userUnit === 'lb' ? Math.round(kgToLb(totalKg)) : Math.round(totalKg);
    },
    formatProgress: (curr, target, unit) =>
      `${curr.toLocaleString()} / ${target.toLocaleString()} ${unit}`,
  },
  {
    id: 'prs_3',
    title: 'Record Smasher',
    description: 'Set 3 new Personal Records (PRs) this month',
    category: 'prs',
    pool: 3,
    baseTarget: 3,
    unit: 'PRs',
    iconName: 'zap',
    getTarget: () => 3,
    calculateProgress: ({ monthlyWorkouts }) =>
      monthlyWorkouts.reduce((acc, w) => acc + (w.summary?.prs?.length || 0), 0),
    formatProgress: (curr, target) => `${curr} / ${target} PRs`,
  },
  {
    id: 'prs_5',
    title: 'Unstoppable Progress',
    description: 'Set 5 new Personal Records (PRs) this month',
    category: 'prs',
    pool: 3,
    baseTarget: 5,
    unit: 'PRs',
    iconName: 'award',
    getTarget: () => 5,
    calculateProgress: ({ monthlyWorkouts }) =>
      monthlyWorkouts.reduce((acc, w) => acc + (w.summary?.prs?.length || 0), 0),
    formatProgress: (curr, target) => `${curr} / ${target} PRs`,
  },
  {
    id: 'reps_1000',
    title: '1,000 Rep Club',
    description: 'Log 1,000 completed working reps this month',
    category: 'reps',
    pool: 3,
    baseTarget: 1000,
    unit: 'reps',
    iconName: 'flame',
    getTarget: () => 1000,
    calculateProgress: ({ monthlyWorkouts }) =>
      monthlyWorkouts.reduce((acc, w) => acc + (w.summary?.totalReps || 0), 0),
    formatProgress: (curr, target) => `${curr.toLocaleString()} / ${target.toLocaleString()} reps`,
  },
];

export const POOL_1 = CHALLENGE_DEFINITIONS.filter((c) => c.pool === 1);
export const POOL_2 = CHALLENGE_DEFINITIONS.filter((c) => c.pool === 2);
export const POOL_3 = CHALLENGE_DEFINITIONS.filter((c) => c.pool === 3);

/**
 * Deterministically generates 3 challenge IDs for a given month string (YYYY-MM).
 * Combines 1 from Pool 1 (frequency), 1 from Pool 2 (muscle focus), 1 from Pool 3 (volume/PR/reps).
 */
export function getDefaultMonthlyChallengeIds(monthStr: string): [string, string, string] {
  let hash = 0;
  for (let i = 0; i < monthStr.length; i++) {
    hash = (hash << 5) - hash + monthStr.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  const c1 = POOL_1[positiveHash % POOL_1.length];
  const c2 = POOL_2[(positiveHash >> 2) % POOL_2.length];
  const c3 = POOL_3[(positiveHash >> 4) % POOL_3.length];

  return [c1.id, c2.id, c3.id];
}

/**
 * Picks 3 random challenge IDs from distinct pools.
 */
export function generateRandomMonthlyChallengeIds(): [string, string, string] {
  const c1 = POOL_1[Math.floor(Math.random() * POOL_1.length)];
  const c2 = POOL_2[Math.floor(Math.random() * POOL_2.length)];
  const c3 = POOL_3[Math.floor(Math.random() * POOL_3.length)];
  return [c1.id, c2.id, c3.id];
}

/**
 * Resolves active challenge metrics from definitions and user workout data.
 */
export function resolveMonthlyChallenges(
  challengeIds: string[],
  monthlyWorkouts: Workout[],
  monthlySets: SetEntry[],
  exerciseMap: Map<string, Exercise>,
  userUnit: 'kg' | 'lb' = 'kg'
): ActiveChallenge[] {
  const defMap = new Map(CHALLENGE_DEFINITIONS.map((c) => [c.id, c]));

  return challengeIds
    .map((id) => defMap.get(id))
    .filter((def): def is ChallengeDefinition => Boolean(def))
    .map((def) => {
      const target = def.getTarget(userUnit);
      const rawCurrent = def.calculateProgress({
        monthlyWorkouts,
        monthlySets,
        exerciseMap,
        userUnit,
      });
      const current = Math.min(rawCurrent, target);
      const progressPercent = target > 0 ? Math.min(100, Math.round((rawCurrent / target) * 100)) : 0;
      const isCompleted = rawCurrent >= target;
      const displayText = def.formatProgress(rawCurrent, target, userUnit);

      return {
        definition: def,
        current: rawCurrent,
        target,
        progressPercent,
        isCompleted,
        displayText,
      };
    });
}
