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

// ─── fake leaderboard users ─────────────────────────────────────────────────
// 10 fake accounts the demo user "follows" so the leaderboard isn't empty.
// Emails follow the pattern `fake.N@repmi.test` so we can find + reuse them
// across re-runs (idempotent — never create duplicates).

interface FakeUser {
  email: string;
  username: string;
  total_xp: number;
  weekly_xp: number;
  total_sessions: number;
  total_volume_kg: number;
  total_duration_sec: number;
  current_streak: number;
  longest_streak: number;
  total_reps: number;
  total_sets: number;
  pr_count: number;
}

const FAKE_USERS: FakeUser[] = [
  { email: 'fake.1@repmi.test',  username: 'alexm',       total_xp: 48200, weekly_xp: 4200, total_sessions: 184, total_volume_kg: 1_240_000, total_duration_sec: 396_000, current_streak: 6,  longest_streak: 42, total_reps: 18_400, total_sets: 6_400, pr_count: 38 },
  { email: 'fake.2@repmi.test',  username: 'jordan_d',    total_xp: 41100, weekly_xp: 3850, total_sessions: 165, total_volume_kg: 1_060_000, total_duration_sec: 356_000, current_streak: 12, longest_streak: 56, total_reps: 16_500, total_sets: 5_700, pr_count: 31 },
  { email: 'fake.3@repmi.test',  username: 'sarah_94',    total_xp: 36800, weekly_xp: 3200, total_sessions: 142, total_volume_kg:   920_000, total_duration_sec: 308_000, current_streak: 4,  longest_streak: 38, total_reps: 14_200, total_sets: 4_900, pr_count: 27 },
  { email: 'fake.4@repmi.test',  username: 'mike.jones',  total_xp: 29400, weekly_xp: 2950, total_sessions: 121, total_volume_kg:   780_000, total_duration_sec: 261_000, current_streak: 8,  longest_streak: 33, total_reps: 12_100, total_sets: 4_200, pr_count: 22 },
  { email: 'fake.5@repmi.test',  username: 'emilyrose',   total_xp: 24600, weekly_xp: 2400, total_sessions: 102, total_volume_kg:   640_000, total_duration_sec: 220_000, current_streak: 2,  longest_streak: 28, total_reps: 10_200, total_sets: 3_500, pr_count: 19 },
  { email: 'fake.6@repmi.test',  username: 'ben_t',       total_xp: 19800, weekly_xp: 1900, total_sessions: 83,  total_volume_kg:   510_000, total_duration_sec: 178_000, current_streak: 5,  longest_streak: 24, total_reps: 8_300,  total_sets: 2_900, pr_count: 15 },
  { email: 'fake.7@repmi.test',  username: 'ninakim',     total_xp: 15400, weekly_xp: 1450, total_sessions: 66,  total_volume_kg:   410_000, total_duration_sec: 142_000, current_streak: 0,  longest_streak: 18, total_reps: 6_600,  total_sets: 2_300, pr_count: 12 },
  { email: 'fake.8@repmi.test',  username: 'chris.p',     total_xp: 11200, weekly_xp: 1100, total_sessions: 48,  total_volume_kg:   305_000, total_duration_sec: 103_000, current_streak: 1,  longest_streak: 14, total_reps: 4_900,  total_sets: 1_700, pr_count: 9 },
  { email: 'fake.9@repmi.test',  username: 'maya23',      total_xp: 7600,  weekly_xp: 850,  total_sessions: 33,  total_volume_kg:   210_000, total_duration_sec: 70_800,  current_streak: 3,  longest_streak: 10, total_reps: 3_300,  total_sets: 1_150, pr_count: 6 },
  { email: 'fake.10@repmi.test', username: 'danielw',     total_xp: 3400,  weekly_xp: 480,  total_sessions: 15,  total_volume_kg:   95_000,  total_duration_sec: 32_400,  current_streak: 7,  longest_streak: 7,  total_reps: 1_500,  total_sets: 525,   pr_count: 3 },
];

// ─── session set shape ─────────────────────────────────────────────────────
// Recorded session sets are NOT the same shape as the workout-template rows.
// Each set has a `label` ('1','2','3'... for working sets) and only the
// relevant metric fields. Matches SessionSet in src/screens/WorkoutScreen.tsx
// and the WorkoutSessionPayloadSchema.
type SessionSet = {
  label: string;
  kg?: number;
  reps?: number;
  minutes?: number;
  seconds?: number;
  meters?: number;
};

