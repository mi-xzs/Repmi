// src/screens/UserProfileScreen.tsx
//
// Read-only profile view for any non-self user. Layout mirrors the
// owner's ProfileScreen tab so the page feels familiar — same cover
// + avatar header, same badges, same Lifetime Stats grid, same
// activity calendar shell, same top-workouts shell. Edit affordances
// (cover/avatar picker, name input, settings cog) are replaced by
// a back chevron and a Follow / Unfollow button.
//
// Stats come from the profiles cache (written by each user's own
// XPContext.refresh), so this screen never reads raw workout_sessions
// belonging to someone else. Sections that genuinely need raw session
// data (calendar, top workouts, muscle radar) render empty states for
// now and will fill in once those aggregates land in the cache too.

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Modal,
} from 'react-native';
import {
  blockUser,
  reportUser,
  ReportReason,
  REPORT_REASONS,
} from '../services/moderationService';
import { Feather } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAccent } from '../services/SettingsContext';
import { useAuth } from '../services/AuthContext';
import {
  fetchProfile,
  fetchProfileStats,
  fetchFollowCounts,
  fetchFollowEdges,
  followUser,
  unfollowUser,
  ProfileStats,
  FollowEdgeStatus,
} from '../services/profileService';
import { UserProfile } from '../types/user';
import { getLevelFromXP, getLevelTitle } from '../services/xpService';
import { fmtDuration } from '../utils/analyticsHelpers';
import RadarChart from '../components/analytics/RadarChart';
import { logError } from '../services/logger';

const GOAL_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  strength:    { label: 'Strength',    icon: 'trending-up', color: '#6D6D6D', bg: 'rgba(109,109,109,0.12)' },
  hypertrophy: { label: 'Hypertrophy', icon: 'layers',      color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  endurance:   { label: 'Endurance',   icon: 'activity',    color: '#60A5FA', bg: 'rgba(96,165,250,0.12)'  },
  weight_loss: { label: 'Cut',         icon: 'zap',         color: '#FBBF24', bg: 'rgba(251,191,36,0.12)'  },
  general:     { label: 'General',     icon: 'heart',       color: '#00FA9A', bg: 'rgba(0,250,154,0.12)'   },
};

function formatTonnes(kg: number): string {
  const t = kg / 1000;
  if (t >= 100) return `${Math.round(t).toLocaleString()}T`;
  if (t >= 10)  return `${t.toFixed(1)}T`;
  return `${t.toFixed(2)}T`;
}

// Same threshold logic as ProfileScreen — KG until 1M, then tonnes.
function formatTotalVolume(kg: number): string {
  if (kg >= 1_000_000) return formatTonnes(kg);
  return `${Math.round(kg).toLocaleString()} KG`;
}

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

