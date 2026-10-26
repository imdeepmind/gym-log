import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Exercise } from '@/types';
import {
  getExerciseChartData,
  getOverallVolumeTrends,
  TimeRange,
  ExerciseSessionPoint,
  RepPRRow,
} from '@/services/stats';
import { PRsGallery } from './PRsGallery';
import { BodyTrackingView } from './BodyTrackingView';
import { MuscleHeatmap } from '../heatmap/MuscleHeatmap';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  Trophy,
  Activity,
  Sparkles,
  Calendar,
  CheckCircle2,
  Flame,
} from 'lucide-react';

const TIME_RANGES: TimeRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

export function ProgressView() {
  const [activeSubtab, setActiveSubtab] = useState<'exercise' | 'overall' | 'heatmap' | 'prs' | 'body'>('exercise');
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');

  // Exercise selection for per-exercise analytics
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('ex_barbell_bench_press');
  const [exerciseData, setExerciseData] = useState<{
    points: ExerciseSessionPoint[];
    repPRs: RepPRRow[];
    allTimeMaxWeight: number;
    allTimeMaxE1RM: number;
  }>({ points: [], repPRs: [], allTimeMaxWeight: 0, allTimeMaxE1RM: 0 });

  // Overall volume trends
  const [overallData, setOverallData] = useState<{ date: string; volume: number; duration: number }[]>([]);

  // Load all exercises for dropdown
  const allExercises = useLiveQuery(() => db.exercises.toArray(), [], []);

  useEffect(() => {
    if (selectedExerciseId) {
      getExerciseChartData(selectedExerciseId, timeRange).then(setExerciseData);
    }
  }, [selectedExerciseId, timeRange]);

  useEffect(() => {
    if (activeSubtab === 'overall') {
      getOverallVolumeTrends(timeRange).then(setOverallData);
    }
  }, [activeSubtab, timeRange]);

  const selectedExercise = allExercises.find((e) => e.id === selectedExerciseId);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header & Subtabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--border-color)]">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-color)] tracking-tight">Progress & Analytics</h2>
          <p className="text-xs text-[var(--text-muted)]">
            Progression charts, personal records, and body measurements
          </p>
        </div>

        {/* Time Range Selector */}
        {(activeSubtab === 'exercise' || activeSubtab === 'overall') && (
          <div className="flex items-center space-x-1 bg-[var(--hover-bg)] p-1 rounded-sm border border-[var(--border-color)]">
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-sm transition-colors ${
                  timeRange === r
                    ? 'bg-[#d9083c] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-color)]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Subtab Navigation - clean wrap without scrollbar on desktop & mobile */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        {[
          { id: 'exercise', label: 'Movements', icon: TrendingUp },
          { id: 'overall', label: 'Volume', icon: Activity },
          { id: 'heatmap', label: 'Heatmap', icon: Flame },
          { id: 'prs', label: 'PRs', icon: Trophy },
          { id: 'body', label: 'Body Metrics', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubtab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubtab(tab.id as any)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider transition-all ${
                isActive
                  ? 'bg-[#d9083c] text-white shadow-sm'
                  : 'bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-color)] hover:border-[var(--text-muted)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: MOVEMENT PROGRESSION */}
      {activeSubtab === 'exercise' && (
        <div className="space-y-5">
          {/* Exercise Selector */}
          <div className="flat-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider block mb-1">
                Select Exercise
              </label>
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="flat-input w-full p-2 text-sm bg-[var(--card-bg)] font-semibold text-[var(--text-color)]"
              >
                {allExercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.primaryMuscle})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Record Stats */}
            <div className="flex items-center space-x-4 font-mono text-xs">
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  All-Time Max
                </div>
                <div className="font-bold text-[var(--text-color)] text-lg">
                  {exerciseData.allTimeMaxWeight} <span className="text-xs text-[var(--text-muted)] font-normal">kg</span>
                </div>
              </div>
              <div className="text-right pl-3 border-l border-[var(--border-color)]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Estimated 1RM
                </div>
                <div className="font-bold text-[#d9083c] text-lg">
                  {exerciseData.allTimeMaxE1RM} <span className="text-xs text-[var(--text-muted)] font-normal">kg</span>
                </div>
              </div>
            </div>
          </div>

          {exerciseData.points.length === 0 ? (
            <div className="flat-card p-10 text-center space-y-2">
              <Activity className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-40" />
              <h4 className="font-bold text-[var(--text-color)] text-sm">No History for this Movement</h4>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Complete at least one workout containing {selectedExercise?.name || 'this exercise'} to generate progressive overload charts.
              </p>
            </div>
          ) : (
            <>
              {/* Estimated 1RM Progression Line Chart */}
              <div className="flat-card p-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <span>Estimated 1RM Progression (Best Set per Session)</span>
                  <span className="font-mono text-[#d9083c]">kg</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={exerciseData.points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                      <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card-bg)',
                          borderColor: 'var(--border-color)',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: 'var(--text-color)',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="e1rm"
                        name="Estimated 1RM"
                        stroke="#d9083c"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#d9083c' }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Session Volume Bar Chart */}
              <div className="flat-card p-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <span>Total Volume per Session</span>
                  <span className="font-mono text-emerald-400">kg volume</span>
                </div>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={exerciseData.points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                      <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card-bg)',
                          borderColor: 'var(--border-color)',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: 'var(--text-color)',
                        }}
                      />
                      <Bar dataKey="volume" name="Session Volume (kg)" fill="#d9083c" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Rep PRs at Specific Weights Table */}
              {exerciseData.repPRs.length > 0 && (
                <div className="flat-card overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[var(--border-color)] text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Rep PRs by Weight ({exerciseData.repPRs.length} load tiers)
                  </div>
                  <div className="divide-y divide-[var(--border-color)]">
                    <div className="px-4 py-1.5 bg-[var(--hover-bg)] grid grid-cols-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      <span>Weight</span>
                      <span className="text-center">Best Reps</span>
                      <span className="text-right">Achieved Date</span>
                    </div>
                    {exerciseData.repPRs.map((pr) => (
                      <div key={pr.weightKg} className="px-4 py-2.5 grid grid-cols-3 text-xs font-mono hover:bg-[var(--hover-bg)]">
                        <span className="font-bold text-[var(--text-color)]">{pr.weightKg} kg</span>
                        <span className="text-center font-bold text-[#d9083c]">{pr.reps} reps</span>
                        <span className="text-right text-[var(--text-muted)]">{pr.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SUBTAB 2: OVERALL VOLUME TREND */}
      {activeSubtab === 'overall' && (
        <div className="space-y-4">
          <div className="flat-card p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <span>Overall Total Workout Volume Trend</span>
              <span className="font-mono text-[#d9083c]">Total kg per workout</span>
            </div>
            {overallData.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                No completed workouts recorded yet to display volume trends.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overallData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d9083c" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#d9083c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card-bg)',
                        borderColor: 'var(--border-color)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: 'var(--text-color)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="volume"
                      stroke="#d9083c"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#volGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: MUSCLE HEATMAP */}
      {activeSubtab === 'heatmap' && <MuscleHeatmap />}

      {/* SUBTAB 4: PERSONAL RECORDS */}
      {activeSubtab === 'prs' && <PRsGallery />}

      {/* SUBTAB 4: BODY MEASUREMENTS */}
      {activeSubtab === 'body' && <BodyTrackingView />}
    </div>
  );
}
