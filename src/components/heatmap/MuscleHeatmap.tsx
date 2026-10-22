import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Muscle, Exercise, SetEntry } from '@/types';
import { ALL_MUSCLES, MUSCLE_DEFINITIONS, getMuscleName, addMuscleSets } from '@/domain/muscles';
import { subDays, parseISO, isAfter } from 'date-fns';
import { Activity, X, Info } from 'lucide-react';

interface Props {
  daysLookback?: number;
}

export function MuscleHeatmap({ daysLookback = 7 }: Props) {
  const [selectedMuscle, setSelectedMuscle] = useState<Muscle | null>(null);
  const [periodDays, setPeriodDays] = useState<number>(daysLookback);

  // Load all workouts, sets, and exercises from Dexie
  const workouts = useLiveQuery(() => db.workouts.where('status').equals('completed').toArray(), [], []);
  const allSets = useLiveQuery(() => db.sets.toArray(), [], []);
  const allExercises = useLiveQuery(() => db.exercises.toArray(), [], []);

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    allExercises.forEach((e) => map.set(e.id, e));
    return map;
  }, [allExercises]);

  // Filter workouts within the period
  const recentWorkouts = useMemo(() => {
    const cutoff = subDays(new Date(), periodDays);
    return workouts.filter((w) => isAfter(parseISO(w.localDate), cutoff));
  }, [workouts, periodDays]);

  // Aggregate weighted set counts per muscle
  const { muscleCounts, muscleContributionDetails } = useMemo(() => {
    const counts: Partial<Record<Muscle, number>> = {};
    const details: Record<Muscle, { exerciseName: string; sets: number; date: string }[]> = {} as any;
    ALL_MUSCLES.forEach((m) => {
      counts[m] = 0;
      details[m] = [];
    });

    const recentWorkoutIds = new Set(recentWorkouts.map((w) => w.id));
    const recentWorkoutMap = new Map(recentWorkouts.map((w) => [w.id, w]));

    const workingSets = allSets.filter(
      (s) => s.completed && s.type !== 'warmup' && recentWorkoutIds.has(s.workoutId)
    );

    // Group sets by workout and exercise
    const workoutExerciseCounts = new Map<string, number>();
    for (const s of workingSets) {
      const key = `${s.workoutId}_${s.exerciseId}`;
      workoutExerciseCounts.set(key, (workoutExerciseCounts.get(key) || 0) + 1);
    }

    for (const [key, setCount] of workoutExerciseCounts.entries()) {
      const [wId, exId] = key.split('_');
      const ex = exerciseMap.get(exId);
      const w = recentWorkoutMap.get(wId);
      if (!ex || !w) continue;

      // Primary muscle: 1.0 per set
      counts[ex.primaryMuscle] = (counts[ex.primaryMuscle] || 0) + setCount * 1.0;
      details[ex.primaryMuscle].push({
        exerciseName: ex.name,
        sets: setCount,
        date: w.localDate,
      });

      // Secondary muscles: 0.5 per set
      for (const sec of ex.secondaryMuscles) {
        counts[sec] = (counts[sec] || 0) + setCount * 0.5;
        details[sec].push({
          exerciseName: `${ex.name} (Secondary)`,
          sets: setCount * 0.5,
          date: w.localDate,
        });
      }
    }

    return { muscleCounts: counts, muscleContributionDetails: details };
  }, [recentWorkouts, allSets, exerciseMap]);

  // 4-step color scale matching #d9083c
  const getMuscleColor = (muscle: Muscle) => {
    const count = muscleCounts[muscle] || 0;
    if (count === 0) return '#1e1e1e';
    if (count < 5) return '#760421';
    if (count < 10) return '#a7062e';
    return '#d9083c';
  };

  const selectedMuscleDetails = selectedMuscle ? muscleContributionDetails[selectedMuscle] || [] : [];
  const selectedMuscleCount = selectedMuscle ? muscleCounts[selectedMuscle] || 0 : 0;

  return (
    <div className="flat-card p-5 space-y-4">
      {/* Header and Period Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a2a2a] pb-3">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Muscle Training Heatmap</span>
            <span className="text-[10px] font-mono uppercase bg-[#d9083c]/10 text-[#d9083c] border border-[#d9083c]/30 px-1.5 py-0.2 rounded-sm">
              Weighted Sets
            </span>
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Primary movement sets count 1.0, secondary assists count 0.5. Tap any muscle to inspect workouts.
          </p>
        </div>

        <div className="flex items-center space-x-1 bg-[#1e1e1e] p-1 rounded-sm border border-[#2a2a2a] text-xs font-semibold">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setPeriodDays(d)}
              className={`px-2.5 py-1 rounded-sm uppercase tracking-wider transition-colors ${
                periodDays === d
                  ? 'bg-[#d9083c] text-white'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* SVG Diagram and Muscle Detail Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Interactive SVG Body Silhouettes (Front & Back) */}
        <div className="flex items-center justify-center space-x-6 sm:space-x-10 p-4 bg-[#121212] rounded-md border border-[#2a2a2a]">
          {/* Front Body */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Front View
            </span>
            <svg viewBox="0 0 160 320" className="w-36 h-72 select-none">
              {/* Head / Neck */}
              <circle cx="80" cy="25" r="16" fill="#2a2a2a" />
              <rect x="74" y="41" width="12" height="10" fill="#2a2a2a" />

              {/* Shoulders (Left & Right) */}
              <path
                d="M48 55 Q40 60 40 75 Q52 75 56 60 Z"
                fill={getMuscleColor('shoulders')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('shoulders')}
              />
              <path
                d="M112 55 Q120 60 120 75 Q108 75 104 60 Z"
                fill={getMuscleColor('shoulders')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('shoulders')}
              />

              {/* Chest (Left & Right) */}
              <path
                d="M56 55 L78 57 L78 85 L54 80 Z"
                fill={getMuscleColor('chest')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('chest')}
              />
              <path
                d="M104 55 L82 57 L82 85 L106 80 Z"
                fill={getMuscleColor('chest')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('chest')}
              />

              {/* Biceps */}
              <rect
                x="38"
                y="78"
                width="14"
                height="28"
                rx="4"
                fill={getMuscleColor('biceps')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('biceps')}
              />
              <rect
                x="108"
                y="78"
                width="14"
                height="28"
                rx="4"
                fill={getMuscleColor('biceps')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('biceps')}
              />

              {/* Forearms */}
              <rect
                x="34"
                y="110"
                width="12"
                height="35"
                rx="3"
                fill={getMuscleColor('forearms')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('forearms')}
              />
              <rect
                x="114"
                y="110"
                width="12"
                height="35"
                rx="3"
                fill={getMuscleColor('forearms')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('forearms')}
              />

              {/* Abs & Core */}
              <rect
                x="65"
                y="88"
                width="30"
                height="45"
                rx="3"
                fill={getMuscleColor('abs')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('abs')}
              />

              {/* Obliques */}
              <path
                d="M54 88 L64 88 L64 130 L52 120 Z"
                fill={getMuscleColor('obliques')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('obliques')}
              />
              <path
                d="M106 88 L96 88 L96 130 L108 120 Z"
                fill={getMuscleColor('obliques')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('obliques')}
              />

              {/* Hips / Pelvis */}
              <polygon points="56,134 104,134 94,155 66,155" fill="#222222" />

              {/* Quadriceps (Thighs) */}
              <rect
                x="54"
                y="158"
                width="22"
                height="65"
                rx="6"
                fill={getMuscleColor('quads')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('quads')}
              />
              <rect
                x="84"
                y="158"
                width="22"
                height="65"
                rx="6"
                fill={getMuscleColor('quads')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('quads')}
              />

              {/* Calves Front */}
              <rect
                x="57"
                y="235"
                width="16"
                height="55"
                rx="4"
                fill={getMuscleColor('calves')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('calves')}
              />
              <rect
                x="87"
                y="235"
                width="16"
                height="55"
                rx="4"
                fill={getMuscleColor('calves')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('calves')}
              />
            </svg>
          </div>

          {/* Back Body */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Back View
            </span>
            <svg viewBox="0 0 160 320" className="w-36 h-72 select-none">
              {/* Head */}
              <circle cx="80" cy="25" r="16" fill="#2a2a2a" />
              <rect x="74" y="41" width="12" height="10" fill="#2a2a2a" />

              {/* Traps */}
              <polygon
                points="80,45 60,65 80,85 100,65"
                fill={getMuscleColor('traps')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('traps')}
              />

              {/* Upper Back */}
              <path
                d="M52 65 L60 65 L80 85 L100 65 L108 65 L104 90 L56 90 Z"
                fill={getMuscleColor('upper_back')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('upper_back')}
              />

              {/* Lats */}
              <path
                d="M56 92 L75 92 L70 128 L50 115 Z"
                fill={getMuscleColor('lats')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('lats')}
              />
              <path
                d="M104 92 L85 92 L90 128 L110 115 Z"
                fill={getMuscleColor('lats')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('lats')}
              />

              {/* Lower Back */}
              <rect
                x="71"
                y="94"
                width="18"
                height="35"
                rx="2"
                fill={getMuscleColor('lower_back')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('lower_back')}
              />

              {/* Triceps (Left & Right) */}
              <rect
                x="38"
                y="76"
                width="13"
                height="32"
                rx="4"
                fill={getMuscleColor('triceps')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('triceps')}
              />
              <rect
                x="109"
                y="76"
                width="13"
                height="32"
                rx="4"
                fill={getMuscleColor('triceps')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('triceps')}
              />

              {/* Glutes */}
              <rect
                x="54"
                y="135"
                width="24"
                height="28"
                rx="6"
                fill={getMuscleColor('glutes')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('glutes')}
              />
              <rect
                x="82"
                y="135"
                width="24"
                height="28"
                rx="6"
                fill={getMuscleColor('glutes')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('glutes')}
              />

              {/* Hamstrings */}
              <rect
                x="55"
                y="168"
                width="22"
                height="60"
                rx="6"
                fill={getMuscleColor('hamstrings')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('hamstrings')}
              />
              <rect
                x="83"
                y="168"
                width="22"
                height="60"
                rx="6"
                fill={getMuscleColor('hamstrings')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('hamstrings')}
              />

              {/* Calves Back */}
              <rect
                x="56"
                y="235"
                width="18"
                height="55"
                rx="5"
                fill={getMuscleColor('calves')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('calves')}
              />
              <rect
                x="86"
                y="235"
                width="18"
                height="55"
                rx="5"
                fill={getMuscleColor('calves')}
                className="cursor-pointer transition-colors hover:opacity-80"
                onClick={() => setSelectedMuscle('calves')}
              />
            </svg>
          </div>
        </div>

        {/* Selected Muscle Inspector Panel */}
        <div className="space-y-3">
          {selectedMuscle ? (
            <div className="p-4 bg-[#121212] border border-[#2a2a2a] rounded-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2a]">
                <div>
                  <h4 className="font-bold text-base text-white">
                    {getMuscleName(selectedMuscle)}
                  </h4>
                  <div className="text-xs text-[#d9083c] font-mono font-semibold">
                    {selectedMuscleCount} weighted sets in past {periodDays} days
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMuscle(null)}
                  className="p-1 text-[var(--text-muted)] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedMuscleDetails.length === 0 ? (
                <div className="text-xs text-[var(--text-muted)] italic">
                  No sets logged for this muscle group in the chosen timeframe.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {selectedMuscleDetails.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-[#161616] border border-[#2a2a2a] rounded-sm text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-white">{item.exerciseName}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">{item.date}</div>
                      </div>
                      <span className="font-mono font-bold text-[#d9083c]">
                        +{item.sets} sets
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-[#121212] border border-[#2a2a2a] rounded-sm text-center text-xs text-[var(--text-muted)] space-y-2">
              <Info className="w-6 h-6 mx-auto text-[#d9083c] opacity-60" />
              <div className="font-semibold text-white">Interactive Diagram</div>
              <p>Click any muscle group on the front or back silhouette to inspect the exact exercises and set volume performed.</p>
            </div>
          )}

          {/* Color Scale Legend */}
          <div className="p-3 bg-[#121212] border border-[#2a2a2a] rounded-sm">
            <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider mb-2">
              Weekly Volume Intensity Scale
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
              <div className="p-1.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-sm text-slate-400">
                0 sets
              </div>
              <div className="p-1.5 bg-[#760421] text-white rounded-sm font-semibold">
                1–4 sets
              </div>
              <div className="p-1.5 bg-[#a7062e] text-white rounded-sm font-semibold">
                5–9 sets
              </div>
              <div className="p-1.5 bg-[#d9083c] text-white rounded-sm font-semibold">
                10+ sets
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
