import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Exercise, Muscle, Equipment } from '@/types';
import { Search, Star, Plus, Dumbbell, Filter } from 'lucide-react';
import { MUSCLE_DEFINITIONS, getMuscleName } from '@/domain/muscles';
import { ExercisePickerModal } from '../workout/ExercisePickerModal';

const MUSCLE_TABS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio'];

export function ExercisesView() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const exercises = useLiveQuery(() => db.exercises.toArray(), [], []);

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (ex.isArchived) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = ex.name.toLowerCase().includes(q);
        const matchesMuscle = ex.primaryMuscle.toLowerCase().includes(q);
        if (!matchesName && !matchesMuscle) return false;
      }

      if (activeTab !== 'All') {
        const info = MUSCLE_DEFINITIONS[ex.primaryMuscle];
        if (!info || info.category !== activeTab) return false;
      }

      if (selectedEquipment !== 'all') {
        if (ex.equipment !== selectedEquipment) return false;
      }

      return true;
    });
  }, [exercises, search, activeTab, selectedEquipment]);

  const toggleFavorite = async (e: React.MouseEvent, ex: Exercise) => {
    e.stopPropagation();
    await db.exercises.update(ex.id, { isFavorite: !ex.isFavorite });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--border-color)]">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-color)] tracking-tight">Movement Library</h2>
          <p className="text-xs text-[var(--text-muted)]">
            {exercises.length} total movements preloaded with muscles, equipment, and tracking types
          </p>
        </div>

        <button
          onClick={() => setIsPickerOpen(true)}
          className="btn-primary text-xs flex items-center space-x-1.5 py-2 px-3.5"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Movement</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flat-card p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search exercises by name or muscle (e.g. Incline Bench, Deadlift, Lats)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flat-input w-full pl-9 pr-3 py-2 text-xs"
          />
        </div>

        {/* Muscle Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          {MUSCLE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-sm text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-[#d9083c] text-white'
                  : 'bg-[var(--hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-color)] border border-[var(--border-color)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Exercises */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((ex) => (
          <div
            key={ex.id}
            className="flat-card p-3.5 flex flex-col justify-between hover:border-[#d9083c] transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-sm text-[var(--text-color)] hover:text-[#d9083c] transition-colors">
                  {ex.name}
                </h4>
                <button
                  onClick={(e) => toggleFavorite(e, ex)}
                  className="text-[var(--text-muted)] hover:text-amber-400 p-0.5"
                >
                  <Star className={`w-3.5 h-3.5 ${ex.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-sm text-[#d9083c]">
                  {getMuscleName(ex.primaryMuscle)}
                </span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-sm text-[var(--text-color)]">
                  {ex.equipment}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-sm text-[var(--text-muted)]">
                  {ex.trackingType.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-[var(--text-muted)] font-mono mt-3 pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
              <span>Rest: {ex.defaultRestSec || 90}s</span>
              {ex.isCustom ? (
                <span className="text-[#d9083c] font-semibold text-[10px] uppercase">Custom</span>
              ) : (
                <span className="text-[10px] text-[var(--text-muted)] uppercase">Seeded</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <ExercisePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={() => {}}
      />
    </div>
  );
}
