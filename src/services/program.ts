import { db } from '@/db/schema';
import { Program, ScheduleOverride, ID } from '@/types';

export const SEEDED_PROGRAM: Program = {
  id: 'prog_ppl_weekly',
  name: 'Push Pull Legs (PPL) Split',
  kind: 'weekly',
  cycleLength: 7,
  startDate: new Date().toISOString().slice(0, 10),
  isActive: true,
  days: [
    { dayIndex: 0, planIds: ['plan_push_a'], label: 'Push Day' }, // Mon
    { dayIndex: 1, planIds: ['plan_pull_a'], label: 'Pull Day' }, // Tue
    { dayIndex: 2, planIds: ['plan_leg_a'], label: 'Leg Day' },   // Wed
    { dayIndex: 3, planIds: [], label: 'Active Recovery' },       // Thu
    { dayIndex: 4, planIds: ['plan_upper_power'], label: 'Upper Power' }, // Fri
    { dayIndex: 5, planIds: ['plan_leg_a'], label: 'Lower Volume' },      // Sat
    { dayIndex: 6, planIds: [], label: 'Full Rest' },            // Sun
  ],
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

/**
 * Initializes default program if none exist.
 */
export async function initializeDefaultProgram() {
  const count = await db.programs.count();
  if (count === 0) {
    await db.programs.add(SEEDED_PROGRAM);
  }
}

/**
 * Gets currently active program.
 */
export async function getActiveProgram(): Promise<Program | undefined> {
  return await db.programs.where('isActive').equals(1 as any).first();
}

/**
 * Sets a program as active and archives/deactivates others.
 */
export async function setActiveProgram(programId: ID): Promise<void> {
  await db.transaction('rw', db.programs, async () => {
    const all = await db.programs.toArray();
    for (const p of all) {
      await db.programs.update(p.id, { isActive: p.id === programId });
    }
  });
}

/**
 * Creates or updates a schedule override for a specific date (Skip or Replace).
 */
export async function setScheduleOverride(
  dateStr: string,
  action: 'skip' | 'replace',
  planIds?: ID[]
): Promise<void> {
  await db.scheduleOverrides.put({
    date: dateStr,
    action,
    planIds,
  });
}

/**
 * Removes a schedule override.
 */
export async function removeScheduleOverride(dateStr: string): Promise<void> {
  await db.scheduleOverrides.delete(dateStr);
}
