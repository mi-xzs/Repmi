import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { useAccent } from '../../../services/SettingsContext';
import { XPLogEntry, LevelInfo, LevelTitle } from '../../../services/xpService';
import { WorkoutSession, SessionExercise, SessionSet } from '../../../screens/WorkoutScreen';
import { setScore, setMetric, PRDelta, formatPRDelta, formatPRValue, pickHeadlinePR } from '../../../utils/prDetection';
import { getExerciseMode } from '../../../constants/exerciseCatalog';

export const SHARE_CARD_WIDTH = 300;
export const SHARE_CARD_HEIGHT = 220;

interface ShareCardProps {
  workoutName: string;
  session: WorkoutSession;
  entry: XPLogEntry;
  levelAfter: LevelInfo;
  titleAfter: LevelTitle;
  prDeltas?: ReadonlyMap<string, PRDelta>;
  username?: string | null;
  avatarUrl?: string | null;
}

type TopSetRow = {
  id: string;
  exercise: string;
  main: string;
  reps: string | null;
  prDelta: PRDelta | null;
};

function formatSetMain(s: SessionSet, mode?: 'weight' | 'bodyweight' | 'timed' | 'distance'): string {
  if (mode === 'distance' && (s.meters ?? 0) > 0) {
    const m = s.meters ?? 0;
    return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
  }
  if ((s.kg ?? 0) > 0) return `${s.kg} kg`;
  const secs = (s.minutes ?? 0) * 60 + (s.seconds ?? 0);
  if (secs > 0) {
    const m = s.minutes ?? 0;
    const sec = (s.seconds ?? 0).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }
  return `${s.reps ?? 0} reps`;
}

