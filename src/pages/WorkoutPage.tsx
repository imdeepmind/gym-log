import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Exercise } from '@/types';
import { startWorkout, getActiveWorkout } from '@/services/workout';
import { startWorkoutFromPlan } from '@/services/plan';
import { getActiveProgram } from '@/services/program';
import { getScheduledPlansForDate } from '@/domain/schedule';
import { ActiveWorkoutView } from '@/components/workout/ActiveWorkoutView';
import { MonthlyChallenges } from '@/components/workout/MonthlyChallenges';
import {
  Flame,
  Plus,
  Play,
  ArrowRight,
  Repeat,
  CheckCircle2,
} from 'lucide-react';

export function WorkoutPage() {
  const navigate = useNavigate();

  // Reactive Dexie query for active in_progress workout
  const activeWorkout = useLiveQuery(() => getActiveWorkout(), [], undefined);

  // Reactive Dexie query for active program
  const activeProgram = useLiveQuery(() => getActiveProgram(), [], undefined);
  const overrides = useLiveQuery(() => db.scheduleOverrides.toArray(), [], []);

  // Plans & exercises queries
  const plans = useLiveQuery(() => db.plans.toArray(), [], []);
  const allExercises = useLiveQuery(() => db.exercises.toArray(), [], []);
  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    allExercises.forEach((e) => map.set(e.id, e));
    return map;
  }, [allExercises]);

  const planMap = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);

  // Recent completed workouts (last 3)
  const recentWorkouts = useLiveQuery(
    () => db.workouts.where('status').equals('completed').reverse().limit(3).toArray(),
    [],
    []
  );

  // Resolve today's scheduled plan
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayScheduledPlanIds = getScheduledPlansForDate(todayStr, activeProgram, overrides);
  const todayPlanId = todayScheduledPlanIds.length > 0 ? todayScheduledPlanIds[0] : undefined;
  const todayPlan = todayPlanId ? planMap.get(todayPlanId) : undefined;

  // Check if any workout was completed today
  const todaysCompletedWorkouts = useLiveQuery(
    () => db.workouts.where('localDate').equals(todayStr).filter((w) => w.status === 'completed').toArray(),
    [todayStr],
    []
  );
  const completedTodayWorkout = todaysCompletedWorkouts.length > 0 ? todaysCompletedWorkouts[0] : undefined;

  const handleStartEmpty = async () => {
    await startWorkout('Strength Session');
  };

  const handleStartTodayPlan = async () => {
    if (todayPlan) {
      await startWorkoutFromPlan(todayPlan.id);
    } else {
      await startWorkout('Strength Session');
    }
  };

  if (activeWorkout) {
    return (
      <ActiveWorkoutView
        workout={activeWorkout}
        onFinishComplete={() => navigate('/history')}
        onDiscardComplete={() => {}}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Monthly Fitness Challenges */}
      <MonthlyChallenges />

      {/* Today's Scheduled Plan or Completed Session Card */}
      <div
        className={`flat-card p-6 transition-colors ${
          completedTodayWorkout
            ? 'border-emerald-500/50 bg-emerald-950/10 shadow-lg'
            : ''
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {completedTodayWorkout ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Completed Today
                </span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 bg-[#d9083c] rounded-full animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Today's Scheduled Routine
                </span>
              </>
            )}
          </div>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            {activeProgram ? activeProgram.name : 'Weekly Program'}
          </span>
        </div>

        {completedTodayWorkout ? (
          /* Completed Today View */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-[var(--text-color)] flex items-center space-x-2">
                  <span>{completedTodayWorkout.name}</span>
                </h2>
                <p className="text-xs text-emerald-500 font-medium mt-1">
                  Session finished · Great work completing your training today!
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigate('/history')}
                  className="btn-primary flex items-center space-x-1.5 text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-md"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>View in History</span>
                </button>
                <button
                  onClick={handleStartEmpty}
                  className="btn-secondary flex items-center space-x-1.5 text-xs py-2 px-3 text-[var(--text-muted)] hover:text-[var(--text-color)]"
                  title="Start another workout session today"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Train Again</span>
                </button>
              </div>
            </div>

            {/* Today's Completed Session Stats */}
            {completedTodayWorkout.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-[var(--border-color)]">
                <div className="p-2.5 bg-[var(--hover-bg)] rounded-sm border border-[var(--border-color)]">
                  <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">
                    Duration
                  </div>
                  <div className="text-sm font-bold font-mono text-[var(--text-color)] mt-0.5">
                    {Math.floor(completedTodayWorkout.summary.durationSec / 60)} mins
                  </div>
                </div>
                <div className="p-2.5 bg-[var(--hover-bg)] rounded-sm border border-[var(--border-color)]">
                  <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">
                    Volume
                  </div>
                  <div className="text-sm font-bold font-mono text-[var(--text-color)] mt-0.5">
                    {completedTodayWorkout.summary.totalVolumeKg.toLocaleString()} kg
                  </div>
                </div>
                <div className="p-2.5 bg-[var(--hover-bg)] rounded-sm border border-[var(--border-color)]">
                  <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">
                    Working Sets
                  </div>
                  <div className="text-sm font-bold font-mono text-[var(--text-color)] mt-0.5">
                    {completedTodayWorkout.summary.workingSets} sets
                  </div>
                </div>
                <div className="p-2.5 bg-[var(--hover-bg)] rounded-sm border border-[var(--border-color)]">
                  <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">
                    Total Reps
                  </div>
                  <div className="text-sm font-bold font-mono text-[var(--text-color)] mt-0.5">
                    {completedTodayWorkout.summary.totalReps} reps
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Not Yet Completed Today View */
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-[var(--text-color)]">
                  {todayPlan ? todayPlan.name : activeProgram ? 'Rest Day' : 'Strength Session'}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {todayPlan
                    ? `${todayPlan.exercises.length} exercises scheduled for today's session`
                    : activeProgram
                    ? 'No workouts scheduled for today in your active program.'
                    : 'Start an empty workout or create a plan to begin logging.'}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {todayPlan && (
                  <button
                    onClick={handleStartTodayPlan}
                    className="btn-primary flex items-center space-x-2 text-xs py-2.5 px-5 shadow-lg"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Start Workout</span>
                  </button>
                )}
                <button
                  onClick={handleStartEmpty}
                  className={`${todayPlan ? 'btn-secondary' : 'btn-primary'} flex items-center space-x-1.5 text-xs py-2.5 px-4`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{todayPlan ? 'Empty Session' : 'Start Workout'}</span>
                </button>
              </div>
            </div>

            {/* Movements list preview in today's plan */}
            {todayPlan?.exercises && todayPlan.exercises.length > 0 && (
              <div className="pt-4 border-t border-[var(--border-color)]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
                  Scheduled Movements ({todayPlan.exercises.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {todayPlan.exercises.map((pe, idx) => {
                    const ex = exerciseMap.get(pe.exerciseId);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-[var(--hover-bg)] rounded-sm border border-[var(--border-color)] text-xs"
                      >
                        <span className="font-medium text-[var(--text-color)] truncate pr-2">
                          {ex?.name || 'Movement'}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          {pe.targetSets || 3} sets
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Start from Saved Plans (Quick-Launch Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--text-color)] tracking-tight">
              Start From a Plan
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Launch any saved routine with target sets and prefilled weights
            </p>
          </div>
          <button
            onClick={() => navigate('/plans')}
            className="text-xs font-semibold text-[#d9083c] hover:underline flex items-center space-x-1"
          >
            <span>View All Plans ({plans.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="flat-card p-6 text-center space-y-2">
            <div className="font-semibold text-xs text-[var(--text-color)]">
              No Plans Created Yet
            </div>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              Build your first plan to start tracking custom routines with target sets and prefilled weights.
            </p>
            <button
              onClick={() => navigate('/plans')}
              className="btn-primary text-xs py-1.5 px-3 inline-flex items-center space-x-1.5 mt-2"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>Create Plan</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {plans.map((p) => (
              <div
                key={p.id}
                className="flat-card p-4 flex flex-col justify-between space-y-3 hover:border-[#d9083c]/60 transition-colors group"
              >
                <div>
                  <div className="font-bold text-sm text-[var(--text-color)] group-hover:text-[#d9083c] transition-colors">
                    {p.name}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">
                    {p.exercises.length} movements
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-2 line-clamp-2">
                    {p.exercises
                      .slice(0, 3)
                      .map((pe) => exerciseMap.get(pe.exerciseId)?.name || 'Movement')
                      .join(', ')}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    await startWorkoutFromPlan(p.id);
                  }}
                  className="btn-primary w-full text-xs py-2 flex items-center justify-center space-x-1.5"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Start Plan</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {recentWorkouts.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--text-color)] tracking-tight">
                Recent Activity
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Your latest logged sessions
              </p>
            </div>
            <button
              onClick={() => navigate('/history')}
              className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-color)] flex items-center space-x-1"
            >
              <span>Full History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentWorkouts.map((w) => (
              <div
                key={w.id}
                className="flat-card p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-[var(--text-color)]">
                    {w.name}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                    {w.localDate}
                    {w.summary?.durationSec
                      ? ` · ${Math.floor(w.summary.durationSec / 60)} min`
                      : ''}
                  </div>
                  {w.summary?.totalVolumeKg ? (
                    <div className="text-[11px] font-mono text-[#d9083c] font-semibold mt-1">
                      {w.summary.totalVolumeKg.toLocaleString()} kg · {w.summary.workingSets} sets
                    </div>
                  ) : null}
                </div>

                {w.planId && (
                  <button
                    onClick={async () => {
                      await startWorkoutFromPlan(w.planId!);
                    }}
                    className="p-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-color)] hover:bg-[var(--hover-bg)] rounded-sm border border-[var(--border-color)] transition-colors"
                    title="Repeat this workout"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
