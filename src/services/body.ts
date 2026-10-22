import { db } from '@/db/schema';
import { BodyMetric } from '@/types';

export const BODY_METRIC_TYPES = [
  { id: 'bodyweight', label: 'Bodyweight', unit: 'kg' },
  { id: 'body_fat', label: 'Body Fat', unit: '%' },
  { id: 'waist', label: 'Waist', unit: 'cm' },
  { id: 'chest', label: 'Chest', unit: 'cm' },
  { id: 'arm', label: 'Biceps', unit: 'cm' },
  { id: 'forearms', label: 'Forearms', unit: 'cm' },
  { id: 'shoulders', label: 'Shoulders', unit: 'cm' },
  { id: 'thigh', label: 'Thighs', unit: 'cm' },
  { id: 'calves', label: 'Calves', unit: 'cm' },
  { id: 'hips', label: 'Hips', unit: 'cm' },
  { id: 'neck', label: 'Neck', unit: 'cm' },
] as const;

export type MetricType = typeof BODY_METRIC_TYPES[number]['id'] | 'biceps';

export async function addBodyMetric(
  type: MetricType,
  value: number,
  date: string = new Date().toISOString().slice(0, 10)
): Promise<BodyMetric> {
  const now = Date.now();
  const metric: BodyMetric = {
    id: `bm_${Date.now()}`,
    type,
    value: Math.round(value * 10) / 10,
    date,
    createdAt: now,
    updatedAt: now,
  };

  await db.bodyMetrics.add(metric);
  return metric;
}

export async function deleteBodyMetric(id: string): Promise<void> {
  await db.bodyMetrics.delete(id);
}
