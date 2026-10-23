import { z } from 'zod';
import { db } from '@/db/schema';
import { BackupFile, Exercise, Workout, SetEntry } from '@/types';

export const CURRENT_SCHEMA_VERSION = 1;
export const APP_VERSION = '0.1.0';

const backupSchema = z.object({
  format: z.union([z.literal('workout-backup'), z.literal('gymlog-backup')]),
  schemaVersion: z.number().max(CURRENT_SCHEMA_VERSION),
  appVersion: z.string(),
  exportedAt: z.string(),
  settings: z.record(z.unknown()).optional(),
  data: z.object({
    exercises: z.array(z.any()).default([]),
    plans: z.array(z.any()).default([]),
    programs: z.array(z.any()).default([]),
    scheduleOverrides: z.array(z.any()).default([]),
    workouts: z.array(z.any()).default([]),
    workoutExercises: z.array(z.any()).default([]),
    sets: z.array(z.any()).default([]),
    bodyMetrics: z.array(z.any()).default([]),
  }),
});

/**
 * Generates and downloads a complete JSON backup of Workout.
 */
export async function exportJSONBackup(): Promise<BackupFile> {
  // Export only custom exercises or modified exercises
  const allExercises = await db.exercises.toArray();
  const customOrFavExercises = allExercises.filter(
    (e) => e.isCustom || e.isFavorite || e.isArchived
  );

  const [
    plans,
    programs,
    scheduleOverrides,
    workouts,
    workoutExercises,
    sets,
    bodyMetrics,
    settingsRecords,
  ] = await Promise.all([
    db.plans.toArray(),
    db.programs.toArray(),
    db.scheduleOverrides.toArray(),
    db.workouts.toArray(),
    db.workoutExercises.toArray(),
    db.sets.toArray(),
    db.bodyMetrics.toArray(),
    db.settings.toArray(),
  ]);

  const settingsMap: Record<string, unknown> = {};
  for (const s of settingsRecords) {
    settingsMap[s.key] = s.value;
  }

  const backup: BackupFile = {
    format: 'workout-backup',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: settingsMap,
    data: {
      exercises: customOrFavExercises,
      plans,
      programs,
      scheduleOverrides,
      workouts,
      workoutExercises,
      sets,
      bodyMetrics,
    },
  };

  // Record last backup timestamp
  await db.settings.put({ key: 'lastBackupAt', value: backup.exportedAt });

  return backup;
}

/**
 * Triggers a browser file download of the backup.
 */
export function downloadBackupFile(backup: BackupFile) {
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workout-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ImportPreview {
  valid: boolean;
  error?: string;
  counts: {
    exercises: number;
    plans: number;
    programs: number;
    workouts: number;
    sets: number;
    bodyMetrics: number;
  };
  exportedAt: string;
  backup: BackupFile;
}

/**
 * Validates a backup JSON string or object.
 */
export function validateBackupFile(fileContent: string): ImportPreview {
  try {
    const raw = JSON.parse(fileContent);
    const parsed = backupSchema.parse(raw);

    return {
      valid: true,
      exportedAt: parsed.exportedAt,
      counts: {
        exercises: parsed.data.exercises.length,
        plans: parsed.data.plans.length,
        programs: parsed.data.programs.length,
        workouts: parsed.data.workouts.length,
        sets: parsed.data.sets.length,
        bodyMetrics: parsed.data.bodyMetrics.length,
      },
      backup: parsed as BackupFile,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err?.message || 'Invalid backup file format',
      counts: { exercises: 0, plans: 0, programs: 0, workouts: 0, sets: 0, bodyMetrics: 0 },
      exportedAt: '',
      backup: {} as any,
    };
  }
}

/**
 * Imports a verified backup with either 'merge' or 'replace' strategy inside a single transaction.
 */
export async function executeImport(
  backup: BackupFile,
  strategy: 'merge' | 'replace'
): Promise<void> {
  const data = backup.data;

  await db.transaction(
    'rw',
    [
      db.exercises,
      db.plans,
      db.programs,
      db.scheduleOverrides,
      db.workouts,
      db.workoutExercises,
      db.sets,
      db.bodyMetrics,
      db.settings,
    ],
    async () => {
      if (strategy === 'replace') {
        // Clear all tables except keep seeded exercises intact
        await Promise.all([
          db.plans.clear(),
          db.programs.clear(),
          db.scheduleOverrides.clear(),
          db.workouts.clear(),
          db.workoutExercises.clear(),
          db.sets.clear(),
          db.bodyMetrics.clear(),
        ]);
        // Put all data
        if (data.exercises.length > 0) await db.exercises.bulkPut(data.exercises);
        if (data.plans.length > 0) await db.plans.bulkPut(data.plans);
        if (data.programs.length > 0) await db.programs.bulkPut(data.programs);
        if (data.scheduleOverrides.length > 0) await db.scheduleOverrides.bulkPut(data.scheduleOverrides);
        if (data.workouts.length > 0) await db.workouts.bulkPut(data.workouts);
        if (data.workoutExercises.length > 0) await db.workoutExercises.bulkPut(data.workoutExercises);
        if (data.sets.length > 0) await db.sets.bulkPut(data.sets);
        if (data.bodyMetrics.length > 0) await db.bodyMetrics.bulkPut(data.bodyMetrics);
      } else {
        // Merge: match by id, keep the one with larger updatedAt
        const mergeTable = async (table: any, incomingItems: any[]) => {
          for (const item of incomingItems) {
            const existing = await table.get(item.id);
            if (!existing || (item.updatedAt || 0) >= (existing.updatedAt || 0)) {
              await table.put(item);
            }
          }
        };

        await mergeTable(db.exercises, data.exercises);
        await mergeTable(db.plans, data.plans);
        await mergeTable(db.programs, data.programs);
        await mergeTable(db.scheduleOverrides, data.scheduleOverrides);
        await mergeTable(db.workouts, data.workouts);
        await mergeTable(db.workoutExercises, data.workoutExercises);
        await mergeTable(db.sets, data.sets);
        await mergeTable(db.bodyMetrics, data.bodyMetrics);
      }

      // Restore settings
      if (backup.settings) {
        for (const [key, value] of Object.entries(backup.settings)) {
          await db.settings.put({ key, value });
        }
      }
    }
  );
}
