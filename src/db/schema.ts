import Dexie, { type Table } from 'dexie';
import {
  Exercise,
  Plan,
  Program,
  ScheduleOverride,
  Workout,
  WorkoutExercise,
  SetEntry,
  BodyMetric,
  AppSettings,
} from '@/types';
import { SEEDED_EXERCISES } from './seed/exercises';

export interface SettingRecord {
  key: string;
  value: any;
}

export const DEFAULT_SETTINGS: AppSettings = {
  unit: 'kg',
  theme: 'dark',
  defaultRestSec: 90,
  roundingIncrement: 2.5,
  e1rmFormula: 'epley',
  includeBodyweightInVolume: false,
  wakeLockEnabled: true,
  soundEnabled: true,
  vibrateEnabled: true,
  seedVersion: 1,
  backupReminderDays: 14,
  weekStart: 'monday',
};

export class GymLogDB extends Dexie {
  exercises!: Table<Exercise, string>;
  plans!: Table<Plan, string>;
  programs!: Table<Program, string>;
  scheduleOverrides!: Table<ScheduleOverride, string>;
  workouts!: Table<Workout, string>;
  workoutExercises!: Table<WorkoutExercise, string>;
  sets!: Table<SetEntry, string>;
  bodyMetrics!: Table<BodyMetric, string>;
  settings!: Table<SettingRecord, string>;

  constructor() {
    super('GymLogDB');

    this.version(1).stores({
      exercises: 'id, name, primaryMuscle, equipment, isArchived, isFavorite',
      plans: 'id, name, updatedAt',
      programs: 'id, isActive',
      scheduleOverrides: 'date',
      workouts: 'id, status, localDate, startedAt, planId',
      workoutExercises: 'id, workoutId, exerciseId',
      sets: 'id, workoutId, workoutExerciseId, exerciseId, [exerciseId+completedAt]',
      bodyMetrics: 'id, [type+date]',
      settings: 'key',
    });
  }

  async initializeSeedAndSettings() {
    // Check if exercises are already seeded
    const exerciseCount = await this.exercises.count();
    if (exerciseCount === 0) {
      console.log('Seeding initial 200 exercises...');
      await this.exercises.bulkPut(SEEDED_EXERCISES);
    }

    // Check settings
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await this.settings.get(k);
      if (!existing) {
        await this.settings.put({ key: k, value: v });
      }
    }
  }
}

export const db = new GymLogDB();
