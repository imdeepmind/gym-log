import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { WorkoutExercise, Exercise, SetEntry, PRRecord } from '@/types';
import { addSetToExercise, removeWorkoutExercise, getPreviousPerformanceSets } from '@/services/workout';
import { SetRow } from './SetRow';
import { Plus, MoreVertical, Trash2, Clock, MessageSquare, Repeat } from 'lucide-react';

interface Props {
  workoutExercise: WorkoutExercise;
  onPRDetected?: (records: PRRecord[]) => void;
  onSwap?: (workoutExerciseId: string) => void;
}

export function ExerciseCard({ workoutExercise, onPRDetected, onSwap }: Props) {
  const [showNotes, setShowNotes] = useState(false);
  const [notesText, setNotesText] = useState(workoutExercise.notes || '');

  // Live query for exercise entity
  const exercise = useLiveQuery(
    () => db.exercises.get(workoutExercise.exerciseId),
    [workoutExercise.exerciseId]
  );

  // Live query for this exercise's sets in this workout
  const sets = useLiveQuery(
    () =>
      db.sets
        .where('workoutExerciseId')
        .equals(workoutExercise.id)
        .sortBy('order'),
    [workoutExercise.id],
    []
  );

  // Previous performance sets for comparison
  const previousPerformance = useLiveQuery(
    () => getPreviousPerformanceSets(workoutExercise.exerciseId),
    [workoutExercise.exerciseId],
    []
  );

  if (!exercise) return null;

  const handleAddSet = async () => {
    await addSetToExercise(workoutExercise.id, exercise.id, workoutExercise.workoutId);
  };

  const handleRemove = async () => {
    if (confirm(`Remove ${exercise.name} from this workout?`)) {
      await removeWorkoutExercise(workoutExercise.id);
    }
  };

  const handleSaveNotes = async () => {
    await db.workoutExercises.update(workoutExercise.id, { notes: notesText });
    setShowNotes(false);
  };

  return (
    <div className="flat-card mb-4 overflow-hidden">
      {/* Exercise Header */}
      <div className="px-4 py-3 bg-[#161616] border-b border-[#2a2a2a] flex items-center justify-between">
        <div className="flex-1 pr-2">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-base text-white tracking-tight">
              {exercise.name}
            </h3>
            {workoutExercise.supersetGroup && (
              <span className="text-[10px] font-mono uppercase bg-[#d9083c]/10 text-[#d9083c] border border-[#d9083c]/30 px-1.5 py-0.2 rounded-sm">
                Superset {workoutExercise.supersetGroup}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)] mt-0.5">
            <span className="capitalize">{exercise.primaryMuscle.replace('_', ' ')}</span>
            <span>·</span>
            <span className="capitalize">{exercise.equipment}</span>
            {exercise.defaultRestSec && (
              <>
                <span>·</span>
                <span className="flex items-center text-[11px] font-mono">
                  <Clock className="w-3 h-3 mr-0.5 text-[var(--text-muted)]" />
                  {exercise.defaultRestSec}s rest
                </span>
              </>
            )}
          </div>
        </div>

        {/* Card Actions */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`p-1.5 rounded-sm transition-colors ${
              showNotes || workoutExercise.notes
                ? 'text-[#d9083c] bg-[#d9083c]/10'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
            title="Exercise notes"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          {onSwap && (
            <button
              onClick={() => onSwap(workoutExercise.id)}
              className="p-1.5 text-[var(--text-muted)] hover:text-white rounded-sm transition-colors"
              title="Swap movement"
            >
              <Repeat className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleRemove}
            className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 rounded-sm transition-colors"
            title="Remove from workout"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Optional Exercise Notes Form */}
      {showNotes && (
        <div className="p-3 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center space-x-2">
          <input
            type="text"
            placeholder="Notes for this exercise (e.g. pause at bottom, narrow grip)..."
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            className="flat-input flex-1 p-1.5 text-xs text-white"
          />
          <button onClick={handleSaveNotes} className="btn-primary text-xs py-1.5 px-3">
            Save
          </button>
        </div>
      )}

      {/* Set Rows Header */}
      <div className="px-3 py-1.5 bg-[#121212]/80 border-b border-[#2a2a2a]/60 flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        <span className="w-8 text-left">Set</span>
        <span className="w-20 text-left hidden sm:block">Previous</span>
        <span className="flex-1 text-center">
          {exercise.trackingType === 'duration' ? 'Duration' : 'Weight & Reps'}
        </span>
        <span className="w-16 text-right">Done</span>
      </div>

      {/* Set Rows */}
      <div className="divide-y divide-[#2a2a2a]/40">
        {sets.map((set, idx) => (
          <SetRow
            key={set.id}
            set={set}
            exercise={exercise}
            previousSet={previousPerformance[idx]}
            onPRDetected={onPRDetected}
          />
        ))}
      </div>

      {/* Add Set Button */}
      <div className="p-2 bg-[#141414] border-t border-[#2a2a2a] flex items-center justify-between">
        <button
          onClick={handleAddSet}
          className="w-full py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-white hover:bg-[#1e1e1e] rounded-sm transition-colors flex items-center justify-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5 text-[#d9083c]" />
          <span>Add Set</span>
        </button>
      </div>
    </div>
  );
}
