import { describe, it, expect } from 'vitest';
import {
  resolveProgramSlot,
  computeDayState,
  getScheduledPlansForDate,
} from './schedule';
import { Program } from '@/types';

const mockWeeklyProgram: Program = {
  id: 'prog_weekly',
  name: 'PPL Weekly',
  kind: 'weekly',
  cycleLength: 7,
  startDate: '2026-10-01',
  isActive: true,
  days: [
    { dayIndex: 0, planIds: ['plan_push'] }, // Mon
    { dayIndex: 1, planIds: ['plan_pull'] }, // Tue
    { dayIndex: 2, planIds: ['plan_legs'] }, // Wed
    { dayIndex: 3, planIds: [] }, // Thu: Rest
    { dayIndex: 4, planIds: ['plan_upper'] }, // Fri
    { dayIndex: 5, planIds: ['plan_lower'] }, // Sat
    { dayIndex: 6, planIds: [] }, // Sun: Rest
  ],
  createdAt: 1000,
  updatedAt: 1000,
};

describe('resolveProgramSlot', () => {
  it('maps Monday to 0 and Sunday to 6 for weekly program', () => {
    // 2026-10-05 was a Monday
    expect(resolveProgramSlot(mockWeeklyProgram, '2026-10-05')).toBe(0);
    // 2026-10-11 was a Sunday
    expect(resolveProgramSlot(mockWeeklyProgram, '2026-10-11')).toBe(6);
  });
});

describe('getScheduledPlansForDate', () => {
  it('returns scheduled plans on workout days and empty on rest days', () => {
    // 2026-10-05 (Monday) -> Push Plan
    const mondayPlans = getScheduledPlansForDate('2026-10-05', mockWeeklyProgram, []);
    expect(mondayPlans).toEqual(['plan_push']);

    // 2026-10-08 (Thursday) -> Rest
    const thursdayPlans = getScheduledPlansForDate('2026-10-08', mockWeeklyProgram, []);
    expect(thursdayPlans).toEqual([]);
  });

  it('honors schedule overrides to skip a day', () => {
    const plansWithSkip = getScheduledPlansForDate('2026-10-05', mockWeeklyProgram, [
      { date: '2026-10-05', action: 'skip' },
    ]);
    expect(plansWithSkip).toEqual([]);
  });
});

describe('computeDayState', () => {
  it('marks completed when a workout is done on a scheduled day', () => {
    const state = computeDayState(
      '2026-10-05',
      ['plan_push'],
      [{ id: 'w1', localDate: '2026-10-05', status: 'completed' } as any],
      []
    );
    expect(state).toBe('completed');
  });

  it('marks extra when a workout is done on an unscheduled rest day', () => {
    const state = computeDayState(
      '2026-10-08',
      [], // no plans scheduled
      [{ id: 'w2', localDate: '2026-10-08', status: 'completed' } as any],
      []
    );
    expect(state).toBe('extra');
  });
});
