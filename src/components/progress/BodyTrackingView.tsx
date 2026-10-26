import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { BODY_METRIC_TYPES, MetricType, addBodyMetric, deleteBodyMetric } from '@/services/body';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Plus, Trash2, TrendingUp, Calendar } from 'lucide-react';

export function BodyTrackingView() {
  const [selectedType, setSelectedType] = useState<MetricType>('bodyweight');
  const [inputValue, setInputValue] = useState('');
  const [inputDate, setInputDate] = useState(new Date().toISOString().slice(0, 10));

  const metrics = useLiveQuery(
    async () => {
      if (selectedType === 'arm') {
        return db.bodyMetrics.where('type').anyOf(['arm', 'biceps']).sortBy('date');
      }
      return db.bodyMetrics.where('type').equals(selectedType).sortBy('date');
    },
    [selectedType],
    []
  );

  const activeMetricConfig = BODY_METRIC_TYPES.find((m) => m.id === selectedType) || BODY_METRIC_TYPES[0];

  const getPlaceholder = (type: MetricType) => {
    switch (type) {
      case 'bodyweight':
        return '78.5';
      case 'body_fat':
        return '14.5';
      case 'arm':
      case 'biceps':
        return '38.0';
      case 'forearms':
        return '31.0';
      case 'chest':
        return '104.0';
      case 'waist':
        return '82.0';
      case 'hips':
        return '98.0';
      case 'thigh':
        return '60.0';
      case 'calves':
        return '38.5';
      case 'shoulders':
        return '122.0';
      case 'neck':
        return '39.0';
      default:
        return '30.0';
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(inputValue);
    if (!val || val <= 0) return;

    await addBodyMetric(selectedType, val, inputDate);
    setInputValue('');
  };

  const chartData = (metrics || []).map((m) => ({
    date: m.date.slice(5), // MM-DD
    value: m.value,
  }));

  const latestValue = (metrics || []).length > 0 ? metrics![metrics!.length - 1].value : undefined;
  const initialValue = (metrics || []).length > 0 ? metrics![0].value : undefined;
  const diff = latestValue !== undefined && initialValue !== undefined ? Math.round((latestValue - initialValue) * 10) / 10 : 0;

  return (
    <div className="space-y-5">
      {/* Metric Type Selector */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        {BODY_METRIC_TYPES.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedType(m.id)}
            className={`px-3 py-1.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition-colors ${
              selectedType === m.id
                ? 'bg-[#d9083c] text-white shadow-sm'
                : 'bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-color)] hover:border-[var(--text-muted)]'
            }`}
          >
            {m.label} <span className="opacity-60 text-[10px]">({m.unit})</span>
          </button>
        ))}
      </div>

      {/* Log Form & Quick Stat Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Quick Log Form */}
        <form onSubmit={handleAdd} className="flat-card p-4 sm:col-span-2 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Log New {activeMetricConfig.label}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-[var(--text-muted)] uppercase block mb-1">
                Value ({activeMetricConfig.unit})
              </label>
              <input
                type="number"
                step="0.1"
                required
                placeholder={`e.g. ${getPlaceholder(selectedType)}`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flat-input w-full p-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-muted)] uppercase block mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
                className="flat-input w-full p-2 text-xs font-mono"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="btn-primary w-full py-2 text-xs flex items-center justify-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Entry</span>
              </button>
            </div>
          </div>
        </form>

        {/* Current Summary */}
        <div className="flat-card p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Current {activeMetricConfig.label}
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-[var(--text-color)]">
              {latestValue ?? '--'}{' '}
              <span className="text-xs font-normal text-[var(--text-muted)]">
                {activeMetricConfig.unit}
              </span>
            </div>
            {(metrics?.length ?? 0) > 1 && (
              <div className="text-[11px] font-mono mt-1 text-[var(--text-muted)]">
                Change: <strong className={diff > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {diff > 0 ? `+${diff}` : diff} {activeMetricConfig.unit}
                </strong>
              </div>
            )}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] font-mono">
            {metrics?.length ?? 0} logged entries
          </div>
        </div>
      </div>

      {/* Progress Chart */}
      {chartData.length > 1 && (
        <div className="flat-card p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
            <span>{activeMetricConfig.label} Trend</span>
            <span className="font-mono text-[11px] text-[#d9083c]">{activeMetricConfig.unit}</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                <YAxis domain={['auto', 'auto']} stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
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
                  dataKey="value"
                  stroke="#d9083c"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#d9083c' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* History Log Table */}
      {(metrics?.length ?? 0) > 0 && (
        <div className="flat-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--border-color)] text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Recorded History ({metrics!.length})
          </div>
          <div className="divide-y divide-[var(--border-color)] max-h-60 overflow-y-auto">
            {metrics!
              .slice()
              .reverse()
              .map((m) => (
                <div key={m.id} className="p-3 flex items-center justify-between text-xs hover:bg-[var(--hover-bg)] transition-colors">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="font-mono text-[var(--text-muted)]">{m.date}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="font-mono font-bold text-[var(--text-color)] text-sm">
                      {m.value} {activeMetricConfig.unit}
                    </span>
                    <button
                      onClick={() => deleteBodyMetric(m.id)}
                      className="p-1 text-[var(--text-muted)] hover:text-rose-500 rounded-sm"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
