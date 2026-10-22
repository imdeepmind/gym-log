import React, { useState, useEffect } from 'react';
import { getAllHistoricalPRs } from '@/services/stats';
import { Trophy, Award, Dumbbell, Calendar } from 'lucide-react';
import { getMuscleName } from '@/domain/muscles';

export function PRsGallery() {
  const [prs, setPrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllHistoricalPRs()
      .then(setPrs)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-xs text-[var(--text-muted)]">Loading personal records...</div>;
  }

  if (prs.length === 0) {
    return (
      <div className="flat-card p-10 text-center space-y-3">
        <Trophy className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
        <h3 className="font-bold text-white text-base">No Personal Records Yet</h3>
        <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
          Complete workouts and log working sets. As you increase weight or reps, your all-time PR records will be spotlighted here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1 border-b border-[#2a2a2a]">
        <div>
          <h3 className="text-base font-bold text-white">All-Time Personal Records</h3>
          <p className="text-xs text-[var(--text-muted)]">
            {prs.length} exercises with verified record bests
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {prs.map((item) => (
          <div key={item.exercise.id} className="flat-card p-4 space-y-3 hover:border-[#d9083c] transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-sm text-white">{item.exercise.name}</h4>
                <span className="text-[10px] uppercase font-semibold text-[#d9083c]">
                  {getMuscleName(item.exercise.primaryMuscle)}
                </span>
              </div>
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#2a2a2a] text-center font-mono">
              <div className="bg-[#121212] p-2 rounded-sm border border-[#2a2a2a]">
                <div className="text-[9px] uppercase font-semibold text-[var(--text-muted)] font-sans">
                  Max Wt
                </div>
                <div className="font-bold text-white text-sm mt-0.5">
                  {item.maxWeight} <span className="text-[10px] text-[var(--text-muted)]">kg</span>
                </div>
              </div>

              <div className="bg-[#121212] p-2 rounded-sm border border-[#2a2a2a]">
                <div className="text-[9px] uppercase font-semibold text-[var(--text-muted)] font-sans">
                  Best e1RM
                </div>
                <div className="font-bold text-[#d9083c] text-sm mt-0.5">
                  {item.maxE1RM} <span className="text-[10px] text-[var(--text-muted)]">kg</span>
                </div>
              </div>

              <div className="bg-[#121212] p-2 rounded-sm border border-[#2a2a2a]">
                <div className="text-[9px] uppercase font-semibold text-[var(--text-muted)] font-sans">
                  Best Reps
                </div>
                <div className="font-bold text-white text-sm mt-0.5">
                  {item.bestReps} <span className="text-[10px] text-[var(--text-muted)]">reps</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
