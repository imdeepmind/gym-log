import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
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
  Database
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'workout' | 'calendar' | 'progress' | 'history' | 'settings'>('workout');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialize DB seed exercises and settings on mount
  useEffect(() => {
    db.initializeSeedAndSettings().catch(console.error);
  }, []);

  // Reactive Dexie query
  const exerciseCount = useLiveQuery(() => db.exercises.count(), [], 0);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-[#121212] text-[#f0f0f0]' : 'bg-[#ffffff] text-[#1a1a1a]'} flex flex-col font-sans transition-colors duration-200`}>
      {/* Top Header - Responsive for Desktop & Mobile */}
      <header className="sticky top-0 z-40 bg-[var(--card-bg)] border-b border-[var(--border-color)] px-4 lg:px-8 py-3 transition-colors duration-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
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
            <button className="btn-primary flex items-center space-x-1.5 text-xs py-2 px-3.5">
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Start Workout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area - Responsive Container for Desktop & Mobile */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 lg:p-8 pb-24 md:pb-8">
        {/* Responsive Grid: Left Column (Today / Active) & Right Column (Overview / Stats) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Hero Card (Span 2 on Desktop) */}
          <div className="md:col-span-2 space-y-5">
            {/* Today's Workout Card - Flat Design */}
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
                <button className="btn-primary flex items-center space-x-2 text-xs py-2.5 px-5">
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start Scheduled Workout</span>
                </button>
                <button className="btn-secondary flex items-center space-x-2 text-xs py-2.5 px-4">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start Empty</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flat-card p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  This Week
                </div>
                <div className="text-2xl font-bold font-mono text-[var(--text-color)] mt-1">
                  3 <span className="text-xs text-[var(--text-muted)] font-normal">/ 4 days</span>
                </div>
                <div className="text-[10px] text-[#d9083c] font-semibold mt-1">
                  75% adherence
                </div>
              </div>

              <div className="flat-card p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Streak
                </div>
                <div className="text-2xl font-bold font-mono text-[var(--text-color)] mt-1">
                  5 <span className="text-xs text-[var(--text-muted)] font-normal">weeks</span>
                </div>
                <div className="text-[10px] text-emerald-500 font-semibold mt-1">
                  Consistent
                </div>
              </div>

              <div className="flat-card p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Volume (7d)
                </div>
                <div className="text-2xl font-bold font-mono text-[var(--text-color)] mt-1">
                  18,450 <span className="text-xs text-[var(--text-muted)] font-normal">kg</span>
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1">
                  +8% vs last week
                </div>
              </div>

              <div className="flat-card p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Records
                </div>
                <div className="text-2xl font-bold font-mono text-[var(--text-color)] mt-1">
                  14 <span className="text-xs text-[var(--text-muted)] font-normal">PRs</span>
                </div>
                <div className="text-[10px] text-[#d9083c] font-semibold mt-1">
                  2 this month
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar / Secondary Panel (Span 1 on Desktop) */}
          <div className="space-y-4">
            {/* System Status / Architecture Card */}
            <div className="flat-card p-5">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-[#d9083c]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-color)]">
                  Design & Architecture
                </span>
              </div>
              <ul className="space-y-2 text-xs text-[var(--text-muted)]">
                <li className="flex items-center justify-between pb-1.5 border-b border-[var(--border-color)]">
                  <span>Primary Color</span>
                  <span className="font-mono text-[#d9083c] font-bold">#d9083c</span>
                </li>
                <li className="flex items-center justify-between pb-1.5 border-b border-[var(--border-color)]">
                  <span>Style System</span>
                  <span className="text-[var(--text-color)] font-medium">Flat Minimalist</span>
                </li>
                <li className="flex items-center justify-between pb-1.5 border-b border-[var(--border-color)]">
                  <span>Layout</span>
                  <span className="text-[var(--text-color)] font-medium">Responsive Desktop + PWA</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Storage</span>
                  <span className="font-mono text-[var(--text-color)]">Dexie IndexedDB</span>
                </li>
              </ul>
            </div>

            {/* Quick Links Card */}
            <div className="flat-card p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Quick Access
              </div>
              <div className="space-y-1">
                {[
                  { label: 'Exercise Library', count: `${exerciseCount || 200} Exercises` },
                  { label: 'Workout Plans & Templates', count: '4 Plans' },
                  { label: 'Calendar Adherence Matrix', count: 'Monthly' },
                  { label: 'Data Backup (Export / Import)', count: 'JSON' },
                ].map((link, idx) => (
                  <button
                    key={idx}
                    className="w-full flex items-center justify-between p-2 text-xs rounded-sm hover:bg-[var(--hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-color)] transition-colors text-left"
                  >
                    <span>{link.label}</span>
                    <span className="text-[11px] font-mono text-[#d9083c]">{link.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Mobile Bottom Navigation - Visible on mobile/tablet */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--card-bg)] border-t border-[var(--border-color)] px-2 py-2 safe-bottom transition-colors duration-200">
        <div className="max-w-md mx-auto grid grid-cols-5 text-center text-[10px]">
          {[
            { id: 'workout', label: 'Workout', icon: Dumbbell },
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
                <Icon className="w-4 h-4 mb-1" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
