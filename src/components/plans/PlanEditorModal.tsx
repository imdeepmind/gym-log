import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Plan, PlanExercise, Exercise } from '@/types';
import { ExercisePickerModal } from '../workout/ExercisePickerModal';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Clock } from 'lucide-react';

interface Props {
  isOpen: boolean;
  planToEdit?: Plan | null;
  onClose: () => void;
  onSave: () => void;
}

export function PlanEditorModal({ isOpen, planToEdit, onClose, onSave }: Props) {
  const [name, setName] = useState(planToEdit?.name || '');
  const [notes, setNotes] = useState(planToEdit?.notes || '');
  const [exercises, setExercises] = useState<PlanExercise[]>(planToEdit?.exercises || []);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    if (planToEdit) {
      setName(planToEdit.name);
      setNotes(planToEdit.notes || '');
      setExercises(planToEdit.exercises || []);
    } else {
      setName('');
      setNotes('');
      setExercises([]);
    }
  }, [planToEdit, isOpen]);

  const allExercises = useLiveQuery(() => db.exercises.toArray(), [], []);

  const exerciseMap = new Map<string, Exercise>();
  allExercises.forEach((e) => exerciseMap.set(e.id, e));

  if (!isOpen) return null;

  const handleAddExercise = (exerciseId: string) => {
    const ex = exerciseMap.get(exerciseId);
    const newPe: PlanExercise = {
      id: crypto.randomUUID(),
      exerciseId,
      order: exercises.length + 1,
      targetSets: 3,
      repMin: 8,
      repMax: 10,
      restSec: ex?.defaultRestSec || 90,
    };
    setExercises([...exercises, newPe]);
  };

  const handleRemoveExercise = (index: number) => {
    const updated = exercises.filter((_, i) => i !== index);
    setExercises(updated.map((pe, idx) => ({ ...pe, order: idx + 1 })));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= exercises.length) return;
    const next = [...exercises];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setExercises(next.map((pe, idx) => ({ ...pe, order: idx + 1 })));
  };

  const handleUpdateExercise = (index: number, changes: Partial<PlanExercise>) => {
    const next = [...exercises];
    next[index] = { ...next[index], ...changes };
    setExercises(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const now = Date.now();
    if (planToEdit) {
      await db.plans.update(planToEdit.id, {
        name: name.trim(),
        notes,
        exercises,
        updatedAt: now,
      });
    } else {
      const newPlan: Plan = {
        id: `plan_${Date.now()}`,
        name: name.trim(),
        notes,
        isArchived: false,
        exercises,
        createdAt: now,
        updatedAt: now,
      };
      await db.plans.add(newPlan);
    }

    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#161616] border border-[#2a2a2a] w-full max-w-2xl rounded-md flex flex-col max-h-[90vh] overflow-hidden text-[#f0f0f0] shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-white">
              {planToEdit ? 'Edit Workout Plan' : 'Create Workout Plan'}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Configure movements with target sets, rep ranges, and rest intervals
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-white rounded-sm hover:bg-[#1e1e1e]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Plan Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Upper Body Hypertrophy"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flat-input w-full p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Notes & Guidelines (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Keep RIR at 1-2 on compounds, drop set on last isolation movement..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flat-input w-full p-2 text-xs resize-none"
            />
          </div>

          {/* Exercises Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Movements ({exercises.length})
              </span>
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="text-xs font-semibold text-[#d9083c] hover:underline flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Movement</span>
              </button>
            </div>

            <div className="space-y-2">
              {exercises.length === 0 ? (
                <div className="p-6 border border-dashed border-[#2a2a2a] text-center text-xs text-[var(--text-muted)] rounded-sm">
                  No movements added yet. Tap "Add Movement" to choose from 200 exercises.
                </div>
              ) : (
                exercises.map((pe, idx) => {
                  const ex = exerciseMap.get(pe.exerciseId);
                  return (
                    <div
                      key={pe.id}
                      className="p-3 bg-[#121212] border border-[#2a2a2a] rounded-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs text-[var(--text-muted)]">#{idx + 1}</span>
                          <span className="font-semibold text-sm text-white">{ex?.name || 'Exercise'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMove(idx, 'up')}
                            className="p-1 text-[var(--text-muted)] hover:text-white disabled:opacity-20"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === exercises.length - 1}
                            onClick={() => handleMove(idx, 'down')}
                            className="p-1 text-[var(--text-muted)] hover:text-white disabled:opacity-20"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveExercise(idx)}
                            className="p-1 text-[var(--text-muted)] hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Target sets & reps inputs */}
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] uppercase block mb-0.5">
                            Sets
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={pe.targetSets}
                            onChange={(e) =>
                              handleUpdateExercise(idx, { targetSets: parseInt(e.target.value, 10) || 1 })
                            }
                            className="flat-input w-full p-1 text-center font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] uppercase block mb-0.5">
                            Min Reps
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={pe.repMin ?? 8}
                            onChange={(e) =>
                              handleUpdateExercise(idx, { repMin: parseInt(e.target.value, 10) || 1 })
                            }
                            className="flat-input w-full p-1 text-center font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] uppercase block mb-0.5">
                            Max Reps
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={pe.repMax ?? 10}
                            onChange={(e) =>
                              handleUpdateExercise(idx, { repMax: parseInt(e.target.value, 10) || 1 })
                            }
                            className="flat-input w-full p-1 text-center font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] uppercase block mb-0.5">
                            Rest (s)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="15"
                            value={pe.restSec ?? 90}
                            onChange={(e) =>
                              handleUpdateExercise(idx, { restSec: parseInt(e.target.value, 10) || 60 })
                            }
                            className="flat-input w-full p-1 text-center font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#2a2a2a] flex items-center justify-end space-x-3">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs">
              Save
            </button>
          </div>
        </form>
      </div>

      <ExercisePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleAddExercise}
      />
    </div>
  );
}
