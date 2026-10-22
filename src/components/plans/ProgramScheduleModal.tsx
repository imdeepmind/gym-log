import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Program, Plan, ProgramDay } from '@/types';
import { updateProgram, createProgram } from '@/services/program';
import { X, Calendar, Check, Plus, Layers } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export function ProgramScheduleModal({ isOpen, onClose }: Props) {
  const activeProgram = useLiveQuery(
    async () => {
      const all = await db.programs.toArray();
      return all.find((p) => p.isActive);
    },
    [],
    undefined
  );

  const plans = useLiveQuery(() => db.plans.toArray(), [], []);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<'weekly' | 'cycle'>('weekly');
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (activeProgram) {
      setName(activeProgram.name);
      setKind(activeProgram.kind);
      // Ensure all 7 days exist for weekly
      const daySlots: ProgramDay[] = [];
      for (let i = 0; i < 7; i++) {
        const existing = activeProgram.days.find((d) => d.dayIndex === i);
        if (existing) {
          daySlots.push({ ...existing });
        } else {
          daySlots.push({
            dayIndex: i,
            planIds: [],
            label: i === 6 ? 'Rest Day' : WEEKDAY_NAMES[i],
          });
        }
      }
      setDays(daySlots);
    } else {
      setName('My Weekly Split');
      setKind('weekly');
      setDays(
        WEEKDAY_NAMES.map((w, idx) => ({
          dayIndex: idx,
          planIds: [],
          label: idx === 6 ? 'Rest Day' : `${w} Routine`,
        }))
      );
    }
  }, [activeProgram, isOpen]);

  if (!isOpen) return null;

  const handlePlanChange = (dayIndex: number, selectedPlanId: string) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.dayIndex !== dayIndex) return d;
        return {
          ...d,
          planIds: selectedPlanId ? [selectedPlanId] : [],
          label: selectedPlanId
            ? plans.find((p) => p.id === selectedPlanId)?.name || d.label
            : 'Rest Day',
        };
      })
    );
  };

  const handleLabelChange = (dayIndex: number, label: string) => {
    setDays((prev) =>
      prev.map((d) => (d.dayIndex === dayIndex ? { ...d, label } : d))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeProgram) {
      await updateProgram(activeProgram.id, {
        name: name.trim() || 'My Training Program',
        kind,
        days,
      });
    } else {
      await createProgram({
        name: name.trim() || 'My Training Program',
        kind,
        cycleLength: 7,
        startDate: new Date().toISOString().slice(0, 10),
        isActive: true,
        days,
      });
    }

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#161616] border border-[#2a2a2a] w-full max-w-2xl rounded-md flex flex-col max-h-[90vh] text-[#f0f0f0] shadow-2xl">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#d9083c]/10 border border-[#d9083c]/30 flex items-center justify-center text-[#d9083c]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Program Split & Schedule</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Assign recurring workout plans to days of the week (e.g. Sunday) or set Rest days.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-white rounded-sm hover:bg-[#1e1e1e]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Schedule Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Program Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Program Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Push Pull Legs Split"
              className="flat-input w-full px-3 py-2 text-sm font-semibold"
            />
          </div>

          {/* 7 Days of the Week Schedule */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Weekly Days (Monday — Sunday)
              </label>
              <span className="text-[11px] text-[var(--text-muted)]">
                Choose a plan for each day or leave as Rest
              </span>
            </div>

            <div className="space-y-2">
              {days.map((day) => {
                const dayName = WEEKDAY_NAMES[day.dayIndex];
                const currentPlanId = day.planIds.length > 0 ? day.planIds[0] : '';
                const isSunday = day.dayIndex === 6;

                return (
                  <div
                    key={day.dayIndex}
                    className={`p-3 rounded-sm border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSunday
                        ? 'bg-[#1a1517] border-[#d9083c]/40'
                        : 'bg-[#1a1a1a] border-[#2a2a2a]'
                    }`}
                  >
                    {/* Day Name & Label */}
                    <div className="min-w-[130px]">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white">{dayName}</span>
                        {isSunday && (
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded-sm bg-[#d9083c]/20 text-[#d9083c] font-semibold border border-[#d9083c]/40">
                            Sunday
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={day.label}
                        onChange={(e) => handleLabelChange(day.dayIndex, e.target.value)}
                        placeholder="Day note/label"
                        className="bg-transparent border-none text-[11px] text-[var(--text-muted)] focus:text-white p-0 mt-0.5 outline-none font-mono"
                      />
                    </div>

                    {/* Plan Selector Dropdown */}
                    <div className="flex-1 max-w-sm">
                      <select
                        value={currentPlanId}
                        onChange={(e) => handlePlanChange(day.dayIndex, e.target.value)}
                        className={`flat-input w-full py-1.5 px-3 text-xs font-semibold ${
                          currentPlanId
                            ? 'text-white border-[#d9083c]/50 bg-[#161616]'
                            : 'text-[var(--text-muted)] bg-[#121212]'
                        }`}
                      >
                        <option value="">Rest Day (No Workout)</option>
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.exercises.length} exercises)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-[#2a2a2a] flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              Changes update your calendar schedule and home screen immediately.
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-xs py-2 px-5 flex items-center space-x-1.5"
              >
                {isSaved ? <Check className="w-4 h-4 stroke-[3]" /> : null}
                <span>{isSaved ? 'Saved!' : 'Save Schedule'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
