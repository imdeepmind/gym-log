import { describe, it, expect } from 'vitest';
import { calculateE1RM, calculateSetVolume, roundToIncrement } from './calc';
import { addMuscleSets } from './muscles';

describe('calculateE1RM', () => {
  it('returns weight when reps = 1', () => {
    expect(calculateE1RM(100, 1)).toBe(100);
  });

  it('calculates Epley formula correctly', () => {
    // 100 * (1 + 10 / 30) = 133.333...
    const e1rm = calculateE1RM(100, 10, 'epley');
    expect(Math.round(e1rm * 10) / 10).toBe(133.3);
  });

  it('calculates Brzycki formula correctly', () => {
    // 100 * (36 / (37 - 10)) = 100 * (36 / 27) = 133.333...
    const e1rm = calculateE1RM(100, 10, 'brzycki');
    expect(Math.round(e1rm * 10) / 10).toBe(133.3);
  });

  it('returns 0 for reps above 12 per spec', () => {
    expect(calculateE1RM(100, 15)).toBe(0);
  });
});

describe('calculateSetVolume', () => {
  it('calculates weight_reps volume as weight * reps', () => {
    const vol = calculateSetVolume('weight_reps', 'working', 80, 10);
    expect(vol).toBe(800);
  });

  it('excludes warmups by default', () => {
    const vol = calculateSetVolume('weight_reps', 'warmup', 80, 10);
    expect(vol).toBe(0);
  });

  it('handles bodyweight_reps without and with bodyweight', () => {
    expect(calculateSetVolume('bodyweight_reps', 'working', 0, 15, 75, false)).toBe(0);
    expect(calculateSetVolume('bodyweight_reps', 'working', 0, 15, 75, true)).toBe(1125);
  });

  it('handles weighted_bodyweight', () => {
    // Added 20kg, 5 reps
    expect(calculateSetVolume('weighted_bodyweight', 'working', 20, 5, 80, false)).toBe(100);
    // With bodyweight (80+20) * 5 = 500
    expect(calculateSetVolume('weighted_bodyweight', 'working', 20, 5, 80, true)).toBe(500);
  });

  it('returns 0 for assisted_bodyweight, duration, and distance_time', () => {
    expect(calculateSetVolume('assisted_bodyweight', 'working', 20, 10)).toBe(0);
    expect(calculateSetVolume('duration', 'working', 0, 0)).toBe(0);
    expect(calculateSetVolume('distance_time', 'working', 0, 0)).toBe(0);
  });
});

describe('roundToIncrement', () => {
  it('rounds to nearest 2.5 kg', () => {
    expect(roundToIncrement(81.5, 2.5)).toBe(82.5);
    expect(roundToIncrement(80.5, 2.5)).toBe(80);
    expect(roundToIncrement(82.0, 2.5)).toBe(82.5);
  });

  it('rounds to nearest 5 lb', () => {
    expect(roundToIncrement(177, 5)).toBe(175);
    expect(roundToIncrement(178, 5)).toBe(180);
  });
});

describe('addMuscleSets', () => {
  it('attributes 1.0 to primary muscle and 0.5 to secondary muscles', () => {
    let acc: Partial<Record<string, number>> = {};
    // Bench press: chest (primary), triceps & shoulders (secondary)
    acc = addMuscleSets(acc, 'chest', ['triceps', 'shoulders']);
    acc = addMuscleSets(acc, 'chest', ['triceps', 'shoulders']);
    acc = addMuscleSets(acc, 'chest', ['triceps', 'shoulders']);

    expect(acc['chest']).toBe(3.0);
    expect(acc['triceps']).toBe(1.5);
    expect(acc['shoulders']).toBe(1.5);
  });
});


