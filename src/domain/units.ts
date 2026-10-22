import { roundToIncrement } from './calc';

export const KG_TO_LB = 2.20462262185;

export function kgToLb(kg: number): number {
  return kg * KG_TO_LB;
}

export function lbToKg(lb: number): number {
  return lb / KG_TO_LB;
}

/**
 * Converts a stored canonical kg weight to display weight in the target unit.
 */
export function toDisplayWeight(weightKg: number | undefined, unit: 'kg' | 'lb'): number {
  if (weightKg === undefined || weightKg === null) return 0;
  if (unit === 'lb') {
    return Math.round(kgToLb(weightKg) * 10) / 10;
  }
  return Math.round(weightKg * 10) / 10;
}

/**
 * Converts user-entered weight into canonical kg for storage.
 */
export function toCanonicalKg(enteredWeight: number, unit: 'kg' | 'lb'): number {
  if (enteredWeight === undefined || enteredWeight === null) return 0;
  if (unit === 'lb') {
    return lbToKg(enteredWeight);
  }
  return enteredWeight;
}

/**
 * Formats a weight with unit suffix, e.g. "80 kg" or "175 lb".
 */
export function formatWeight(weightKg: number | undefined, unit: 'kg' | 'lb'): string {
  if (weightKg === undefined || weightKg === null) return `0 ${unit}`;
  const disp = toDisplayWeight(weightKg, unit);
  return `${disp} ${unit}`;
}
