import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Workout, WorkoutSummary, PRRecord, Exercise } from '@/types';
import {
  finishWorkout,
  discardWorkout,
  addExerciseToWorkout,
} from '@/services/workout';
import { calculateSetVolume } from '@/domain/calc';
import { kgToLb } from '@/domain/units';
import { ExerciseCard } from './ExerciseCard';
import { ExercisePickerModal } from './ExercisePickerModal';
import { FinishSummaryModal } from './FinishSummaryModal';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useConfirm } from '@/hooks/useConfirm';
import {
  Clock,
  Plus,
  Check,
  Trash2,
  Edit2,
  AlertCircle,
  Dumbbell,
  Play,
  Activity,
} from 'lucide-react';

interface Props {
  workout: Workout;
  onFinishComplete?: () => void;
  onDiscardComplete?: () => void;
}

export function ActiveWorkoutView({
  workout,
  onFinishComplete,
  onDiscardComplete,
}: Props) {
  // Screen wake lock while workout is active
  useWakeLock(true);
  const confirm = useConfirm();

  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [workoutName, setWorkoutName] = useState(workout.name);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [finishSummary, setFinishSummary] = useState<WorkoutSummary | null>(null);
  const [sessionPRs, setSessionPRs] = useState<PRRecord[]>([]);

  // Live query for workout exercises
  const workoutExercises = useLiveQuery(
    () =>
      db.workoutExercises
        .where('workoutId')
        .equals(workout.id)
        .sortBy('order'),
    [workout.id],
    []
  );

  // Live query for all sets in this active workout
  const allSets = useLiveQuery(
    () => db.sets.where('workoutId').equals(workout.id).toArray(),
    [workout.id],
    []
  );

  // Live query for all exercises to attribute tracking types
  const allExercises = useLiveQuery(() => db.exercises.toArray(), [], []);
  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    allExercises.forEach((e) => map.set(e.id, e));
    return map;
  }, [allExercises]);

  // Live query for user unit preference
  const settingsRecords = useLiveQuery(() => db.settings.toArray(), [], []);
  const userUnit = useMemo(() => {
    const record = settingsRecords.find((s) => s.key === 'unit');
    return (record?.value as 'kg' | 'lb') || 'kg';
  }, [settingsRecords]);

  // Real-time calculated workout stats
  const liveStats = useMemo(() => {
    let totalVolumeKg = 0;
    let totalReps = 0;
    let completedSetsCount = 0;
    const totalSetsCount = allSets.length;

    for (const set of allSets) {
      if (!set.completed) continue;

      completedSetsCount++;
      totalReps += set.reps || 0;

      const ex = exerciseMap.get(set.exerciseId);
      const trackingType = ex?.trackingType || 'weight_reps';
      const vol = calculateSetVolume(
        trackingType,
        set.type,
        set.weightKg,
        set.reps,
        workout.bodyweightKg
      );
      totalVolumeKg += vol;
    }

    const displayVolume =
      userUnit === 'lb'
        ? Math.round(kgToLb(totalVolumeKg) * 10) / 10
        : Math.round(totalVolumeKg * 10) / 10;

    return {
      totalVolume: displayVolume,
      totalVolumeKg,
      totalReps,
      completedSetsCount,
      totalSetsCount,
      unit: userUnit,
    };
  }, [allSets, exerciseMap, workout.bodyweightKg, userUnit]);

  // Live timer derived from now - startedAt per spec 7.2
  useEffect(() => {
    const updateElapsed = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - workout.startedAt) / 1000));
      setElapsedSec(diff);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    // Instantly resync clock on foreground wake-up (switching back from other apps/music)
    const handleWakeUp = () => {
      if (document.visibilityState === 'visible') {
        updateElapsed();
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
  }, [workout.startedAt]);

  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;
  const hours = Math.floor(mins / 60);
  const formattedTime =
    hours > 0
      ? `${hours}:${(mins % 60).toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins}:${secs.toString().padStart(2, '0')}`;

  const handleSaveName = async () => {
    if (workoutName.trim()) {
      await db.workouts.update(workout.id, { name: workoutName.trim() });
    }
    setIsEditingName(false);
  };

  const handleAddExercise = async (exerciseId: string) => {
    await addExerciseToWorkout(workout.id, exerciseId);
  };

  const handleFinish = async () => {
    const completedSets = await db.sets
      .where('workoutId')
      .equals(workout.id)
      .filter((s) => s.completed)
      .toArray();

    if (completedSets.length === 0) {
      const ok = await confirm({
        title: 'No Completed Sets',
        message: 'No sets have been completed in this session yet. Do you want to discard this workout instead?',
        confirmText: 'Discard Workout',
        cancelText: 'Keep Editing',
        variant: 'warning',
      });
      if (ok) {
        await discardWorkout(workout.id);
        if (onDiscardComplete) onDiscardComplete();
      }
      return;
    }

    const summary = await finishWorkout(workout.id);
    setFinishSummary(summary);
    setIsSummaryOpen(true);
  };

  const handleDiscard = async () => {
    const ok = await confirm({
      title: 'Discard Workout',
      message: 'Are you sure you want to discard this workout? All logged sets and notes will be permanently deleted.',
      confirmText: 'Discard',
      variant: 'danger',
    });
    if (ok) {
      await discardWorkout(workout.id);
      if (onDiscardComplete) onDiscardComplete();
    }
  };

  const handleSaveSummaryNotes = async (
    notes: string,
    mood?: 1 | 2 | 3 | 4 | 5,
    energy?: 1 | 2 | 3 | 4 | 5
  ) => {
    await db.workouts.update(workout.id, {
      notes,
      mood,
      energy,
    });
    if (onFinishComplete) onFinishComplete();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 pb-24 sm:pb-20">
      {/* Sticky Top Bar for Active Workout Status */}
      <div className="flat-card p-4 flex flex-wrap items-center justify-between gap-3 border-[#d9083c]/40">
        <div className="flex-1 min-w-[200px]">
          {isEditingName ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                autoFocus
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="flat-input text-base font-bold text-[var(--text-color)] px-2 py-1"
              />
              <button onClick={handleSaveName} className="btn-primary text-xs py-1 px-2.5">
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <h2
                onClick={() => setIsEditingName(true)}
                className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-color)] hover:text-[#d9083c] cursor-pointer flex items-center group transition-colors"
              >
                <span>{workout.name}</span>
                <Edit2 className="w-3.5 h-3.5 ml-1.5 opacity-40 group-hover:opacity-100" />
              </h2>
            </div>
          )}

          <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)] mt-1">
            <span className="flex items-center text-[#d9083c] font-mono font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#d9083c] mr-1.5 animate-pulse" />
              In Progress
            </span>
            <span>·</span>
            <span className="font-mono">{workout.localDate}</span>
          </div>
        </div>

        {/* Live Elapsed Timer */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Elapsed Time
            </div>
            <div className="font-mono text-xl sm:text-2xl font-bold text-[var(--text-color)] tabular-nums">
              {formattedTime}
            </div>
          </div>

          {/* Finish & Discard Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDiscard}
              className="p-2.5 text-xs text-[var(--text-muted)] hover:text-rose-500 bg-[var(--hover-bg)] hover:bg-rose-500/10 border border-[var(--border-color)] rounded-sm transition-colors"
              title="Discard Workout"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleFinish}
              className="btn-primary flex items-center space-x-1.5 text-xs py-2.5 px-4 shadow-lg"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Finish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Exercises List */}
      <div className="space-y-4">
        {workoutExercises.length === 0 ? (
          <div className="flat-card p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-sm bg-[var(--hover-bg)] border border-[var(--border-color)] flex items-center justify-center mx-auto text-[#d9083c]">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-color)]">Empty Session</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              Add your first movement to start logging sets, weights, reps, and track personal records in real time.
            </p>
            <button
              onClick={() => setIsPickerOpen(true)}
              className="btn-primary text-xs py-2 px-4 inline-flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Movement</span>
            </button>
          </div>
        ) : (
          workoutExercises.map((we) => (
            <ExerciseCard
              key={we.id}
              workoutExercise={we}
              onPRDetected={(records) => {
                setSessionPRs((prev) => [...prev, ...records]);
              }}
            />
          ))
        )}
      </div>

      {/* Bottom Add Exercise Bar */}
      {workoutExercises.length > 0 && (
        <div className="flex items-center justify-center pt-2">
          <button
            onClick={() => setIsPickerOpen(true)}
            className="btn-secondary w-full py-3 text-xs flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4 text-[#d9083c]" />
            <span>Add Exercise ({200} available)</span>
          </button>
        </div>
      )}

      {/* Live Session Totals Summary Card at bottom */}
      {workoutExercises.length > 0 && (
        <div className="flat-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#d9083c] animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-color)]">
                Live Workout Stats
              </h4>
            </div>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              {liveStats.completedSetsCount} of {liveStats.totalSetsCount} sets completed
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-sm text-center">
              <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">
                Total Weight
              </div>
              <div className="text-base sm:text-xl font-bold font-mono text-[#d9083c] mt-0.5">
                {liveStats.totalVolume.toLocaleString()}{' '}
                <span className="text-xs font-normal text-[var(--text-muted)]">{liveStats.unit}</span>
              </div>
            </div>

            <div className="p-3 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-sm text-center">
              <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">
                Total Reps
              </div>
              <div className="text-base sm:text-xl font-bold font-mono text-[var(--text-color)] mt-0.5">
                {liveStats.totalReps}
              </div>
            </div>

            <div className="p-3 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-sm text-center">
              <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">
                Sets Done
              </div>
              <div className="text-base sm:text-xl font-bold font-mono text-[var(--text-color)] mt-0.5">
                {liveStats.completedSetsCount}{' '}
                <span className="text-xs font-normal text-[var(--text-muted)]">/ {liveStats.totalSetsCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Picker Modal */}
      <ExercisePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleAddExercise}
      />

      {/* Finish Summary Modal */}
      {finishSummary && (
        <FinishSummaryModal
          isOpen={isSummaryOpen}
          workout={workout}
          summary={finishSummary}
          prs={sessionPRs}
          onClose={() => {
            setIsSummaryOpen(false);
            if (onFinishComplete) onFinishComplete();
          }}
          onSaveNotes={handleSaveSummaryNotes}
        />
      )}

      {/* Sticky Bottom Live Stats Bar while workout is going on */}
      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:bottom-0 left-0 right-0 md:left-16 z-30 bg-[var(--card-bg)]/95 backdrop-blur-md border-t border-[var(--border-color)] px-4 py-2.5 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-around text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">Weight:</span>
            <span className="font-mono font-bold text-[#d9083c]">
              {liveStats.totalVolume.toLocaleString()} {liveStats.unit}
            </span>
          </div>
          <span className="text-[var(--border-color)]">|</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">Reps:</span>
            <span className="font-mono font-bold text-[var(--text-color)]">{liveStats.totalReps}</span>
          </div>
          <span className="text-[var(--border-color)]">|</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">Sets:</span>
            <span className="font-mono font-bold text-[var(--text-color)]">
              {liveStats.completedSetsCount} / {liveStats.totalSetsCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
