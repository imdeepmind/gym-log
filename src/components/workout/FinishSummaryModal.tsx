import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Workout, WorkoutSummary, PRRecord, Muscle } from '@/types';
import { Trophy, Clock, Dumbbell, Flame, Check, Heart, Zap, Sparkles } from 'lucide-react';
import { getMuscleName } from '@/domain/muscles';

interface Props {
  isOpen: boolean;
  workout: Workout;
  summary: WorkoutSummary;
  prs: PRRecord[];
  onClose: () => void;
  onSaveNotes: (notes: string, mood?: 1 | 2 | 3 | 4 | 5, energy?: 1 | 2 | 3 | 4 | 5) => void;
}

export function FinishSummaryModal({
  isOpen,
  workout,
  summary,
  prs,
  onClose,
  onSaveNotes,
}: Props) {
  const [notes, setNotes] = useState(workout.notes || '');
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5 | undefined>(workout.mood);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5 | undefined>(workout.energy);

  // Trigger celebration confetti on finish
  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#d9083c', '#ffffff', '#f59e0b', '#10b981'],
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const durationMins = Math.floor(summary.durationSec / 60);
  const durationSecs = summary.durationSec % 60;

  const handleFinishDone = () => {
    onSaveNotes(notes, mood, energy);
    onClose();
  };

  // Convert muscle set counts to array sorted descending
  const muscleList = Object.entries(summary.muscleSets || {})
    .filter(([_, count]) => (count || 0) > 0)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0)) as [Muscle, number][];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#161616] border border-[#2a2a2a] w-full max-w-xl rounded-md p-6 text-[#f0f0f0] shadow-2xl my-auto space-y-5">
        {/* Header with celebration banner */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#d9083c]/10 text-[#d9083c] border border-[#d9083c]/30 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Workout Completed</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
            {workout.name}
          </h2>
          <p className="text-xs text-[var(--text-muted)] font-mono">
            {workout.localDate} · Finished Strong
          </p>
        </div>

        {/* PR Records Alert if any */}
        {prs.length > 0 && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-md">
            <div className="flex items-center space-x-2 text-amber-400 mb-2">
              <Trophy className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Personal Records ({prs.length})
              </span>
            </div>
            <div className="space-y-1">
              {prs.map((pr, idx) => (
                <div key={idx} className="text-xs flex items-center justify-between text-slate-200">
                  <span className="capitalize">{pr.kind.replace('_', ' ')}:</span>
                  <span className="font-mono font-bold text-amber-300">
                    {pr.value} {pr.kind === 'rep_pr' ? 'reps' : 'kg'}{' '}
                    {pr.previousValue && (
                      <span className="text-[10px] text-[var(--text-muted)] font-normal">
                        (prev {pr.previousValue})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Core Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-sm text-center">
            <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">
              Duration
            </div>
            <div className="text-lg font-bold font-mono text-white mt-0.5">
              {durationMins}m {durationSecs}s
            </div>
          </div>

          <div className="p-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-sm text-center">
            <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">
              Total Volume
            </div>
            <div className="text-lg font-bold font-mono text-[#d9083c] mt-0.5">
              {summary.totalVolumeKg.toLocaleString()}{' '}
              <span className="text-xs text-[var(--text-muted)] font-normal">kg</span>
            </div>
          </div>

          <div className="p-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-sm text-center">
            <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">
              Total Reps
            </div>
            <div className="text-lg font-bold font-mono text-white mt-0.5">
              {summary.totalReps}
            </div>
          </div>

          <div className="p-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-sm text-center">
            <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">
              Sets
            </div>
            <div className="text-lg font-bold font-mono text-white mt-0.5">
              {summary.workingSets}{' '}
              {summary.warmupSets > 0 && (
                <span className="text-xs text-amber-500 font-normal">
                  (+{summary.warmupSets}w)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Muscle Groups Trained Breakdown */}
        {muscleList.length > 0 && (
          <div className="p-4 bg-[#1e1e1e]/60 border border-[#2a2a2a] rounded-sm space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Muscle Groups Trained (Weighted Sets)
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {muscleList.map(([muscle, count]) => (
                <div
                  key={muscle}
                  className="px-2.5 py-1 bg-[#161616] border border-[#2a2a2a] rounded-sm text-xs flex items-center space-x-1.5"
                >
                  <span className="text-slate-300">{getMuscleName(muscle)}</span>
                  <span className="font-mono font-bold text-[#d9083c]">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mood and Energy Rating */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              Session Mood
            </label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setMood(lvl as any)}
                  className={`flex-1 py-1 text-xs font-bold rounded-sm border transition-colors ${
                    mood === lvl
                      ? 'bg-[#d9083c] border-[#d9083c] text-white'
                      : 'bg-[#1e1e1e] border-[#2a2a2a] text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              Energy Level
            </label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setEnergy(lvl as any)}
                  className={`flex-1 py-1 text-xs font-bold rounded-sm border transition-colors ${
                    energy === lvl
                      ? 'bg-amber-500 border-amber-500 text-black'
                      : 'bg-[#1e1e1e] border-[#2a2a2a] text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Workout Notes Input */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Workout Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did this workout feel? (e.g. felt strong on bench press, great mind-muscle connection)..."
            className="flat-input w-full p-2.5 text-xs text-white resize-none"
          />
        </div>

        {/* Modal Done Action */}
        <div className="pt-2 border-t border-[#2a2a2a] flex items-center justify-end space-x-3">
          <button
            onClick={handleFinishDone}
            className="btn-primary w-full py-2.5 text-xs flex items-center justify-center space-x-2"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Done · View in History</span>
          </button>
        </div>
      </div>
    </div>
  );
}
