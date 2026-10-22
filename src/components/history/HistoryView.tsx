import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Workout, SetEntry, Exercise } from '@/types';
import { Clock, Dumbbell, Flame, Calendar, Trash2, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { getMuscleName } from '@/domain/muscles';

export function HistoryView() {
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  // Load completed workouts reverse chronological
  const workouts = useLiveQuery(
    () =>
      db.workouts
        .where('status')
        .equals('completed')
        .reverse()
        .sortBy('startedAt'),
    [],
    []
  );

  const allExercises = useLiveQuery(() => db.exercises.toArray(), [], []);
  const exerciseMap = new Map<string, Exercise>();
  allExercises.forEach((ex) => exerciseMap.set(ex.id, ex));

  // Load all sets for expanded workout
  const expandedSets = useLiveQuery<SetEntry[], SetEntry[]>(
    () =>
      expandedWorkoutId
        ? db.sets.where('workoutId').equals(expandedWorkoutId).sortBy('order')
        : Promise.resolve<SetEntry[]>([]),
    [expandedWorkoutId],
    []
  );

  const handleDelete = async (e: React.MouseEvent, workoutId: string) => {
    e.stopPropagation();
    if (confirm('Delete this workout permanently from your history?')) {
      await db.transaction('rw', [db.workouts, db.workoutExercises, db.sets], async () => {
        await db.sets.where('workoutId').equals(workoutId).delete();
        await db.workoutExercises.where('workoutId').equals(workoutId).delete();
        await db.workouts.delete(workoutId);
      });
      if (expandedWorkoutId === workoutId) {
        setExpandedWorkoutId(null);
      }
    }
  };

  if (workouts.length === 0) {
    return (
      <div className="flat-card p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-sm bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center mx-auto text-[var(--text-muted)]">
          <Calendar className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">No Logged Workouts</h3>
        <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
          Start your first workout from the Workout tab. Once you complete a session, your full logs, volumes, and PRs will be archived here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-1 border-b border-[#2a2a2a]">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Workout History</h2>
          <p className="text-xs text-[var(--text-muted)]">
            {workouts.length} total sessions recorded with zero data loss
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {workouts.map((workout) => {
          const isExpanded = expandedWorkoutId === workout.id;
          const summary = workout.summary;
          const durationMins = summary ? Math.floor(summary.durationSec / 60) : 0;

          // Group sets by exercise
          const setsByExercise = new Map<string, SetEntry[]>();
          if (isExpanded) {
            expandedSets.forEach((s) => {
              const current = setsByExercise.get(s.exerciseId) || [];
              current.push(s);
              setsByExercise.set(s.exerciseId, current);
            });
          }

          return (
            <div
              key={workout.id}
              onClick={() => setExpandedWorkoutId(isExpanded ? null : workout.id)}
              className="flat-card cursor-pointer overflow-hidden transition-all"
            >
              <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-base text-white tracking-tight hover:text-[#d9083c] transition-colors">
                      {workout.name}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)] mt-1 font-mono">
                    <span>{workout.localDate}</span>
                    {durationMins > 0 && (
                      <>
                        <span>·</span>
                        <span>{durationMins} mins</span>
                      </>
                    )}
                    {workout.mood && (
                      <>
                        <span>·</span>
                        <span className="text-amber-400">Mood {workout.mood}/5</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Summary Metrics Chips */}
                <div className="flex items-center space-x-3 text-xs">
                  {summary && (
                    <div className="flex items-center space-x-2 font-mono">
                      <div className="text-right">
                        <div className="text-[10px] text-[var(--text-muted)] uppercase">Volume</div>
                        <div className="font-bold text-white">
                          {summary.totalVolumeKg.toLocaleString()} kg
                        </div>
                      </div>
                      <div className="text-right pl-2 border-l border-[#2a2a2a]">
                        <div className="text-[10px] text-[var(--text-muted)] uppercase">Sets</div>
                        <div className="font-bold text-white">{summary.workingSets}</div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={(e) => handleDelete(e, workout.id)}
                    className="p-2 text-[var(--text-muted)] hover:text-rose-500 rounded-sm hover:bg-rose-500/10 transition-colors"
                    title="Delete workout"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="text-[var(--text-muted)]">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Session Detail View */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-[#2a2a2a] bg-[#121212]/60 space-y-4">
                  {workout.notes && (
                    <div className="p-3 bg-[#161616] border border-[#2a2a2a] rounded-sm text-xs text-slate-300">
                      <span className="font-semibold text-[var(--text-muted)] uppercase text-[10px] block mb-1">
                        Session Notes
                      </span>
                      {workout.notes}
                    </div>
                  )}

                  {/* Muscle breakdown chips */}
                  {summary?.muscleSets && Object.keys(summary.muscleSets).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(summary.muscleSets).map(([m, count]) => (
                        <span
                          key={m}
                          className="px-2 py-0.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-sm text-[11px] text-slate-300"
                        >
                          {getMuscleName(m as any)}: <strong className="text-[#d9083c]">{count}</strong>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Sets grouped by exercise */}
                  <div className="space-y-3">
                    {Array.from(setsByExercise.entries()).map(([exId, setsList]) => {
                      const exercise = exerciseMap.get(exId);
                      return (
                        <div key={exId} className="bg-[#161616] border border-[#2a2a2a] rounded-sm p-3">
                          <h4 className="font-semibold text-xs text-white mb-2">
                            {exercise?.name || 'Movement'}
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                            {setsList.map((s, idx) => (
                              <div
                                key={s.id}
                                className="p-1.5 bg-[#121212] border border-[#2a2a2a] rounded-sm flex items-center justify-between"
                              >
                                <span className="text-[var(--text-muted)] font-sans">Set {idx + 1}</span>
                                <span className="font-bold text-white">
                                  {s.durationSec
                                    ? `${s.durationSec}s`
                                    : `${s.weightKg ?? 0}k × ${s.reps ?? 0}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
