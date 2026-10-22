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
import { exportSetsToCSV, downloadCSVFile, importFromCSV } from '@/services/csv';
import { PRsGallery } from './PRsGallery';
import { BodyTrackingView } from './BodyTrackingView';
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
  FileSpreadsheet,
  Download,
  Upload,
  Sparkles,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

const TIME_RANGES: TimeRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

export function ProgressView() {
  const [activeSubtab, setActiveSubtab] = useState<'exercise' | 'overall' | 'prs' | 'body' | 'csv'>('exercise');
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

  // CSV import status
  const [importStatus, setImportStatus] = useState<string | null>(null);

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

  const handleExportCSV = async () => {
    const csv = await exportSetsToCSV();
    downloadCSVFile(csv);
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const res = await importFromCSV(text);
        setImportStatus(`Successfully imported ${res.importedWorkouts} workouts and ${res.importedSets} sets!`);
      } catch (err: any) {
        setImportStatus(`Import error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const selectedExercise = allExercises.find((e) => e.id === selectedExerciseId);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header & Subtabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#2a2a2a]">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Progress & Analytics</h2>
          <p className="text-xs text-[var(--text-muted)]">
            Progression charts, personal records, body measurements, and CSV data
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center space-x-1 bg-[#1e1e1e] p-1 rounded-sm border border-[#2a2a2a]">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-sm transition-colors ${
                timeRange === r
                  ? 'bg-[#d9083c] text-white'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Subtab Navigation Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'exercise', label: 'Movement Progression', icon: TrendingUp },
          { id: 'overall', label: 'Overall Volume Trend', icon: Activity },
          { id: 'prs', label: 'Personal Records', icon: Trophy },
          { id: 'body', label: 'Body Measurements', icon: Activity },
          { id: 'csv', label: 'CSV Export / Import', icon: FileSpreadsheet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubtab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubtab(tab.id as any)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[#d9083c] text-white'
                  : 'bg-[#1e1e1e] text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
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
                className="flat-input w-full p-2 text-sm bg-[#161616] font-semibold text-white"
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
                <div className="font-bold text-white text-lg">
                  {exerciseData.allTimeMaxWeight} <span className="text-xs text-[var(--text-muted)] font-normal">kg</span>
                </div>
              </div>
              <div className="text-right pl-3 border-l border-[#2a2a2a]">
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
              <h4 className="font-bold text-white text-sm">No History for this Movement</h4>
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
                      <CartesianGrid stroke="#222222" strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="#666666" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#666666" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#161616',
                          borderColor: '#2a2a2a',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#f0f0f0',
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
                      <CartesianGrid stroke="#222222" strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="#666666" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#666666" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#161616',
                          borderColor: '#2a2a2a',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#f0f0f0',
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
                  <div className="px-4 py-2.5 border-b border-[#2a2a2a] text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Rep PRs by Weight ({exerciseData.repPRs.length} load tiers)
                  </div>
                  <div className="divide-y divide-[#2a2a2a]">
                    <div className="px-4 py-1.5 bg-[#121212] grid grid-cols-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      <span>Weight</span>
                      <span className="text-center">Best Reps</span>
                      <span className="text-right">Achieved Date</span>
                    </div>
                    {exerciseData.repPRs.map((pr) => (
                      <div key={pr.weightKg} className="px-4 py-2.5 grid grid-cols-3 text-xs font-mono hover:bg-[#1a1a1a]">
                        <span className="font-bold text-white">{pr.weightKg} kg</span>
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
                    <CartesianGrid stroke="#222222" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#666666" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#666666" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#161616',
                        borderColor: '#2a2a2a',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#f0f0f0',
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

      {/* SUBTAB 3: PERSONAL RECORDS */}
      {activeSubtab === 'prs' && <PRsGallery />}

      {/* SUBTAB 4: BODY MEASUREMENTS */}
      {activeSubtab === 'body' && <BodyTrackingView />}

      {/* SUBTAB 5: CSV EXPORT / IMPORT */}
      {activeSubtab === 'csv' && (
        <div className="space-y-4 max-w-xl mx-auto">
          <div className="flat-card p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#d9083c]">
                CSV Data Interoperability
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Export your workout history to an open CSV spreadsheet, or import previous workout exports from Strong, Hevy, or GymLog.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleExportCSV}
                className="btn-primary text-xs flex items-center space-x-1.5 py-2.5 px-4"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV Spreadsheet</span>
              </button>

              <label className="btn-secondary text-xs flex items-center space-x-1.5 py-2.5 px-4 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#d9083c]" />
                <span>Import Strong / Hevy CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  className="hidden"
                />
              </label>
            </div>

            {importStatus && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-sm">
                {importStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
