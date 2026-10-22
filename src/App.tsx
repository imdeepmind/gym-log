import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { startWorkout, getActiveWorkout } from '@/services/workout';
import { ActiveWorkoutView } from '@/components/workout/ActiveWorkoutView';
import { HistoryView } from '@/components/history/HistoryView';
import { ExercisesView } from '@/components/exercises/ExercisesView';
import { SettingsView } from '@/components/settings/SettingsView';
import { RestTimerBar } from '@/components/workout/RestTimerBar';
import { 
  Dumbbell, 
  Flame, 
  Trophy, 
  Calendar, 
  Settings as SettingsIcon, 
  Plus, 
  Play, 
  CheckCircle2, 
  BarChart2, 
  Clock, 
  Folder,
  Layers,
  ArrowRight,
  Sun,
  Moon,
  BookOpen,
  Sparkles
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'workout' | 'exercises' | 'history' | 'settings'>('workout');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialize DB seed exercises and settings on mount
  useEffect(() => {
    db.initializeSeedAndSettings().catch(console.error);
  }, []);

  // Reactive Dexie query for active in_progress workout
  const activeWorkout = useLiveQuery(() => getActiveWorkout(), [], undefined);

  // Reactive Dexie query for total exercise count
  const exerciseCount = useLiveQuery(() => db.exercises.count(), [], 0);

  // Reactive Dexie query for completed workouts count
  const completedCount = useLiveQuery(
    () => db.workouts.where('status').equals('completed').count(),
    [],
    0
  );

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

  const handleStartPushDay = async () => {
    const w = await startWorkout('Push Day A · Chest & Shoulders');
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
            className="flex items-center space-x-3 cursor-pointer"
          >
            <div className="w-8 h-8 bg-[#d9083c] flex items-center justify-center rounded-sm">
              <Dumbbell className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight leading-none text-[var(--text-color)]">
                  GymLog
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-[#d9083c] bg-[#d9083c]/10 px-1.5 py-0.5 rounded-sm">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] hidden sm:block">
                Offline-First Strength Tracker
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {[
              { id: 'workout', label: 'Workout', icon: Dumbbell },
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
                  className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors ${
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
            /* No Workout Active: Dashboard & Quick Start */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Today's Workout Card */}
              <div className="md:col-span-2 space-y-5">
                <div className="flat-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-[#d9083c] rounded-full"></span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Today's Schedule
                      </span>
                    </div>
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      Day 1 · Push Day
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold tracking-tight text-[var(--text-color)] mb-2">
                    Push Day A · Chest & Shoulders
                  </h2>
                  <p className="text-sm text-[var(--text-muted)] mb-5 max-w-lg">
                    5 exercises · Barbell Bench Press, Incline DB Press, Overhead Press, Lateral Raises, Cable Triceps Pushdown.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border-color)]">
                    <button
                      onClick={handleStartPushDay}
                      className="btn-primary flex items-center space-x-2 text-xs py-2.5 px-5"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Start Scheduled Workout</span>
                    </button>
                    <button
                      onClick={handleStartEmpty}
                      className="btn-secondary flex items-center space-x-2 text-xs py-2.5 px-4"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Start Empty</span>
                    </button>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flat-card p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Logged Sessions
                    </div>
                    <div className="text-2xl font-bold font-mono text-[var(--text-color)] mt-1">
                      {completedCount}{' '}
                      <span className="text-xs text-[var(--text-muted)] font-normal">done</span>
                    </div>
                    <div className="text-[10px] text-emerald-500 font-semibold mt-1">
                      Zero Data Loss
                    </div>
                  </div>

                  <div className="flat-card p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Library
                    </div>
                    <div className="text-2xl font-bold font-mono text-[var(--text-color)] mt-1">
                      {exerciseCount || 200}{' '}
                      <span className="text-xs text-[var(--text-muted)] font-normal">movements</span>
                    </div>
                    <div className="text-[10px] text-[#d9083c] font-semibold mt-1">
                      Fully Preloaded
                    </div>
                  </div>

                  <div className="flat-card p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Storage
                    </div>
                    <div className="text-2xl font-bold font-mono text-[var(--text-color)] mt-1">
                      Local
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-1">
                      IndexedDB Offline
                    </div>
                  </div>

                  <div className="flat-card p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Backups
                    </div>
                    <div className="text-2xl font-bold font-mono text-[var(--text-color)] mt-1">
                      JSON
                    </div>
                    <div className="text-[10px] text-[#d9083c] font-semibold mt-1">
                      Export Anytime
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Panel */}
              <div className="space-y-4">
                <div className="flat-card p-5">
                  <div className="flex items-center space-x-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-[#d9083c]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-color)]">
                      Quick Access
                    </span>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => setActiveTab('exercises')}
                      className="w-full flex items-center justify-between p-2 text-xs rounded-sm hover:bg-[var(--hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-color)] transition-colors text-left"
                    >
                      <span>Movement Library ({exerciseCount || 200})</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#d9083c]" />
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className="w-full flex items-center justify-between p-2 text-xs rounded-sm hover:bg-[var(--hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-color)] transition-colors text-left"
                    >
                      <span>Completed History ({completedCount})</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#d9083c]" />
                    </button>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="w-full flex items-center justify-between p-2 text-xs rounded-sm hover:bg-[var(--hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-color)] transition-colors text-left"
                    >
                      <span>JSON Backup & Settings</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#d9083c]" />
                    </button>
                  </div>
                </div>

                <div className="flat-card p-5 border-[#d9083c]/30">
                  <div className="flex items-center space-x-2 text-[#d9083c] mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">PWA Features</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Set completion feedback under 100ms. Live rest timers with audio alerts, screen wake lock during training, and instant persistence on every input change.
                  </p>
                </div>
              </div>
            </div>
          )
        )}

        {/* TAB 2: EXERCISES */}
        {activeTab === 'exercises' && <ExercisesView />}

        {/* TAB 3: HISTORY */}
        {activeTab === 'history' && <HistoryView />}

        {/* TAB 4: SETTINGS */}
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
        <div className="max-w-md mx-auto grid grid-cols-4 text-center text-[10px]">
          {[
            { id: 'workout', label: 'Workout', icon: Dumbbell },
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
                className={`flex flex-col items-center py-1 transition-colors ${
                  isActive ? 'text-[#d9083c] font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-color)]'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
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
