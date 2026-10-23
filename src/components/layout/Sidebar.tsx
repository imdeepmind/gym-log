import React from 'react';
import {
  Dumbbell,
  Layers,
  Trophy,
  BookOpen,
  Flame,
  Settings as SettingsIcon,
} from 'lucide-react';
import { TabType } from './Header';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  hasActiveWorkout?: boolean;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  hasActiveWorkout = false,
}: SidebarProps) {
  const navItems = [
    { id: 'workout' as const, label: 'Workout', icon: Dumbbell },
    { id: 'plans' as const, label: 'Plans & Calendar', icon: Layers },
    { id: 'progress' as const, label: 'Progress', icon: Trophy },
    { id: 'exercises' as const, label: 'Movements', icon: BookOpen },
    { id: 'history' as const, label: 'History', icon: Flame },
  ];

  return (
    <aside
      className="hidden md:flex flex-col fixed top-[calc(3.5rem+env(safe-area-inset-top,0px))] left-0 bottom-0 w-16 bg-[var(--card-bg)] border-r border-[var(--border-color)] z-30 py-4 justify-between items-center transition-colors duration-200 select-none"
      aria-label="Navigation Sidenav"
    >
      {/* Primary Navigation Icons */}
      <nav className="flex flex-col items-center space-y-2.5 w-full px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === 'plans' && activeTab === 'calendar');

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-10 h-10 rounded-md flex items-center justify-center transition-all duration-150 relative group ${
                isActive
                  ? 'bg-[#d9083c] text-white shadow-sm font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-color)] hover:bg-[var(--hover-bg)]'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-4 h-4" />

              {/* Workout in progress live pulse dot on Workout icon */}
              {item.id === 'workout' && hasActiveWorkout && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}

              {/* Tooltip on Hover */}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#181818] text-white text-xs font-semibold rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 border border-[#303030] flex items-center">
                {item.label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#303030]" />
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom: Settings Icon */}
      <div className="flex flex-col items-center w-full px-3 pt-3 border-t border-[var(--border-color)]">
        <button
          onClick={() => onSelectTab('settings')}
          className={`w-10 h-10 rounded-md flex items-center justify-center transition-all duration-150 relative group ${
            activeTab === 'settings'
              ? 'bg-[#d9083c] text-white shadow-sm font-bold'
              : 'text-[var(--text-muted)] hover:text-[var(--text-color)] hover:bg-[var(--hover-bg)]'
          }`}
          aria-label="Settings"
        >
          <SettingsIcon className="w-4 h-4" />
          {/* Tooltip on Hover */}
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#181818] text-white text-xs font-semibold rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 border border-[#303030] flex items-center">
            Settings
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#303030]" />
          </div>
        </button>
      </div>
    </aside>
  );
}
