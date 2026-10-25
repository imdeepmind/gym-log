import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Plan, Exercise } from '@/types';
import { startWorkoutFromPlan } from '@/services/plan';
import { PlanEditorModal } from './PlanEditorModal';
import { ProgramScheduleModal } from './ProgramScheduleModal';
import { CalendarView } from '@/components/calendar/CalendarView';
import {
  Plus,
  Play,
  Edit2,
  Copy,
  Trash2,
  Layers,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useConfirm } from '@/hooks/useConfirm';

interface Props {
  onStartPlanWorkout: (workout: any) => void;
}

export function PlansView({ onStartPlanWorkout }: Props) {
  const confirm = useConfirm();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const plans = useLiveQuery(
    async () => {
      const all = await db.plans.toArray();
      return all.filter((p) => !p.isArchived);
    },
    [],
    []
  );

  const allExercises = useLiveQuery(() => db.exercises.toArray(), [], []);
  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    allExercises.forEach((e) => map.set(e.id, e));
    return map;
  }, [allExercises]);

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
    const ok = await confirm({
      title: 'Delete Plan',
      message: `Delete plan "${name}"? Past workouts logged with this plan will remain intact in your history.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) {
      await db.plans.delete(planId);
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-12">
      {/* Top Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-color)] tracking-tight">
            Plans & Calendar
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Configure reusable workout routines and monitor your weekly training consistency
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsScheduleOpen(true)}
            className="btn-secondary text-xs flex items-center space-x-1.5 py-2 px-3.5"
            title="Configure Weekly Program Split"
          >
            <Calendar className="w-3.5 h-3.5 text-[#d9083c]" />
            <span>Weekly Split</span>
          </button>

          <button
            onClick={() => {
              setEditingPlan(null);
              setIsEditorOpen(true);
            }}
            className="btn-primary text-xs flex items-center space-x-1.5 py-2 px-3.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Plan</span>
          </button>
        </div>
      </div>

      {/* Navigation Quick Jump Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 -mt-4">
        <button
          onClick={() => scrollToSection('plans-section')}
          className="px-3 py-1.5 text-xs font-semibold rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] hover:border-[#d9083c] transition-colors flex items-center space-x-1.5 shrink-0 shadow-xs"
        >
          <Layers className="w-3.5 h-3.5 text-[#d9083c]" />
          <span>Workout Plans ({plans.length})</span>
        </button>
        <button
          onClick={() => scrollToSection('calendar-section')}
          className="px-3 py-1.5 text-xs font-semibold rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] hover:border-[#d9083c] transition-colors flex items-center space-x-1.5 shrink-0 shadow-xs"
        >
          <Calendar className="w-3.5 h-3.5 text-[#d9083c]" />
          <span>Calendar & Adherence</span>
        </button>
      </div>

      {/* SECTION 1: WORKOUT PLANS */}
      <section id="plans-section" className="space-y-4 scroll-mt-20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-color)] flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#d9083c]" />
              <span>Workout Routines</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Launch preconfigured routines with prefilled exercises, sets, and rep ranges
            </p>
          </div>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            {plans.length} {plans.length === 1 ? 'saved routine' : 'saved routines'}
          </span>
        </div>

        {/* Grid of Plans or Empty State */}
        {plans.length === 0 ? (
          <div className="flat-card p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-sm bg-[var(--hover-bg)] border border-[var(--border-color)] flex items-center justify-center mx-auto text-[#d9083c]">
              <Layers className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-[var(--text-color)]">No Plans Created Yet</h4>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              You don't have any custom plans saved. Tap "New Plan" above to configure your exercises, sets, and rep targets.
            </p>
            <button
              onClick={() => {
                setEditingPlan(null);
                setIsEditorOpen(true);
              }}
              className="btn-primary text-xs py-2 px-4 inline-flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create First Plan</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flat-card p-5 flex flex-col justify-between space-y-4 hover:border-[#d9083c] transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-base text-[var(--text-color)] hover:text-[#d9083c] transition-colors">
                        {plan.name}
                      </h4>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">
                        {plan.exercises.length} {plan.exercises.length === 1 ? 'exercise' : 'exercises'} · ~{plan.exercises.reduce((acc, pe) => acc + (pe.targetSets || 3), 0)} target sets
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setEditingPlan(plan);
                          setIsEditorOpen(true);
                        }}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-color)] rounded-sm hover:bg-[var(--hover-bg)] transition-colors"
                        title="Edit Plan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(plan)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-color)] rounded-sm hover:bg-[var(--hover-bg)] transition-colors"
                        title="Duplicate Plan"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id, plan.name)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 rounded-sm hover:bg-rose-500/10 transition-colors"
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
                          className="text-xs flex items-center justify-between text-[var(--text-color)] py-0.5"
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
                      <div className="text-[11px] text-[var(--text-muted)] font-mono pt-0.5">
                        +{plan.exercises.length - 5} more movements
                      </div>
                    )}
                  </div>
                </div>

                {/* Launch Button */}
                <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[var(--text-muted)] flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-[#d9083c]" />
                    <span>One-tap start</span>
                  </span>
                  <button
                    onClick={() => handleStart(plan.id)}
                    className="btn-primary text-xs flex items-center space-x-1.5 py-1.5 px-3.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Start Workout</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: CALENDAR & ADHERENCE (COMES AFTER PLANS SECTION) */}
      <section id="calendar-section" className="pt-6 border-t border-[var(--border-color)] scroll-mt-20">
        <CalendarView onStartWorkout={onStartPlanWorkout} />
      </section>

      {/* Modals */}
      <PlanEditorModal
        isOpen={isEditorOpen}
        planToEdit={editingPlan}
        onClose={() => setIsEditorOpen(false)}
        onSave={() => {}}
      />

      <ProgramScheduleModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
      />
    </div>
  );
}

