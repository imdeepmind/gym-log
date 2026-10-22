import { db } from '@/db/schema';
import {
  Workout,
  WorkoutExercise,
  SetEntry,
  WorkoutSummary,
  Muscle,
  SetType,
  PRRecord,
  ID,
} from '@/types';
import { calculateSetVolume } from '@/domain/calc';
import { checkSetPRs } from '@/domain/prs';
import { addMuscleSets } from '@/domain/muscles';

/**
 * Starts a new active workout.
 */
export async function startWorkout(
  name: string = 'Afternoon Workout',
  planId?: ID,
  scheduledDate?: string
): Promise<Workout> {
  // Ensure only one in_progress workout exists
  const existing = await db.workouts.where('status').equals('in_progress').first();
  if (existing) {
    return existing;
  }

  const now = Date.now();
  const todayStr = new Date().toISOString().slice(0, 10);
  const workout: Workout = {
    id: crypto.randomUUID(),
    name,
    status: 'in_progress',
    startedAt: now,
    localDate: todayStr,
    planId,
    scheduledDate,
    createdAt: now,
    updatedAt: now,
  };

  await db.workouts.add(workout);
  return workout;
}

/**
 * Retrieves the currently active workout, if any.
 */
export async function getActiveWorkout(): Promise<Workout | undefined> {
  return await db.workouts.where('status').equals('in_progress').first();
}

/**
 * Adds an exercise to an active workout.
 */
export async function addExerciseToWorkout(
  workoutId: ID,
  exerciseId: ID
): Promise<WorkoutExercise> {
  const existingExercises = await db.workoutExercises
    .where('workoutId')
    .equals(workoutId)
    .toArray();
  const nextOrder = existingExercises.length + 1;
  const now = Date.now();

  const workoutExercise: WorkoutExercise = {
    id: crypto.randomUUID(),
    workoutId,
    exerciseId,
    order: nextOrder,
    createdAt: now,
    updatedAt: now,
  };

  await db.workoutExercises.add(workoutExercise);

  // Check previous performance for this exercise to prefill first set
  const prevSets = await getPreviousPerformanceSets(exerciseId);
  const defaultWeight = prevSets.length > 0 ? prevSets[0].weightKg : undefined;
  const defaultReps = prevSets.length > 0 ? prevSets[0].reps : undefined;

  // Add initial uncompleted set
  await addSetToExercise(workoutExercise.id, exerciseId, workoutId, defaultWeight, defaultReps);

  return workoutExercise;
}

/**
 * Removes an exercise and its sets from the workout.
 */
export async function removeWorkoutExercise(workoutExerciseId: ID): Promise<void> {
  await db.transaction('rw', [db.workoutExercises, db.sets], async () => {
    await db.sets.where('workoutExerciseId').equals(workoutExerciseId).delete();
    await db.workoutExercises.delete(workoutExerciseId);
  });
}

/**
 * Adds a set to a workout exercise.
 */
