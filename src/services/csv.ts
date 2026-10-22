import { db } from '@/db/schema';
import { Workout, WorkoutExercise, SetEntry, Exercise, SetType } from '@/types';

/**
 * Exports all completed workout sets into a standard spreadsheet CSV.
 */
export async function exportSetsToCSV(): Promise<string> {
  const [workouts, sets, exercises] = await Promise.all([
    db.workouts.toArray(),
    db.sets.toArray(),
    db.exercises.toArray(),
  ]);

  const workoutMap = new Map<string, Workout>();
  workouts.forEach((w) => workoutMap.set(w.id, w));

  const exerciseMap = new Map<string, Exercise>();
  exercises.forEach((e) => exerciseMap.set(e.id, e));

  const headers = [
    'Date',
    'Workout Name',
    'Exercise Name',
    'Set Order',
    'Set Type',
    'Weight (kg)',
    'Reps',
    'Duration (s)',
    'Distance (m)',
    'RPE',
    'RIR',
    'Notes',
  ];

  const rows: string[] = [headers.join(',')];

  const completedSets = sets.filter((s) => s.completed);
  completedSets.sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0));

  for (const s of completedSets) {
    const w = workoutMap.get(s.workoutId);
    const ex = exerciseMap.get(s.exerciseId);

    const escapeCsv = (val: any) => `"${(val ?? '').toString().replace(/"/g, '""')}"`;

    const row = [
      escapeCsv(w?.localDate || ''),
      escapeCsv(w?.name || 'Workout'),
      escapeCsv(ex?.name || 'Exercise'),
      s.order,
      s.type,
      s.weightKg ?? '',
      s.reps ?? '',
      s.durationSec ?? '',
      s.distanceM ?? '',
      s.rpe ?? '',
      s.rir ?? '',
      escapeCsv(s.notes || ''),
    ];

    rows.push(row.join(','));
  }

  return rows.join('\n');
}

export function downloadCSVFile(csvContent: string, filename: string = 'gymlog-workouts.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imports workouts from Strong, Hevy, or GymLog CSV format.
 */
export async function importFromCSV(csvText: string): Promise<{ importedWorkouts: number; importedSets: number }> {
  const lines = csvText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) throw new Error('CSV file is empty or missing headers');

  const headerLine = lines[0].toLowerCase();
  const allExercises = await db.exercises.toArray();
  const exerciseLookup = new Map<string, Exercise>();
  allExercises.forEach((e) => exerciseLookup.set(e.name.toLowerCase().trim(), e));

  // Determine format: GymLog, Strong, or Hevy
  const isStrong = headerLine.includes('workout name') && headerLine.includes('exercise name') && headerLine.includes('set order');
  const isHevy = headerLine.includes('title') && headerLine.includes('exercise_title');

  // Simple CSV line parser supporting quoted fields
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let insideQuote = false;
    let entry = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        insideQuote = !insideQuote;
      } else if (c === ',' && !insideQuote) {
        result.push(entry.trim());
        entry = '';
      } else {
        entry += c;
      }
    }
    result.push(entry.trim());
    return result;
  };

  const parsedRows: any[] = [];
  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cols[idx] || '';
    });
    parsedRows.push(rowObj);
  }

  // Group rows by Date + Workout Name
  const workoutGroups = new Map<string, any[]>();
  for (const r of parsedRows) {
    const date = r.date || r.start_time?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    const title = r.workout_name || r.title || 'Imported Workout';
    const groupKey = `${date}_${title}`;
    const list = workoutGroups.get(groupKey) || [];
    list.push(r);
    workoutGroups.set(groupKey, list);
  }

  let importedWorkouts = 0;
  let importedSets = 0;

  await db.transaction('rw', [db.workouts, db.workoutExercises, db.sets, db.exercises], async () => {
    for (const [key, rows] of workoutGroups.entries()) {
      const first = rows[0];
      const dateStr = first.date?.slice(0, 10) || first.start_time?.slice(0, 10) || new Date().toISOString().slice(0, 10);
      const title = first.workout_name || first.title || 'Imported Session';

      const workoutId = `w_imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();

      const workout: Workout = {
        id: workoutId,
        name: title,
        status: 'completed',
        startedAt: now,
        endedAt: now + 3600000,
        localDate: dateStr,
        createdAt: now,
        updatedAt: now,
      };

      await db.workouts.add(workout);
      importedWorkouts++;

      // Group rows by exercise
      const exerciseGroups = new Map<string, any[]>();
      for (const r of rows) {
        const exName = (r.exercise_name || r.exercise_title || 'Bench Press').trim();
        const list = exerciseGroups.get(exName) || [];
        list.push(r);
        exerciseGroups.set(exName, list);
      }

      let order = 1;
      for (const [exName, exRows] of exerciseGroups.entries()) {
        let ex = exerciseLookup.get(exName.toLowerCase());
        if (!ex) {
          // Create custom exercise for unmatched
          const customId = `custom_imp_${Date.now()}_${order}`;
          ex = {
            id: customId,
            name: exName,
            primaryMuscle: 'chest',
            secondaryMuscles: [],
            equipment: 'barbell',
            trackingType: 'weight_reps',
            isCustom: true,
            isFavorite: false,
            isArchived: false,
            defaultRestSec: 90,
            createdAt: now,
            updatedAt: now,
          };
          await db.exercises.add(ex);
          exerciseLookup.set(exName.toLowerCase(), ex);
        }

        const weId = crypto.randomUUID();
        const we: WorkoutExercise = {
          id: weId,
          workoutId,
          exerciseId: ex.id,
          order: order++,
          createdAt: now,
          updatedAt: now,
        };
        await db.workoutExercises.add(we);

        for (let sIdx = 0; sIdx < exRows.length; sIdx++) {
          const sRow = exRows[sIdx];
          const weightKg = parseFloat(sRow.weight__kg_ || sRow.weight_kg || sRow.weight || '0') || 0;
          const reps = parseInt(sRow.reps || '0', 10) || 0;

          const setEntry: SetEntry = {
            id: crypto.randomUUID(),
            workoutId,
            workoutExerciseId: weId,
            exerciseId: ex.id,
            order: sIdx + 1,
            type: 'working',
            weightKg,
            reps,
            completed: true,
            completedAt: now,
            createdAt: now,
            updatedAt: now,
          };

          await db.sets.add(setEntry);
          importedSets++;
        }
      }
    }
  });

  return { importedWorkouts, importedSets };
}
