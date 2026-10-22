import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Program, Plan, ScheduleOverride, Workout } from '@/types';
import {
  generateMonthCalendar,
  calculateAdherenceStats,
  CalendarDayInfo,
  DayState,
} from '@/domain/schedule';
import { startWorkoutFromPlan } from '@/services/plan';
import { startWorkout } from '@/services/workout';
import { setScheduleOverride, removeScheduleOverride } from '@/services/program';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar as CalendarIcon,
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
}

export function CalendarView({ onStartWorkout }: Props) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<CalendarDayInfo | null>(null);

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
  const planMap = new Map<string, Plan>();
  plans.forEach((p) => planMap.set(p.id, p));

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
    if (isToday) base += 'ring-1 ring-[#d9083c] ';

    switch (state) {
      case 'completed':
        return base + 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300';
      case 'completed_late':
        return base + 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300';
      case 'missed':
        return base + 'bg-rose-500/10 border-rose-500/40 text-rose-300';
      case 'extra':
        return base + 'bg-purple-500/10 border-purple-500/40 text-purple-300';
      case 'upcoming':
        return base + 'bg-[#181818] border-[#333333] text-white';
      case 'rest':
      default:
        return base + 'bg-[#141414] border-[#222222] text-[var(--text-muted)]';
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header with Month Nav & Adherence Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#2a2a2a]">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Calendar & Adherence</h2>
          <p className="text-xs text-[var(--text-muted)] font-mono">
            {activeProgram ? activeProgram.name : 'No active program'} · {format(currentMonth, 'MMMM yyyy')}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleToday}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            Today
          </button>
          <button
            onClick={handlePrevMonth}
            className="p-1.5 text-[var(--text-muted)] hover:text-white rounded-sm bg-[#1e1e1e] border border-[#2a2a2a]"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 text-[var(--text-muted)] hover:text-white rounded-sm bg-[#1e1e1e] border border-[#2a2a2a]"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Adherence Stats Banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flat-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            This Week
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
            {adherence.weekCompleted} <span className="text-xs text-[var(--text-muted)] font-normal">/ {adherence.weekTarget} days</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
            {Math.round((adherence.weekCompleted / adherence.weekTarget) * 100)}% on track
          </div>
        </div>

        <div className="flat-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Current Streak
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
            {adherence.streakWeeks} <span className="text-xs text-[var(--text-muted)] font-normal">weeks</span>
          </div>
          <div className="text-[10px] text-[#d9083c] font-semibold mt-0.5">
            No missed sessions
          </div>
        </div>

        <div className="flat-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Monthly Adherence
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
            {adherence.monthlyAdherencePercent}%
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
            Consistency Score
          </div>
        </div>
      </div>

      {/* Calendar Month Grid */}
      <div className="flat-card p-4 overflow-hidden">
        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Pad empty days before first day of month if needed */}
          {calendarDays.length > 0 &&
            Array.from({ length: calendarDays[0].dayOfWeek }).map((_, idx) => (
              <div key={`pad_${idx}`} className="h-16 sm:h-20 bg-transparent opacity-20" />
            ))}

          {calendarDays.map((day) => {
            const hasWorkout = day.completedWorkouts.length > 0;
            const hasSchedule = day.scheduledPlanIds.length > 0;

            return (
              <div
                key={day.dateStr}
                onClick={() => handleDayClick(day)}
                className={`h-16 sm:h-20 p-2 border rounded-sm flex flex-col justify-between cursor-pointer ${getDayStyle(
                  day.state,
                  day.isToday
                )}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs sm:text-sm font-bold">
                    {day.dayNumber}
                  </span>
                  {day.isToday && (
                    <span className="text-[9px] font-semibold uppercase px-1 py-0.2 bg-[#d9083c] text-white rounded-flat">
                      Today
                    </span>
                  )}
                </div>

                {/* Day status badge */}
                <div className="text-[10px] font-mono truncate">
                  {day.state === 'completed' && (
                    <span className="text-emerald-400 font-semibold flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" /> Done
                    </span>
                  )}
                  {day.state === 'missed' && (
                    <span className="text-rose-400 font-semibold">Missed</span>
                  )}
                  {day.state === 'extra' && (
                    <span className="text-purple-400 font-semibold">Extra</span>
                  )}
                  {day.state === 'upcoming' && (
                    <span className="text-slate-400">Due</span>
                  )}
                  {day.state === 'rest' && !hasWorkout && (
                    <span className="text-[var(--text-muted)] opacity-60">Rest</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--text-muted)] pt-1">
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
          <span className="w-2.5 h-2.5 rounded-sm bg-[#1e1e1e] border border-[#333333]" />
          <span>Due / Upcoming</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#141414] border border-[#222222]" />
          <span>Rest</span>
        </div>
      </div>

      {/* Day Detail Sheet Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#161616] border border-[#2a2a2a] w-full max-w-md rounded-md p-5 text-[#f0f0f0] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2a]">
              <div>
                <h3 className="font-bold text-base text-white">{selectedDay.dateStr}</h3>
                <span className="text-xs uppercase font-semibold text-[var(--text-muted)] tracking-wider">
                  State: <strong className="text-white capitalize">{selectedDay.state.replace('_', ' ')}</strong>
                </span>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1.5 text-[var(--text-muted)] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scheduled Plan on this date */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Scheduled Movement Template
              </div>
              {selectedDay.scheduledPlanIds.length > 0 ? (
                <div className="space-y-2">
                  {selectedDay.scheduledPlanIds.map((pid) => {
                    const plan = planMap.get(pid);
                    return (
                      <div
                        key={pid}
                        className="p-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-sm flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-sm text-white">
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
                <div className="p-3 bg-[#121212] border border-[#2a2a2a] rounded-sm text-xs text-[var(--text-muted)]">
                  Rest day (no workouts scheduled on this date)
                </div>
              )}
            </div>

            {/* Completed Workouts on this date if any */}
            {selectedDay.completedWorkouts.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">
                  Logged Workouts ({selectedDay.completedWorkouts.length})
                </div>
                <div className="space-y-1.5">
                  {selectedDay.completedWorkouts.map((w) => (
                    <div
                      key={w.id}
                      className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-sm text-xs flex items-center justify-between"
                    >
                      <span className="font-semibold text-white">{w.name}</span>
                      <span className="font-mono text-emerald-300">
                        {w.summary?.totalVolumeKg.toLocaleString()} kg volume
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions: Skip Day Override */}
            <div className="pt-2 border-t border-[#2a2a2a] flex items-center justify-between">
              <button
                onClick={handleToggleSkip}
                className="text-xs text-[var(--text-muted)] hover:text-white underline"
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
    </div>
  );
}
