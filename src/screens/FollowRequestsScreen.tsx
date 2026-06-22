import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAccent } from '../services/SettingsContext';
import {
  fetchIncomingFollowRequests,
  acceptFollowRequest,
  rejectFollowRequest,
  ProfileSearchResult,
} from '../services/profileService';
import { logError } from '../services/logger';

export default function FollowRequestsScreen() {
  const navigation = useNavigation<any>();
  const { accent } = useAccent();

  const [requests, setRequests] = useState<ProfileSearchResult[] | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const rows = await fetchIncomingFollowRequests();
    setRequests(rows);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setBusy = (id: string, on: boolean) =>
    setBusyIds(prev => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });

  const respond = useCallback(
    async (requester: ProfileSearchResult, accept: boolean) => {
      if (busyIds.has(requester.id)) return;
      setBusy(requester.id, true);
      const snapshot = requests ?? [];
      setRequests(prev => (prev ?? []).filter(r => r.id !== requester.id));
      try {
        if (accept) await acceptFollowRequest(requester.id);
        else await rejectFollowRequest(requester.id);
      } catch (e) {
        logError('followRequests.respond.failed', { accept, name: (e as Error)?.name });
        setRequests(snapshot);
      } finally {
        setBusy(requester.id, false);
      }
    },
    [busyIds, requests],
  );

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={s.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.highlight} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Follow requests</Text>
      </View>

      {requests === null ? (
        <View style={s.statusWrap}>
          <ActivityIndicator color={accent} />
        </View>
      ) : requests.length === 0 ? (
        <View style={s.statusWrap}>
          <Feather name="user-check" size={26} color={colors.button2} />
          <Text style={s.statusText}>No pending requests</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          {requests.map(r => {
            const busy = busyIds.has(r.id);
            return (
              <View key={r.id} style={s.row}>
                <TouchableOpacity
                  style={s.rowMain}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('UserProfile', { userId: r.id })}
                >
                  <View style={s.avatarWrap}>
                    {r.avatar_url ? (
                      <Image source={{ uri: r.avatar_url }} style={s.avatarImg} />
                    ) : (
                      <View style={[s.avatarFallback, { backgroundColor: accent + '22' }]}>
                        <Text style={[s.avatarInitial, { color: accent }]}>
                          {r.username.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.username} numberOfLines={1}>{r.username}</Text>
                </TouchableOpacity>

                <View style={s.actions}>
                  <TouchableOpacity
                    onPress={() => respond(r, true)}
                    disabled={busy}
                    style={[s.actionBtn, { backgroundColor: accent }, busy && s.actionDisabled]}
                  >
                    <Text style={s.actionTextDark}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => respond(r, false)}
                    disabled={busy}
                    style={[s.actionBtn, s.actionBtnGhost, busy && s.actionDisabled]}
                  >
                    <Text style={s.actionTextGhost}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.highlight },

  statusWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  statusText: { color: colors.button1, fontSize: 14 },

  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  avatarWrap: { width: 44, height: 44 },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 17, fontWeight: '700' },
  username: { flex: 1, color: colors.highlight, fontSize: 14, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnGhost: { backgroundColor: colors.button3 },
  actionDisabled: { opacity: 0.5 },
  actionTextDark: { color: colors.background, fontSize: 13, fontWeight: '700' },
  actionTextGhost: { color: colors.highlight, fontSize: 13, fontWeight: '600' },
});