interface BuiltSession {
  workout_id: string;
  workout_name: string;
  date: string; // ISO
  duration: number;
  exercises: { name: string; sets: SessionSet[] }[];
  rpe: number; // 1–10, one per session
}

// Slightly deterministic "noise" so the data feels human without looking
// random. Returns a value in [-1, 1] derived from two integer seeds.
function noise(a: number, b: number): number {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1; // [-1, 1)
}

// Build sessions across the past 7 weeks with realistic per-exercise
// progression and an RPE per session. Exercises start at ~65% of their
// "current" template kg seven weeks ago and ramp linearly to 100% today,
// with small per-session noise. RPE rises gently as loads get heavier and
// dips on the deload-style PUSH_LIGHT sessions.
//
// Sessions are placed on Mon / Wed / Fri / Sat of each week so the
// Weekly tab is always populated with current-week data (regardless of
// what day the seed runs).
function buildSessions(): BuiltSession[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Weekday → which workout that day of the week uses.
  // 0 = Sunday … 6 = Saturday in JS.
  const weekdaySchedule: Record<number, Workout> = {
    1: PUSH_DAY,     // Monday
    3: PULL_DAY,     // Wednesday
    5: LEG_DAY,      // Friday
    6: PUSH_LIGHT,   // Saturday
  };
  const sessionWeekdays = [1, 3, 5, 6]; // ordered earliest → latest in a week

  // Start of THIS week (Monday). We anchor on Monday so weeks line up
  // with how WeeklyDigest computes "this week".
  const startOfThisWeek = new Date(today);
  const dow = today.getDay();
  const offsetToMon = dow === 0 ? -6 : 1 - dow; // Sun => -6, Mon => 0, Tue => -1, …
  startOfThisWeek.setDate(today.getDate() + offsetToMon);

  // Walk back 7 weeks (current week + 6 prior). For each week, emit a
  // session for each weekday in `sessionWeekdays` — but skip dates in the
  // future (current week's not-yet-arrived days).
  const plan: { workout: Workout; date: Date }[] = [];
  for (let weeksBack = 6; weeksBack >= 0; weeksBack--) {
    const weekStart = new Date(startOfThisWeek);
    weekStart.setDate(startOfThisWeek.getDate() - weeksBack * 7);
    for (const wd of sessionWeekdays) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + (wd - 1)); // wd: Mon=1, so offset = wd-1 from Monday
      if (d > today) continue; // future day — skip
      plan.push({ workout: weekdaySchedule[wd], date: d });
    }
  }
  // plan is already oldest → newest order, perfect for progression.

  const total = plan.length;
  const sessions: BuiltSession[] = [];

  for (let idx = 0; idx < plan.length; idx++) {
    const { workout, date: planDate } = plan[idx];
    const t = idx / Math.max(1, total - 1); // 0 (oldest) → 1 (newest)
    // Progression: 65% of current weights at start, 100% today.
    const baseFactor = 0.65 + t * 0.35;
    // PUSH_LIGHT is a deload-style day — keep it at ~70% of current.
    const isLight = workout === PUSH_LIGHT;
    const progressionFactor = isLight ? 0.65 + t * 0.10 : baseFactor;

    const exercises = workout.sections.map((sec) => ({
      name: sec.exerciseName,
      sets: sec.rows.map((row, setIdx) => {
        const set: SessionSet = { label: String(setIdx + 1) };
        if (row.kg > 0) {
          // Per-set noise ± ~2%
          const wobble = 1 + noise(idx, setIdx) * 0.02;
          // Round to nearest 2.5 kg for realism.
          set.kg = Math.max(5, Math.round((row.kg * progressionFactor * wobble) / 2.5) * 2.5);
        }
        if (row.reps > 0) {
          // Occasionally drop the final rep on the heaviest set on heavy days.
          const dropLast = !isLight && setIdx >= row.sets - 1 && noise(idx, setIdx + 99) > 0.5;
          set.reps = Math.max(1, row.reps - (dropLast ? 1 : 0));
        }
        if ((row.minutes ?? 0) > 0) set.minutes = row.minutes;
        if ((row.seconds ?? 0) > 0) set.seconds = row.seconds;
        if ((row.meters ?? 0) > 0) set.meters = row.meters;
        return set;
      }),
    }));

    // RPE: scales from ~6 → ~9 with progression, dips ~1 on Light days,
    // plus per-session jitter. Stored as integer 1–10 per schema.
    const rpeBase = 6.5 + t * 2.0 + (isLight ? -1.0 : 0);
    const rpe = Math.max(5, Math.min(10, Math.round(rpeBase + noise(idx, 7) * 0.8)));

    const d = new Date(planDate);
    d.setHours(18, 30, 0, 0); // 6:30pm gym

    sessions.push({
      workout_id: workout.id,
      workout_name: workout.workoutName,
      date: d.toISOString(),
      duration: 3600 + (idx % 3) * 600, // 60–80 min
      exercises,
      rpe,
    });
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

  // 4. Insert sessions with realistic progression + RPE per session
  const sessions = buildSessions();
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

  // 4b. RPE entries — one per session, recorded at the session date.
  console.log(`Inserting ${sessions.length} RPE entries...`);
  const rpeRows = sessions.map((s) => ({
    user_id: userId,
    workout_id: s.workout_id,
    rating: s.rpe,
    recorded_at: s.date,
  }));
  const { error: rErr } = await supabase.from('workout_rpe').insert(rpeRows);
  if (rErr) console.warn('RPE insert warning:', rErr.message);

  // 5. Demo's own profile fields + stats — computed from the sessions
  // we just inserted so they stay in sync with the actual data.
  console.log('Updating demo profile + stats...');
  let totalVolume = 0;
  let totalReps = 0;
  let totalSets = 0;
  let totalDuration = 0;
  for (const sess of sessions) {
    totalDuration += sess.duration;
    for (const ex of sess.exercises) {
      for (const set of ex.sets) {
        totalSets++;
        if (set.kg && set.reps) totalVolume += set.kg * set.reps;
        if (set.reps) totalReps += set.reps;
      }
    }
  }
  const { error: pErr } = await supabase.from('profiles').upsert({
    id: userId,
    username: 'repmi.demo',
    weekly_target: 4,
    is_public_profile: true,
    // Hand-picked total_xp / weekly_xp so demo sits mid-leaderboard.
    total_xp: 21500,
    weekly_xp: 2200,
    total_sessions: sessions.length,
    total_volume_kg: Math.round(totalVolume),
    total_duration_sec: totalDuration,
    current_streak: 4,
    longest_streak: 19,
    total_reps: totalReps,
    total_sets: totalSets,
    pr_count: 14,
  });
  if (pErr) console.warn('Demo profile upsert warning:', pErr.message);

  // 6. Fake leaderboard users — created (or reused) via auth.admin, then
  // their profile + a follow edge from demo are upserted. Idempotent.
  console.log(`Seeding ${FAKE_USERS.length} fake leaderboard users...`);
  const fakeIds: string[] = [];
  for (const fake of FAKE_USERS) {
    let fakeId = list.users.find((u) => u.email?.toLowerCase() === fake.email)?.id;
    if (!fakeId) {
      const { data: created, error: cErr } = await supabase.auth.admin.createUser({
        email: fake.email,
        password: randomUUID(), // throwaway — these accounts are never signed into
        email_confirm: true,
        user_metadata: { is_fake_seed: true },
      });
      if (cErr || !created.user) {
        console.warn(`  Could not create ${fake.email}:`, cErr?.message);
        continue;
      }
      fakeId = created.user.id;
      console.log(`  Created ${fake.email}`);
    }
    fakeIds.push(fakeId);

    const { error: fpErr } = await supabase.from('profiles').upsert({
      id: fakeId,
      username: fake.username,
      is_public_profile: true,
      total_xp: fake.total_xp,
      weekly_xp: fake.weekly_xp,
      total_sessions: fake.total_sessions,
      total_volume_kg: fake.total_volume_kg,
      total_duration_sec: fake.total_duration_sec,
      current_streak: fake.current_streak,
      longest_streak: fake.longest_streak,
      total_reps: fake.total_reps,
      total_sets: fake.total_sets,
      pr_count: fake.pr_count,
    });
    if (fpErr) console.warn(`  Profile upsert failed for ${fake.username}:`, fpErr.message);
  }

  // 7. Follow edges: demo → each fake user (status='accepted' so they show
  // up in the leaderboard immediately). Clear stale edges first.
  console.log('Refreshing follow edges...');
  await supabase
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .in('following_id', fakeIds);

  if (fakeIds.length > 0) {
    const { error: fErr } = await supabase.from('follows').insert(
      fakeIds.map((id) => ({
        follower_id: userId,
        following_id: id,
        status: 'accepted',
      })),
    );
    if (fErr) console.warn('Follow insert warning:', fErr.message);
  }

  console.log('✅ Demo account seeded.');
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
