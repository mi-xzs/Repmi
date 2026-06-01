
// src/screens/ProfileScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { loadAllSessions as sbLoadAllSessions } from '../services/sessionService';
import { logError } from '../services/logger';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useWorkouts } from '../services/WorkoutContext';
import { useXP } from '../services/XPContext';
import { useProfile } from '../services/ProfileContext';
import { useSettings, useAccent } from '../services/SettingsContext';
import { useAuth } from '../services/AuthContext';
import {
  fetchFollowCounts,
  fetchFollowers,
  fetchFollowing,
  fetchFollowEdges,
  fetchPendingRequestCount,
  followUser,
  unfollowUser,
  uploadProfileImage,
  ProfileSearchResult,
  FollowEdgeStatus,
} from '../services/profileService';
import { WorkoutSession } from './WorkoutScreen';
import { fmtDuration, muscleForExercise } from '../utils/analyticsHelpers';
import RadarChart from '../components/analytics/RadarChart';
import { RadarPoint } from '../types/analytics';

// ─── constants ────────────────────────────────────────────────────────────────

const GOAL_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  strength:    { label: 'Strength',    icon: 'trending-up', color: '#6D6D6D', bg: 'rgba(109,109,109,0.12)' },
  hypertrophy: { label: 'Hypertrophy', icon: 'layers',      color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  endurance:   { label: 'Endurance',   icon: 'activity',    color: '#60A5FA', bg: 'rgba(96,165,250,0.12)'  },
  weight_loss: { label: 'Cut',         icon: 'zap',         color: '#FBBF24', bg: 'rgba(251,191,36,0.12)'  },
  general:     { label: 'General',     icon: 'heart',       color: '#00FA9A', bg: 'rgba(0,250,154,0.12)'   },
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatTonnes(kg: number): string {
  const t = kg / 1000;
  if (t >= 100) return `${Math.round(t).toLocaleString()}T`;
  if (t >= 10)  return `${t.toFixed(1)}T`;
  return `${t.toFixed(2)}T`;
}

// Switch heavy lifts to tonnes so the inline meta row doesn't overflow on small screens.
function formatVolumeShort(kg: number): string {
  if (kg >= 10000) return formatTonnes(kg);
  return `${Math.round(kg).toLocaleString()} KG`;
}

// Lifetime-stat volume: stays in KG until it crosses 1,000,000 — only
// then switching to tonnes. Below the threshold the long-press modal
// surfaces the tonne conversion on demand.
function formatTotalVolume(kg: number): string {
  if (kg >= 1_000_000) return formatTonnes(kg);
  return `${Math.round(kg).toLocaleString()} KG`;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  icon,
  onLongPress,
}: {
  label: string;
  value: string;
  icon: string;
  onLongPress?: () => void;
}) {
  const content = (
    <>
      <Feather name={icon as any} size={14} color={colors.highlight} />
      <Text style={pillStyles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text style={pillStyles.label}>{label}</Text>
    </>
  );

  if (onLongPress) {
    return (
      <Pressable onLongPress={onLongPress} delayLongPress={250} style={pillStyles.container}>
        {content}
      </Pressable>
    );
  }
  return <View style={pillStyles.container}>{content}</View>;
}

const pillStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.container,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  value: {
    color: colors.highlight,
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    color: colors.button1,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

// ─── workout calendar ─────────────────────────────────────────────────────────

const CELL = 11;
const GAP  = 3;
const STRIDE = CELL + GAP;

function WorkoutCalendar({ sessions }: { sessions: WorkoutSession[] }) {
  const { accent } = useAccent();
  const { width: screenWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const visibleWidth = screenWidth - (16 * 2 + 14 * 2);

  const workoutDates = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) {
      const d = new Date(s.date);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    return set;
  }, [sessions]);

  const { weeks, monthCols, todayCol, currentMonthStartCol } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rangeStart = new Date(today);
    rangeStart.setDate(today.getDate() - 180);

    const rangeEnd = new Date(today);
    rangeEnd.setDate(today.getDate() + 180);

    const gridStart = new Date(rangeStart);
    const dow = gridStart.getDay();
    gridStart.setDate(gridStart.getDate() - (dow === 0 ? 6 : dow - 1));

    const weeks: { dateStr: string | null; inRange: boolean; isFuture: boolean }[][] = [];
    const monthCols: { label: string; col: number }[] = [];
    let week: { dateStr: string | null; inRange: boolean; isFuture: boolean }[] = [];
    let col = 0;
    let lastMonth = -1;
    let todayCol = 0;
    let currentMonthStartCol = 0;
    let currentMonthFound = false;
    const currentMonth = today.getMonth();

    const cur = new Date(gridStart);
    while (cur <= rangeEnd) {
      const inRange = cur >= rangeStart;
      const isFuture = cur > today;
      const month = cur.getMonth();
      const dateStr = inRange
        ? `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
        : null;

      if (inRange && month !== lastMonth && week.length === 0) {
        monthCols.push({ label: cur.toLocaleDateString('en-US', { month: 'short' }), col });
        lastMonth = month;
      }

      if (inRange && month === currentMonth && !currentMonthFound) {
        currentMonthStartCol = col;
        currentMonthFound = true;
      }

      if (cur.getTime() === today.getTime()) todayCol = col;

      week.push({ dateStr, inRange, isFuture });

      if (week.length === 7) {
        weeks.push(week);
        week = [];
        col++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (week.length > 0) {
      while (week.length < 7) week.push({ dateStr: null, inRange: false, isFuture: false });
      weeks.push(week);
    }

    return { weeks, monthCols, todayCol, currentMonthStartCol };
  }, []);

  useEffect(() => {
    const midCol = (currentMonthStartCol + todayCol) / 2;
    const x = midCol * STRIDE - visibleWidth / 2 + STRIDE / 2;
    setTimeout(() => scrollRef.current?.scrollTo({ x: Math.max(0, x), animated: false }), 50);
  }, [todayCol, currentMonthStartCol, visibleWidth]);

  return (
    <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false}>
      <View>
        {/* Month labels */}
        <View style={{ height: 14, marginBottom: 6 }}>
          {monthCols.map(({ label, col }) => (
            <Text
              key={col}
              style={{
                position: 'absolute',
                left: col * STRIDE,
                fontSize: 9,
                fontWeight: '600',
                color: colors.button1,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}
            >
              {label}
            </Text>
          ))}
        </View>

        {/* Grid: each column = one week */}
        <View style={{ flexDirection: 'row', gap: GAP }}>
          {weeks.map((week, wi) => (
            <View key={wi} style={{ gap: GAP }}>
              {week.map(({ dateStr, inRange, isFuture }, di) => {
                const active = !isFuture && dateStr ? workoutDates.has(dateStr) : false;
                return (
                  <View
                    key={di}
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 3,
                      backgroundColor: !inRange
                        ? 'transparent'
                        : active
                        ? accent
                        : isFuture
                        ? `${colors.button3}60`
                        : colors.button3,
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

const ProfileScreen: React.FC = () => {
  const { workouts } = useWorkouts();
  const { levelInfo, levelTitle } = useXP();
  const { equippedSeasonTitle } = useSettings();
  const { accent } = useAccent();
  const displayTitle = equippedSeasonTitle ?? levelTitle.title;
  const { profile, updateProfile } = useProfile();
  const { session } = useAuth();
  const navigation = useNavigation<any>();

  const [allSessions,        setAllSessions]        = useState<WorkoutSession[]>([]);
  const [sessionsByWorkout,  setSessionsByWorkout]  = useState<Record<string, WorkoutSession[]>>({});
  const [editingName,  setEditingName]  = useState(false);
  const [nameInput,    setNameInput]    = useState('');
  const [followers,    setFollowers]    = useState(0);
  const [following,    setFollowing]    = useState(0);
  // Follow-list modal — null = closed, otherwise which list to show.
  const [followListMode, setFollowListMode] = useState<'followers' | 'following' | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover,  setUploadingCover]  = useState(false);
  const [volumeModalOpen, setVolumeModalOpen] = useState(false);
  // Incoming follow requests (private accounts) — drives the inbox badge.
  const [pendingRequests, setPendingRequests] = useState(0);

  const pickImage = useCallback(async (
    bucket: 'avatars' | 'covers',
    setUploading: (v: boolean) => void,
    profileKey: 'avatar_url' | 'cover_url',
  ) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      allowsEditing: true,
      aspect: (bucket === 'avatars' ? [1, 1] : [16, 9]) as [number, number],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0] || !session?.user.id) return;
    setUploading(true);
    try {
      // H6 — uploadProfileImage now returns { url, path }. We stamp both
      // on the profile: the signed URL for immediate render, and the
      // raw path so future loads can mint a fresh signed URL when the
      // 1-hour TTL elapses (handled in ProfileContext on next fetch).
      const out = await uploadProfileImage(session.user.id, bucket, result.assets[0].uri);
      if (out) {
        const pathKey = profileKey === 'avatar_url' ? 'avatar_path' : 'cover_path';
        await updateProfile({ [profileKey]: out.url, [pathKey]: out.path } as any);
      }
    } finally {
      setUploading(false);
    }
  }, [session?.user.id, updateProfile]);

  const pickAvatar = useCallback(() =>
    pickImage('avatars', setUploadingAvatar, 'avatar_url'), [pickImage]);

  const pickCover = useCallback(() =>
    pickImage('covers', setUploadingCover, 'cover_url'), [pickImage]);

  const loadSessions = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) return;
    try {
      const combined = await sbLoadAllSessions(userId);
      setAllSessions(combined);

      const grouped: Record<string, WorkoutSession[]> = {};
      for (const s of combined) {
        if (!grouped[s.workoutId]) grouped[s.workoutId] = [];
        grouped[s.workoutId].push(s);
      }
      setSessionsByWorkout(grouped);
    } catch (e) {
      logError('profile.sessions.load.failed', { name: (e as Error)?.name });
    }
  }, [session?.user.id]);

  useFocusEffect(useCallback(() => {
    loadSessions();
    if (session?.user.id) {
      fetchFollowCounts(session.user.id)
        .then(counts => {
          setFollowers(counts.followers);
          setFollowing(counts.following);
        })
        .catch(() => {});
      // Refresh on focus so the badge updates after the user returns from
      // the requests inbox (where they may have cleared some).
      fetchPendingRequestCount()
        .then(setPendingRequests)
        .catch(() => {});
    }
  }, [loadSessions, session?.user.id]));

  // ─── save helpers ──────────────────────────────────────────────────────────

  const commitName = () => {
    setEditingName(false);
    if (nameInput.trim()) updateProfile({ username: nameInput.trim() });
  };

  // ─── derived stats ─────────────────────────────────────────────────────────

  const totalSessions  = allSessions.length;
  const totalDuration  = allSessions.reduce((a, s) => a + s.duration, 0);

  // One pass through sessions for the four set-derived totals + PRs.
  // PRs walk sessions chronologically so a new heaviest weight is
  // counted once per exercise (first lift doesn't count — no prior
  // baseline). Warm-ups/cooldowns excluded throughout.
  const { totalVolume, totalReps, totalSets, prCount } = useMemo(() => {
    let totalVolume = 0;
    let totalReps = 0;
    let totalSets = 0;
    const sorted = [...allSessions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const maxKgByExercise: Record<string, number> = {};
    let prCount = 0;
    for (const s of sorted) {
      for (const ex of s.exercises) {
        if (ex.name === 'Warm-up' || ex.name === 'Cooldown') continue;
        for (const set of ex.sets) {
          if (set.label === 'W') continue;
          const kg = set.kg ?? 0;
          const reps = set.reps ?? 0;
          totalSets += 1;
          totalReps += reps;
          if (kg > 0 && reps > 0) totalVolume += kg * reps;
          if (kg > 0) {
            const prev = maxKgByExercise[ex.name] ?? 0;
            if (kg > prev) {
              if (prev > 0) prCount += 1;
              maxKgByExercise[ex.name] = kg;
            }
          }
        }
      }
    }
    return { totalVolume, totalReps, totalSets, prCount };
  }, [allSessions]);

  const memberSince = useMemo(() => {
    if (allSessions.length === 0) return 'No sessions yet';
    const d = new Date(allSessions[0].date);
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }, [allSessions]);

  const topWorkouts = useMemo(() => {
    return workouts
      .map(w => {
        const sessions = sessionsByWorkout[w.id] ?? [];
        const time   = sessions.reduce((a, s) => a + s.duration, 0);
        const volume = sessions.reduce((a, s) =>
          a + s.exercises.reduce((a2, ex) =>
            a2 + ex.sets.reduce((a3, set) =>
              a3 + (set.label === 'W' ? 0 : (set.kg ?? 0) * (set.reps ?? 0)), 0), 0), 0);
        const sets   = sessions.reduce((a, s) =>
          a + s.exercises.reduce((a2, ex) =>
            a2 + ex.sets.filter(set => set.label !== 'W').length, 0), 0);
        return { name: w.workoutName || 'Unnamed', sessionCount: sessions.length, time, volume, sets };
      })
      .filter(w => w.sessionCount > 0)
      .sort((a, b) => b.sessionCount - a.sessionCount)
      .slice(0, 3);
  }, [workouts, sessionsByWorkout]);

  const topMuscles: RadarPoint[] = useMemo(() => {
    const setsByMuscle: Record<string, number> = {};
    for (const session of allSessions) {
      for (const ex of session.exercises) {
        const muscle = muscleForExercise(ex.name);
        if (!muscle) continue;
        const working = ex.sets.filter(s => s.label !== 'W').length;
        if (working > 0) setsByMuscle[muscle] = (setsByMuscle[muscle] ?? 0) + working;
      }
    }
    return Object.entries(setsByMuscle)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));
  }, [allSessions]);

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Cover + Avatar ── avatar straddles the cover's bottom edge ── */}
        <View style={styles.coverContainer}>
          <TouchableOpacity style={styles.coverTap} onPress={pickCover} activeOpacity={0.85}>
            {profile?.cover_url
              ? <Image source={{ uri: profile.cover_url }} style={styles.cover} />
              : <View style={styles.coverPlaceholder} />
            }
            {uploadingCover
              ? <View style={styles.coverOverlay}><ActivityIndicator color="#fff" /></View>
              : <View style={styles.coverEditBadge}><Feather name="camera" size={13} color="#fff" /></View>
            }
          </TouchableOpacity>

          {/* Absolutely positioned so half sits inside cover, half below */}
          <View style={styles.avatarAnchor}>
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85} style={styles.avatarRing}>
              {profile?.avatar_url
                ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                : <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>
                      {profile?.username ? profile.username[0].toUpperCase() : '?'}
                    </Text>
                  </View>
              }
              {uploadingAvatar
                ? <View style={styles.avatarOverlay}><ActivityIndicator color="#fff" /></View>
                : <View style={styles.avatarEditBadge}><Feather name="camera" size={10} color="#fff" /></View>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Padded content ── */}
        <View style={styles.scroll}>

          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.8}
          >
            <Feather name="settings" size={18} color={colors.button1} />
          </TouchableOpacity>

          {/* Follow-requests inbox — shows a count badge when there are
              pending requests. Always tappable so users can review past
              requests even at zero. */}
          <TouchableOpacity
            style={styles.requestsBtn}
            onPress={() => navigation.navigate('FollowRequests')}
            activeOpacity={0.8}
          >
            <Feather name="user-plus" size={18} color={colors.button1} />
            {pendingRequests > 0 && (
              <View style={[styles.requestsBadge, { backgroundColor: accent }]}>
                <Text style={styles.requestsBadgeText}>
                  {pendingRequests > 99 ? '99+' : pendingRequests}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Name + badges */}
          <View style={styles.avatarSection}>
            {editingName ? (
              <View style={styles.nameInputRow}>
                <TextInput
                  style={styles.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  onBlur={commitName}
                  onSubmitEditing={commitName}
                  placeholder="Your name"
                  placeholderTextColor={colors.button2}
                  returnKeyType="done"
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.nameRow}
                onPress={() => { setNameInput(profile?.username ?? ''); setEditingName(true); }}
                activeOpacity={0.7}
              >
                <Text style={styles.name}>{profile?.username || 'Add your name'}</Text>
                <Feather name="edit-2" size={13} color={colors.button1} />
              </TouchableOpacity>
            )}

            <View style={styles.badgeRow}>
              <View style={[styles.levelBadge, { borderColor: accent }]}>
                <Text style={[styles.levelText, { color: accent }]}>
                  Lv.{levelInfo.level}
                </Text>
              </View>
              <View style={[styles.levelBadge, { borderColor: accent }]}>
                <Text style={[styles.levelText, { color: accent }]}>
                  {displayTitle}
                </Text>
              </View>
              {/* Coin badge moved to the Store tab — that's now the
                  natural home for the wallet readout. */}
              {profile?.goal && GOAL_META[profile.goal] && (() => {
                const g = GOAL_META[profile.goal!];
                return (
                  <View style={[styles.goalBadge, { backgroundColor: g.bg, borderColor: g.color + '40' }]}>
                    <Feather name={g.icon as any} size={11} color={g.color} />
                    <Text style={[styles.goalBadgeText, { color: g.color }]}>{g.label}</Text>
                  </View>
                );
              })()}
            </View>

            <View style={styles.followRow}>
              <TouchableOpacity
                style={styles.followStat}
                activeOpacity={0.7}
                onPress={() => setFollowListMode('followers')}
              >
                <Text style={styles.followCount}>{followers.toLocaleString()}</Text>
                <Text style={styles.followLabel}>Followers</Text>
              </TouchableOpacity>
              <View style={styles.followDivider} />
              <TouchableOpacity
                style={styles.followStat}
                activeOpacity={0.7}
                onPress={() => setFollowListMode('following')}
              >
                <Text style={styles.followCount}>{following.toLocaleString()}</Text>
                <Text style={styles.followLabel}>Following</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.memberSince}>Member since {memberSince}</Text>
          </View>

          {/* ── Key stats ── two rows of three. Volume stays in KG
              until 1M kg; long-press surfaces the tonne conversion. */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lifetime Stats</Text>
            <View style={styles.pillRow}>
              <StatPill label="Sessions" value={`${totalSessions}`}         icon="activity" />
              <StatPill label="Time"     value={fmtDuration(totalDuration)} icon="clock"    />
              <StatPill
                label="Volume"
                value={formatTotalVolume(totalVolume)}
                icon="trending-up"
                onLongPress={() => setVolumeModalOpen(true)}
              />
            </View>
            <View style={[styles.pillRow, { marginTop: 8 }]}>
              <StatPill label="Reps" value={totalReps.toLocaleString()} icon="repeat" />
              <StatPill label="Sets" value={totalSets.toLocaleString()} icon="layers" />
              <StatPill label="PRs"  value={prCount.toLocaleString()}    icon="award"  />
            </View>
          </View>

          {/* ── Activity calendar ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity</Text>
            <View style={styles.calendarCard}>
              <WorkoutCalendar sessions={allSessions} />
            </View>
          </View>

          {/* ── Workouts ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Workouts</Text>
            {topWorkouts.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="award" size={18} color={colors.button2} />
                <Text style={styles.emptyHint}>Complete a session to see your top workouts</Text>
              </View>
            ) : (
              <View style={styles.workoutsPanel}>
                {topWorkouts.map((w, i) => {
                  const isTop = i === 0;
                  const isLast = i === topWorkouts.length - 1;
                  return (
                    <View key={i} style={[styles.workoutRow, !isLast && styles.workoutRowDivider]}>
                      <View style={styles.workoutRankCol}>
                        <Text style={[styles.workoutRankLabel, isTop && { color: accent }]}>
                          {i + 1}
                        </Text>
                      </View>
                      <View style={styles.workoutBody}>
                        <View style={styles.workoutHead}>
                          <Text style={styles.workoutName} numberOfLines={1}>{w.name}</Text>
                          <View style={styles.workoutPrimary}>
                            <Text style={styles.workoutPrimaryValue}>{w.sessionCount}</Text>
                            <Text style={styles.workoutPrimaryUnit}>times</Text>
                          </View>
                        </View>
                        <View style={styles.workoutMetaRow}>
                          <Text style={styles.workoutMetaText}>{fmtDuration(w.time)}</Text>
                          <Text style={styles.workoutMetaDot}>·</Text>
                          <Text style={styles.workoutMetaText}>{formatVolumeShort(w.volume)}</Text>
                          <Text style={styles.workoutMetaDot}>·</Text>
                          <Text style={styles.workoutMetaText}>{w.sets.toLocaleString()} sets</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* ── Muscle focus radar ── */}
          <View style={styles.section}>
            <RadarChart
              data={topMuscles}
              title="Top Muscles"
              color="accent"
              emptyMessage="Complete a session to see your muscle focus"
            />
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      <Modal
        visible={volumeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setVolumeModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setVolumeModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalLabel}>Total Volume</Text>
            <Text style={styles.modalValue}>{Math.round(totalVolume).toLocaleString()} KG</Text>
            <Text style={styles.modalSub}>{formatTonnes(totalVolume)}</Text>
          </Pressable>
        </Pressable>
      </Modal>

      <FollowListModal
        mode={followListMode}
        ownerId={session?.user.id}
        viewerId={session?.user.id}
        onClose={() => setFollowListMode(null)}
        onCountsChanged={() => {
          // A follow/unfollow inside the modal may have changed the
          // viewer's *following* count (if the viewer is the owner).
          // Re-fetch so the header chips stay accurate.
          if (session?.user.id) {
            fetchFollowCounts(session.user.id)
              .then(counts => {
                setFollowers(counts.followers);
                setFollowing(counts.following);
              })
              .catch(() => {});
          }
        }}
      />
    </View>
  );
};

// ─── Follow-list modal (Instagram-style) ─────────────────────────────────────
// Shows the owner's followers or following list. Each row carries a
// Follow/Following toggle so the viewer can manage relationships
// without leaving the modal. Closes via tap-outside or the X button.

type FollowListMode = 'followers' | 'following';

function FollowListModal({
  mode,
  ownerId,
  viewerId,
  onClose,
  onCountsChanged,
}: {
  mode: FollowListMode | null;
  ownerId: string | undefined;
  viewerId: string | undefined;
  onClose: () => void;
  onCountsChanged: () => void;
}) {
  const { accent } = useAccent();
  const visible = mode !== null;
  const [users, setUsers] = useState<ProfileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  // Per-user edge status toward the viewer: 'accepted' | 'pending' | absent.
  const [followEdges, setFollowEdges] = useState<Map<string, FollowEdgeStatus>>(new Map());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (!visible) return;
    if (!ownerId || !mode) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const list =
        mode === 'followers'
          ? await fetchFollowers(ownerId)
          : await fetchFollowing(ownerId);
      if (cancelled) return;
      setUsers(list);
      // Resolve the viewer's edge toward each user so every row can show
      // the right button state (Follow / Requested / Following).
      if (viewerId && list.length > 0) {
        const edges = await fetchFollowEdges(viewerId, list.map(u => u.id));
        if (!cancelled) setFollowEdges(edges);
      } else {
        setFollowEdges(new Map());
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [visible, mode, ownerId, viewerId]);

  const setEdge = (id: string, status: FollowEdgeStatus | null) =>
    setFollowEdges(prev => {
      const next = new Map(prev);
      if (status === null) next.delete(id);
      else next.set(id, status);
      return next;
    });

  const handleToggle = useCallback(
    async (target: ProfileSearchResult) => {
      if (!viewerId || target.id === viewerId) return;
      const prevStatus = followEdges.get(target.id) ?? null;
      const wasEngaged = prevStatus !== null; // following or requested
      setPendingIds(prev => new Set(prev).add(target.id));

      if (wasEngaged) {
        // Unfollow / cancel request.
        setEdge(target.id, null);
        try {
          await unfollowUser(viewerId, target.id);
          onCountsChanged();
        } catch (e) {
          logError('profile.follow.toggle.failed', { name: (e as Error)?.name });
          setEdge(target.id, prevStatus); // revert
        } finally {
          setPendingIds(prev => { const n = new Set(prev); n.delete(target.id); return n; });
        }
        return;
      }

      // New follow/request — server decides accepted vs pending.
      try {
        const result = await followUser(viewerId, target.id);
        setEdge(target.id, result);
        if (result === 'accepted') onCountsChanged();
      } catch (e) {
        logError('profile.follow.toggle.failed', { name: (e as Error)?.name });
        setEdge(target.id, null);
      } finally {
        setPendingIds(prev => { const n = new Set(prev); n.delete(target.id); return n; });
      }
    },
    [viewerId, followEdges, onCountsChanged],
  );

  const title = mode === 'followers' ? 'Followers' : 'Following';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={followListStyles.backdrop} onPress={onClose}>
        <Pressable style={followListStyles.card} onPress={() => {}}>
          <View style={followListStyles.header}>
            <Text style={followListStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={followListStyles.closeBtn}>
              <Feather name="x" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={followListStyles.statusWrap}>
              <ActivityIndicator color={accent} />
            </View>
          ) : users.length === 0 ? (
            <View style={followListStyles.statusWrap}>
              <Feather name="users" size={22} color="rgba(255,255,255,0.3)" />
              <Text style={followListStyles.statusText}>
                {mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={followListStyles.scroll}
              contentContainerStyle={followListStyles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {users.map(u => {
                const isSelf = u.id === viewerId;
                const edge = followEdges.get(u.id) ?? null;
                const engaged = edge !== null; // following or requested
                const followLabel =
                  edge === 'accepted' ? 'Following'
                  : edge === 'pending' ? 'Requested'
                  : 'Follow';
                const pending = pendingIds.has(u.id);
                return (
                  <Pressable
                    key={u.id}
                    onPress={() => {
                      // Close the list modal before navigating —
                      // otherwise the modal stays painted on top of
                      // the view-profile screen.
                      onClose();
                      navigation.navigate('UserProfile', { userId: u.id });
                    }}
                    style={({ pressed }) => [
                      followListStyles.row,
                      pressed && { backgroundColor: 'rgba(255,255,255,0.04)' },
                    ]}
                  >
                    <View style={followListStyles.avatarWrap}>
                      {u.avatar_url ? (
                        <Image
                          source={{ uri: u.avatar_url }}
                          style={followListStyles.avatarImg}
                        />
                      ) : (
                        <View style={[followListStyles.avatarFallback, { backgroundColor: accent + '22' }]}>
                          <Text style={[followListStyles.avatarInitial, { color: accent }]}>
                            {u.username.slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={followListStyles.username} numberOfLines={1}>
                      {u.username}
                    </Text>
                    {!isSelf && (
                      <TouchableOpacity
                        onPress={() => handleToggle(u)}
                        disabled={pending}
                        activeOpacity={0.7}
                        style={[
                          followListStyles.followBtn,
                          engaged
                            ? followListStyles.followBtnActive
                            : { borderColor: accent, backgroundColor: accent + '14' },
                          pending && { opacity: 0.5 },
                        ]}
                      >
                        <Text
                          style={[
                            followListStyles.followBtnText,
                            { color: engaged ? 'rgba(255,255,255,0.7)' : accent },
                          ]}
                        >
                          {followLabel}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const followListStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '78%',
    backgroundColor: colors.container,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.button3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.4,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  scroll: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingVertical: 6,
  },
  statusWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 40,
    height: 40,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '800',
  },
  username: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  followBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  followBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 55,     // 43px avatar bottom half + 12px gap
  },

  // Cover + avatar header
  coverContainer: {
    width: '100%',
    height: 220,
  },
  coverTap: {
    width: '100%',
    height: 220,
  },
  cover: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: 220,
    backgroundColor: colors.container,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEditBadge: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    padding: 6,
  },
  settingsBtn: {
    position: 'absolute',
    top: 8,
    right: 0,
    padding: 6,
  },
  // Follow-requests inbox button — sits just left of the settings gear.
  requestsBtn: {
    position: 'absolute',
    top: 8,
    right: 38,
    padding: 6,
  },
  requestsBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestsBadgeText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '800',
  },
  // avatar center sits exactly on the cover's bottom edge
  avatarAnchor: {
    position: 'absolute',
    bottom: -43,        // half of 86px total avatar diameter
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  avatarRing: {
    padding: 3,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.button3,
    backgroundColor: colors.background,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarFallback: {
    backgroundColor: colors.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.highlight,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.button2,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1.5,
    borderColor: colors.background,
  },

  // Name / info section
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.highlight,
  },
  nameInputRow: {
    width: '60%',
  },
  nameInput: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.highlight,
    borderBottomWidth: 1,
    borderBottomColor: colors.button2,
    textAlign: 'center',
    paddingBottom: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  goalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  levelBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  followRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  followStat: {
    alignItems: 'center',
    gap: 2,
  },
  followCount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.highlight,
  },
  followLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.button1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  followDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.button3,
  },
  memberSince: {
    fontSize: 11,
    color: colors.button1,
  },

  // Sections
  section: {
    marginBottom: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.button1,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Calendar
  calendarCard: {
    backgroundColor: colors.container,
    borderRadius: 14,
    padding: 14,
    overflow: 'hidden',
  },

  // Pills
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },

  // Workouts panel — single container, divided rows
  workoutsPanel: {
    backgroundColor: colors.container,
    borderRadius: 14,
    overflow: 'hidden',
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  workoutRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.button3,
  },
  workoutRankCol: {
    width: 32,
    alignItems: 'center',
    paddingTop: 0,
  },
  workoutRankLabel: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.button2,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    lineHeight: 28,
  },
  workoutRankLabelTop: {
    color: colors.accent,
  },
  workoutBody: {
    flex: 1,
    gap: 6,
  },
  workoutHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  workoutName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.highlight,
    letterSpacing: 0.1,
  },
  workoutPrimary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  workoutPrimaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.highlight,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  workoutPrimaryUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.button1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  workoutMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workoutMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.button1,
    letterSpacing: 0.2,
  },
  workoutMetaDot: {
    fontSize: 11,
    color: colors.button2,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  emptyHint: {
    fontSize: 12,
    color: colors.button1,
  },

  // Volume kg-translation modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  modalCard: {
    backgroundColor: colors.container,
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 6,
    minWidth: 220,
    borderWidth: 1,
    borderColor: colors.button3,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.button1,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modalValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.highlight,
    letterSpacing: 0.3,
  },
  modalSub: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.button1,
  },
});

export default ProfileScreen;