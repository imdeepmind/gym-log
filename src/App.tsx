import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { startWorkout, getActiveWorkout } from '@/services/workout';
import {
  WorkoutPage,
  PlansPage,
  ProgressPage,
  ExercisesPage,
  HistoryPage,
  SettingsPage,
} from '@/pages';
import { RestTimerBar } from '@/components/workout/RestTimerBar';
import { Header, TabType } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import {
  Dumbbell,
  Layers,
  Trophy,
  Flame,
  Settings as SettingsIcon,
} from 'lucide-react';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialize DB seed exercises, default plans, and settings on mount
  useEffect(() => {
    db.initializeSeedAndSettings().catch(console.error);
  }, []);

  // Reactive Dexie query for active in_progress workout
  const activeWorkout = useLiveQuery(() => getActiveWorkout(), [], undefined);

  // Derive active tab from current URL pathname
  const activeTab = useMemo<TabType>(() => {
    const p = location.pathname;
    if (p.startsWith('/plans') || p.startsWith('/calendar')) return 'plans';
    if (p.startsWith('/progress')) return 'progress';
    if (p.startsWith('/exercises')) return 'exercises';
    if (p.startsWith('/history')) return 'history';
    if (p.startsWith('/settings')) return 'settings';
    return 'workout';
  }, [location.pathname]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  const handleSelectTab = (tab: TabType) => {
    if (tab === 'workout') {
      navigate('/');
    } else {
      navigate(`/${tab}`);
    }
  };

  const handleStartEmpty = async () => {
    await startWorkout('Strength Session');
    navigate('/');
  };

  const navItems = [
    { id: 'workout' as const, label: 'Workout', icon: Dumbbell, path: '/' },
    { id: 'plans' as const, label: 'Plans', icon: Layers, path: '/plans' },
    { id: 'progress' as const, label: 'Progress', icon: Trophy, path: '/progress' },
    { id: 'history' as const, label: 'History', icon: Flame, path: '/history' },
    { id: 'settings' as const, label: 'Settings', icon: SettingsIcon, path: '/settings' },
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-[#121212] text-[#f0f0f0]' : 'bg-[#ffffff] text-[#1a1a1a]'} flex flex-col font-sans transition-colors duration-200`}>
      {/* Top Header - Across all viewports */}
      <Header
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        hasActiveWorkout={!!activeWorkout}
        onStartEmptyWorkout={handleStartEmpty}
      />

      {/* Left Sidenav Panel (Desktop, below top header) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        hasActiveWorkout={!!activeWorkout}
      />

      {/* Main Content Area - Responsive Container for Desktop & Mobile */}
      <div className="flex-1 flex flex-col md:ml-16">
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 lg:p-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-8">
          <Routes>
            <Route path="/" element={<WorkoutPage />} />
            <Route path="/workout" element={<Navigate to="/" replace />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/calendar" element={<Navigate to="/plans" replace />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Persistent Resume Mini Bar if active workout is in progress and viewing another tab */}
      {activeWorkout && location.pathname !== '/' && location.pathname !== '/workout' && (
        <div
          onClick={() => navigate('/')}
          className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:bottom-4 left-4 right-4 md:left-24 max-w-lg mx-auto z-40 bg-[#161616] border border-[#d9083c] p-3 rounded-md shadow-2xl flex items-center justify-between cursor-pointer hover:bg-[#1e1e1e] transition-colors"
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--card-bg)] border-t border-[var(--border-color)] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] transition-colors duration-200">
        <div className="max-w-md mx-auto grid grid-cols-5 text-center text-[9px]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
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

      {/* Global Shared Confirmation Modal */}
      <ConfirmModal />
    </div>
  );
}
