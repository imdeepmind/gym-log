import React, { useState } from 'react';
import { SetEntry, Exercise, SetType, PRRecord } from '@/types';
import { toggleSetCompleted, updateSet, deleteSet } from '@/services/workout';
import { useRestTimerStore } from '@/hooks/useRestTimer';
import { Check, Trophy, MoreVertical, Copy, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  set: SetEntry;
  exercise: Exercise;
  previousSet?: SetEntry;
  onPRDetected?: (records: PRRecord[]) => void;
}

export function SetRow({ set, exercise, previousSet, onPRDetected }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [prRecords, setPrRecords] = useState<PRRecord[]>([]);
  const startRestTimer = useRestTimerStore((s) => s.start);

  const handleToggleComplete = async () => {
    const nextState = !set.completed;
    const { prRecords } = await toggleSetCompleted(set.id, nextState);

    if (nextState) {
      // Start rest timer
      const restSec = exercise.defaultRestSec || 90;
      startRestTimer(restSec, exercise.name);

      if (prRecords.length > 0) {
        setPrRecords(prRecords);
        if (onPRDetected) {
          onPRDetected(prRecords);
        }
      }
    } else {
      setPrRecords([]);
    }
  };

  const handleWeightChange = (newVal: number) => {
    const val = Math.max(0, newVal);
    updateSet(set.id, { weightKg: Math.round(val * 10) / 10 });
  };

  const handleRepsChange = (newVal: number) => {
    const val = Math.max(0, newVal);
    updateSet(set.id, { reps: Math.round(val) });
  };

  const handleDurationChange = (newVal: number) => {
    const val = Math.max(0, newVal);
    updateSet(set.id, { durationSec: Math.round(val) });
  };

  const handleCopyPrevious = () => {
    if (!previousSet) return;
    updateSet(set.id, {
      weightKg: previousSet.weightKg,
      reps: previousSet.reps,
      durationSec: previousSet.durationSec,
      distanceM: previousSet.distanceM,
    });
  };

  const getSetBadge = (type: SetType, order: number) => {
    switch (type) {
      case 'warmup':
        return <span className="text-amber-500 font-bold">W</span>;
      case 'drop':
        return <span className="text-purple-400 font-bold">D</span>;
      case 'failure':
        return <span className="text-rose-500 font-bold">F</span>;
      default:
        return <span>{order}</span>;
    }
  };

  return (
    <div
      className={`py-2 px-3 flex items-center justify-between text-xs transition-colors rounded-sm border-b border-[#2a2a2a]/60 ${
        set.completed ? 'bg-emerald-500/5' : 'hover:bg-[#1e1e1e]/60'
      }`}
    >
      {/* Set Number / Badge */}
      <div className="w-8 flex items-center justify-start space-x-1">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-6 h-6 rounded-sm bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center font-mono text-[11px] font-semibold text-[var(--text-muted)] hover:text-white"
          title="Change set type or notes"
        >
          {getSetBadge(set.type, set.order)}
        </button>
      </div>

      {/* Previous Performance Preview */}
      <div className="w-20 text-[11px] font-mono text-[var(--text-muted)] truncate text-left hidden sm:block">
        {previousSet ? (
          previousSet.durationSec ? (
            `${previousSet.durationSec}s`
          ) : (
            `${previousSet.weightKg ?? '-'}k × ${previousSet.reps ?? '-'}`
          )
        ) : (
          <span className="opacity-40">-</span>
        )}
      </div>

      {/* Inputs per tracking type */}
      <div className="flex-1 flex items-center justify-center space-x-2 sm:space-x-4 max-w-xs mx-auto">
        {exercise.trackingType === 'duration' ? (
          /* Duration Input */
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleDurationChange((set.durationSec || 0) - 5)}
              className="w-6 h-6 bg-[#1e1e1e] border border-[#2a2a2a] rounded-sm text-xs font-bold text-[var(--text-muted)] hover:text-white"
            >
              -
            </button>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Secs"
              value={set.durationSec ?? ''}
              onChange={(e) => handleDurationChange(parseFloat(e.target.value) || 0)}
              className="w-16 p-1 text-center font-mono text-sm bg-transparent border-b border-[#2a2a2a] focus:border-[#d9083c] outline-none text-white"
            />
            <span className="text-[10px] text-[var(--text-muted)] font-mono">s</span>
            <button
              onClick={() => handleDurationChange((set.durationSec || 0) + 5)}
              className="w-6 h-6 bg-[#1e1e1e] border border-[#2a2a2a] rounded-sm text-xs font-bold text-[var(--text-muted)] hover:text-white"
            >
              +
            </button>
          </div>
        ) : (
          /* Weight & Reps Inputs */
          <div className="flex items-center space-x-2">
            {/* Weight field with steppers */}
            {exercise.trackingType !== 'bodyweight_reps' && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleWeightChange((set.weightKg || 0) - 2.5)}
                  className="w-5 h-6 bg-[#1e1e1e] border border-[#2a2a2a] rounded-sm text-xs font-bold text-[var(--text-muted)] hover:text-white"
                  title="-2.5 kg"
                >
                  -
                </button>
                <input
                  type="number"
                  step="0.5"
                  inputMode="decimal"
                  placeholder="kg"
                  value={set.weightKg ?? ''}
                  onChange={(e) => handleWeightChange(parseFloat(e.target.value) || 0)}
                  className="w-14 p-1 text-center font-mono text-sm bg-transparent border-b border-[#2a2a2a] focus:border-[#d9083c] outline-none text-white tabular-nums"
                />
                <button
                  onClick={() => handleWeightChange((set.weightKg || 0) + 2.5)}
                  className="w-5 h-6 bg-[#1e1e1e] border border-[#2a2a2a] rounded-sm text-xs font-bold text-[var(--text-muted)] hover:text-white"
                  title="+2.5 kg"
                >
                  +
                </button>
              </div>
            )}

            <span className="text-[var(--text-muted)] font-mono">×</span>

            {/* Reps field with steppers */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleRepsChange((set.reps || 0) - 1)}
                className="w-5 h-6 bg-[#1e1e1e] border border-[#2a2a2a] rounded-sm text-xs font-bold text-[var(--text-muted)] hover:text-white"
                title="-1 rep"
              >
                -
              </button>
              <input
                type="number"
                inputMode="numeric"
                placeholder="reps"
                value={set.reps ?? ''}
                onChange={(e) => handleRepsChange(parseInt(e.target.value, 10) || 0)}
                className="w-12 p-1 text-center font-mono text-sm bg-transparent border-b border-[#2a2a2a] focus:border-[#d9083c] outline-none text-white tabular-nums"
              />
              <button
                onClick={() => handleRepsChange((set.reps || 0) + 1)}
                className="w-5 h-6 bg-[#1e1e1e] border border-[#2a2a2a] rounded-sm text-xs font-bold text-[var(--text-muted)] hover:text-white"
                title="+1 rep"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PR Badge if earned */}
      <div className="w-16 flex items-center justify-end space-x-1">
        {prRecords.length > 0 && (
          <span className="inline-flex items-center text-[10px] font-bold text-[#d9083c] bg-[#d9083c]/10 px-1.5 py-0.5 rounded-sm border border-[#d9083c]/30 animate-pulse">
            <Trophy className="w-3 h-3 mr-0.5" />
            PR
          </span>
        )}

        {/* Copy Previous Button */}
        {previousSet && !set.completed && (
          <button
            onClick={handleCopyPrevious}
            className="p-1 text-[var(--text-muted)] hover:text-white rounded-sm"
            title="Copy previous performance"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Complete Checkbox - Matching todo.imdeepmind.com flat checkmark */}
        <button
          onClick={handleToggleComplete}
          className={`w-7 h-7 rounded-sm border flex items-center justify-center transition-all ${
            set.completed
              ? 'bg-[#d9083c] border-[#d9083c] text-white'
              : 'border-[#3a3a3a] hover:border-[#d9083c] bg-[#161616]'
          }`}
          title={set.completed ? 'Mark incomplete' : 'Complete set'}
        >
          {set.completed && <Check className="w-4 h-4 stroke-[3]" />}
        </button>
      </div>

      {/* Set Options Dropdown / Modal */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#161616] border border-[#2a2a2a] w-full max-w-xs p-4 rounded-md space-y-3 text-[#f0f0f0]">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2a]">
              <span className="font-bold text-sm">Set {set.order} Options</span>
              <button
                onClick={() => setShowMenu(false)}
                className="text-[var(--text-muted)] hover:text-white text-xs uppercase"
              >
                Close
              </button>
            </div>

            {/* Set Type Tag Selection */}
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                Set Type
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['working', 'warmup', 'drop', 'failure'] as SetType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      updateSet(set.id, { type: t });
                      setShowMenu(false);
                    }}
                    className={`py-1.5 text-xs font-semibold capitalize rounded-sm border transition-colors ${
                      set.type === t
                        ? 'bg-[#d9083c] border-[#d9083c] text-white'
                        : 'border-[#2a2a2a] bg-[#1e1e1e] text-[var(--text-muted)] hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* RPE & RIR */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase block mb-1">
                  RPE (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="0.5"
                  value={set.rpe ?? ''}
                  onChange={(e) => updateSet(set.id, { rpe: parseFloat(e.target.value) || undefined })}
                  placeholder="e.g. 8.5"
                  className="flat-input w-full p-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase block mb-1">
                  RIR (reps in reserve)
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={set.rir ?? ''}
                  onChange={(e) => updateSet(set.id, { rir: parseInt(e.target.value, 10) || undefined })}
                  placeholder="e.g. 2"
                  className="flat-input w-full p-1.5 text-xs font-mono"
                />
              </div>
            </div>

            {/* Delete Set Action */}
            <div className="pt-2 border-t border-[#2a2a2a]">
              <button
                onClick={() => {
                  deleteSet(set.id);
                  setShowMenu(false);
                }}
                className="w-full flex items-center justify-center space-x-1.5 text-rose-500 hover:bg-rose-500/10 p-2 rounded-sm text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Set</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