export async function addSetToExercise(
  workoutExerciseId: ID,
  exerciseId: ID,
  workoutId: ID,
  prefillWeight?: number,
  prefillReps?: number
): Promise<SetEntry> {
  const existingSets = await db.sets
    .where('workoutExerciseId')
    .equals(workoutExerciseId)
    .toArray();
  const nextOrder = existingSets.length + 1;
  const now = Date.now();

  // If no prefill passed, try to copy the previous set's weight/reps
  let weight = prefillWeight;
  let reps = prefillReps;
  if (weight === undefined && existingSets.length > 0) {
    const last = existingSets[existingSets.length - 1];
    weight = last.weightKg;
    reps = last.reps;
  }

  const setEntry: SetEntry = {
    id: crypto.randomUUID(),
    workoutId,
    workoutExerciseId,
    exerciseId,
    order: nextOrder,
    type: 'working',
    weightKg: weight,
    reps: reps,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.sets.add(setEntry);
  return setEntry;
}

/**
 * Updates a set entry.
 */
export async function updateSet(setId: ID, changes: Partial<SetEntry>): Promise<void> {
  await db.sets.update(setId, {
    ...changes,
    updatedAt: Date.now(),
  });
}

/**
 * Marks a set completed or uncompleted.
 * Returns PR detection result if newly completed.
 */
export async function toggleSetCompleted(
  setId: ID,
  completed: boolean
): Promise<{ prRecords: PRRecord[] }> {
  const set = await db.sets.get(setId);
  if (!set) return { prRecords: [] };

  const now = Date.now();
  if (!completed) {
    await db.sets.update(setId, {
      completed: false,
      completedAt: undefined,
      updatedAt: now,
    });
    return { prRecords: [] };
  }

  // Completing set: set completedAt
  const updatedSet: SetEntry = {
    ...set,
    completed: true,
    completedAt: now,
    updatedAt: now,
  };
  await db.sets.put(updatedSet);

  // PR Detection
  const priorSets = await db.sets
    .where('[exerciseId+completedAt]')
    .between([set.exerciseId, 0], [set.exerciseId, now - 1])
    .toArray();

  const settingsRec = await db.settings.get('e1rmFormula');
  const formula = settingsRec?.value === 'brzycki' ? 'brzycki' : 'epley';
  const prResult = checkSetPRs(updatedSet, priorSets, formula);

  return { prRecords: prResult.records };
}

/**
 * Deletes a set row.
 */
export async function deleteSet(setId: ID): Promise<void> {
  await db.sets.delete(setId);
}

/**
 * Gets previous performance sets from the most recent completed workout for an exercise.
 */
export async function getPreviousPerformanceSets(exerciseId: ID): Promise<SetEntry[]> {
  const completedSets = await db.sets
    .where('[exerciseId+completedAt]')
    .between([exerciseId, 0], [exerciseId, Date.now()])
    .reverse()
    .toArray();

  if (completedSets.length === 0) return [];

  // Find most recent workout id that isn't the active one
  const latestWorkoutId = completedSets[0].workoutId;
  return completedSets.filter((s) => s.workoutId === latestWorkoutId);
}

/**
 * Computes finish summary for the workout.
 */
export async function computeWorkoutSummary(workoutId: ID): Promise<WorkoutSummary> {
  const workout = await db.workouts.get(workoutId);
  const workoutSets = await db.sets.where('workoutId').equals(workoutId).toArray();
  const completedSets = workoutSets.filter((s) => s.completed);

  const durationSec = workout ? Math.max(0, Math.floor((Date.now() - workout.startedAt) / 1000)) : 0;
  let totalVolumeKg = 0;
  let totalReps = 0;
  let workingSets = 0;
  let warmupSets = 0;
  const uniqueExerciseIds = new Set<ID>();
  let muscleSetsAcc: Partial<Record<Muscle, number>> = {};
  const prs: PRRecord[] = [];

  // Get all exercise details for muscle attribution
  const exerciseMap = new Map();
  const allExercises = await db.exercises.toArray();
  for (const ex of allExercises) {
    exerciseMap.set(ex.id, ex);
  }

  for (const set of completedSets) {
    const ex = exerciseMap.get(set.exerciseId);
    if (!ex) continue;

    uniqueExerciseIds.add(set.exerciseId);

    if (set.type === 'warmup') {
      warmupSets++;
    } else {
      workingSets++;
      totalReps += set.reps || 0;
      const vol = calculateSetVolume(
        ex.trackingType,
        set.type,
        set.weightKg,
        set.reps,
        workout?.bodyweightKg || 0
      );
      totalVolumeKg += vol;

      // Muscle sets: 1.0 for primary, 0.5 for secondary
      muscleSetsAcc = addMuscleSets(muscleSetsAcc, ex.primaryMuscle, ex.secondaryMuscles);
    }
  }

  return {
    durationSec,
    totalVolumeKg: Math.round(totalVolumeKg),
    totalReps,
    workingSets,
    warmupSets,
    exerciseCount: uniqueExerciseIds.size,
    muscleSets: muscleSetsAcc,
    prs,
  };
}

/**
 * Finishes an active workout and computes its summary.
 */
export async function finishWorkout(
  workoutId: ID,
  notes?: string,
  mood?: 1 | 2 | 3 | 4 | 5,
  energy?: 1 | 2 | 3 | 4 | 5
): Promise<WorkoutSummary> {
  const summary = await computeWorkoutSummary(workoutId);
  const now = Date.now();

  await db.workouts.update(workoutId, {
    status: 'completed',
    endedAt: now,
    notes,
    mood,
    energy,
    summary,
    updatedAt: now,
  });

  return summary;
}

/**
 * Discards an in_progress workout and cleans up its rows.
 */
export async function discardWorkout(workoutId: ID): Promise<void> {
  await db.transaction('rw', [db.workouts, db.workoutExercises, db.sets], async () => {
    await db.sets.where('workoutId').equals(workoutId).delete();
    await db.workoutExercises.where('workoutId').equals(workoutId).delete();
    await db.workouts.delete(workoutId);
  });
}
