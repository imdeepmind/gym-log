GymLog: Technical Specification
Version 0.1 (draft) · October 22, 2026 · Offline-first React PWA for logging gym workouts

1. Overview
GymLog is an installable, offline-first progressive web app for logging strength workouts. The user starts a workout (empty, from a Plan, or from today's Program day), a live timer runs, they log sets, and when they finish they see a summary: duration, total volume, total reps, sets and the muscle groups trained. Over time the app turns that history into charts, personal records, a calendar of completed and missed workouts, and next-session suggestions.
Goals
• Fast, one-handed logging in a gym with poor connectivity.
• Zero data loss: every change is persisted immediately, including mid-workout.
• Everything local and private. Full JSON export and import.
• Flexible exercise types: weight x reps, bodyweight, weighted/assisted bodyweight, duration, distance and time.
Non-goals for v1
• No backend, accounts, cloud sync or social features.
• No exercise videos or images (they bloat offline storage).
• No Apple Health or Google Fit integration (limited for PWAs).
• No AI coaching. Suggestions are simple, explainable rules.
2. Terminology
Term
Meaning
Exercise
A movement in the library, e.g. Bench Press, Pull-up, Plank.
Plan
A reusable workout template: an ordered list of exercises with target sets, reps and rest. e.g. Leg Day A.
Program
A schedule that maps days to Plans, e.g. Mon = Legs, Tue = Push, Wed = Rest. Weekly or N-day rotating cycle.
Workout
One actual logged session on a date. May be started empty, from a Plan, or from a Program day.
Set
One logged entry inside a Workout: weight, reps, duration etc., with a type (warm-up, working, drop, failure).
A Plan is a template, a Program arranges Plans over time, and a Workout is what really happened.
3. Feature scope and phasing
Phase 1: Core logging (MVP)
• Exercise library: about 150 to 200 preloaded exercises with primary and secondary muscles, equipment and tracking type. Custom exercises can be created, edited and archived (never hard-deleted, so history stays intact). Search plus filters by muscle, equipment and favourites.
• Start Workout (the heart of the app):
    ◦ Start empty, from a Plan, or from today's Program day.
    ◦ A live elapsed timer starts at once. The start time is editable.
    ◦ Add, remove, reorder and swap exercises mid-workout. Group exercises into supersets.
    ◦ Finish and discard actions. A workout can also be logged afterwards for a past date.
• Set logging with a field set per tracking type, set tags (warm-up, working, drop, failure), optional RPE or RIR, and notes per set and per exercise. Warm-ups are excluded from volume and PR calculations by default.
• Previous performance auto-fill: last session's sets are shown beside each row and used to pre-fill new sets. Includes a copy previous set button.
• Rest timer after each completed set, configurable per exercise, with sound and vibration.
• Screen wake lock while a workout is active.
• Finish summary (section 7.6).
• History: list of past workouts, detail view, edit and delete.
• Export and import of full JSON backup, plus a backup reminder if no export for N days.
• Settings: kg/lb, theme, default rest time, rounding increment.
• PWA shell: installable, fully offline, persistent storage request.
Phase 2: Plans, Programs, Calendar
• Plans: create from scratch, duplicate, or save a finished workout as a Plan.
• Programs: weekly or N-day cycle, one active at a time, with start date, rest days and multiple Plans per day.
• Home screen shows Today: the scheduled Plan with one-tap start. Swap or skip today without breaking the schedule.
• Calendar month view with Completed, Missed, Rest, Upcoming and Extra states.
• Session notes and a mood and energy tag per workout.
Phase 3: Progress
• Per-exercise and overall charts, personal records page and in-workout PR badges.
• Body weight and measurements tracking with charts.
• Progressive overload suggestions.
• CSV export, and CSV import from Strong and Hevy.
Phase 4: Medium-effort extras
• Workout history search across exercises, plans, notes and dates.
• Muscle group heatmap of what you have trained this week.
• Progression and deload rules per Plan exercise and per Program.
Later (not in this spec's scope)
Built-in popular programs (5/3/1, PPL, StrongLifts), percentage-based programming, auto warm-up calculator, share-as-image, file-based sync via Google Drive or Dropbox.
4. Tech stack
Concern
Choice
Why
UI
React 18 and TypeScript
As requested. Strict mode on.
Build
Vite
Fast dev loop, simple PWA integration.
PWA
vite-plugin-pwa (Workbox)
Manifest, service worker, precaching, update prompt.
Storage
IndexedDB via Dexie
Indexed queries over years of sets. localStorage is about 5 MB, synchronous and unqueryable.
Reactive data
dexie-react-hooks (useLiveQuery)
UI re-renders automatically when the DB changes. DB is the source of truth.
Transient UI state
Zustand
Open sheets, rest timer display, filters. Not for workout data.
Routing
React Router
Use HashRouter if hosting on GitHub Pages, else BrowserRouter with SPA fallback.
Charts
Recharts
Line, bar and area charts, lazy-loaded on the Progress route.
Dates
date-fns
Small, tree-shakeable.
Validation
Zod
Import file validation and typed parsing.
Styling
Tailwind CSS
Fast mobile-first UI, dark mode via class.
Testing
Vitest, React Testing Library, fake-indexeddb, Playwright
See section 17.
IDs are generated with crypto.randomUUID(). Hosting is any static host (Cloudflare Pages, Netlify, Vercel).
5. Architecture
Four layers, with strict one-way dependencies:
6. UI: pages and components. Reads data through hooks, calls services for writes.
7. Hooks: thin wrappers around useLiveQuery and service calls.
8. Services: workoutService, planService, programService, backupService, importService, statsService. They own transactions and business rules.
9. Domain: pure functions with no IO (e1RM, volume, PR detection, suggestions, schedule resolution, missed-day logic). Fully unit-testable.
Suggested structure:
src/
  domain/        calc.ts, prs.ts, suggest.ts, schedule.ts, units.ts, muscles.ts
  db/            schema.ts, migrations.ts, seed/exercises.json
  services/      workout.ts, plan.ts, program.ts, backup.ts, importers/
  hooks/         useActiveWorkout.ts, useRestTimer.ts, useWakeLock.ts
  pages/         Home, Workout, Summary, History, Plans, Programs, Calendar, Progress, Exercises, Body, Settings
  components/    SetRow, ExercisePicker, MuscleHeatmap, charts/
  pwa/           register.ts, install.ts
10. Data model
All entities carry id, createdAt and updatedAt (epoch ms). Dates that represent a calendar day are stored as local date strings (YYYY-MM-DD) in addition to timestamps, so timezone changes and travel never shift a workout to a different day. All weights are stored in kilograms (canonical) and converted for display, so switching kg/lb never corrupts history.
type ID = string;
type Muscle = 'chest' | 'upper_back' | 'lats' | 'lower_back' | 'traps' | 'shoulders'
  | 'biceps' | 'triceps' | 'forearms' | 'abs' | 'obliques' | 'glutes'
  | 'quads' | 'hamstrings' | 'calves' | 'adductors' | 'abductors' | 'cardio';
type TrackingType = 'weight_reps' | 'bodyweight_reps' | 'weighted_bodyweight'
  | 'assisted_bodyweight' | 'duration' | 'distance_time';
type SetType = 'warmup' | 'working' | 'drop' | 'failure';

interface Base { id: ID; createdAt: number; updatedAt: number }

interface Exercise extends Base {
  name: string;
  trackingType: TrackingType;
  primaryMuscle: Muscle;
  secondaryMuscles: Muscle[];
  equipment: 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'band' | 'other';
  isCustom: boolean;     // false = seeded from the bundled library
  isFavorite: boolean;
  isArchived: boolean;
  defaultRestSec?: number;
}

interface PlanExercise {
  id: ID; exerciseId: ID; order: number;
  supersetGroup?: number;
  targetSets: number; repMin?: number; repMax?: number;
  targetWeightKg?: number; restSec?: number; notes?: string;
  progression?: ProgressionRule;          // Phase 4
}
interface Plan extends Base {              // plan = template
  name: string; notes?: string; isArchived: boolean;
  exercises: PlanExercise[];              // embedded: always loaded together, small
}

interface ProgramDay { dayIndex: number; planIds: ID[]; label?: string } // empty planIds = rest
interface Program extends Base {
  name: string;
  kind: 'weekly' | 'cycle';
  cycleLength: number;                    // 7 for weekly
  days: ProgramDay[];                     // weekly: 0 = Monday ... 6 = Sunday
  startDate: string;                      // YYYY-MM-DD, missed days count from here
  endDate?: string;
  isActive: boolean;                      // only one active at a time
  deload?: DeloadRule;                    // Phase 4
}
interface ScheduleOverride { date: string; action: 'skip' | 'replace'; planIds?: ID[] } // key = date

interface Workout extends Base {
  name: string;
  status: 'in_progress' | 'completed';
  startedAt: number; endedAt?: number;
  localDate: string;                      // day the workout belongs to
  planId?: ID; programId?: ID;
  scheduledDate?: string;                 // set when started from a Program day, lets a late workout satisfy a missed day
  bodyweightKg?: number;
  notes?: string; mood?: 1|2|3|4|5; energy?: 1|2|3|4|5;
  summary?: WorkoutSummary;               // computed once at finish
}
interface WorkoutExercise extends Base {
  workoutId: ID; exerciseId: ID; order: number;
  supersetGroup?: number; restSec?: number; notes?: string;
}
interface SetEntry extends Base {
  workoutId: ID; workoutExerciseId: ID;
  exerciseId: ID;                         // denormalised for per-exercise history queries
  order: number; type: SetType;
  weightKg?: number;                      // added load for weighted, assist amount for assisted
  reps?: number; durationSec?: number; distanceM?: number;
  rpe?: number; rir?: number; notes?: string;
  completed: boolean;                     // pre-filled rows exist before completion
  completedAt?: number;                   // only set when completed
}

interface WorkoutSummary {
  durationSec: number; totalVolumeKg: number; totalReps: number;
  workingSets: number; warmupSets: number; exerciseCount: number;
  muscleSets: Partial<Record<Muscle, number>>;   // snapshot of weighted sets per muscle
  prs: { exerciseId: ID; kind: PRKind; value: number }[];
}

interface BodyMetric extends Base {
  type: 'bodyweight' | 'body_fat' | 'chest' | 'waist' | 'hips' | 'arm' | 'thigh';
  date: string; value: number;           // kg, %, or cm
}
Dexie schema
db.version(1).stores({
  exercises:         'id, name, primaryMuscle, equipment, isArchived, isFavorite',
  plans:             'id, name, updatedAt',
  programs:          'id, isActive',
  scheduleOverrides: 'date',
  workouts:          'id, status, localDate, startedAt, planId',
  workoutExercises:  'id, workoutId, exerciseId',
  sets:              'id, workoutId, workoutExerciseId, exerciseId, [exerciseId+completedAt]',
  bodyMetrics:       'id, [type+date]',
  settings:          'key',
});
Notes on the schema:
• Sets with no completedAt are not present in the [exerciseId+completedAt] index, so history and PR queries automatically ignore unfinished rows.
• Every schema change gets a new db.version(n) with an upgrade function. The export file carries its own schemaVersion (section 13) so backups can be migrated too.
• Settings live in the settings table. Only the theme is mirrored to localStorage, to avoid a flash of the wrong theme on load.
• Seeded exercises have stable IDs (e.g. ex_bench_press) so backups from different devices merge cleanly. Seeded exercises cannot be edited, only favourited or archived. Editing one offers duplicate as custom.
7. Start Workout, the active session
7.1 Lifecycle

1. Start: the user taps Start Workout and chooses Empty, From Plan, or Today's Program day. A Workout row is created at once with status in_progress and startedAt = now.
2. Active: every edit writes straight to IndexedDB. There is at most one in_progress workout at a time.
3. Finish: the user taps Finish. The app computes the summary, stores it on the Workout, sets status completed and endedAt, and shows the summary screen.
4. Discard: confirms, then deletes the workout and its rows.
If the app is reloaded, crashed or killed, the in_progress workout is found on launch. The home screen shows a Resume workout banner and a mini bar appears above the bottom nav on every other screen.
7.2 Timer
The elapsed time is never counted with setInterval. It is derived: elapsed = now - startedAt. The UI ticks once a second only to re-render. This stays correct when the phone locks, the tab is throttled, or the app is restarted. On finish, durationSec = endedAt - startedAt, and the user can adjust the start time if they forgot to press start.
7.3 Starting from a Plan
Starting from a Plan copies its exercises into WorkoutExercise rows and creates SetEntry rows (uncompleted) for each target set. Row values are pre-filled in this priority order:
5. Progression-rule target for this exercise, if the Plan defines one (Phase 4).
6. The Plan's target weight and reps.
7. Last performance of that exercise (previous performance auto-fill).
8. Blank.
The copy is a snapshot. Editing the workout never changes the Plan. After finishing, if the workout diverged from its Plan (exercises added, removed, or set counts changed), the summary offers Update Plan with today's changes.
7.4 Logging UX
• Each exercise is a card with set rows. A row shows: set number, previous performance (e.g. 80 x 8), input fields for the exercise's tracking type, set type tag, and a complete checkbox.
• Tapping the checkbox marks the set completed, stamps completedAt, runs PR detection and starts the rest timer.
• Inputs use inputMode decimal for weight and numeric for reps, so the right keypad appears. Steppers (+/- plate increment) sit beside the weight field.
• Long press on the set number opens a sheet to change set type, add RPE or RIR, or delete the set.
• Add Exercise opens the picker (search, filters, recent, favourites, create new). Cards can be reordered, swapped, or joined into a superset.
• Warm-up sets are visually muted and excluded from volume and PRs.
7.5 Rest timer, wake lock, notifications
• On set completion the rest timer starts with that exercise's restSec, else the Plan value, else the global default. It is stored as an endsAt timestamp (not a countdown) and shown in a sticky bar with +15s, -15s and Skip.
• At zero: a sound (AudioContext, unlocked by the first user tap) and vibration where supported. iOS does not support navigator.vibrate.
• PWAs cannot reliably run timers or push notifications while the phone is locked, especially on iOS. A local notification when the app is backgrounded is therefore best-effort only. On returning to the app the timer recomputes from endsAt and shows the true state.
• Wake lock: navigator.wakeLock.request('screen') while a workout is active, re-acquired on visibilitychange. If unsupported, degrade silently. A setting allows turning it off.
7.6 Finish summary
Shown right after Finish and available later from History. Computed from completed sets and stored in Workout.summary.
Stat
Definition
Duration
endedAt - startedAt
Total volume
Sum of load x reps over completed working sets (section 8.2)
Total reps
Sum of reps over completed working sets
Sets
Working sets completed, with warm-up sets shown separately
Exercises
Count of exercises with at least one completed set
Muscle groups trained
Per muscle: weighted set count, shown as chips and a horizontal bar chart. Primary muscle counts 1.0 per set, secondary 0.5.
PRs
Any personal records hit in this workout, with the old and new value
Comparison
Volume change vs. the previous workout of the same Plan, when one exists
The summary screen also lets the user set a name, notes, mood and energy, and the optional Update Plan action. Empty and uncompleted sets are ignored. If no sets were completed, Finish offers to discard instead.
9. Calculations (domain layer)
8.1 Estimated 1RM
Epley formula: e1RM = w x (1 + reps / 30), and e1RM = w when reps = 1. Only sets with 1 to 12 reps feed e1RM charts, because the estimate is unreliable above that. A setting allows Brzycki instead.
8.2 Volume
Tracking type
Load used in volume
weight_reps
weightKg
bodyweight_reps
0 by default (reps only)
weighted_bodyweight
added weightKg
assisted_bodyweight
not counted
duration, distance_time
not counted in kg volume, shown as time or distance
A setting, Include bodyweight in volume, adds the user's most recent bodyweight entry to bodyweight and weighted exercises. Volume = load x reps for completed sets of type working, drop or failure. Warm-ups are excluded unless the user opts in.
8.3 Personal records
Per exercise, on every set completion, the app queries that exercise's completed working sets (via the [exerciseId+completedAt] index) and computes in memory:
• Max weight for any reps.
• Max e1RM.
• Rep PR at weight: most reps at a given weight.
• Best session volume for the exercise.
A PR is awarded only if it strictly beats an earlier record, and only when the exercise has prior history, so the first ever set does not trigger a badge. Sets from the current workout count as history, so a PR can only be beaten by a later, better set. PRs found during the workout are shown as a badge on the set row and collected into the summary. Deleting or editing a past workout triggers a recompute of that exercise's PR list.
8.4 Previous performance
For an exercise, find the most recent completed workout containing completed working sets of it (reverse range query on [exerciseId+completedAt]), then load that workout's sets for the exercise. Shown inline as 80 x 8, 80 x 8, 80 x 7.
8.5 Progressive overload suggestion (rule-based)
Suggestions appear as a tappable chip, never auto-applied:
• If all working sets in the last session reached the top of the rep range (or the Plan's target reps): suggest weight + increment (default 2.5 kg, or 5 lb, for barbell and machine, smaller for dumbbells), keeping reps at the bottom of the range.
• If some sets were within the range: suggest the same weight and +1 rep on the weakest set.
• If the minimum reps were missed in 3 consecutive sessions: suggest a 10% reduction.
• Bodyweight exercises: suggest +1 rep, then added weight once the rep target is exceeded.
Suggestions are computed by a pure function suggestNext(history, rangeConfig). Weights are rounded to the user's rounding increment.
8.6 Progression and deload rules (Phase 4)
type ProgressionRule =
  | { kind: 'linear'; incrementKg: number; frequency: 'session' | 'week'; requireAllSetsCompleted: boolean }
  | { kind: 'double'; repMin: number; repMax: number; incrementKg: number };

interface DeloadRule { everyNWeeks: number; percent: number }   // e.g. every 4 weeks, 10 percent
Rules are resolved when a workout starts from a Plan (section 7.3, priority 1). Linear: if the last workout of this Plan containing the exercise completed all target sets, use previous weight + increment, otherwise repeat. Double progression: hold the weight until all sets reach repMax, then add weight and reset to repMin. Deload: if the program week number is a multiple of everyNWeeks, multiply targets by (1 - percent). All results are rounded to the plate increment. The resolved value is only a pre-fill, and the user can always edit it.
8.7 Muscle load and heatmap (Phase 4)
Weighted sets per muscle over a chosen period (default 7 days): primary muscle counts 1.0 per completed working set, secondary 0.5. The heatmap is an inline SVG of the body (front and back) with one path per Muscle id, filled by a four-step colour scale (none, low, medium, high). Thresholds are configurable in code, and the legend shows the actual set counts so the colours make no medical claims. Tapping a muscle lists the sets and exercises behind its number.
9. Plans and Programs
9.1 Plans
• Create from scratch: pick exercises, set target sets, rep range, optional target weight and rest.
• Save as Plan from a finished workout (uses the actual completed sets as targets).
• Duplicate, rename, archive. Archived Plans stay referenced by history and old Programs.
• Exercises can be reordered and grouped into supersets.
9.2 Programs
• Weekly: 7 day slots, Monday to Sunday. Cycle: N day slots rotating from the start date (e.g. a 4-day Push, Pull, Legs, Rest rotation).
• Each day holds zero or more Plans (zero means rest).
• Exactly one Program is active. Activating another one archives the old one's calendar at the day before the new start date.
• Resolving a date to a day slot:
    ◦ weekly: slot = weekday of the date.
    ◦ cycle: slot = daysBetween(startDate, date) mod cycleLength.
• ScheduleOverride rows let the user skip a scheduled day or replace its Plans without editing the Program itself.
• The home screen shows Today with the scheduled Plan(s). One tap starts the workout with planId, programId and scheduledDate pre-set. The user can swap in a different Plan from the same screen.
10. Calendar and adherence
A month grid. Each day cell is derived, not stored, from the active Program (and earlier Programs, using their date ranges), overrides and completed workouts:
State
Rule
Completed
A scheduled day with at least one completed workout on that date.
Completed late
A scheduled day with no workout on the date itself, but a workout whose scheduledDate equals that date.
Missed
The day is before today, on or after the Program's startDate, was scheduled with at least one Plan, was not skipped, and has neither of the two states above.
Rest
The slot has no Plans, or an override skipped it.
Due / Upcoming
Today or later, scheduled, not yet done.
Extra
A workout was logged on a day with no schedule.
Pseudocode:
for each date d from program.startDate to end of visible month:
  plans = override(d)?.planIds ?? slot(program, d).planIds
  done = workouts.completed.filter(w => w.localDate == d)
  lateDone = workouts.completed.some(w => w.scheduledDate == d && w.localDate != d)
  if plans.empty:           state = done ? 'extra' : 'rest'
  else if done or lateDone: state = done ? 'completed' : 'completed_late'
  else if d < today:        state = 'missed'
  else:                     state = 'upcoming'
Tapping a day opens a sheet with that day's workouts, and actions to start, log for that date, skip or reschedule. Stats shown above the grid: planned workouts completed this week (e.g. 4 of 5), current streak (consecutive scheduled days not missed, rest days ignored), and monthly adherence percentage. Without any active Program, the calendar still works: it simply marks days with workouts.
11. Progress and charts
All charts have range filters (1M, 3M, 6M, 1Y, All) and are lazy-loaded.
Per exercise
• Estimated 1RM over time (line), best set per session.
• Max weight over time.
• Total volume per session (bar).
• Rep PRs by weight (table).
Overall
• Workouts per week or month (bar).
• Weekly volume per muscle group (stacked bar), plus the heatmap (section 8.7).
• Total volume trend (area).
• Body weight and measurements (line, Phase 3).
• Personal records page: all PRs by exercise, with dates.
Data is derived from sets by statsService with memoised, per-exercise queries. Aggregation by week uses the user's week start setting.
12. History and search
• History list grouped by month, with name, date, duration, volume and a muscle chip row. Workout detail supports edit and delete. Editing a past workout re-runs summary and PR calculations for the affected exercises.
• Search (Phase 4): a single search field plus filters for exercise (multi-select), muscle group, Plan and date range. Matching works like this:
    1. Resolve typed text to exercise IDs via normalised, case-insensitive matching on the in-memory exercise list.
    2. Query sets by exerciseId to get workout IDs.
    3. Match workout names, session notes and set notes with a filter scan (fine at personal-data scale).
    4. Group results by date, highlight the matching sets, and show the best set per workout.
13. Export and import
13.1 JSON backup
interface BackupFile {
  format: 'gymlog-backup';
  schemaVersion: number;        // bumped on any data-model change
  appVersion: string;
  exportedAt: string;           // ISO 8601
  settings: Record<string, unknown>;
  data: {
    exercises: Exercise[]; plans: Plan[]; programs: Program[];
    scheduleOverrides: ScheduleOverride[]; workouts: Workout[];
    workoutExercises: WorkoutExercise[]; sets: SetEntry[]; bodyMetrics: BodyMetric[];
  };
}
Only custom exercises plus user modifications are exported, since the seed library ships with the app. The file is downloaded via an anchor with a Blob URL. On mobile, navigator.share with a File is offered so it can go to Drive, WhatsApp or Files. Settings stores lastBackupAt, and the app shows a reminder banner after N days (default 14) without an export.
13.2 Import flow

1. User picks a file. Parse and validate with Zod. Reject unknown formats and files with a schemaVersion newer than the app's. Older versions go through a chain of migration functions.
2. Show a preview: counts (e.g. 142 workouts, 12 custom exercises, 3 plans), date range, and a count of records that would conflict.
3. User chooses Merge or Replace.
    ◦ Merge: match by id. When both sides have a record, keep the one with the larger updatedAt. Custom exercises with the same normalised name but different ids are offered for merging into one.
    ◦ Replace: clear all stores and write the file. The user is shown a prominent Download current backup first button before confirming.
4. Everything is written in a single Dexie transaction, so a failure rolls back and leaves existing data untouched.
5. Show a result summary, then recompute derived caches (PR list).
13.3 CSV
• Export: one row per set with date, workout name, exercise, set order, set type, weight (in the user's unit), reps, duration, distance, RPE, RIR and notes. Spreadsheet-friendly.
• Import from Strong and Hevy (Phase 3): a parser per app, selected by the CSV header. Rows are grouped into workouts by start time and name, exercise names are matched to the library by normalised name, and unmatched names become new custom exercises with the tracking type inferred (weight present means weight_reps, otherwise bodyweight_reps). Both apps have changed their export columns over time, so the parsers must be written against real, current export samples and covered by fixture tests.
6. PWA, offline and storage
• Web app manifest: standalone display, portrait, theme and background colours, maskable icons (192 and 512).
• Service worker precaches the whole build, so the app opens and works fully offline. There are no network API calls in v1.
• Updates: registerType is prompt. When a new version is ready a toast offers Update. The app never reloads or skips waiting while a workout is in progress. The update is applied only after the workout is finished or discarded.
• Persistent storage: call navigator.storage.persist() after the first completed workout and show the result in Settings together with navigator.storage.estimate() usage. Browsers can evict storage for sites that are not installed, and iOS Safari can clear script-writable data after about 7 days of non-use for non-installed sites. Installing to the home screen avoids most of this, so the first-run flow explains how to install (a custom install button on Android and desktop Chrome using beforeinstallprompt, instructions for Add to Home Screen on iOS). Regular JSON backups remain the real safety net.
• Seed library is bundled as JSON and loaded into IndexedDB on first run. A seedVersion in settings lets later app versions add new seed exercises without touching user data.
7. Screens and navigation
Bottom navigation: Home, History, Plans, Progress, More. A persistent mini bar for the active workout sits above it.
Screen
Contents
Home
Today card (scheduled Plan, Start), Start empty workout, resume banner, week strip, backup reminder
Active Workout
Header with live timer and Finish, exercise cards with set rows, rest timer bar, Add Exercise
Finish Summary
Stats from section 7.6, notes, mood and energy, Update Plan, Done
History
List, filters, search (Phase 4), detail view with edit
Plans
List, editor (exercises, targets, supersets), Save as Plan
Programs
List, editor (weekly grid or N-day cycle), activate
Calendar
Month grid, day sheet, adherence stats
Progress
Overall charts, heatmap, PRs, per-exercise detail
Exercises
Library, filters, create and edit custom, archive
Body
Bodyweight and measurements, charts
Settings
Units, theme, default rest, rounding increment, wake lock, volume options, backup and import, storage status
8. Non-functional requirements
• Performance: set completion feedback under 100 ms. Cold start to interactive under 2 s on a mid-range Android phone. Initial JS bundle at most 250 KB gzipped, with charts and the heatmap lazy-loaded.
• Data safety: writes are immediate on set completion and debounced at no more than 300 ms for text inputs. No reliance on beforeunload.
• Usability: 44 px minimum tap targets, primary actions in the bottom half of the screen, light and dark themes, kg as the default unit with lb optional.
• Accessibility: labelled inputs, sufficient contrast, and chart data also available as a table.
• Privacy: no analytics, no network requests, no third-party scripts.
• Scale target: 5 years of data (about 100,000 sets) must stay responsive. All list views are paginated or virtualised.
• Multi-tab: Dexie live queries keep tabs consistent. Starting a workout while another is in progress resumes the existing one.
9. Testing strategy
• Unit (Vitest): e1RM, volume rules per tracking type, PR detection edge cases (first set, ties, warm-ups), suggestNext, progression and deload resolution, schedule resolution for weekly and cycle Programs, missed-day logic around the start date and with overrides, kg/lb round-trip, rounding.
• Integration (Vitest with fake-indexeddb): workout lifecycle, resume after reload, summary computation, schema migrations from each previous version, import merge and replace, transaction rollback on a bad file.
• Fixtures: real Strong and Hevy CSV exports, and a large synthetic backup (100,000 sets) for performance checks.
• Component (React Testing Library): set row for each tracking type, rest timer display, Finish summary.
• End-to-end (Playwright): full workout from a Plan, go offline and reload mid-workout, install and update flow, export then import into a clean profile and compare data. Mobile viewport and a throttled CPU profile.
• Quality gates: Lighthouse PWA and performance checks in CI, TypeScript strict, ESLint, and a bundle-size budget.
10. Milestones
Milestone
Scope
M1
Project setup, PWA shell, Dexie schema, seed library, settings and units, export and import (JSON)
M2
Active workout: start, timer, exercise picker, set logging for all types, previous performance, rest timer, wake lock, finish summary, history
M3
Plans, Programs, Today card, calendar and adherence, session notes, mood and energy
M4
PRs, charts, body metrics, overload suggestions, CSV export, Strong and Hevy import
M5
History search, muscle heatmap, progression and deload rules, polish and accessibility pass
11. Risks and open questions
• Storage eviction: mitigated by installability, persistent storage and backup reminders, but not eliminated. Cloud or file sync is the long-term fix.
• Background timers on iOS are unreliable. The timestamp-based design keeps the displayed state correct, but alerts while locked are best-effort.
• Third-party CSV formats can change. The importers need fixture tests and graceful errors.
• Heatmap artwork: an SVG body diagram with per-muscle paths must be sourced or drawn (a licensing check is needed if using an existing one).
• Open questions for you:
    1. App name (GymLog is a placeholder).
    2. Should supersets be in Phase 1, or wait until after Plans?
    3. Preferred hosting target (this decides HashRouter vs BrowserRouter).
    4. Default rounding increment: 2.5 kg and 5 lb, or something else?
    5. Should bodyweight count towards volume by default?
