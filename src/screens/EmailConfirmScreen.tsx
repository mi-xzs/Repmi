import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';
import { colors } from '../theme/colors';
import { useAccent } from '../services/SettingsContext';
import { useAuth } from '../services/AuthContext';
import { Skeleton } from '../components/ui/Skeleton';

export default function EmailConfirmScreen({ navigation, route }: any) {
  const { accent } = useAccent();
  const { session } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) return;

    const accessToken: string | undefined = route.params?.access_token;
    const refreshToken: string | undefined = route.params?.refresh_token;

    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: err }) => {
          if (err) {
            setError('Confirmation link is invalid or expired. Request a new one from the sign-up screen.');
          }
        });
      return;
    }

    setError('Confirmation link is invalid or expired. Request a new one from the sign-up screen.');
  }, [route.params, session]);

  if (error) {
    return (
      <View style={s.container}>
        <Text style={[s.title, { color: accent }]}>Couldn't confirm</Text>
        <Text style={s.subtitle}>{error}</Text>
        <TouchableOpacity
          style={[s.button, { backgroundColor: accent }]}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
        >
          <Text style={s.buttonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <Skeleton width="65%" height={32} radius={6} style={{ marginBottom: 10 }} />
        <Skeleton width="85%" height={16} radius={4} style={{ marginBottom: 32 }} />
        <Skeleton height={50} radius={12} style={{ marginBottom: 12 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.button1, marginBottom: 32, lineHeight: 22 },
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: { color: colors.background, fontWeight: '700', fontSize: 16 },
});