export default function UserProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accent } = useAccent();
  const { session } = useAuth();
  const targetId: string = route.params?.userId;
  const viewerId = session?.user.id;
  const isSelf = viewerId === targetId;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [counts, setCounts] = useState<{ followers: number; following: number }>({ followers: 0, following: 0 });
  // 'none' = not following, 'pending' = request sent, 'accepted' = following.
  const [followState, setFollowState] = useState<'none' | FollowEdgeStatus>('none');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [volumeModalOpen, setVolumeModalOpen] = useState(false);
  // H12 — kebab menu + report modal state.
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    const [p, s, c] = await Promise.all([
      fetchProfile(targetId),
      fetchProfileStats(targetId),
      fetchFollowCounts(targetId),
    ]);
    setProfile(p);
    setStats(s);
    setCounts(c);
    if (viewerId && !isSelf) {
      const edges = await fetchFollowEdges(viewerId, [targetId]);
      setFollowState(edges.get(targetId) ?? 'none');
    }
    setLoading(false);
  }, [targetId, viewerId, isSelf]);

  useEffect(() => { load(); }, [load]);

  // H12 — Block & Report.
  const handleBlock = useCallback(() => {
    setMenuOpen(false);
    Alert.alert(
      `Block ${profile?.username ?? 'this user'}?`,
      `They won't be able to see your profile, follow you, or appear in your search results. You'll also unfollow each other.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(targetId);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Block failed', e instanceof Error ? e.message : 'Unknown error');
            }
          },
        },
      ],
    );
  }, [profile, targetId, navigation]);

  const openReport = useCallback(() => {
    setMenuOpen(false);
    setReportOpen(true);
  }, []);

  const submitReport = useCallback(async () => {
    if (!reportReason) {
      Alert.alert('Pick a reason', 'Tell us what the problem is so we can review it.');
      return;
    }
    setSubmitting(true);
    try {
      await reportUser(targetId, reportReason, reportDetails);
      setReportOpen(false);
      setReportReason(null);
      setReportDetails('');
      Alert.alert('Thanks for reporting', 'We review reports within 24 hours.');
    } catch (e) {
      Alert.alert('Report failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }, [reportReason, targetId, reportDetails]);

  const handleToggle = useCallback(async () => {
    if (!viewerId || isSelf) return;
    setPending(true);
    const prevState = followState;
    // already engaged (following OR requested) → tapping clears it
    const wasEngaged = prevState !== 'none';

    if (wasEngaged) {
      // Unfollow or cancel-request: only decrement the follower count if we
      // were actually an accepted follower (a pending request never counted).
      const wasAccepted = prevState === 'accepted';
      setFollowState('none');
      if (wasAccepted) setCounts(c => ({ ...c, followers: c.followers - 1 }));
      try {
        await unfollowUser(viewerId, targetId);
      } catch (e) {
        logError('userProfile.follow.toggle.failed', { name: (e as Error)?.name });
        setFollowState(prevState);
        if (wasAccepted) setCounts(c => ({ ...c, followers: c.followers + 1 }));
      } finally {
        setPending(false);
      }
      return;
    }

    // New follow/request — the server decides accepted vs pending based on the
    // target's privacy. We can't predict it, so we don't optimistically bump
    // the count; we apply the real result when it returns.
    try {
      const result = await followUser(viewerId, targetId);
      setFollowState(result);
      if (result === 'accepted') setCounts(c => ({ ...c, followers: c.followers + 1 }));
    } catch (e) {
      logError('userProfile.follow.toggle.failed', { name: (e as Error)?.name });
      setFollowState('none');
    } finally {
      setPending(false);
    }
  }, [viewerId, isSelf, followState, targetId]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={accent} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.notFoundText}>Profile not found</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={[styles.backLinkText, { color: accent }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const levelInfo = getLevelFromXP(stats?.totalXP ?? 0);
  const levelTitle = getLevelTitle(levelInfo.level);
  const goal = profile.goal ? GOAL_META[profile.goal] : null;

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Cover + Avatar ── mirrors ProfileScreen, just no pickers ── */}
        <View style={styles.coverContainer}>
          {profile.cover_url
            ? <Image source={{ uri: profile.cover_url }} style={styles.cover} />
            : <View style={styles.coverPlaceholder} />
          }

          {/* Back chevron — sits where the cover edit badge sits on the
              owner's view, so the top-right corner reads identically. */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={20} color="#fff" />
          </TouchableOpacity>

          {/* H12 — kebab menu (hidden when viewing self). */}
          {!isSelf && (
            <TouchableOpacity
              onPress={() => setMenuOpen(true)}
              hitSlop={10}
              style={styles.kebabBtn}
              activeOpacity={0.7}
            >
              <Feather name="more-vertical" size={20} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Avatar straddling the cover's bottom edge — same positioning */}
          <View style={styles.avatarAnchor}>
            <View style={styles.avatarRing}>
              {profile.avatar_url
                ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                : <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>
                      {profile.username ? profile.username[0].toUpperCase() : '?'}
                    </Text>
                  </View>
              }
            </View>
          </View>
        </View>

        {/* ── Padded content ── */}
        <View style={styles.scroll}>

          {/* Name + badges — name is static text, no edit affordance */}
          <View style={styles.avatarSection}>
            <Text style={styles.name}>{profile.username}</Text>

            <View style={styles.badgeRow}>
              <View style={[styles.levelBadge, { borderColor: accent }]}>
                <Text style={[styles.levelText, { color: accent }]}>
                  Lv.{levelInfo.level}
                </Text>
              </View>
              <View style={[styles.levelBadge, { borderColor: accent }]}>
                <Text style={[styles.levelText, { color: accent }]}>
                  {levelTitle.title}
                </Text>
              </View>
              {goal && (
                <View style={[styles.goalBadge, { backgroundColor: goal.bg, borderColor: goal.color + '40' }]}>
                  <Feather name={goal.icon as any} size={11} color={goal.color} />
                  <Text style={[styles.goalBadgeText, { color: goal.color }]}>{goal.label}</Text>
                </View>
              )}
            </View>

            <View style={styles.followRow}>
              <View style={styles.followStat}>
                <Text style={styles.followCount}>{counts.followers.toLocaleString()}</Text>
                <Text style={styles.followLabel}>Followers</Text>
              </View>
              <View style={styles.followDivider} />
              <View style={styles.followStat}>
                <Text style={styles.followCount}>{counts.following.toLocaleString()}</Text>
                <Text style={styles.followLabel}>Following</Text>
              </View>
            </View>

            {/* Follow / Unfollow — sits where "Member since" sits on the
                owner's view. Hidden when viewing self. */}
            {!isSelf && (() => {
              const engaged = followState !== 'none'; // following or requested
              const label =
                followState === 'accepted' ? 'FOLLOWING'
                : followState === 'pending' ? 'REQUESTED'
                : 'FOLLOW';
              const icon =
                followState === 'accepted' ? 'check'
                : followState === 'pending' ? 'clock'
                : 'plus';
              return (
                <Pressable
                  onPress={handleToggle}
                  disabled={pending}
                  style={({ pressed }) => [
                    styles.followBtn,
                    engaged
                      ? styles.followBtnActive
                      : { backgroundColor: accent, borderColor: accent },
                    pressed && { opacity: 0.85 },
                    pending && { opacity: 0.5 },
                  ]}
                >
                  <Feather
                    name={icon as any}
                    size={14}
                    color={engaged ? 'rgba(255,255,255,0.85)' : '#000'}
                  />
                  <Text
                    style={[
                      styles.followBtnText,
                      { color: engaged ? 'rgba(255,255,255,0.85)' : '#000' },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })()}
          </View>

          {/* ── Key stats ── identical to ProfileScreen Lifetime Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lifetime Stats</Text>
            <View style={styles.pillRow}>
              <StatPill label="Sessions" value={`${stats?.totalSessions ?? 0}`} icon="activity" />
              <StatPill label="Time" value={fmtDuration(stats?.totalDurationSec ?? 0)} icon="clock" />
              <StatPill
                label="Volume"
                value={formatTotalVolume(stats?.totalVolumeKg ?? 0)}
                icon="trending-up"
                onLongPress={() => setVolumeModalOpen(true)}
              />
            </View>
            <View style={[styles.pillRow, { marginTop: 8 }]}>
              <StatPill label="Reps" value={(stats?.totalReps ?? 0).toLocaleString()} icon="repeat" />
              <StatPill label="Sets" value={(stats?.totalSets ?? 0).toLocaleString()} icon="layers" />
              <StatPill label="PRs"  value={(stats?.prCount ?? 0).toLocaleString()}    icon="award"  />
            </View>
          </View>

          {/* ── Activity ── needs raw session dates which aren't in the
              cache yet, so empty state for now. */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity</Text>
            <View style={styles.calendarCard}>
              <View style={styles.lockedSection}>
                <Feather name="lock" size={18} color={colors.button2} />
                <Text style={styles.emptyHint}>Activity calendar is private</Text>
              </View>
            </View>
          </View>

          {/* ── Top Workouts ── needs per-workout breakdown which isn't
              cached. Empty state matches ProfileScreen's empty design. */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Workouts</Text>
            <View style={styles.emptyState}>
              <Feather name="award" size={18} color={colors.button2} />
              <Text style={styles.emptyHint}>Workout breakdown is private</Text>
            </View>
          </View>

          {/* ── Muscle focus radar ── needs exercise data per session.
              Render the empty state of the existing chart for shape
              parity with the owner's view. */}
          <View style={styles.section}>
            <RadarChart
              data={[]}
              title="Top Muscles"
              color="accent"
              emptyMessage="Muscle focus is private"
            />
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Volume kg ↔ tonne conversion modal — matches ProfileScreen. */}
      <Modal
        visible={volumeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setVolumeModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setVolumeModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalLabel}>Total Volume</Text>
            <Text style={styles.modalValue}>
              {Math.round(stats?.totalVolumeKg ?? 0).toLocaleString()} KG
            </Text>
            <Text style={styles.modalSub}>{formatTonnes(stats?.totalVolumeKg ?? 0)}</Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* H12 — Block / Report kebab menu. */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menuCard} onPress={() => {}}>
            <TouchableOpacity style={styles.menuItem} onPress={openReport}>
              <Feather name="flag" size={16} color={colors.highlight} />
              <Text style={styles.menuItemText}>Report user</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleBlock}>
              <Feather name="user-x" size={16} color="#FF6B6B" />
              <Text style={[styles.menuItemText, { color: '#FF6B6B' }]}>Block user</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* H12 — Report flow. */}
      <Modal
        visible={reportOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setReportOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setReportOpen(false)}>
          <Pressable style={styles.reportCard} onPress={() => {}}>
            <Text style={styles.reportTitle}>Report user</Text>
            <Text style={styles.reportSub}>
              Help us understand the problem. We review reports within 24 hours.
            </Text>
            {REPORT_REASONS.map(r => (
              <TouchableOpacity
                key={r.key}
                style={[
                  styles.reasonRow,
                  reportReason === r.key && { backgroundColor: 'rgba(255,255,255,0.06)' },
                ]}
                onPress={() => setReportReason(r.key)}
              >
                <View
                  style={[
                    styles.radio,
                    reportReason === r.key && { borderColor: accent, backgroundColor: accent },
                  ]}
                />
                <Text style={styles.reasonText}>{r.label}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={styles.reportInput}
              placeholder="Optional details (max 500 chars)"
              placeholderTextColor={colors.button2}
              value={reportDetails}
              onChangeText={t => setReportDetails(t.slice(0, 500))}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.reportCancel]}
                onPress={() => setReportOpen(false)}
              >
                <Text style={styles.reportCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportSubmit, { backgroundColor: accent }, submitting && { opacity: 0.5 }]}
                onPress={submitReport}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color={colors.background} />
                  : <Text style={styles.reportSubmitText}>Submit</Text>
                }
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '600',
  },
  backLink: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 55,     // 43px avatar bottom half + 12px gap (matches ProfileScreen)
  },

  // Cover + avatar header — dimensions match ProfileScreen exactly
  coverContainer: {
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
  backBtn: {
    position: 'absolute',
    top: 48,
    left: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // avatar center sits exactly on the cover's bottom edge
  avatarAnchor: {
    position: 'absolute',
    bottom: -43,
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

  // Name / info section — identical to ProfileScreen
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.highlight,
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

  // Follow / Unfollow CTA
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
  },
  followBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  // Sections — match ProfileScreen
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
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  calendarCard: {
    backgroundColor: colors.container,
    borderRadius: 14,
    padding: 14,
    overflow: 'hidden',
  },
  lockedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 28,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: colors.container,
    borderRadius: 14,
  },
  emptyHint: {
    fontSize: 12,
    color: colors.button1,
  },

  // Volume conversion modal — same styling as ProfileScreen.
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
  },
  modalSub: {
    fontSize: 13,
    color: colors.button1,
  },

  // H12 — kebab button + Block/Report UI.
  kebabBtn: {
    position: 'absolute',
    top: 48,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCard: {
    backgroundColor: colors.container,
    borderRadius: 14,
    paddingVertical: 4,
    width: 240,
    borderWidth: 1,
    borderColor: colors.button3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuItemText: {
    color: colors.highlight,
    fontSize: 14,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.button3,
  },
  reportCard: {
    backgroundColor: colors.container,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: colors.button3,
    gap: 8,
  },
  reportTitle: {
    color: colors.highlight,
    fontSize: 18,
    fontWeight: '700',
  },
  reportSub: {
    color: colors.button1,
    fontSize: 13,
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 8,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.button1,
  },
  reasonText: {
    color: colors.highlight,
    fontSize: 14,
  },
  reportInput: {
    backgroundColor: colors.background,
    borderRadius: 10,
    color: colors.highlight,
    padding: 10,
    minHeight: 60,
    fontSize: 13,
    marginTop: 8,
  },
  reportCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.background,
    marginTop: 12,
  },
  reportCancelText: {
    color: colors.highlight,
    fontWeight: '600',
  },
  reportSubmit: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  reportSubmitText: {
    color: colors.background,
    fontWeight: '700',
  },
});
