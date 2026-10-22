import { describe, it, expect } from 'vitest';
import { checkSetPRs } from './prs';
import { SetEntry } from '@/types';

function createMockSet(overrides: Partial<SetEntry>): SetEntry {
  return {
    id: 's_1',
    workoutId: 'w_1',
    workoutExerciseId: 'we_1',
    exerciseId: 'ex_bench_press',
    order: 1,
    type: 'working',
    weightKg: 80,
    reps: 8,
    completed: true,
    completedAt: 1000,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe('checkSetPRs', () => {
  it('does NOT award PR on the first ever set (spec 8.3)', () => {
    const currentSet = createMockSet({ completedAt: 2000 });
    const result = checkSetPRs(currentSet, []); // no prior sets
    expect(result.isPR).toBe(false);
    expect(result.records).toHaveLength(0);
  });

  it('does NOT award PR for warmup sets', () => {
    const priorSet = createMockSet({ weightKg: 80, reps: 8, completedAt: 1000 });
    const currentSet = createMockSet({ type: 'warmup', weightKg: 90, reps: 10, completedAt: 2000 });
    const result = checkSetPRs(currentSet, [priorSet]);
    expect(result.isPR).toBe(false);
  });

  it('awards Max Weight PR when strictly beating earlier max weight', () => {
    const priorSet = createMockSet({ weightKg: 80, reps: 8, completedAt: 1000 });
    const currentSet = createMockSet({ weightKg: 85, reps: 8, completedAt: 2000 });
    const result = checkSetPRs(currentSet, [priorSet]);
    expect(result.isPR).toBe(true);
    expect(result.records.some((r) => r.kind === 'max_weight' && r.value === 85)).toBe(true);
  });

  it('awards Rep PR when hitting more reps at the same weight', () => {
    const priorSet = createMockSet({ weightKg: 80, reps: 8, completedAt: 1000 });
    const currentSet = createMockSet({ weightKg: 80, reps: 10, completedAt: 2000 });
    const result = checkSetPRs(currentSet, [priorSet]);
    expect(result.isPR).toBe(true);
    expect(result.records.some((r) => r.kind === 'rep_pr' && r.value === 10)).toBe(true);
  });

  it('does not award PR when tying prior record', () => {
    const priorSet = createMockSet({ weightKg: 80, reps: 8, completedAt: 1000 });
    const currentSet = createMockSet({ weightKg: 80, reps: 8, completedAt: 2000 });
    const result = checkSetPRs(currentSet, [priorSet]);
    expect(result.isPR).toBe(false);
  });
});
