// Standalone validation of the pending-session queue + migration-flag fix.
// Inlines copies of the algorithms so we don't have to boot React Native.
//
// Run from project root:
//   node scripts/test-pending-queue.mjs

const store = new Map();
const AsyncStorage = {
  async getItem(k) { return store.has(k) ? store.get(k) : null; },
  async setItem(k, v) { store.set(k, v); },
  async removeItem(k) { store.delete(k); },
};

let saveFails = false;
let saveCount = 0;
async function saveSession(userId, workoutId, session) {
  saveCount++;
  if (saveFails) throw new Error('simulated network failure');
}

function reset() {
  store.clear();
  saveFails = false;
  saveCount = 0;
}

// ─── Queue logic (verbatim from sessionService.ts) ──────────────────────────
const PENDING_KEY = 'pending_sessions_v1';

async function queuePendingSession(workoutId, session) {
  let queue = [];
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (raw) queue = JSON.parse(raw);
  } catch {
    queue = [];
  }
  queue.push({ workoutId, session });
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(queue));
}

async function flushPendingSessions(userId) {
  let queue = [];
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (raw) queue = JSON.parse(raw);
  } catch {
    await AsyncStorage.removeItem(PENDING_KEY);
    return;
  }
  if (queue.length === 0) return;

  const remaining = [];
  for (const item of queue) {
    try {
      await saveSession(userId, item.workoutId, item.session);
    } catch {
      remaining.push(item);
    }
  }

  if (remaining.length === 0) {
    await AsyncStorage.removeItem(PENDING_KEY);
  } else {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
  }
}

// ─── Migration flag decision (mirrors the fix at sessionService.ts:172) ─────
const MIGRATION_KEY = 'sessions_migrated_sb_v1';
async function migrate(hasLocalSessions) {
  const done = await AsyncStorage.getItem(MIGRATION_KEY);
  if (done) return 'skipped';

  const sessionInserts = hasLocalSessions ? [{ user_id: 'u', workout_id: 'w' }] : [];
  const rpeInserts = [];

  if (sessionInserts.length > 0 || rpeInserts.length > 0) {
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
    return 'migrated';
  }
  return 'no-op';
}

// ─── Test harness ───────────────────────────────────────────────────────────
let failed = 0;
function assertEq(a, b, msg) {
  if (a !== b) {
    console.error(`FAIL ${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
    failed++;
  } else {
    console.log(`  ok ${msg}`);
  }
}

const sample = { date: '2026-01-01T00:00:00.000Z', duration: 60, exercises: [] };

(async () => {
  console.log('Queue behavior:');

  reset();
  await queuePendingSession('w1', sample);
  await queuePendingSession('w2', { ...sample, date: '2026-01-02T00:00:00.000Z' });
  const stored = JSON.parse(store.get(PENDING_KEY));
  assertEq(stored.length, 2, 'queue accumulates two items');
  assertEq(stored[0].workoutId, 'w1', 'queue preserves insertion order');

  reset();
  await queuePendingSession('w1', sample);
  await flushPendingSessions('user-id');
  assertEq(store.has(PENDING_KEY), false, 'flush clears queue on success');
  assertEq(saveCount, 1, 'flush calls saveSession once per item');

  reset();
  await queuePendingSession('w1', sample);
  await queuePendingSession('w2', sample);
  saveFails = true;
  await flushPendingSessions('user-id');
  const afterFail = JSON.parse(store.get(PENDING_KEY));
  assertEq(afterFail.length, 2, 'flush keeps all items when every save fails');
  assertEq(saveCount, 2, 'flush attempts every item even on failure');

  reset();
  store.set(PENDING_KEY, '{ this is not json');
  await flushPendingSessions('user-id');
  assertEq(store.has(PENDING_KEY), false, 'corrupt queue is cleared');
  assertEq(saveCount, 0, 'no saves attempted on corrupt queue');

  reset();
  await flushPendingSessions('user-id');
  assertEq(saveCount, 0, 'empty queue flush is a no-op');

  console.log('\nMigration flag behavior:');

  reset();
  const r1 = await migrate(false);
  assertEq(r1, 'no-op', 'returns no-op when nothing local');
  assertEq(store.has(MIGRATION_KEY), false, 'flag NOT set when nothing migrated (the fix)');

  reset();
  const r2 = await migrate(true);
  assertEq(r2, 'migrated', 'migrates when local data exists');
  assertEq(store.get(MIGRATION_KEY), 'true', 'flag set after successful migration');

  reset();
  await migrate(true);
  saveCount = 0;
  const r3 = await migrate(true);
  assertEq(r3, 'skipped', 'second run is skipped once flag is set');

  reset();
  await migrate(false);
  await migrate(false);
  const r4 = await migrate(true);
  assertEq(r4, 'migrated', 'flag stays open across no-op runs, so a later run can still migrate');

  console.log('\nEnd-to-end recovery scenario:');

  reset();
  saveFails = true;
  try {
    await saveSession('user', 'w1', sample);
  } catch {
    await queuePendingSession('w1', sample);
  }
  assertEq(JSON.parse(store.get(PENDING_KEY)).length, 1, 'failed live save lands in queue');

  saveFails = false;
  await saveSession('user', 'w2', { ...sample, date: '2026-01-02T00:00:00.000Z' });
  await flushPendingSessions('user');
  assertEq(store.has(PENDING_KEY), false, 'queue drains once network returns');

  console.log(failed === 0 ? '\nAll tests passed.' : `\n${failed} test(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
