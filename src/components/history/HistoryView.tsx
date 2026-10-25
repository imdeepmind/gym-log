import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Workout, SetEntry, Exercise } from '@/types';
import {
  Clock,
  Dumbbell,
  Flame,
  Calendar,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  X,
} from 'lucide-react';
import { getMuscleName, ALL_MUSCLES } from '@/domain/muscles';
import { useConfirm } from '@/hooks/useConfirm';

export function HistoryView() {
  const confirm = useConfirm();
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMuscle, setFilterMuscle] = useState<string>('all');
  const [filterExerciseId, setFilterExerciseId] = useState<string>('all');

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
  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    allExercises.forEach((ex) => map.set(ex.id, ex));
    return map;
  }, [allExercises]);

  const allSets = useLiveQuery(() => db.sets.toArray(), [], []);

  // Sets grouped by workoutId
  const setsByWorkoutMap = useMemo(() => {
    const map = new Map<string, SetEntry[]>();
    for (const s of allSets) {
      const list = map.get(s.workoutId) || [];
      list.push(s);
      map.set(s.workoutId, list);
    }
    return map;
  }, [allSets]);

  // Spec 12 multi-dimensional search algorithm
  const filteredWorkouts = useMemo(() => {
    return workouts.filter((w) => {
      const workoutSets = setsByWorkoutMap.get(w.id) || [];

      // Muscle group filter
      if (filterMuscle !== 'all') {
        const hasMuscle = workoutSets.some((s) => {
          const ex = exerciseMap.get(s.exerciseId);
          return (
            ex &&
            (ex.primaryMuscle === filterMuscle || ex.secondaryMuscles.includes(filterMuscle as any))
          );
        });
        if (!hasMuscle) return false;
      }

      // Exercise filter
      if (filterExerciseId !== 'all') {
        const hasEx = workoutSets.some((s) => s.exerciseId === filterExerciseId);
        if (!hasEx) return false;
      }

      // Text Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = w.name.toLowerCase().includes(query);
        const matchesNotes = (w.notes || '').toLowerCase().includes(query);
        const matchesDate = w.localDate.includes(query);
        const matchesAnyMovement = workoutSets.some((s) => {
          const ex = exerciseMap.get(s.exerciseId);
          return (
            (ex?.name.toLowerCase().includes(query) ?? false) ||
            (s.notes?.toLowerCase().includes(query) ?? false)
          );
        });

        if (!matchesName && !matchesNotes && !matchesDate && !matchesAnyMovement) {
          return false;
        }
      }

      return true;
    });
  }, [workouts, searchQuery, filterMuscle, filterExerciseId, setsByWorkoutMap, exerciseMap]);

  const handleDelete = async (e: React.MouseEvent, workoutId: string) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Delete Workout',
      message: 'Delete this workout permanently from your history? All associated sets and logs will be permanently deleted.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) {
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

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-[#2a2a2a]">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Workout History</h2>
          <p className="text-xs text-[var(--text-muted)]">
            {workouts.length} total sessions recorded with zero data loss
          </p>
        </div>
      </div>

      {/* Advanced Multi-Filter Search Bar (Spec 12) */}
      <div className="flat-card p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search workouts by name, exercise, date, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flat-input w-full pl-9 pr-3 py-2 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Selectors */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-[var(--text-muted)]">Muscle:</span>
            <select
              value={filterMuscle}
              onChange={(e) => setFilterMuscle(e.target.value)}
              className="flat-input py-1 px-2 text-xs bg-[#161616]"
            >
              <option value="all">All Muscle Groups</option>
              {ALL_MUSCLES.map((m) => (
                <option key={m} value={m}>
                  {getMuscleName(m)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[var(--text-muted)]">Movement:</span>
            <select
              value={filterExerciseId}
              onChange={(e) => setFilterExerciseId(e.target.value)}
              className="flat-input py-1 px-2 text-xs bg-[#161616] max-w-[200px]"
            >
              <option value="all">All Movements</option>
              {allExercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {(filterMuscle !== 'all' || filterExerciseId !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setFilterMuscle('all');
                setFilterExerciseId('all');
                setSearchQuery('');
              }}
              className="text-xs text-[#d9083c] hover:underline font-semibold ml-auto"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Workouts List */}
      {filteredWorkouts.length === 0 ? (
        <div className="flat-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-sm bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center mx-auto text-[var(--text-muted)]">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Workouts Found</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            {workouts.length === 0
              ? 'Start your first workout from the Workout tab. Once finished, your sessions will be archived here.'
              : 'No completed workouts match your current search and filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWorkouts.map((workout) => {
            const isExpanded = expandedWorkoutId === workout.id;
            const summary = workout.summary;
            const durationMins = summary ? Math.floor(summary.durationSec / 60) : 0;
            const workoutSets = setsByWorkoutMap.get(workout.id) || [];

            // Group sets by exercise
            const setsByExercise = new Map<string, SetEntry[]>();
            if (isExpanded) {
              workoutSets.forEach((s) => {
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
      )}
    </div>
  );
}
