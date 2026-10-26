import React, { useState, useEffect } from 'react';
import { useRestTimerStore, playRestEndBeep } from '@/hooks/useRestTimer';
import { Timer, Plus, Minus, X } from 'lucide-react';

export function RestTimerBar() {
  const { active, endsAt, exerciseName, adjust, skip } = useRestTimerStore();
  const [remainingSec, setRemainingSec] = useState<number>(0);

  useEffect(() => {
    if (!active || !endsAt) {
      setRemainingSec(0);
      return;
    }

    const checkTime = () => {
      const diff = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemainingSec(diff);

      if (diff === 0) {
        // Only beep if the timer finished recently (within 3s), not after hours in background
        const overdueSec = (Date.now() - endsAt) / 1000;
        if (overdueSec <= 3) {
          playRestEndBeep();
        }
        skip();
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 500);

    // Instantly resync or dismiss on foreground wake-up
    const handleWakeUp = () => {
      if (document.visibilityState === 'visible') {
        checkTime();
      }
    };

    document.addEventListener('visibilitychange', handleWakeUp);
    window.addEventListener('pageshow', handleWakeUp);
    window.addEventListener('focus', handleWakeUp);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleWakeUp);
      window.removeEventListener('pageshow', handleWakeUp);
      window.removeEventListener('focus', handleWakeUp);
    };
  }, [active, endsAt, skip]);

  if (!active || remainingSec <= 0) {
    return null;
  }

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return (
    <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:bottom-4 left-4 right-4 md:left-24 max-w-md md:max-w-lg mx-auto z-50 bg-[var(--card-bg)] border border-[#d9083c] px-4 py-3 rounded-md shadow-2xl flex items-center justify-between text-[var(--text-color)] animate-in fade-in slide-in-from-bottom duration-200">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-sm bg-[#d9083c]/10 flex items-center justify-center text-[#d9083c]">
          <Timer className="w-4 h-4 animate-spin-slow" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Rest Timer
            </span>
            {exerciseName && (
              <span className="text-[11px] text-[#d9083c] truncate max-w-[120px]">
                · {exerciseName}
              </span>
            )}
          </div>
          <div className="font-mono text-xl font-bold tracking-tight text-[var(--text-color)] tabular-nums">
            {timeFormatted}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1.5">
        <button
          onClick={() => adjust(-15)}
          className="p-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-color)] bg-[var(--hover-bg)] hover:bg-[var(--border-color)] rounded-sm transition-colors"
          title="-15s"
        >
          -15s
        </button>
        <button
          onClick={() => adjust(15)}
          className="p-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-color)] bg-[var(--hover-bg)] hover:bg-[var(--border-color)] rounded-sm transition-colors"
          title="+15s"
        >
          +15s
        </button>
        <button
          onClick={skip}
          className="p-1.5 text-xs text-[#d9083c] hover:bg-[#d9083c]/10 rounded-sm transition-colors ml-1"
          title="Skip"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
