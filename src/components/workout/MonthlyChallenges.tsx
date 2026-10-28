import React, { useMemo, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Exercise } from '@/types';
import {
  getDefaultMonthlyChallengeIds,
  generateRandomMonthlyChallengeIds,
  resolveMonthlyChallenges,
  ActiveChallenge,
} from '@/domain/challenges';
import confetti from 'canvas-confetti';
import { format } from 'date-fns';
import {
  Trophy,
  Target,
  Flame,
  Dumbbell,
  Zap,
  Award,
  Calendar,
  Layers,
  Sparkles,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  ListFilter,
} from 'lucide-react';

export function MonthlyChallenges() {
  const [isRerolling, setIsRerolling] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('gym_challenges_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Mobile layout mode: 'carousel' (horizontal swipe) or 'list' (compact rows)
  const [mobileMode, setMobileMode] = useState<'carousel' | 'list'>(() => {
    try {
      return (localStorage.getItem('gym_challenges_mobile_mode') as 'carousel' | 'list') || 'carousel';
    } catch {
      return 'carousel';
    }
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeCarouselIdx, setActiveCarouselIdx] = useState(0);

  // Derive current month identifiers (e.g., '2026-10' and 'October 2026')
  const now = new Date();
  const currentMonthStr = format(now, 'yyyy-MM');
  const monthFullName = format(now, 'MMMM yyyy');
  const monthShortName = format(now, 'MMM');
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(0, lastDayOfMonth - now.getDate());

  // Query completed workouts for this month
  const allWorkouts = useLiveQuery(
    () => db.workouts.where('status').equals('completed').toArray(),
    [],
    []
  );
  const monthlyWorkouts = useMemo(() => {
    return allWorkouts.filter((w) => w.localDate && w.localDate.startsWith(currentMonthStr));
  }, [allWorkouts, currentMonthStr]);

  // Query all sets and exercises
  const allSets = useLiveQuery(() => db.sets.toArray(), [], []);
  const allExercises = useLiveQuery(() => db.exercises.toArray(), [], []);
  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    allExercises.forEach((e) => map.set(e.id, e));
    return map;
  }, [allExercises]);

  // Query app settings for user unit and custom saved challenge IDs
  const settingsRecords = useLiveQuery(() => db.settings.toArray(), [], []);
  const settingsMap = useMemo(() => {
    return new Map(settingsRecords.map((s) => [s.key, s.value]));
  }, [settingsRecords]);

  const userUnit = (settingsMap.get('unit') as 'kg' | 'lb') || 'kg';

  // Get active challenge IDs for this month
  const challengeIds = useMemo<string[]>(() => {
    const settingKey = `monthly_challenges_${currentMonthStr}`;
    const saved = settingsMap.get(settingKey);
    if (Array.isArray(saved) && saved.length === 3) {
      return saved as string[];
    }
    return getDefaultMonthlyChallengeIds(currentMonthStr);
  }, [settingsMap, currentMonthStr]);

  // Resolve challenge objects with real-time calculated progress
  const activeChallenges = useMemo<ActiveChallenge[]>(() => {
    return resolveMonthlyChallenges(
      challengeIds,
      monthlyWorkouts,
      allSets,
      exerciseMap,
      userUnit
    );
  }, [challengeIds, monthlyWorkouts, allSets, exerciseMap, userUnit]);

  const completedCount = activeChallenges.filter((c) => c.isCompleted).length;
  const allCompleted = activeChallenges.length > 0 && completedCount === activeChallenges.length;

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('gym_challenges_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const toggleMobileMode = () => {
    setMobileMode((prev) => {
      const next = prev === 'carousel' ? 'list' : 'carousel';
      try {
        localStorage.setItem('gym_challenges_mobile_mode', next);
      } catch {}
      return next;
    });
  };

  const handleReroll = async () => {
    setIsRerolling(true);
    try {
      const newIds = generateRandomMonthlyChallengeIds();
      await db.settings.put({
        key: `monthly_challenges_${currentMonthStr}`,
        value: newIds,
      });
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.3 },
        colors: ['#d9083c', '#f59e0b', '#3b82f6'],
      });
    } finally {
      setTimeout(() => setIsRerolling(false), 300);
    }
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, offsetWidth } = scrollRef.current;
    const itemWidth = offsetWidth * 0.85;
    const index = Math.round(scrollLeft / (itemWidth || 1));
    setActiveCarouselIdx(Math.min(Math.max(index, 0), activeChallenges.length - 1));
  };

  const scrollToCard = (idx: number) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const card = container.children[idx] as HTMLElement;
    if (card) {
      container.scrollTo({
        left: card.offsetLeft - 8,
        behavior: 'smooth',
      });
      setActiveCarouselIdx(idx);
    }
  };

  const getChallengeIcon = (iconName: string) => {
    switch (iconName) {
      case 'flame':
        return <Flame className="w-3.5 h-3.5 text-amber-400" />;
      case 'dumbbell':
        return <Dumbbell className="w-3.5 h-3.5 text-[#d9083c]" />;
      case 'zap':
        return <Zap className="w-3.5 h-3.5 text-yellow-400" />;
      case 'award':
        return <Award className="w-3.5 h-3.5 text-emerald-400" />;
      case 'calendar':
        return <Calendar className="w-3.5 h-3.5 text-sky-400" />;
      case 'layers':
        return <Layers className="w-3.5 h-3.5 text-indigo-400" />;
      case 'target':
        return <Target className="w-3.5 h-3.5 text-rose-400" />;
      case 'trophy':
      default:
        return <Trophy className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'frequency':
      case 'consistency':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'legs':
        return 'bg-[#d9083c]/10 text-[#d9083c] border-[#d9083c]/20';
      case 'shoulders':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'chest':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'back':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'arms':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'volume':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'prs':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default:
        return 'bg-[var(--hover-bg)] text-[var(--text-muted)] border-[var(--border-color)]';
    }
  };

  return (
    <section
      id="monthly-challenges-card"
      aria-label="Monthly Fitness Challenges"
      className={`flat-card transition-all duration-200 relative overflow-hidden ${
        isCollapsed ? 'p-3' : 'p-3.5 sm:p-5'
      } ${
        allCompleted
          ? 'border-amber-500/60 bg-gradient-to-br from-amber-500/5 via-[var(--card-bg)] to-amber-500/10 shadow-lg'
          : ''
      }`}
    >
      {/* Background Glow Accent for All-Completed State */}
      {allCompleted && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      )}

      {/* Card Header - Ultra compact on mobile, detailed on desktop */}
      <div className="flex items-center justify-between gap-2">
        <div
          onClick={toggleCollapse}
          className="flex items-center space-x-2 cursor-pointer select-none group min-w-0"
        >
          <div className="w-7 h-7 rounded-sm bg-[#d9083c]/10 border border-[#d9083c]/30 flex items-center justify-center shrink-0">
            <Target className="w-3.5 h-3.5 text-[#d9083c]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 truncate">
              {/* Short title on mobile, full on desktop */}
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text-color)] tracking-tight truncate">
                <span className="sm:hidden">{monthShortName} Challenges</span>
                <span className="hidden sm:inline">{monthFullName} Challenges</span>
              </h3>

              {allCompleted ? (
                <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Done</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
                  {daysRemaining}d left
                </span>
              )}
            </div>

            {/* Subtitle hidden when collapsed */}
            {!isCollapsed && (
              <p className="hidden sm:block text-[11px] text-[var(--text-muted)] truncate">
                {daysRemaining > 0
                  ? `${daysRemaining} days remaining in ${format(now, 'MMMM')}`
                  : 'Final day'} · Crush your 3 training targets
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Completion Badge */}
          <span
            className={`px-2 py-0.5 rounded-xs text-[11px] font-mono font-bold border transition-colors ${
              completedCount === 3
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : completedCount > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-[var(--hover-bg)] border-[var(--border-color)] text-[var(--text-muted)]'
            }`}
          >
            {completedCount}/3
          </span>

          {/* Toggle between Swipe Carousel & Compact List on Mobile */}
          {!isCollapsed && (
            <button
              onClick={toggleMobileMode}
              className="md:hidden p-1 text-[var(--text-muted)] hover:text-[var(--text-color)] hover:bg-[var(--hover-bg)] rounded-xs transition-colors"
              title={mobileMode === 'carousel' ? 'Switch to list view' : 'Switch to carousel view'}
              aria-label="Toggle mobile layout"
            >
              {mobileMode === 'carousel' ? (
                <ListFilter className="w-3.5 h-3.5" />
              ) : (
                <LayoutGrid className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Reroll Button */}
          <button
            id="reroll-challenges-btn"
            onClick={handleReroll}
            disabled={isRerolling}
            title="Roll 3 new challenges for this month"
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-color)] hover:bg-[var(--hover-bg)] rounded-xs transition-colors"
            aria-label="Reroll monthly challenges"
          >
            <RotateCcw
              className={`w-3.5 h-3.5 ${isRerolling ? 'animate-spin text-[#d9083c]' : ''}`}
            />
          </button>

          {/* Collapse/Expand Chevron */}
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand challenges' : 'Collapse challenges'}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-color)] hover:bg-[var(--hover-bg)] rounded-xs transition-colors"
            aria-label={isCollapsed ? 'Expand challenges' : 'Collapse challenges'}
          >
            {isCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Render Challenges Content if not collapsed */}
      {!isCollapsed && (
        <div className="mt-3">
          {/* ============================================================== */}
          {/* 1. MOBILE CAROUSEL VIEW (< md viewport, when in carousel mode) */}
          {/* Takes minimal vertical space: ~105px total card height!        */}
          {/* ============================================================== */}
          {mobileMode === 'carousel' && (
            <div className="md:hidden space-y-2">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto snap-x snap-mandatory gap-2.5 pb-1 -mx-1 px-1 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {activeChallenges.map((challenge, idx) => {
                  const isDone = challenge.isCompleted;
                  return (
                    <div
                      key={challenge.definition.id}
                      className={`w-[82vw] max-w-[300px] shrink-0 snap-center p-3 rounded-sm border transition-all flex flex-col justify-between ${
                        isDone
                          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                          : 'bg-[var(--hover-bg)]/80 border-[var(--border-color)]'
                      }`}
                    >
                      <div>
                        {/* Top Badge & Metric Row */}
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="p-0.5 rounded-xs bg-[var(--card-bg)] border border-[var(--border-color)]">
                              {getChallengeIcon(challenge.definition.iconName)}
                            </span>
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-xs border ${getCategoryBadgeClass(
                                challenge.definition.category
                              )}`}
                            >
                              {challenge.definition.category}
                            </span>
                          </div>

                          {isDone ? (
                            <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-400">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Done</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-semibold text-[var(--text-muted)]">
                              {challenge.progressPercent}%
                            </span>
                          )}
                        </div>

                        {/* Title & Short description */}
                        <h4 className="text-xs font-bold text-[var(--text-color)] tracking-tight truncate">
                          {challenge.definition.title}
                        </h4>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
                          {challenge.definition.description}
                        </p>
                      </div>

                      {/* Progress Bar & Values */}
                      <div className="mt-2 pt-1.5 border-t border-[var(--border-color)]/60">
                        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                          <span className="text-[var(--text-muted)] uppercase text-[9px]">
                            Progress
                          </span>
                          <span
                            className={`font-semibold ${
                              isDone ? 'text-emerald-400' : 'text-[var(--text-color)]'
                            }`}
                          >
                            {challenge.displayText}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isDone
                                ? 'bg-emerald-500'
                                : challenge.progressPercent > 66
                                ? 'bg-amber-500'
                                : 'bg-[#d9083c]'
                            }`}
                            style={{ width: `${challenge.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Carousel Pagination Dots */}
              <div className="flex items-center justify-center space-x-1.5 pt-0.5">
                {activeChallenges.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => scrollToCard(idx)}
                    aria-label={`Go to challenge ${idx + 1}`}
                    className={`h-1 rounded-full transition-all duration-200 ${
                      activeCarouselIdx === idx
                        ? 'w-4 bg-[#d9083c]'
                        : 'w-1.5 bg-[var(--border-color)] hover:bg-[var(--text-muted)]'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 2. MOBILE COMPACT LIST VIEW (< md viewport, in list mode)      */}
          {/* Slim rows stacking in ~95px total height!                      */}
          {/* ============================================================== */}
          {mobileMode === 'list' && (
            <div className="md:hidden space-y-1.5">
              {activeChallenges.map((challenge, idx) => {
                const isDone = challenge.isCompleted;
                return (
                  <div
                    key={challenge.definition.id}
                    className={`p-2 rounded-sm border transition-all flex items-center justify-between gap-2 ${
                      isDone
                        ? 'bg-emerald-950/15 border-emerald-500/40'
                        : 'bg-[var(--hover-bg)]/70 border-[var(--border-color)]'
                    }`}
                  >
                    {/* Left: Icon, Title & Category */}
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <span className="p-1 rounded-xs bg-[var(--card-bg)] border border-[var(--border-color)] shrink-0">
                        {getChallengeIcon(challenge.definition.iconName)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-[var(--text-color)] tracking-tight truncate">
                          {challenge.definition.title}
                        </div>
                        <div className="text-[9px] text-[var(--text-muted)] truncate">
                          {challenge.displayText}
                        </div>
                      </div>
                    </div>

                    {/* Right: Slim Progress Bar & Percent */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <div className="w-16 h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isDone ? 'bg-emerald-500' : 'bg-[#d9083c]'
                          }`}
                          style={{ width: `${challenge.progressPercent}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold w-7 text-right ${
                          isDone ? 'text-emerald-400' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {isDone ? '✓' : `${challenge.progressPercent}%`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ============================================================== */}
          {/* 3. DESKTOP GRID VIEW (>= md viewport)                          */}
          {/* Unchanged 3-column desktop layout that works perfectly!        */}
          {/* ============================================================== */}
          <div className="hidden md:grid md:grid-cols-3 gap-3">
            {activeChallenges.map((challenge, idx) => {
              const isDone = challenge.isCompleted;
              return (
                <div
                  key={challenge.definition.id}
                  id={`challenge-card-${idx}`}
                  className={`p-3.5 rounded-sm border transition-all duration-200 flex flex-col justify-between relative group ${
                    isDone
                      ? 'bg-emerald-950/15 border-emerald-500/40 shadow-sm'
                      : 'bg-[var(--hover-bg)]/60 hover:bg-[var(--hover-bg)] border-[var(--border-color)]'
                  }`}
                >
                  <div>
                    {/* Category & Status Row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="p-1 rounded-sm bg-[var(--card-bg)] border border-[var(--border-color)]">
                          {getChallengeIcon(challenge.definition.iconName)}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-xs border ${getCategoryBadgeClass(
                            challenge.definition.category
                          )}`}
                        >
                          {challenge.definition.category}
                        </span>
                      </div>

                      {isDone ? (
                        <span className="flex items-center space-x-1 text-[11px] font-bold text-emerald-400">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono font-semibold text-[var(--text-muted)]">
                          {challenge.progressPercent}%
                        </span>
                      )}
                    </div>

                    {/* Challenge Title & Description */}
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-color)] tracking-tight">
                      {challenge.definition.title}
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2 leading-relaxed">
                      {challenge.definition.description}
                    </p>
                  </div>

                  {/* Progress Bar & Value Display */}
                  <div className="mt-3.5 pt-2 border-t border-[var(--border-color)]/60">
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                      <span className="text-[var(--text-muted)] text-[10px] uppercase font-semibold">
                        Progress
                      </span>
                      <span
                        className={`font-semibold ${
                          isDone ? 'text-emerald-400' : 'text-[var(--text-color)]'
                        }`}
                      >
                        {challenge.displayText}
                      </span>
                    </div>

                    {/* Bar */}
                    <div className="w-full h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDone
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                            : challenge.progressPercent > 66
                            ? 'bg-amber-500'
                            : 'bg-[#d9083c]'
                        }`}
                        style={{ width: `${challenge.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
