import { describe, it, expect } from 'vitest';
import { resolveProgressionTarget } from './progression';
import { PlanExercise, SetEntry } from '@/types';

const mockPlanExercise: PlanExercise = {
  id: 'pe_1',
  exerciseId: 'ex_bench_press',
  order: 1,
  targetSets: 3,
  repMin: 8,
  repMax: 10,
  targetWeightKg: 80,
};

function createMockSet(weightKg: number, reps: number): SetEntry {
  return {
    id: crypto.randomUUID(),
    workoutId: 'w1',
    workoutExerciseId: 'we1',
    exerciseId: 'ex_bench_press',
    order: 1,
    type: 'working',
    weightKg,
    reps,
    completed: true,
    completedAt: 1000,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

describe('resolveProgressionTarget', () => {
  it('applies linear progression increment when all sets completed', () => {
    const exerciseWithLinear: PlanExercise = {
      ...mockPlanExercise,
      progression: {
        kind: 'linear',
        incrementKg: 2.5,
        frequency: 'session',
        requireAllSetsCompleted: true,
      },
    };

    const historySets = [
      createMockSet(80, 8),
      createMockSet(80, 8),
      createMockSet(80, 8),
    ];

    const target = resolveProgressionTarget(exerciseWithLinear, historySets, 1);
    expect(target.weightKg).toBe(82.5);
    expect(target.reason).toContain('Linear progression: +2.5 kg applied');
  });

  it('holds weight on double progression until all sets hit repMax', () => {
    const exerciseWithDouble: PlanExercise = {
      ...mockPlanExercise,
      progression: {
        kind: 'double',
        repMin: 8,
        repMax: 10,
        incrementKg: 2.5,
      },
    };

    // Hit 10, 9, 8 (not all hit 10)
    const historyIncomplete = [
      createMockSet(80, 10),
      createMockSet(80, 9),
      createMockSet(80, 8),
    ];

    const target1 = resolveProgressionTarget(exerciseWithDouble, historyIncomplete, 1);
    expect(target1.weightKg).toBe(80);

    // Hit 10, 10, 10 (all hit 10)
    const historyComplete = [
      createMockSet(80, 10),
      createMockSet(80, 10),
      createMockSet(80, 10),
    ];

    const target2 = resolveProgressionTarget(exerciseWithDouble, historyComplete, 1);
    expect(target2.weightKg).toBe(82.5);
    expect(target2.repMin).toBe(8);
  });

  it('applies program deload reduction on deload weeks', () => {
    const deloadRule = { everyNWeeks: 4, percent: 10 };
    // Week 4 is a deload week
    const target = resolveProgressionTarget(mockPlanExercise, [], 4, deloadRule, 2.5);
    expect(target.isDeload).toBe(true);
    // 80 - 10% = 72 -> rounded to nearest 2.5 = 72.5
    expect(target.weightKg).toBe(72.5);
  });
});
