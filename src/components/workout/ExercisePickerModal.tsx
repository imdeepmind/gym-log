import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Exercise, Muscle, Equipment, TrackingType } from '@/types';
import { Search, X, Star, Plus, Check, Filter } from 'lucide-react';
import { MUSCLE_DEFINITIONS } from '@/domain/muscles';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exerciseId: string) => void;
}

const MUSCLE_CATEGORIES = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio'];
const EQUIPMENT_LIST: (Equipment | 'all')[] = ['all', 'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'other'];

export function ExercisePickerModal({ isOpen, onClose, onSelect }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | 'all'>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  // New Custom Exercise Form State
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState<Muscle>('chest');
  const [customEquipment, setCustomEquipment] = useState<Equipment>('barbell');
  const [customTracking, setCustomTracking] = useState<TrackingType>('weight_reps');

  // Load exercises from Dexie
  const allExercises = useLiveQuery(() => db.exercises.toArray(), [], []);

  const filteredExercises = useMemo(() => {
    return allExercises.filter((ex) => {
      if (ex.isArchived) return false;
      if (onlyFavorites && !ex.isFavorite) return false;

      // Search matching
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = ex.name.toLowerCase().includes(query);
        const matchesMuscle = ex.primaryMuscle.toLowerCase().includes(query);
        if (!matchesName && !matchesMuscle) return false;
      }

      // Category matching
      if (selectedCategory !== 'All') {
        const muscleInfo = MUSCLE_DEFINITIONS[ex.primaryMuscle];
        if (!muscleInfo || muscleInfo.category !== selectedCategory) {
          return false;
        }
      }

      // Equipment matching
      if (selectedEquipment !== 'all') {
        if (ex.equipment !== selectedEquipment) return false;
      }

      return true;
    });
  }, [allExercises, searchQuery, selectedCategory, selectedEquipment, onlyFavorites]);

  const toggleFavorite = async (e: React.MouseEvent, ex: Exercise) => {
    e.stopPropagation();
    await db.exercises.update(ex.id, { isFavorite: !ex.isFavorite });
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const id = `custom_${Date.now()}`;
    const newEx: Exercise = {
      id,
      name: customName.trim(),
      primaryMuscle: customMuscle,
      secondaryMuscles: [],
      equipment: customEquipment,
      trackingType: customTracking,
      isCustom: true,
      isFavorite: false,
      isArchived: false,
      defaultRestSec: 90,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.exercises.add(newEx);
    setIsCreatingCustom(false);
    setCustomName('');
    onSelect(id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#161616] border border-[#2a2a2a] w-full max-w-2xl rounded-md flex flex-col max-h-[90vh] overflow-hidden text-[#f0f0f0] shadow-2xl">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-white">Select Exercise</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Choose from 200 standard movements or create your own
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-white rounded-sm hover:bg-[#1e1e1e] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {isCreatingCustom ? (
          /* Custom Exercise Creation Form */
          <form onSubmit={handleCreateCustom} className="p-6 space-y-4 overflow-y-auto">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-[#d9083c]">
              Create Custom Movement
            </h4>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                Exercise Name
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Bulgarian Landmine Split Squat"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="flat-input w-full p-2.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Primary Muscle
                </label>
                <select
                  value={customMuscle}
                  onChange={(e) => setCustomMuscle(e.target.value as Muscle)}
                  className="flat-input w-full p-2 text-sm bg-[#161616]"
                >
                  {Object.entries(MUSCLE_DEFINITIONS).map(([id, info]) => (
                    <option key={id} value={id}>
                      {info.name} ({info.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Equipment
                </label>
                <select
                  value={customEquipment}
                  onChange={(e) => setCustomEquipment(e.target.value as Equipment)}
                  className="flat-input w-full p-2 text-sm bg-[#161616]"
                >
                  <option value="barbell">Barbell</option>
                  <option value="dumbbell">Dumbbell</option>
                  <option value="machine">Machine</option>
                  <option value="cable">Cable</option>
                  <option value="bodyweight">Bodyweight</option>
                  <option value="kettlebell">Kettlebell</option>
                  <option value="band">Band</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                Tracking Type
              </label>
              <select
                value={customTracking}
                onChange={(e) => setCustomTracking(e.target.value as TrackingType)}
                className="flat-input w-full p-2 text-sm bg-[#161616]"
              >
                <option value="weight_reps">Weight & Reps (standard)</option>
                <option value="bodyweight_reps">Bodyweight Reps (pushups, pullups)</option>
                <option value="weighted_bodyweight">Weighted Bodyweight (+ added load)</option>
                <option value="assisted_bodyweight">Assisted Bodyweight (- assisted load)</option>
                <option value="duration">Duration (planks, wall sits)</option>
                <option value="distance_time">Distance & Time (running, rowing)</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#2a2a2a]">
              <button
                type="button"
                onClick={() => setIsCreatingCustom(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary text-xs">
                Save & Select
              </button>
            </div>
          </form>
        ) : (
          /* Exercise Search & List View */
          <>
            {/* Search Input & Action */}
            <div className="p-4 border-b border-[#2a2a2a] space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search 200 exercises by name or muscle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flat-input w-full pl-9 pr-3 py-2 text-sm"
                />
              </div>

              {/* Muscle Category Filter Chips */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                {MUSCLE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-sm whitespace-nowrap uppercase tracking-wider text-[11px] font-semibold transition-colors ${
                      selectedCategory === cat
                        ? 'bg-[#d9083c] text-white'
                        : 'bg-[#1e1e1e] text-[var(--text-muted)] hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Equipment and Favorites Filter Bar */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[var(--text-muted)]">Equipment:</span>
                  <select
                    value={selectedEquipment}
                    onChange={(e) => setSelectedEquipment(e.target.value as any)}
                    className="flat-input text-xs py-1 px-2 bg-[#161616]"
                  >
                    <option value="all">All Equipment</option>
                    <option value="barbell">Barbell</option>
                    <option value="dumbbell">Dumbbell</option>
                    <option value="machine">Machine</option>
                    <option value="cable">Cable</option>
                    <option value="bodyweight">Bodyweight</option>
                    <option value="kettlebell">Kettlebell</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setOnlyFavorites(!onlyFavorites)}
                    className={`flex items-center space-x-1 px-2 py-1 rounded-sm transition-colors ${
                      onlyFavorites ? 'bg-amber-500/20 text-amber-400' : 'text-[var(--text-muted)] hover:text-white'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-400' : ''}`} />
                    <span className="text-[11px] font-medium">Favorites</span>
                  </button>

                  <button
                    onClick={() => setIsCreatingCustom(true)}
                    className="text-xs text-[#d9083c] hover:underline font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Custom</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Exercises List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#2a2a2a] p-1">
              {filteredExercises.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-muted)] text-sm">
                  No movements found matching your filters.
                  <div className="mt-3">
                    <button
                      onClick={() => setIsCreatingCustom(true)}
                      className="btn-primary text-xs"
                    >
                      Create Custom Movement
                    </button>
                  </div>
                </div>
              ) : (
                filteredExercises.map((ex) => (
                  <div
                    key={ex.id}
                    onClick={() => {
                      onSelect(ex.id);
                      onClose();
                    }}
                    className="p-3 hover:bg-[#1e1e1e] flex items-center justify-between cursor-pointer transition-colors group"
                  >
                    <div className="flex-1 pr-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm text-white group-hover:text-[#d9083c] transition-colors">
                          {ex.name}
                        </span>
                        {ex.isCustom && (
                          <span className="text-[10px] font-mono uppercase bg-[#1e1e1e] text-[#d9083c] px-1.5 py-0.2 rounded-sm border border-[#d9083c]/30">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)] mt-1">
                        <span className="capitalize">{ex.primaryMuscle.replace('_', ' ')}</span>
                        <span>·</span>
                        <span className="capitalize">{ex.equipment}</span>
                        <span>·</span>
                        <span className="text-[11px] font-mono">{ex.trackingType.replace('_', ' ')}</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => toggleFavorite(e, ex)}
                      className="p-2 text-[var(--text-muted)] hover:text-amber-400 transition-colors"
                      title="Toggle Favorite"
                    >
                      <Star className={`w-4 h-4 ${ex.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
