import React, { useState } from 'react';
import { SetEntry, Exercise, SetType, PRRecord, WorkoutExercise } from '@/types';
import { toggleSetCompleted, updateSet, deleteSet } from '@/services/workout';
import { useRestTimerStore } from '@/hooks/useRestTimer';
import { db } from '@/db/schema';
import { Check, Trophy, MoreVertical, Copy, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  set: SetEntry;
  exercise: Exercise;
  workoutExercise?: WorkoutExercise;
  allSets?: SetEntry[];
  previousSet?: SetEntry;
  onPRDetected?: (records: PRRecord[]) => void;
}

export function SetRow({
  set,
  exercise,
  workoutExercise,
  allSets,
  previousSet,
  onPRDetected,
}: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [prRecords, setPrRecords] = useState<PRRecord[]>([]);
  const startRestTimer = useRestTimerStore((s) => s.start);

  const handleToggleComplete = async () => {
    const nextState = !set.completed;
    const { prRecords } = await toggleSetCompleted(set.id, nextState);

    if (nextState) {
      // Check if all sets for this exercise/workout are now completed
      const otherSets = (allSets || []).filter((s) => s.id !== set.id);
      const isExerciseFinished = otherSets.every((s) => s.completed);

      // Fetch user settings for default rest and special between-exercise break
      const settingsRecords = await db.settings.toArray();
      const settingsMap = new Map(settingsRecords.map((s) => [s.key, s.value]));
      const defaultRest = (settingsMap.get('defaultRestSec') as number) || 90;
      const betweenExerciseRest = (settingsMap.get('betweenExerciseRestSec') as number) || 120;

      if (isExerciseFinished) {
        // Special break time when this workout/exercise is completed
        startRestTimer(betweenExerciseRest, exercise.name, true);
      } else {
        // Regular intra-set rest: takes configured break time for this workout/exercise
        const restSec = workoutExercise?.restSec || exercise.defaultRestSec || defaultRest;
        startRestTimer(restSec, exercise.name, false);
      }

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
      className={`py-2 px-3 flex items-center justify-between text-xs transition-colors rounded-sm border-b border-[var(--border-color)] ${
        set.completed ? 'bg-emerald-500/5' : 'hover:bg-[var(--hover-bg)]'
      }`}
    >
      {/* Set Number / Badge */}
      <div className="w-8 flex items-center justify-start space-x-1">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-6 h-6 rounded-sm bg-[var(--hover-bg)] border border-[var(--border-color)] flex items-center justify-center font-mono text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-color)]"
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
              className="w-6 h-6 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-sm text-xs font-bold text-[var(--text-color)] hover:bg-[var(--border-color)] transition-colors"
            >
              -
            </button>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Secs"
              value={set.durationSec ?? ''}
              onChange={(e) => handleDurationChange(parseFloat(e.target.value) || 0)}
              className="w-16 p-1 text-center font-mono text-sm bg-transparent border-b border-[var(--border-color)] focus:border-[#d9083c] outline-none text-[var(--text-color)]"
            />
            <span className="text-[10px] text-[var(--text-muted)] font-mono">s</span>
            <button
              onClick={() => handleDurationChange((set.durationSec || 0) + 5)}
              className="w-6 h-6 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-sm text-xs font-bold text-[var(--text-color)] hover:bg-[var(--border-color)] transition-colors"
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
                  className="w-5 h-6 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-sm text-xs font-bold text-[var(--text-color)] hover:bg-[var(--border-color)] transition-colors"
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
                  className="w-14 p-1 text-center font-mono text-sm bg-transparent border-b border-[var(--border-color)] focus:border-[#d9083c] outline-none text-[var(--text-color)] tabular-nums"
                />
                <button
                  onClick={() => handleWeightChange((set.weightKg || 0) + 2.5)}
                  className="w-5 h-6 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-sm text-xs font-bold text-[var(--text-color)] hover:bg-[var(--border-color)] transition-colors"
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
                className="w-5 h-6 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-sm text-xs font-bold text-[var(--text-color)] hover:bg-[var(--border-color)] transition-colors"
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
                className="w-12 p-1 text-center font-mono text-sm bg-transparent border-b border-[var(--border-color)] focus:border-[#d9083c] outline-none text-[var(--text-color)] tabular-nums"
              />
              <button
                onClick={() => handleRepsChange((set.reps || 0) + 1)}
                className="w-5 h-6 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-sm text-xs font-bold text-[var(--text-color)] hover:bg-[var(--border-color)] transition-colors"
                title="+1 rep"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PR Badge & Complete Checkbox */}
      <div className="w-20 flex items-center justify-end space-x-1.5 shrink-0">
        {prRecords.length > 0 && (
          <span className="inline-flex items-center text-[10px] font-bold text-[#d9083c] bg-[#d9083c]/10 px-1.5 py-0.5 rounded-sm border border-[#d9083c]/30 animate-pulse shrink-0">
            <Trophy className="w-3 h-3 mr-0.5 shrink-0" />
            <span>PR</span>
          </span>
        )}

        {/* Copy Previous Button */}
        {previousSet && !set.completed && (
          <button
            onClick={handleCopyPrevious}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-color)] rounded-sm shrink-0"
            title="Copy previous performance"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Complete Checkbox - Guaranteed square size with shrink-0 */}
        <button
          onClick={handleToggleComplete}
          className={`w-7 h-7 shrink-0 rounded-sm border flex items-center justify-center transition-all ${
            set.completed
              ? 'bg-[#d9083c] border-[#d9083c] text-white'
              : 'border-[var(--border-color)] hover:border-[#d9083c] bg-[var(--card-bg)] text-[var(--text-color)]'
          }`}
          title={set.completed ? 'Mark incomplete' : 'Complete set'}
        >
          {set.completed && <Check className="w-4 h-4 stroke-[3]" />}
        </button>
      </div>

      {/* Set Options Dropdown / Modal */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] w-full max-w-xs p-4 rounded-md space-y-3 text-[var(--text-color)]">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <span className="font-bold text-sm">Set {set.order} Options</span>
              <button
                onClick={() => setShowMenu(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-color)] text-xs uppercase"
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
                        : 'border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-color)]'
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
            <div className="pt-2 border-t border-[var(--border-color)]">
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
