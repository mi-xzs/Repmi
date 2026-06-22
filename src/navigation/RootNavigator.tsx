import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../services/AuthContext';
import { useProfile } from '../services/ProfileContext';
import AuthNavigator from './AuthNavigator';
import OnboardingScreen from '../screens/OnboardingScreen';
import TabNavigator from './TabNavigator';
import UserProfileScreen from '../screens/UserProfileScreen';
import FollowRequestsScreen from '../screens/FollowRequestsScreen';
import { colors } from '../theme/colors';
import { Skeleton, useStableLoading } from '../components/ui/Skeleton';
import type { RootStackParamList } from './types';
import MFAChallengeScreen from '../screens/MFAChallengeScreen';
import MFAEnrollScreen from '../screens/MFAEnrollScreen';
import HealthDataConsentScreen from '../screens/HealthDataConsentScreen';
import PasswordResetConfirmScreen from '../screens/PasswordResetConfirmScreen';

const Root = createNativeStackNavigator<RootStackParamList>();

function BootSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 80, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12 }}>
        <Skeleton width={44} height={44} radius={22} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="55%" height={16} radius={4} />
          <Skeleton width="35%" height={11} radius={3} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} width={28} height={28} radius={14} />
        ))}
      </View>
      <Skeleton height={56} radius={14} />
      <Skeleton width={120} height={13} radius={3} style={{ marginTop: 8 }} />
      <Skeleton height={96} radius={12} />
      <Skeleton height={96} radius={12} />
    </View>
  );
}

export default function RootNavigator() {
  const { session, isLoading: authLoading, mfaRequired, inPasswordRecovery } = useAuth();
  const { hasProfile, isLoading: profileLoading } = useProfile();

  if (inPasswordRecovery) {
    return (
      <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Root.Screen
          name="PasswordResetConfirm"
          component={PasswordResetConfirmScreen}
        />
      </Root.Navigator>
    );
  }

  const isBooting = authLoading || (session != null && !mfaRequired && profileLoading);
  if (useStableLoading(isBooting)) {
    return <BootSkeleton />;
  }

  return (
    <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!session ? (
        <Root.Screen name="Auth" component={AuthNavigator} />
      ) : mfaRequired ? (
        <Root.Screen name="MFAChallenge" component={MFAChallengeScreen} />
      ) : !hasProfile ? (
        <Root.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <>
          <Root.Screen name="Main" component={TabNavigator} />
          <Root.Screen
            name="UserProfile"
            component={UserProfileScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Root.Screen
            name="FollowRequests"
            component={FollowRequestsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Root.Screen
            name="MFAEnroll"
            component={MFAEnrollScreen}
            options={{ animation: 'slide_from_right', presentation: 'modal' }}
          />
          <Root.Screen
            name="HealthDataConsent"
            component={HealthDataConsentScreen}
            options={{ animation: 'slide_from_right', presentation: 'modal' }}
          />
        </>
      )}
    </Root.Navigator>
  );
}
