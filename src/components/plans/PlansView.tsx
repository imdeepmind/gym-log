import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Plan, Exercise } from '@/types';
import { startWorkoutFromPlan } from '@/services/plan';
import { PlanEditorModal } from './PlanEditorModal';
import { Plus, Play, Edit2, Copy, Trash2, Dumbbell, Layers } from 'lucide-react';

interface Props {
  onStartPlanWorkout: (workout: any) => void;
}

export function PlansView({ onStartPlanWorkout }: Props) {
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const plans = useLiveQuery(
    async () => {
      const all = await db.plans.toArray();
      return all.filter((p) => !p.isArchived);
    },
    [],
    []
  );

  const allExercises = useLiveQuery(() => db.exercises.toArray(), [], []);
  const exerciseMap = new Map<string, Exercise>();
  allExercises.forEach((e) => exerciseMap.set(e.id, e));

  const handleStart = async (planId: string) => {
    const workout = await startWorkoutFromPlan(planId);
    onStartPlanWorkout(workout);
  };

  const handleDuplicate = async (plan: Plan) => {
    const newPlan: Plan = {
      ...plan,
      id: `plan_${Date.now()}`,
      name: `${plan.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.plans.add(newPlan);
  };

  const handleDelete = async (planId: string, name: string) => {
    if (confirm(`Delete plan "${name}"? Past workouts logged with this plan will remain intact.`)) {
      await db.plans.delete(planId);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#2a2a2a]">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Workout Plans & Templates</h2>
          <p className="text-xs text-[var(--text-muted)]">
            Reusable training templates with preconfigured exercises, sets, and rep ranges
          </p>
        </div>

        <button
          onClick={() => {
            setEditingPlan(null);
            setIsEditorOpen(true);
          }}
          className="btn-primary text-xs flex items-center space-x-1.5 py-2 px-3.5"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Plan</span>
        </button>
      </div>

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="flat-card p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-base text-white hover:text-[#d9083c] transition-colors">
                    {plan.name}
                  </h3>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    {plan.exercises.length} exercises · ~{plan.exercises.reduce((acc, pe) => acc + (pe.targetSets || 3), 0)} target sets
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setEditingPlan(plan);
                      setIsEditorOpen(true);
                    }}
                    className="p-1.5 text-[var(--text-muted)] hover:text-white rounded-sm hover:bg-[#1e1e1e]"
                    title="Edit Plan"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(plan)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-white rounded-sm hover:bg-[#1e1e1e]"
                    title="Duplicate Plan"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id, plan.name)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 rounded-sm hover:bg-rose-500/10"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {plan.notes && (
                <p className="text-xs text-[var(--text-muted)] italic mt-2 line-clamp-2">
                  {plan.notes}
                </p>
              )}

              {/* Movement List Preview */}
              <div className="mt-3 space-y-1">
                {plan.exercises.slice(0, 5).map((pe, idx) => {
                  const ex = exerciseMap.get(pe.exerciseId);
                  return (
                    <div
                      key={pe.id || idx}
                      className="text-xs flex items-center justify-between text-slate-300 py-0.5"
                    >
                      <span className="truncate pr-2">
                        {idx + 1}. {ex?.name || 'Movement'}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                        {pe.targetSets} × {pe.repMin && pe.repMax ? `${pe.repMin}-${pe.repMax}` : pe.targetSets}
                      </span>
                    </div>
                  );
                })}
                {plan.exercises.length > 5 && (
                  <div className="text-[11px] text-[var(--text-muted)] font-mono">
                    +{plan.exercises.length - 5} more movements
                  </div>
                )}
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-3 border-t border-[#2a2a2a] flex items-center justify-between">
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                One-tap start
              </span>
              <button
                onClick={() => handleStart(plan.id)}
                className="btn-primary text-xs flex items-center space-x-1.5 py-2 px-4"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start Workout</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <PlanEditorModal
        isOpen={isEditorOpen}
        planToEdit={editingPlan}
        onClose={() => setIsEditorOpen(false)}
        onSave={() => {}}
      />
    </div>
  );
}
