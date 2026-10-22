import React from 'react';
import { Dumbbell, Flame, Trophy, Calendar, Settings as SettingsIcon } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-surface-950 text-slate-100 flex flex-col font-sans">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 bg-surface-900/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-cyan-300 flex items-center justify-center shadow-glow">
            <Dumbbell className="w-5 h-5 text-surface-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              GymLog
            </h1>
            <p className="text-[10px] text-brand-400 font-semibold tracking-wider uppercase mt-0.5">
              Offline First PWA
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
            Ready
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 pb-24 space-y-4">
        {/* Project Setup Card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden border border-brand-500/20">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center space-x-2 text-brand-400 mb-2">
            <Flame className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Setup Complete</span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white mb-1">
            Strength Tracking Engine
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Project initialized with Vite, React 18, TypeScript, Tailwind CSS, Dexie IndexedDB architecture, and PWA service worker.
          </p>
        </div>

        {/* Status Highlights */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-panel p-3.5 rounded-xl border border-white/5">
            <div className="text-xs font-medium text-slate-400">Offline Database</div>
            <div className="text-base font-bold text-white mt-1">IndexedDB / Dexie</div>
            <div className="text-[11px] text-brand-400 mt-0.5 font-mono">Zero data loss</div>
          </div>
          <div className="glass-panel p-3.5 rounded-xl border border-white/5">
            <div className="text-xs font-medium text-slate-400">PWA Target</div>
            <div className="text-base font-bold text-white mt-1">Standalone</div>
            <div className="text-[11px] text-emerald-400 mt-0.5 font-mono">Offline-ready</div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation Placeholder */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface-900/90 backdrop-blur-lg border-t border-white/5 px-2 py-2 safe-bottom">
        <div className="max-w-md mx-auto grid grid-cols-5 text-center text-xs">
          <button className="flex flex-col items-center py-1.5 text-brand-400 font-medium">
            <Dumbbell className="w-5 h-5 mb-1" />
            <span>Workout</span>
          </button>
          <button className="flex flex-col items-center py-1.5 text-slate-400 hover:text-slate-200">
            <Calendar className="w-5 h-5 mb-1" />
            <span>Calendar</span>
          </button>
          <button className="flex flex-col items-center py-1.5 text-slate-400 hover:text-slate-200">
            <Trophy className="w-5 h-5 mb-1" />
            <span>Progress</span>
          </button>
          <button className="flex flex-col items-center py-1.5 text-slate-400 hover:text-slate-200">
            <Flame className="w-5 h-5 mb-1" />
            <span>History</span>
          </button>
          <button className="flex flex-col items-center py-1.5 text-slate-400 hover:text-slate-200">
            <SettingsIcon className="w-5 h-5 mb-1" />
            <span>Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
