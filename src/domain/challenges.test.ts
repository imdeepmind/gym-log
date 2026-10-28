import { describe, it, expect } from 'vitest';
import {
  getDefaultMonthlyChallengeIds,
  generateRandomMonthlyChallengeIds,
  resolveMonthlyChallenges,
  CHALLENGE_DEFINITIONS,
  POOL_1,
  POOL_2,
  POOL_3,
} from './challenges';
import { Workout, SetEntry, Exercise } from '@/types';

describe('Monthly Challenges Domain', () => {
  it('has valid definitions in Pool 1, Pool 2, and Pool 3', () => {
    expect(POOL_1.length).toBeGreaterThanOrEqual(3);
    expect(POOL_2.length).toBeGreaterThanOrEqual(5);
    expect(POOL_3.length).toBeGreaterThanOrEqual(4);

    for (const def of CHALLENGE_DEFINITIONS) {
      expect(def.id).toBeTruthy();
      expect(def.title).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.baseTarget).toBeGreaterThan(0);
    }
  });

  it('deterministically selects 1 challenge from each pool for a given month', () => {
    const idsOct = getDefaultMonthlyChallengeIds('2026-10');
    const idsOctAgain = getDefaultMonthlyChallengeIds('2026-10');
    const idsNov = getDefaultMonthlyChallengeIds('2026-11');

    expect(idsOct).toEqual(idsOctAgain);
    expect(idsOct).toHaveLength(3);

    const defMap = new Map(CHALLENGE_DEFINITIONS.map((c) => [c.id, c]));
    expect(defMap.get(idsOct[0])?.pool).toBe(1);
    expect(defMap.get(idsOct[1])?.pool).toBe(2);
    expect(defMap.get(idsOct[2])?.pool).toBe(3);
  });

  it('calculates progress and completion correctly for workout frequency and volume', () => {
    const exerciseMap = new Map<string, Exercise>([
      [
        'ex_bench',
        {
          id: 'ex_bench',
          name: 'Barbell Bench Press',
          primaryMuscle: 'chest',
          secondaryMuscles: ['shoulders', 'triceps'],
          equipment: 'barbell',
          trackingType: 'weight_reps',
          isCustom: false,
          isFavorite: false,
          isArchived: false,
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      [
        'ex_squat',
        {
          id: 'ex_squat',
          name: 'Barbell Squat',
          primaryMuscle: 'quads',
          secondaryMuscles: ['glutes', 'hamstrings'],
          equipment: 'barbell',
          trackingType: 'weight_reps',
          isCustom: false,
          isFavorite: false,
          isArchived: false,
          createdAt: 0,
          updatedAt: 0,
        },
      ],
    ]);

    const mockWorkouts: Workout[] = [
      {
        id: 'w1',
        name: 'Leg Day',
        status: 'completed',
        startedAt: 1000,
        localDate: '2026-10-05',
        summary: {
          durationSec: 3600,
          totalVolumeKg: 15000,
          totalReps: 120,
          workingSets: 15,
          warmupSets: 3,
          exerciseCount: 4,
          muscleSets: { quads: 6, glutes: 3, hamstrings: 3 },
          prs: [{ exerciseId: 'ex_squat', kind: 'max_weight', value: 140 }],
        },
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 'w2',
        name: 'Leg Day 2',
        status: 'completed',
        startedAt: 2000,
        localDate: '2026-10-12',
        summary: {
          durationSec: 3600,
          totalVolumeKg: 25000,
          totalReps: 150,
          workingSets: 18,
          warmupSets: 2,
          exerciseCount: 5,
          muscleSets: { quads: 8, glutes: 4 },
          prs: [],
        },
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const activeChallenges = resolveMonthlyChallenges(
      ['monthly_workouts_12', 'leg_workouts_6', 'volume_35k'],
      mockWorkouts,
      [],
      exerciseMap,
      'kg'
    );

    expect(activeChallenges).toHaveLength(3);

    // monthly_workouts_12: 2 of 12
    expect(activeChallenges[0].current).toBe(2);
    expect(activeChallenges[0].target).toBe(12);
    expect(activeChallenges[0].progressPercent).toBe(17);
    expect(activeChallenges[0].isCompleted).toBe(false);

    // leg_workouts_6: 2 of 6
    expect(activeChallenges[1].current).toBe(2);
    expect(activeChallenges[1].target).toBe(6);
    expect(activeChallenges[1].progressPercent).toBe(33);
    expect(activeChallenges[1].isCompleted).toBe(false);

    // volume_35k: 40000 of 35000 -> 100% completed!
    expect(activeChallenges[2].current).toBe(40000);
    expect(activeChallenges[2].target).toBe(35000);
    expect(activeChallenges[2].progressPercent).toBe(100);
    expect(activeChallenges[2].isCompleted).toBe(true);
  });
});
