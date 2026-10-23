import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Plan, Workout } from '@/types';
import {
  generateMonthCalendar,
  calculateAdherenceStats,
  CalendarDayInfo,
  DayState,
} from '@/domain/schedule';
import { startWorkoutFromPlan } from '@/services/plan';
import { setScheduleOverride, removeScheduleOverride } from '@/services/program';
import { ProgramScheduleModal } from '@/components/plans/ProgramScheduleModal';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Play,
  X,
  Plus,
  Flame,
  Award,
  AlertCircle,
} from 'lucide-react';
import { addMonths, subMonths, format } from 'date-fns';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props {
  onStartWorkout: (workout: any) => void;
  className?: string;
}

export function CalendarView({ onStartWorkout, className = '' }: Props) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<CalendarDayInfo | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // Load active program
  const activeProgram = useLiveQuery(
    async () => {
      const all = await db.programs.toArray();
      return all.find((p) => p.isActive);
    },
    [],
    undefined
  );

  // Load schedule overrides
  const overrides = useLiveQuery(() => db.scheduleOverrides.toArray(), [], []);

  // Load all workouts
  const workouts = useLiveQuery(() => db.workouts.toArray(), [], []);

  // Load all plans
  const plans = useLiveQuery(() => db.plans.toArray(), [], []);
  const planMap = useMemo(() => {
    const map = new Map<string, Plan>();
    plans.forEach((p) => map.set(p.id, p));
    return map;
  }, [plans]);

  // Generate calendar days for visible month
  const calendarDays = useMemo(() => {
    return generateMonthCalendar(currentMonth, activeProgram, overrides, workouts);
  }, [currentMonth, activeProgram, overrides, workouts]);

  // Calculate adherence statistics
  const adherence = useMemo(() => {
    return calculateAdherenceStats(calendarDays, activeProgram);
  }, [calendarDays, activeProgram]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleDayClick = (day: CalendarDayInfo) => {
    setSelectedDay(day);
  };

  const handleStartScheduled = async (planId: string) => {
    if (!selectedDay) return;
    const workout = await startWorkoutFromPlan(planId, selectedDay.dateStr);
    setSelectedDay(null);
    onStartWorkout(workout);
  };

  const handleToggleSkip = async () => {
    if (!selectedDay) return;
    if (selectedDay.isOverridden) {
      await removeScheduleOverride(selectedDay.dateStr);
    } else {
      await setScheduleOverride(selectedDay.dateStr, 'skip');
    }
  };

  // State styling helper
  const getDayStyle = (state: DayState, isToday: boolean) => {
    let base = 'hover:border-[#d9083c] transition-all ';
    if (isToday) base += 'ring-2 ring-[#d9083c] ';

    switch (state) {
      case 'completed':
        return base + 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400';
      case 'completed_late':
        return base + 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400';
      case 'missed':
        return base + 'bg-rose-500/10 border-rose-500/40 text-rose-400';
      case 'extra':
        return base + 'bg-purple-500/10 border-purple-500/40 text-purple-400';
      case 'upcoming':
        return base + 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-color)]';
      case 'rest':
      default:
        return base + 'bg-[var(--hover-bg)]/40 border-[var(--border-color)]/50 text-[var(--text-muted)]';
    }
  };

  return (
    <div className={`space-y-4 animate-in fade-in duration-200 ${className}`}>
      {/* Calendar Header with Title, Active Program, and Month Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--border-color)]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#d9083c]" />
            <h3 className="text-lg font-bold text-[var(--text-color)] tracking-tight">
              Calendar & Schedule
            </h3>
            {activeProgram && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#d9083c]/10 text-[#d9083c] border border-[#d9083c]/20">
                {activeProgram.name}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {activeProgram
              ? `Track your programmed training adherence, missed sessions, and completed workouts`
              : `No active program split · All logged workouts appear on this calendar`}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleToday}
            className="btn-secondary text-xs py-1.5 px-2.5"
            title="Jump to current month"
          >
            Today
          </button>

          {/* Month Selector with integrated label */}
          <div className="flex items-center border border-[var(--border-color)] rounded-sm overflow-hidden bg-[var(--card-bg)]">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-color)] hover:bg-[var(--hover-bg)] transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 py-1 font-mono text-xs font-semibold text-[var(--text-color)] whitespace-nowrap min-w-[100px] text-center">
              {format(currentMonth, 'MMM yyyy')}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-color)] hover:bg-[var(--hover-bg)] transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Adherence Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flat-card p-4 flex items-center justify-between sm:block">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>This Week</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[var(--text-color)] mt-1">
              {adherence.weekCompleted}{' '}
              <span className="text-xs text-[var(--text-muted)] font-normal">
                / {adherence.weekTarget} days
              </span>
            </div>
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold sm:mt-1 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block">
            {adherence.weekTarget > 0
              ? Math.round((adherence.weekCompleted / adherence.weekTarget) * 100)
              : 0}% on track
          </div>
        </div>

        <div className="flat-card p-4 flex items-center justify-between sm:block">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center space-x-1.5">
              <Flame className="w-3.5 h-3.5 text-[#d9083c]" />
              <span>Current Streak</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[var(--text-color)] mt-1">
              {adherence.streakWeeks}{' '}
              <span className="text-xs text-[var(--text-muted)] font-normal">
                {adherence.streakWeeks === 1 ? 'week' : 'weeks'}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-[#d9083c] font-semibold sm:mt-1 bg-[#d9083c]/10 px-2 py-0.5 rounded-full inline-block">
            Active adherence
          </div>
        </div>

        <div className="flat-card p-4 flex items-center justify-between sm:block">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center space-x-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Monthly Consistency</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[var(--text-color)] mt-1">
              {adherence.monthlyAdherencePercent}%
            </div>
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold sm:mt-1 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block">
            Consistency score
          </div>
        </div>
      </div>

      {/* Calendar Month Grid */}
      <div className="flat-card p-3 sm:p-4 overflow-hidden">
        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {/* Pad empty days before first day of month if needed */}
          {calendarDays.length > 0 &&
            Array.from({ length: calendarDays[0].dayOfWeek }).map((_, idx) => (
              <div key={`pad_${idx}`} className="h-16 sm:h-20 bg-transparent opacity-20" />
            ))}

          {calendarDays.map((day) => {
            const hasWorkout = day.completedWorkouts.length > 0;

            return (
              <div
                key={day.dateStr}
                onClick={() => handleDayClick(day)}
                className={`h-16 sm:h-20 p-1.5 sm:p-2 border rounded-sm flex flex-col justify-between cursor-pointer ${getDayStyle(
                  day.state,
                  day.isToday
                )}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-xs sm:text-sm font-bold ${
                      day.isToday ? 'text-[#d9083c]' : 'text-[var(--text-color)]'
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                  {day.isToday && (
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 bg-[#d9083c] text-white rounded">
                      Today
                    </span>
                  )}
                </div>

                {/* Day status badge */}
                <div className="text-[10px] font-mono truncate">
                  {day.state === 'completed' && (
                    <span className="text-emerald-400 font-semibold flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-0.5 shrink-0" />
                      <span className="truncate">Done</span>
                    </span>
                  )}
                  {day.state === 'completed_late' && (
                    <span className="text-cyan-400 font-semibold flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-0.5 shrink-0" />
                      <span className="truncate">Late</span>
                    </span>
                  )}
                  {day.state === 'missed' && (
                    <span className="text-rose-400 font-semibold flex items-center">
                      <AlertCircle className="w-3 h-3 mr-0.5 shrink-0" />
                      <span className="truncate">Missed</span>
                    </span>
                  )}
                  {day.state === 'extra' && (
                    <span className="text-purple-400 font-semibold flex items-center">
                      <Plus className="w-3 h-3 mr-0.5 shrink-0" />
                      <span className="truncate">Extra</span>
                    </span>
                  )}
                  {day.state === 'upcoming' && (
                    <span className="text-[var(--text-muted)] font-medium">Due</span>
                  )}
                  {day.state === 'rest' && !hasWorkout && (
                    <span className="text-[var(--text-muted)] opacity-50">Rest</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs text-[var(--text-muted)] pt-1 pb-2">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/20 border border-rose-500" />
          <span>Missed</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-purple-500/20 border border-purple-500" />
          <span>Extra Session</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--card-bg)] border border-[var(--border-color)]" />
          <span>Due / Upcoming</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--hover-bg)]/40 border border-[var(--border-color)]/50" />
          <span>Rest</span>
        </div>
      </div>

      {/* Day Detail Sheet Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] w-full max-w-md rounded-md p-5 text-[var(--text-color)] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <div>
                <h3 className="font-bold text-base text-[var(--text-color)]">{selectedDay.dateStr}</h3>
                <span className="text-xs uppercase font-semibold text-[var(--text-muted)] tracking-wider">
                  State:{' '}
                  <strong className="text-[var(--text-color)] capitalize">
                    {selectedDay.state.replace('_', ' ')}
                  </strong>
                </span>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-color)] rounded-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scheduled Plan on this date */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Scheduled Plan
              </div>
              {selectedDay.scheduledPlanIds.length > 0 ? (
                <div className="space-y-2">
                  {selectedDay.scheduledPlanIds.map((pid: string) => {
                    const plan = planMap.get(pid);
                    return (
                      <div
                        key={pid}
                        className="p-3 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-sm flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-sm text-[var(--text-color)]">
                            {plan?.name || 'Workout Plan'}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {plan?.exercises.length || 0} exercises configured
                          </div>
                        </div>
                        <button
                          onClick={() => handleStartScheduled(pid)}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center space-x-1"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Start</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-sm text-xs text-[var(--text-muted)] flex items-center justify-between">
                  <span>Rest day (no workouts scheduled)</span>
                  <button
                    onClick={() => {
                      setSelectedDay(null);
                      setIsScheduleOpen(true);
                    }}
                    className="text-[#d9083c] hover:underline font-semibold ml-2"
                  >
                    Edit Program Split →
                  </button>
                </div>
              )}

              {/* Assign or Change Plan for this specific date */}
              <div className="pt-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Assign or Override Plan for {selectedDay.dateStr}
                </div>
                <select
                  value={selectedDay.scheduledPlanIds[0] || ''}
                  onChange={async (e) => {
                    const pid = e.target.value;
                    if (pid) {
                      await setScheduleOverride(selectedDay.dateStr, 'replace', [pid]);
                    } else {
                      await removeScheduleOverride(selectedDay.dateStr);
                    }
                  }}
                  className="flat-input w-full py-1.5 px-2.5 text-xs bg-[var(--card-bg)] text-[var(--text-color)]"
                >
                  <option value="">
                    {selectedDay.scheduledPlanIds.length > 0
                      ? 'Revert to Program default...'
                      : 'Rest Day (Select a Plan to schedule)'}
                  </option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.exercises.length} exercises)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Completed Workouts on this date if any */}
            {selectedDay.completedWorkouts.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">
                  Logged Workouts ({selectedDay.completedWorkouts.length})
                </div>
                <div className="space-y-1.5">
                  {selectedDay.completedWorkouts.map((w: Workout) => (
                    <div
                      key={w.id}
                      className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-sm text-xs flex items-center justify-between"
                    >
                      <span className="font-semibold text-[var(--text-color)]">{w.name}</span>
                      <span className="font-mono text-emerald-400">
                        {w.summary?.totalVolumeKg.toLocaleString()} kg volume
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions: Skip Day Override */}
            <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
              <button
                onClick={handleToggleSkip}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-color)] underline"
              >
                {selectedDay.isOverridden ? 'Remove Skip Override' : 'Skip This Day in Schedule'}
              </button>
              <button
                onClick={() => setSelectedDay(null)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Program Schedule Modal */}
      <ProgramScheduleModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
      />
    </div>
  );
}
