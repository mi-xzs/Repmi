// scripts/seedDemoAccount.ts
//
// Pre-seeds the shared demo account so portfolio visitors land on a
// fully-populated app — workouts, sessions, profile fields. Run with:
//
//   npx tsx scripts/seedDemoAccount.ts
//
// Required env (read from .env via dotenv if present, otherwise the
// process env):
//   EXPO_PUBLIC_SUPABASE_URL      — the project URL
//   SUPABASE_SERVICE_ROLE_KEY     — the service-role key (SECRET — server only)
//   EXPO_PUBLIC_DEMO_EMAIL        — demo user email (must already exist)
//
// Idempotent: deletes the demo user's existing workouts + sessions first,
// then re-inserts the canonical seed data. Safe to run on a cron.

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── env loading ────────────────────────────────────────────────────────────
// Tiny dotenv shim so the script works without an extra dependency.
const envPath = resolve(__dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_EMAIL = process.env.EXPO_PUBLIC_DEMO_EMAIL;

if (!SUPABASE_URL || !SERVICE_KEY || !DEMO_EMAIL) {
  console.error(
    'Missing env vars. Need EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXPO_PUBLIC_DEMO_EMAIL.',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── seed data ──────────────────────────────────────────────────────────────

type Row = {
  sets: number;
  kg: number;
  reps: number;
  done: boolean;
  minutes?: number;
  seconds?: number;
  meters?: number;
};

type Section = {
  id: string;
  exerciseName: string;
  rows: Row[];
  restTimer?: number;
  exerciseMode?: 'weight' | 'bodyweight' | 'timed' | 'distance';
};

type Workout = {
  id: string;
  workoutName: string;
  showWarmUp: boolean;
  showCooldown: boolean;
  sections: Section[];
};

const mkRow = (sets: number, kg: number, reps: number): Row => ({
  sets,
  kg,
  reps,
  done: false,
});

const mkSection = (exerciseName: string, rows: Row[], mode: Section['exerciseMode'] = 'weight'): Section => ({
  id: randomUUID(),
  exerciseName,
  rows,
  exerciseMode: mode,
  restTimer: 90,
});

const PUSH_DAY: Workout = {
  id: randomUUID(),
  workoutName: 'Push Day',
  showWarmUp: false,
  showCooldown: false,
  sections: [
    mkSection('Barbell Bench Press', [mkRow(1, 60, 8), mkRow(2, 70, 6), mkRow(3, 80, 5), mkRow(4, 80, 5)]),
    mkSection('Overhead Press', [mkRow(1, 35, 8), mkRow(2, 40, 6), mkRow(3, 45, 5)]),
    mkSection('Incline Dumbbell Press', [mkRow(1, 22, 10), mkRow(2, 24, 8), mkRow(3, 26, 6)]),
    mkSection('Triceps Pushdown', [mkRow(1, 25, 12), mkRow(2, 30, 10), mkRow(3, 35, 8)]),
    mkSection('Lateral Raise', [mkRow(1, 8, 15), mkRow(2, 10, 12), mkRow(3, 10, 12)]),
  ],
};

const PULL_DAY: Workout = {
  id: randomUUID(),
  workoutName: 'Pull Day',
  showWarmUp: false,
  showCooldown: false,
  sections: [
    mkSection('Pull-Up', [mkRow(1, 0, 8), mkRow(2, 0, 7), mkRow(3, 0, 6)], 'bodyweight'),
    mkSection('Barbell Row', [mkRow(1, 60, 8), mkRow(2, 70, 6), mkRow(3, 80, 5)]),
    mkSection('Lat Pulldown', [mkRow(1, 50, 10), mkRow(2, 55, 8), mkRow(3, 60, 8)]),
    mkSection('Hammer Curl', [mkRow(1, 14, 12), mkRow(2, 16, 10), mkRow(3, 16, 10)]),
    mkSection('Face Pull', [mkRow(1, 20, 15), mkRow(2, 22, 12), mkRow(3, 22, 12)]),
  ],
};

const LEG_DAY: Workout = {
  id: randomUUID(),
  workoutName: 'Leg Day',
  showWarmUp: false,
  showCooldown: false,
  sections: [
    mkSection('Barbell Back Squat', [mkRow(1, 70, 8), mkRow(2, 90, 6), mkRow(3, 100, 5), mkRow(4, 100, 5)]),
    mkSection('Romanian Deadlift', [mkRow(1, 80, 8), mkRow(2, 90, 6), mkRow(3, 100, 5)]),
    mkSection('Leg Press', [mkRow(1, 120, 12), mkRow(2, 140, 10), mkRow(3, 160, 8)]),
    mkSection('Walking Lunge', [mkRow(1, 12, 12), mkRow(2, 14, 10), mkRow(3, 14, 10)]),
    mkSection('Standing Calf Raise', [mkRow(1, 40, 15), mkRow(2, 50, 12), mkRow(3, 50, 12)]),
  ],
};

const PUSH_LIGHT: Workout = {
  id: randomUUID(),
  workoutName: 'Push (Light)',
  showWarmUp: false,
  showCooldown: false,
  sections: [
    mkSection('Dumbbell Bench Press', [mkRow(1, 18, 12), mkRow(2, 20, 10), mkRow(3, 22, 10)]),
    mkSection('Dumbbell Shoulder Press', [mkRow(1, 14, 12), mkRow(2, 16, 10), mkRow(3, 18, 8)]),
    mkSection('Cable Crossover', [mkRow(1, 12, 15), mkRow(2, 14, 12), mkRow(3, 14, 12)]),
    mkSection('Rope Tricep Extension', [mkRow(1, 20, 15), mkRow(2, 22, 12), mkRow(3, 22, 12)]),
  ],
};

const WORKOUTS: Workout[] = [PUSH_DAY, PULL_DAY, LEG_DAY, PUSH_LIGHT];

// ─── session set shape ─────────────────────────────────────────────────────
// Recorded session sets are NOT the same shape as the workout-template rows.
// Each set has a `label` ('1','2','3'... for working sets, 'W' for warm-up)
// and only includes the relevant metric fields. This matches SessionSet in
// src/screens/WorkoutScreen.tsx and the WorkoutSessionPayloadSchema.
type SessionSet = {
  label: string;
  kg?: number;
  reps?: number;
  minutes?: number;
  seconds?: number;
  meters?: number;
};

// Convert a template row into a recorded SessionSet for a given working-set
// index. Drops the `sets/done` template fields and adds the `label`.
function rowToSessionSet(row: Row, workingIndex: number, dayOffset: number): SessionSet {
  // Slight wave so the data looks like a real human's: occasionally drop
  // the final rep on heavy sets to mimic missed reps.
  const dropLast = workingIndex >= 3 && dayOffset % 5 === 0;
  const set: SessionSet = { label: String(workingIndex) };
  if (row.kg > 0) set.kg = row.kg;
  if (row.reps > 0) set.reps = Math.max(1, row.reps - (dropLast ? 1 : 0));
  if ((row.minutes ?? 0) > 0) set.minutes = row.minutes;
  if ((row.seconds ?? 0) > 0) set.seconds = row.seconds;
  if ((row.meters ?? 0) > 0) set.meters = row.meters;
  return set;
}

// Build 18 sessions across the past 7 weeks, rotating Push/Pull/Legs/Push-Light.
function buildSessions(_workouts: Workout[]) {
  const sessions: Array<{
    workout_id: string;
    date: string;
    duration: number;
    exercises: { name: string; sets: SessionSet[] }[];
  }> = [];

  const rotation = [PUSH_DAY, PULL_DAY, LEG_DAY, PUSH_LIGHT];
  const today = new Date();
  // Walk back ~7 weeks, ~3 sessions/week.
  let i = 0;
  for (let daysAgo = 2; daysAgo <= 50 && i < 18; daysAgo += 2) {
    // Skip ~1 in 4 days to create a realistic mixed cadence.
    if (daysAgo % 7 === 0) continue;
    const w = rotation[i % rotation.length];
    const d = new Date(today);
    d.setDate(today.getDate() - daysAgo);
    d.setHours(18, 30, 0, 0); // 6:30pm gym
    const exercises = w.sections.map((sec) => ({
      name: sec.exerciseName,
      sets: sec.rows.map((row, idx) => rowToSessionSet(row, idx + 1, daysAgo)),
    }));
    sessions.push({
      workout_id: w.id,
      date: d.toISOString(),
      duration: 3600 + (i % 3) * 600, // 60–80 min
      exercises,
    });
    i++;
  }
  return sessions;
}

// ─── runner ─────────────────────────────────────────────────────────────────

async function main() {
  // 1. Look up demo user
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Failed to list users:', listErr.message);
    process.exit(1);
  }
  const demoUser = list.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL!.toLowerCase());
  if (!demoUser) {
    console.error(`Demo user ${DEMO_EMAIL} not found. Create the account first.`);
    process.exit(1);
  }
  const userId = demoUser.id;
  console.log(`Demo user: ${DEMO_EMAIL} (${userId})`);

  // 2. Wipe existing demo data (idempotent)
  console.log('Clearing existing workouts + sessions...');
  await supabase.from('workout_rpe').delete().eq('user_id', userId);
  await supabase.from('workout_sessions').delete().eq('user_id', userId);
  await supabase.from('workouts').delete().eq('user_id', userId);

  // 3. Insert workouts
  console.log(`Inserting ${WORKOUTS.length} workouts...`);
  const workoutRows = WORKOUTS.map((w) => ({
    id: w.id,
    user_id: userId,
    name: w.workoutName,
    data: w,
    updated_at: new Date().toISOString(),
  }));
  const { error: wErr } = await supabase.from('workouts').insert(workoutRows);
  if (wErr) {
    console.error('Workout insert failed:', wErr.message);
    process.exit(1);
  }

  // 4. Insert sessions
  const sessions = buildSessions(WORKOUTS);
  console.log(`Inserting ${sessions.length} sessions...`);
  const sessionRows = sessions.map((s) => ({
    user_id: userId,
    workout_id: s.workout_id,
    date: s.date,
    duration: s.duration,
    exercises: s.exercises,
  }));
  const { error: sErr } = await supabase.from('workout_sessions').insert(sessionRows);
  if (sErr) {
    console.error('Session insert failed:', sErr.message);
    process.exit(1);
  }

  // 5. Profile fields. The profiles table doesn't have `updated_at` —
  // PostgREST rejects the whole row if we include unknown columns, so
  // we only send fields we know exist on this schema.
  console.log('Updating profile fields...');
  const { error: pErr } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      username: 'repmi.demo',
      weekly_target: 4,
    });
  if (pErr) {
    console.warn('Profile upsert warning:', pErr.message);
  }

  console.log('✅ Demo account seeded.');
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
