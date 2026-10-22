import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Exercise } from '@/types';
import { startWorkout, getActiveWorkout } from '@/services/workout';
import { startWorkoutFromPlan } from '@/services/plan';
import { getActiveProgram } from '@/services/program';
import { getScheduledPlansForDate } from '@/domain/schedule';
import { ActiveWorkoutView } from '@/components/workout/ActiveWorkoutView';
import { PlansView } from '@/components/plans/PlansView';
import { CalendarView } from '@/components/calendar/CalendarView';
import { HistoryView } from '@/components/history/HistoryView';
import { ExercisesView } from '@/components/exercises/ExercisesView';
import { SettingsView } from '@/components/settings/SettingsView';
import { RestTimerBar } from '@/components/workout/RestTimerBar';

const ProgressView = React.lazy(() =>
  import('@/components/progress/ProgressView').then((m) => ({ default: m.ProgressView }))
);
import { 
  Dumbbell, 
  Flame, 
  Trophy, 
  Calendar, 
  Settings as SettingsIcon, 
  Plus, 
  Play, 
  Layers,
  ArrowRight,
  Sun,
  Moon,
  BookOpen,
  Repeat
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'workout' | 'plans' | 'calendar' | 'progress' | 'exercises' | 'history' | 'settings'>('workout');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialize DB seed exercises, default plans, and settings on mount
  useEffect(() => {
    db.initializeSeedAndSettings().catch(console.error);
  }, []);

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
  const todayPlanId = todayScheduledPlanIds.length > 0 ? todayScheduledPlanIds[0] : 'plan_push_a';
  const todayPlan = planMap.get(todayPlanId) || planMap.get('plan_push_a');

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  const handleStartEmpty = async () => {
    await startWorkout('Strength Session');
    setActiveTab('workout');
  };

  const handleStartTodayPlan = async () => {
    if (todayPlan) {
      await startWorkoutFromPlan(todayPlan.id);
    } else {
      await startWorkout('Push Day A · Chest & Shoulders');
    }
    setActiveTab('workout');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-[#121212] text-[#f0f0f0]' : 'bg-[#ffffff] text-[#1a1a1a]'} flex flex-col font-sans transition-colors duration-200`}>
      {/* Top Header - Responsive for Desktop & Mobile */}
      <header className="sticky top-0 z-40 bg-[var(--card-bg)] border-b border-[var(--border-color)] px-4 lg:px-8 py-3 transition-colors duration-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div
            onClick={() => setActiveTab('workout')}
            className="flex items-center space-x-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 bg-[#d9083c] flex items-center justify-center rounded-sm">
              <Dumbbell className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <span className="font-bold text-lg tracking-tight leading-none text-[var(--text-color)]">
              GymLog
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
            {[
              { id: 'workout', label: 'Workout', icon: Dumbbell },
              { id: 'plans', label: 'Plans', icon: Layers },
              { id: 'calendar', label: 'Calendar', icon: Calendar },
              { id: 'progress', label: 'Progress', icon: Trophy },
              { id: 'exercises', label: 'Movements', icon: BookOpen },
              { id: 'history', label: 'History', icon: Flame },
              { id: 'settings', label: 'Settings', icon: SettingsIcon },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors ${
                    isActive
                      ? 'bg-[#d9083c] text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-color)] hover:bg-[var(--hover-bg)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action Icons (Theme toggle + New Workout) */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-color)] hover:bg-[var(--hover-bg)] rounded-sm transition-colors"
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {!activeWorkout && (
              <button
                onClick={handleStartEmpty}
                className="btn-primary flex items-center space-x-1.5 text-xs py-2 px-3.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Start Workout</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area - Responsive Container for Desktop & Mobile */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 lg:p-8 pb-24 md:pb-8">
        {/* TAB 1: WORKOUT */}
        {activeTab === 'workout' && (
          activeWorkout ? (
            /* Active Workout in Progress */
            <ActiveWorkoutView
              workout={activeWorkout}
              onFinishComplete={() => setActiveTab('history')}
              onDiscardComplete={() => {}}
            />
          ) : (
            /* Clean, Actionable Workout Dashboard */
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Today's Scheduled Plan Card */}
              <div className="flat-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-[#d9083c] rounded-full animate-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Today's Scheduled Routine
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    {activeProgram ? activeProgram.name : 'Weekly Program'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-[var(--text-color)]">
                      {todayPlan?.name || 'Strength Session'}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {todayPlan?.exercises.length || 0} exercises scheduled for today's session
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleStartTodayPlan}
                      className="btn-primary flex items-center space-x-2 text-xs py-2.5 px-5 shadow-lg"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Start Workout</span>
                    </button>
                    <button
                      onClick={handleStartEmpty}
                      className="btn-secondary flex items-center space-x-1.5 text-xs py-2.5 px-4"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Empty Session</span>
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
                    onClick={() => setActiveTab('plans')}
                    className="text-xs font-semibold text-[#d9083c] hover:underline flex items-center space-x-1"
                  >
                    <span>View All Plans ({plans.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

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
                          setActiveTab('workout');
                        }}
                        className="btn-primary w-full text-xs py-2 flex items-center justify-center space-x-1.5"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>Start Plan</span>
                      </button>
                    </div>
                  ))}
                </div>
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
                      onClick={() => setActiveTab('history')}
                      className="text-xs font-semibold text-[var(--text-muted)] hover:text-white flex items-center space-x-1"
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
                              setActiveTab('workout');
                            }}
                            className="p-2 text-xs text-[var(--text-muted)] hover:text-white hover:bg-[var(--hover-bg)] rounded-sm border border-[var(--border-color)] transition-colors"
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
          )
        )}

        {/* TAB 2: PLANS */}
        {activeTab === 'plans' && (
          <PlansView
            onStartPlanWorkout={(w) => {
              setActiveTab('workout');
            }}
          />
        )}

        {/* TAB 3: CALENDAR */}
        {activeTab === 'calendar' && (
          <CalendarView
            onStartWorkout={(w) => {
              setActiveTab('workout');
            }}
          />
        )}

        {/* TAB 4: PROGRESS & CHARTS (LAZY LOADED) */}
        {activeTab === 'progress' && (
          <React.Suspense
            fallback={
              <div className="p-12 text-center text-xs text-[var(--text-muted)] font-mono">
                Loading analytics engine...
              </div>
            }
          >
            <ProgressView />
          </React.Suspense>
        )}

        {/* TAB 5: EXERCISES */}
        {activeTab === 'exercises' && <ExercisesView />}

        {/* TAB 6: HISTORY */}
        {activeTab === 'history' && <HistoryView />}

        {/* TAB 7: SETTINGS */}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Persistent Resume Mini Bar if active workout is in progress and viewing another tab */}
      {activeWorkout && activeTab !== 'workout' && (
        <div
          onClick={() => setActiveTab('workout')}
          className="fixed bottom-16 md:bottom-4 left-4 right-4 max-w-lg mx-auto z-40 bg-[#161616] border border-[#d9083c] p-3 rounded-md shadow-2xl flex items-center justify-between cursor-pointer hover:bg-[#1e1e1e] transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d9083c] animate-pulse" />
            <div>
              <div className="text-xs font-bold text-white tracking-tight">
                Resume Active Workout
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {activeWorkout.name} · Tap to continue logging
              </div>
            </div>
          </div>
          <button className="btn-primary text-xs py-1.5 px-3">
            Resume
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation - Visible on mobile/tablet */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--card-bg)] border-t border-[var(--border-color)] px-2 py-2 safe-bottom transition-colors duration-200">
        <div className="max-w-md mx-auto grid grid-cols-6 text-center text-[9px]">
          {[
            { id: 'workout', label: 'Workout', icon: Dumbbell },
            { id: 'plans', label: 'Plans', icon: Layers },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
            { id: 'progress', label: 'Progress', icon: Trophy },
            { id: 'history', label: 'History', icon: Flame },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex flex-col items-center py-1 transition-colors ${
                  isActive ? 'text-[#d9083c] font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-color)]'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Sticky Rest Timer Bar */}
      <RestTimerBar />
    </div>
  );
}
