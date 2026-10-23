import React from 'react';
import {
  Sun,
  Moon,
  Plus,
} from 'lucide-react';

export type TabType =
  | 'workout'
  | 'plans'
  | 'calendar'
  | 'progress'
  | 'exercises'
  | 'history'
  | 'settings';

interface HeaderProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  hasActiveWorkout?: boolean;
  onStartEmptyWorkout?: () => void;
}

export function Header({
  activeTab,
  onSelectTab,
  isDarkMode,
  onToggleTheme,
  hasActiveWorkout = false,
  onStartEmptyWorkout,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[var(--card-bg)] border-b border-[var(--border-color)] px-4 lg:px-6 h-14 flex items-center transition-colors duration-200">
      <div className="w-full flex items-center justify-between">
        {/* Logo & Brand Wordmark - WORKOUT */}
        <div
          onClick={() => onSelectTab('workout')}
          className="flex items-center cursor-pointer select-none"
        >
          <span className="font-black text-xl tracking-tight text-[var(--text-color)]">
            <span className="text-[#d9083c]">WORK</span>OUT
          </span>
        </div>

        {/* Action Icons (Theme toggle + New Workout when not on dashboard) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleTheme}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-color)] hover:bg-[var(--hover-bg)] rounded-sm transition-colors"
            title="Toggle Theme"
            aria-label="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {!hasActiveWorkout && onStartEmptyWorkout && activeTab !== 'workout' && (
            <button
              onClick={onStartEmptyWorkout}
              className="btn-primary flex items-center space-x-1.5 text-xs py-2 px-3.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Start Workout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

