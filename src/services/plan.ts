import { db } from '@/db/schema';
import { Plan, PlanExercise, Workout, WorkoutExercise, SetEntry, ID } from '@/types';
import { getPreviousPerformanceSets, startWorkout } from './workout';

export const SEEDED_PLANS: Plan[] = [
  {
    id: 'plan_push_a',
    name: 'Push Day A · Chest & Shoulders',
    notes: 'Focus on progressive overload on compound presses, followed by delts & triceps hypertrophy.',
    isArchived: false,
    exercises: [
      { id: 'pe_1', exerciseId: 'ex_barbell_bench_press', order: 1, targetSets: 4, repMin: 6, repMax: 8, restSec: 120 },
      { id: 'pe_2', exerciseId: 'ex_incline_dumbbell_bench_press', order: 2, targetSets: 3, repMin: 8, repMax: 10, restSec: 90 },
      { id: 'pe_3', exerciseId: 'ex_barbell_overhead_press', order: 3, targetSets: 3, repMin: 8, repMax: 10, restSec: 90 },
      { id: 'pe_4', exerciseId: 'ex_dumbbell_lateral_raise', order: 4, targetSets: 4, repMin: 12, repMax: 15, restSec: 60 },
      { id: 'pe_5', exerciseId: 'ex_cable_triceps_pushdown', order: 5, targetSets: 3, repMin: 10, repMax: 12, restSec: 60 },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'plan_pull_a',
    name: 'Pull Day A · Back & Biceps',
    notes: 'Heavy compound back work, lat pulldowns, and focused arm curl volume.',
    isArchived: false,
    exercises: [
      { id: 'pe_6', exerciseId: 'ex_conventional_deadlift', order: 1, targetSets: 3, repMin: 5, repMax: 5, restSec: 180 },
      { id: 'pe_7', exerciseId: 'ex_lat_pulldown', order: 2, targetSets: 4, repMin: 8, repMax: 10, restSec: 90 },
      { id: 'pe_8', exerciseId: 'ex_barbell_bent_over_row', order: 3, targetSets: 3, repMin: 8, repMax: 10, restSec: 90 },
      { id: 'pe_9', exerciseId: 'ex_face_pulls', order: 4, targetSets: 3, repMin: 12, repMax: 15, restSec: 60 },
      { id: 'pe_10', exerciseId: 'ex_barbell_biceps_curl', order: 5, targetSets: 3, repMin: 10, repMax: 12, restSec: 75 },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'plan_leg_a',
    name: 'Leg Day A · Quads & Hamstrings',
    notes: 'Squats, posterior chain hinges, and machine volume for full lower-body stimulus.',
    isArchived: false,
    exercises: [
      { id: 'pe_11', exerciseId: 'ex_barbell_back_squat', order: 1, targetSets: 4, repMin: 6, repMax: 8, restSec: 180 },
      { id: 'pe_12', exerciseId: 'ex_romanian_deadlift', order: 2, targetSets: 3, repMin: 8, repMax: 10, restSec: 120 },
      { id: 'pe_13', exerciseId: 'ex_leg_press', order: 3, targetSets: 3, repMin: 10, repMax: 12, restSec: 90 },
      { id: 'pe_14', exerciseId: 'ex_lying_leg_curl', order: 4, targetSets: 3, repMin: 10, repMax: 12, restSec: 75 },
      { id: 'pe_15', exerciseId: 'ex_standing_calf_raise', order: 5, targetSets: 4, repMin: 12, repMax: 15, restSec: 60 },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'plan_upper_power',
    name: 'Upper Body Power',
    notes: 'High-intensity push and pull movement supersets for total upper physique development.',
    isArchived: false,
    exercises: [
      { id: 'pe_16', exerciseId: 'ex_incline_barbell_bench_press', order: 1, targetSets: 4, repMin: 6, repMax: 8, restSec: 120 },
      { id: 'pe_17', exerciseId: 'ex_pull_ups', order: 2, targetSets: 4, repMin: 6, repMax: 8, restSec: 120 },
      { id: 'pe_18', exerciseId: 'ex_seated_dumbbell_shoulder_press', order: 3, targetSets: 3, repMin: 8, repMax: 10, restSec: 90 },
      { id: 'pe_19', exerciseId: 'ex_seated_cable_row', order: 4, targetSets: 3, repMin: 8, repMax: 10, restSec: 90 },
      { id: 'pe_20', exerciseId: 'ex_ez_bar_skull_crushers', order: 5, targetSets: 3, repMin: 10, repMax: 12, restSec: 75 },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
];

/**
 * Initializes default plans if none exist.
 */
export async function initializeDefaultPlans() {
  const count = await db.plans.count();
  if (count === 0) {
    await db.plans.bulkAdd(SEEDED_PLANS);
  }
}

/**
 * Starts an active workout from a Plan (Spec 7.3).
 * Priority order for prefilling set rows:
 * 1. Plan's target weight and reps
 * 2. Last performance of that exercise (auto-fill)
 * 3. Blank
 */
export async function startWorkoutFromPlan(
  planId: ID,
  scheduledDate?: string
): Promise<Workout> {
  const plan = await db.plans.get(planId);
  if (!plan) throw new Error('Plan not found');

  const now = Date.now();
  const todayStr = new Date().toISOString().slice(0, 10);

  const workout: Workout = {
    id: crypto.randomUUID(),
    name: plan.name,
    status: 'in_progress',
    startedAt: now,
    localDate: todayStr,
    planId: plan.id,
    scheduledDate: scheduledDate || todayStr,
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction('rw', [db.workouts, db.workoutExercises, db.sets], async () => {
    await db.workouts.add(workout);

    for (const pe of plan.exercises) {
      const workoutExerciseId = crypto.randomUUID();
      const we: WorkoutExercise = {
        id: workoutExerciseId,
        workoutId: workout.id,
        exerciseId: pe.exerciseId,
        order: pe.order,
        supersetGroup: pe.supersetGroup,
        restSec: pe.restSec,
        notes: pe.notes,
        createdAt: now,
        updatedAt: now,
      };
      await db.workoutExercises.add(we);

      // Check last performance
      const prevSets = await getPreviousPerformanceSets(pe.exerciseId);

      const targetCount = pe.targetSets || 3;
      for (let s = 1; s <= targetCount; s++) {
        const prevSet = prevSets[s - 1];
        const weightKg = pe.targetWeightKg ?? (prevSet ? prevSet.weightKg : undefined);
        const reps = pe.repMax ?? pe.repMin ?? (prevSet ? prevSet.reps : undefined);

        const setEntry: SetEntry = {
          id: crypto.randomUUID(),
          workoutId: workout.id,
          workoutExerciseId,
          exerciseId: pe.exerciseId,
          order: s,
          type: 'working',
          weightKg,
          reps,
          completed: false,
          createdAt: now,
          updatedAt: now,
        };
        await db.sets.add(setEntry);
      }
    }
  });

  return workout;
}

/**
 * Saves a finished workout as a reusable Plan.
 */
export async function saveWorkoutAsPlan(
  workoutId: ID,
  planName: string,
  notes?: string
): Promise<Plan> {
  const workoutExercises = await db.workoutExercises
    .where('workoutId')
    .equals(workoutId)
    .sortBy('order');
  const now = Date.now();

  const planExercises: PlanExercise[] = [];
  for (const we of workoutExercises) {
    const completedSets = await db.sets
      .where('workoutExerciseId')
      .equals(we.id)
      .filter((s) => s.completed && s.type !== 'warmup')
      .toArray();

    const targetSets = Math.max(1, completedSets.length);
    const avgReps =
      completedSets.length > 0
        ? Math.round(
            completedSets.reduce((sum, s) => sum + (s.reps || 0), 0) / completedSets.length
          )
        : 10;
    const avgWeight =
      completedSets.length > 0
        ? completedSets[0].weightKg
        : undefined;

    planExercises.push({
      id: crypto.randomUUID(),
      exerciseId: we.exerciseId,
      order: we.order,
      supersetGroup: we.supersetGroup,
      targetSets,
      repMin: avgReps,
      repMax: avgReps,
      targetWeightKg: avgWeight,
      restSec: we.restSec,
      notes: we.notes,
    });
  }

  const plan: Plan = {
    id: `plan_${Date.now()}`,
    name: planName,
    notes,
    isArchived: false,
    exercises: planExercises,
    createdAt: now,
    updatedAt: now,
  };

  await db.plans.add(plan);
  return plan;
}
