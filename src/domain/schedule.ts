import { Program, ScheduleOverride, Workout, Plan, ID } from '@/types';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  parseISO,
  differenceInCalendarDays,
  getDay,
  isBefore,
  isAfter,
  isToday,
  startOfWeek,
  endOfWeek,
} from 'date-fns';

export type DayState =
  | 'completed'
  | 'completed_late'
  | 'missed'
  | 'rest'
  | 'upcoming'
  | 'extra';

export interface CalendarDayInfo {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  dayOfWeek: number; // 0 = Mon, 6 = Sun
  state: DayState;
  isToday: boolean;
  scheduledPlanIds: ID[];
  completedWorkouts: Workout[];
  isOverridden?: boolean;
}

export interface AdherenceStats {
  weekCompleted: number;
  weekTarget: number;
  streakWeeks: number;
  monthlyAdherencePercent: number;
}

/**
 * Resolves which day slot of a program applies to a given calendar date.
 * - Weekly: Monday = 0, Tuesday = 1, ... Sunday = 6
 * - Cycle: (daysBetween(startDate, date) % cycleLength)
 */
export function resolveProgramSlot(program: Program, dateStr: string): number {
  const targetDate = parseISO(dateStr);

  if (program.kind === 'weekly') {
    // date-fns getDay(): Sunday = 0, Monday = 1, ... Saturday = 6
    const d = getDay(targetDate);
    return d === 0 ? 6 : d - 1; // 0 = Mon, 6 = Sun
  }

  // Cycle program
  const startDate = parseISO(program.startDate);
  const diffDays = differenceInCalendarDays(targetDate, startDate);
  if (diffDays < 0) return 0;
  return diffDays % (program.cycleLength || 7);
}

/**
 * Determines the scheduled plans for a specific date considering overrides.
 */
export function getScheduledPlansForDate(
  dateStr: string,
  program: Program | undefined,
  overrides: ScheduleOverride[]
): ID[] {
  // Check override first
  const override = overrides.find((o) => o.date === dateStr);
  if (override) {
    if (override.action === 'skip') return [];
    if (override.action === 'replace' && override.planIds) return override.planIds;
  }

  if (!program || !program.isActive) return [];

  // Check if date is within program start and optional end
  if (isBefore(parseISO(dateStr), parseISO(program.startDate))) {
    return [];
  }
  if (program.endDate && isAfter(parseISO(dateStr), parseISO(program.endDate))) {
    return [];
  }

  const slotIndex = resolveProgramSlot(program, dateStr);
  const dayConfig = program.days.find((d) => d.dayIndex === slotIndex);
  return dayConfig ? dayConfig.planIds : [];
}

/**
 * Computes calendar day state according to Section 10 pseudocode:
 * - Completed: Scheduled day with at least one completed workout on that date.
 * - Completed Late: Scheduled day with no workout on date, but workout whose scheduledDate equals that date.
 * - Missed: Before today, on or after Program startDate, scheduled, not skipped, not done.
 * - Rest: Slot has no plans or override skipped it.
 * - Upcoming: Today or later, scheduled, not yet done.
 * - Extra: Workout logged on an unscheduled day.
 */
export function computeDayState(
  dateStr: string,
  scheduledPlanIds: ID[],
  completedWorkouts: Workout[],
  allCompletedWorkouts: Workout[],
  programStartDate?: string
): DayState {
  const isPast = isBefore(parseISO(dateStr), parseISO(format(new Date(), 'yyyy-MM-dd')));
  const isCurrentDay = dateStr === format(new Date(), 'yyyy-MM-dd');

  const doneToday = completedWorkouts.filter((w) => w.localDate === dateStr);
  const lateDone = allCompletedWorkouts.some(
    (w) => w.scheduledDate === dateStr && w.localDate !== dateStr
  );

  const hasScheduledPlans = scheduledPlanIds.length > 0;

  if (!hasScheduledPlans) {
    return doneToday.length > 0 ? 'extra' : 'rest';
  }

  if (doneToday.length > 0) {
    return 'completed';
  }

  if (lateDone) {
    return 'completed_late';
  }

  if (isPast) {
    // Only count as missed if on or after program start date
    if (programStartDate && isBefore(parseISO(dateStr), parseISO(programStartDate))) {
      return 'rest';
    }
    return 'missed';
  }

  // Today or future scheduled day
  return 'upcoming';
}

/**
 * Generates all calendar days for a given month with their derived states.
 */
export function generateMonthCalendar(
  monthDate: Date,
  program: Program | undefined,
  overrides: ScheduleOverride[],
  workouts: Workout[]
): CalendarDayInfo[] {
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const daysInMonth = eachDayOfInterval({ start, end });
  const completedWorkouts = workouts.filter((w) => w.status === 'completed');

  return daysInMonth.map((d) => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayOfWeek = getDay(d) === 0 ? 6 : getDay(d) - 1;
    const scheduledPlanIds = getScheduledPlansForDate(dateStr, program, overrides);
    const dayCompletedWorkouts = completedWorkouts.filter((w) => w.localDate === dateStr);

    const state = computeDayState(
      dateStr,
      scheduledPlanIds,
      dayCompletedWorkouts,
      completedWorkouts,
      program?.startDate
    );

    const isOverridden = overrides.some((o) => o.date === dateStr);

    return {
      dateStr,
      dayNumber: d.getDate(),
      dayOfWeek,
      state,
      isToday: isToday(d),
      scheduledPlanIds,
      completedWorkouts: dayCompletedWorkouts,
      isOverridden,
    };
  });
}

/**
 * Computes adherence statistics for the active program.
 */
export function calculateAdherenceStats(
  calendarDays: CalendarDayInfo[],
  program?: Program
): AdherenceStats {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const thisWeekDays = calendarDays.filter(
    (d) => d.dateStr >= weekStart && d.dateStr <= weekEnd
  );

  const weekTarget = thisWeekDays.filter(
    (d) => d.scheduledPlanIds.length > 0 || d.completedWorkouts.length > 0
  ).length;

  const weekCompleted = thisWeekDays.filter(
    (d) => d.state === 'completed' || d.state === 'extra' || d.state === 'completed_late'
  ).length;

  // Monthly adherence
  const pastScheduledDays = calendarDays.filter(
    (d) => d.dateStr <= todayStr && (d.scheduledPlanIds.length > 0 || d.completedWorkouts.length > 0)
  );

  const pastCompletedDays = pastScheduledDays.filter(
    (d) => d.state === 'completed' || d.state === 'completed_late' || d.state === 'extra'
  );

  const monthlyAdherencePercent =
    pastScheduledDays.length > 0
      ? Math.round((pastCompletedDays.length / pastScheduledDays.length) * 100)
      : 100;

  return {
    weekCompleted,
    weekTarget: Math.max(weekTarget, 1),
    streakWeeks: Math.max(1, Math.floor(pastCompletedDays.length / 3)),
    monthlyAdherencePercent,
  };
}
