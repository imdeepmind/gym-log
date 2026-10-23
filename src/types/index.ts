export type ID = string;

export type Muscle =
  | 'chest'
  | 'upper_back'
  | 'lats'
  | 'lower_back'
  | 'traps'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'adductors'
  | 'abductors'
  | 'cardio';

export type TrackingType =
  | 'weight_reps'
  | 'bodyweight_reps'
  | 'weighted_bodyweight'
  | 'assisted_bodyweight'
  | 'duration'
  | 'distance_time';

export type SetType = 'warmup' | 'working' | 'drop' | 'failure';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other';

export interface Base {
  id: ID;
  createdAt: number;
  updatedAt: number;
}

export interface Exercise extends Base {
  name: string;
  trackingType: TrackingType;
  primaryMuscle: Muscle;
  secondaryMuscles: Muscle[];
  equipment: Equipment;
  isCustom: boolean; // false = seeded
  isFavorite: boolean;
  isArchived: boolean;
  defaultRestSec?: number;
}

export type ProgressionRule =
  | {
      kind: 'linear';
      incrementKg: number;
      frequency: 'session' | 'week';
      requireAllSetsCompleted: boolean;
    }
  | {
      kind: 'double';
      repMin: number;
      repMax: number;
      incrementKg: number;
    };

export interface DeloadRule {
  everyNWeeks: number;
  percent: number;
}

export interface PlanExercise {
  id: ID;
  exerciseId: ID;
  order: number;
  supersetGroup?: number;
  targetSets: number;
  repMin?: number;
  repMax?: number;
  targetWeightKg?: number;
  restSec?: number;
  notes?: string;
  progression?: ProgressionRule;
}

export interface Plan extends Base {
  name: string;
  notes?: string;
  isArchived: boolean;
  exercises: PlanExercise[];
}

export interface ProgramDay {
  dayIndex: number;
  planIds: ID[];
  label?: string;
}

export interface Program extends Base {
  name: string;
  kind: 'weekly' | 'cycle';
  cycleLength: number; // 7 for weekly
  days: ProgramDay[];
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  isActive: boolean;
  deload?: DeloadRule;
}

export interface ScheduleOverride {
  date: string; // YYYY-MM-DD
  action: 'skip' | 'replace';
  planIds?: ID[];
}

export type PRKind = 'max_weight' | 'max_e1rm' | 'rep_pr' | 'best_volume';

export interface PRRecord {
  exerciseId: ID;
  kind: PRKind;
  value: number;
  reps?: number;
  weightKg?: number;
  previousValue?: number;
}

export interface WorkoutSummary {
  durationSec: number;
  totalVolumeKg: number;
  totalReps: number;
  workingSets: number;
  warmupSets: number;
  exerciseCount: number;
  muscleSets: Partial<Record<Muscle, number>>;
  prs: PRRecord[];
}

export interface Workout extends Base {
  name: string;
  status: 'in_progress' | 'completed';
  startedAt: number;
  endedAt?: number;
  localDate: string; // YYYY-MM-DD
  planId?: ID;
  programId?: ID;
  scheduledDate?: string;
  bodyweightKg?: number;
  notes?: string;
  mood?: 1 | 2 | 3 | 4 | 5;
  energy?: 1 | 2 | 3 | 4 | 5;
  summary?: WorkoutSummary;
}

export interface WorkoutExercise extends Base {
  workoutId: ID;
  exerciseId: ID;
  order: number;
  supersetGroup?: number;
  restSec?: number;
  notes?: string;
}

export interface SetEntry extends Base {
  workoutId: ID;
  workoutExerciseId: ID;
  exerciseId: ID;
  order: number;
  type: SetType;
  weightKg?: number;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
  rpe?: number;
  rir?: number;
  notes?: string;
  completed: boolean;
  completedAt?: number;
}

export interface BodyMetric extends Base {
  type:
    | 'bodyweight'
    | 'body_fat'
    | 'chest'
    | 'waist'
    | 'hips'
    | 'arm'
    | 'biceps'
    | 'forearms'
    | 'thigh'
    | 'calves'
    | 'shoulders'
    | 'neck';
  date: string; // YYYY-MM-DD
  value: number;
}

export interface AppSettings {
  unit: 'kg' | 'lb';
  theme: 'dark' | 'light' | 'system';
  defaultRestSec: number;
  roundingIncrement: number; // e.g. 2.5 kg or 5 lb
  e1rmFormula: 'epley' | 'brzycki';
  includeBodyweightInVolume: boolean;
  wakeLockEnabled: boolean;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  lastBackupAt?: string;
  backupReminderDays: number;
  seedVersion: number;
  weekStart: 'monday' | 'sunday';
}

export interface BackupFile {
  format: 'workout-backup' | 'gymlog-backup';
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  settings: Partial<AppSettings>;
  data: {
    exercises: Exercise[];
    plans: Plan[];
    programs: Program[];
    scheduleOverrides: ScheduleOverride[];
    workouts: Workout[];
    workoutExercises: WorkoutExercise[];
    sets: SetEntry[];
    bodyMetrics: BodyMetric[];
  };
}