function formatSetReps(s: SessionSet, mode?: 'weight' | 'bodyweight' | 'timed' | 'distance'): string | null {
  if (mode === 'distance') {
    const secs = (s.minutes ?? 0) * 60 + (s.seconds ?? 0);
    if (secs <= 0) return null;
    const m = Math.floor(secs / 60);
    const sec = (secs % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }
  const reps = s.reps ?? 0;
  if (reps === 0) return null;
  if ((s.kg ?? 0) > 0) return `×${reps}`;
  const secs = (s.minutes ?? 0) * 60 + (s.seconds ?? 0);
  if (secs > 0) return `×${reps}`;
  return null;
}

function splitDuration(seconds: number): { value: string; unit: string } {
  const totalMin = Math.floor(seconds / 60);
  if (totalMin < 60) return { value: String(totalMin), unit: 'm' };
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return { value: `${h}:${m.toString().padStart(2, '0')}`, unit: 'h' };
}

function extractTopSets(
  exercises: SessionExercise[],
  prDeltas: ReadonlyMap<string, PRDelta>,
): TopSetRow[] {
  const candidates: { exercise: string; set: SessionSet; score: number }[] = [];
  for (const ex of exercises) {
    if (ex.name === 'Warm-up' || ex.name === 'Cooldown') continue;
    const working = ex.sets.filter((s) => s.label !== 'W');
    if (working.length === 0) continue;
    const mode = getExerciseMode(ex.name);
    const best = working.reduce((acc, s) => (setMetric(s, mode) > setMetric(acc, mode) ? s : acc));
    candidates.push({ exercise: ex.name, set: best, score: setScore(best) });
  }
  return candidates
    .sort((a, b) => {
      const aPR = prDeltas.has(a.exercise) ? 1 : 0;
      const bPR = prDeltas.has(b.exercise) ? 1 : 0;
      if (aPR !== bPR) return bPR - aPR;
      return b.score - a.score;
    })
    .slice(0, 1)
    .map((c, i) => {
      const mode = getExerciseMode(c.exercise);
      return {
        id: `${c.exercise}-${i}`,
        exercise: c.exercise,
        main: formatSetMain(c.set, mode),
        reps: formatSetReps(c.set, mode),
        prDelta: prDeltas.get(c.exercise) ?? null,
      };
    });
}

function computeTotalVolume(exercises: SessionExercise[]): number {
  let total = 0;
  for (const ex of exercises) {
    if (ex.name === 'Warm-up' || ex.name === 'Cooldown') continue;
    for (const s of ex.sets) {
      if (s.label === 'W') continue;
      total += (s.kg ?? 0) * (s.reps ?? 0);
    }
  }
  return Math.round(total);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const EMPTY_PR_MAP: ReadonlyMap<string, PRDelta> = new Map();


const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(
  { workoutName, session, entry, levelAfter, titleAfter, prDeltas, username, avatarUrl },
  ref,
) {
  const { accent, accentSubtle } = useAccent();
  const prs = prDeltas ?? EMPTY_PR_MAP;
  const topSets = useMemo(() => extractTopSets(session.exercises, prs), [session, prs]);
  const headlinePR = useMemo(() => pickHeadlinePR(prs), [prs]);
  const totalVolume = useMemo(() => computeTotalVolume(session.exercises), [session]);
  const exerciseCount = useMemo(() => {
    let n = 0;
    for (const ex of session.exercises) {
      if (ex.name === 'Warm-up' || ex.name === 'Cooldown') continue;
      if (ex.sets.some((s) => s.label !== 'W')) n += 1;
    }
    return n;
  }, [session]);
  const hasStreak = entry.streakMultiplier > 1;

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.header}>
        {username ? (
          <View style={styles.identity}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={[styles.avatarInitial, { color: accent }]}>
                  {username[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <Text style={styles.username} numberOfLines={1}>
              @{username}
            </Text>
          </View>
        ) : (
          <Text style={[styles.wordmark, { color: accent }]}>GYM TRACKER</Text>
        )}
        <Text style={styles.date}>{formatDate(session.date)}</Text>
      </View>

      <Text style={styles.workoutName} numberOfLines={2}>
        {workoutName.toUpperCase()}
      </Text>

      <View style={styles.levelRow}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>LV {levelAfter.level}</Text>
        </View>
        {entry.totalXP > 0 && (
          <View style={[styles.xpPill, { backgroundColor: accentSubtle }]}>
            <Text style={[styles.xpPillText, { color: accent }]}>+{entry.totalXP} XP</Text>
          </View>
        )}
        {hasStreak && (
          <View style={[styles.streakPill, { backgroundColor: accentSubtle }]}>
            <Feather name="zap" size={11} color={accent} />
            <Text style={[styles.streakText, { color: accent }]}>{entry.streakMultiplier}×</Text>
          </View>
        )}
      </View>

      {headlinePR && (
        <View style={styles.headlinePR}>
          <View style={styles.wing} />
          <View style={styles.headlineCenter}>
            <Feather name="chevron-right" size={10} color={accent} />
            <Text style={styles.headlinePRContent} numberOfLines={1}>
              <Text style={[styles.headlinePRLabel, { color: accent }]}>NEW PR</Text>
              <Text style={styles.headlinePRBody}>  ·  {headlinePR.name.toUpperCase()}  </Text>
              <Text style={styles.headlinePRValue}>{formatPRValue(headlinePR.delta)}</Text>
            </Text>
            <Feather name="chevron-left" size={10} color={accent} />
          </View>
          <View style={styles.wing} />
        </View>
      )}

      {topSets.length > 0 && (
        <View style={styles.topSets}>
          <View style={styles.topSetsHeader}>
            <Text style={styles.sectionLabel}>TOP SET</Text>
            <Text style={styles.topSetsCount}>{exerciseCount} exercises</Text>
          </View>
          {topSets.map((s) => (
            <View key={s.id} style={styles.setRow}>
              <View style={styles.setIcon}>
                <Feather name="bar-chart-2" size={10} color={colors.button1} />
              </View>
              <View style={styles.setLeft}>
                <Text style={styles.setName} numberOfLines={1}>
                  {s.exercise}
                </Text>
                {s.prDelta && (
                  <View style={styles.prBadge}>
                    <Feather name="chevron-up" size={10} color={accent} />
                    <Text style={[styles.prBadgeText, { color: accent }]}>{formatPRDelta(s.prDelta)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.setRight}>
                <Text style={styles.setValue}>{s.main}</Text>
                {s.reps && (
                  <View style={styles.repsPill}>
                    <Text style={styles.repsPillText}>{s.reps}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Feather name="clock" size={10} color={colors.button1} />
            <Text style={styles.statLabel}>DURATION</Text>
          </View>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>{splitDuration(session.duration).value}</Text>
            <Text style={styles.statUnit}>{splitDuration(session.duration).unit}</Text>
          </View>
        </View>
        {exerciseCount > 0 && (
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Feather name="grid" size={10} color={colors.button1} />
              <Text style={styles.statLabel}>EXERCISES</Text>
            </View>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{exerciseCount}</Text>
            </View>
          </View>
        )}
        {totalVolume > 0 && (
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Feather name="award" size={10} color={colors.button1} />
              <Text style={styles.statLabel}>VOLUME</Text>
            </View>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{totalVolume.toLocaleString()}</Text>
              <Text style={styles.statUnit}>kg</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
});

export default ShareCard;

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    justifyContent: 'space-between',
    borderRadius: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordmark: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.container,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 11,
    fontWeight: '800',
  },
  username: {
    color: colors.highlight,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  date: {
    color: colors.button1,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  workoutName: {
    color: colors.titleText,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: 0,
    lineHeight: 17,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 3,
  },
  xpPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  xpPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  levelBadge: {
    backgroundColor: colors.container,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  levelBadgeText: {
    color: colors.highlight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  titleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  streakText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headlinePR: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 5,
  },
  wing: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 250, 154, 0.45)',
  },
  headlineCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  headlinePRContent: {
    textAlign: 'center',
    flexShrink: 1,
  },
  headlinePRLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  headlinePRBody: {
    color: colors.titleText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  headlinePRValue: {
    color: colors.titleText,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  topSets: {
    backgroundColor: colors.container,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  topSetsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
  },
  sectionLabel: {
    color: colors.button1,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  topSetsCount: {
    color: colors.button1,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
    gap: 6,
  },
  setIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  setName: {
    color: colors.highlight,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  setRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    backgroundColor: 'rgba(0,250,154,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(0,250,154,0.35)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    flexShrink: 0,
  },
  prBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  setValue: {
    color: colors.titleText,
    fontSize: 12,
    fontWeight: '700',
  },
  repsPill: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  repsPillText: {
    color: colors.button1,
    fontSize: 9,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 0,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.container,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  statLabel: {
    color: colors.button1,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statValue: {
    color: colors.titleText,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  statUnit: {
    color: colors.button1,
    fontSize: 9,
    fontWeight: '700',
  },
});
