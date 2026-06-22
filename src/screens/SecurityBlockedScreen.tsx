import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function SecurityBlockedScreen({
  reason,
}: { reason?: string }) {
  return (
    <View style={s.root}>
      <View style={s.iconWrap}>
        <Feather name="shield-off" size={48} color="#FF6B6B" />
      </View>
      <Text style={s.title}>Repmi can't run on this device</Text>
      <Text style={s.body}>
        We detected a security risk that could expose your account data.
        For your safety, Repmi has been disabled on this device.
      </Text>
      {reason ? (
        <Text style={s.reason}>Reason: {reason}</Text>
      ) : null}
      <Text style={s.footer}>
        If you believe this is a mistake, contact{' '}
        <Text style={{ color: colors.highlight }}>support@repmi.co.uk</Text>.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,107,107,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    color: colors.highlight,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: colors.button1,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  reason: {
    color: '#FF9999',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  footer: {
    color: colors.button2,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
