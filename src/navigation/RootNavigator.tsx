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

// H2 — MFA-required gate. When the user is signed in at AAL1 with a
// verified TOTP factor, we render ONLY the MFA challenge stack — no
// access to TabNavigator until the challenge is satisfied.
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

  const isBooting = authLoading || (session != null && !mfaRequired && profileLoading);
  if (useStableLoading(isBooting)) {
    return <BootSkeleton />;
  }

  return (
    <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {inPasswordRecovery ? (
        // Web: Supabase auto-created a recovery session from the URL
        // hash. Skip Auth/Main and route directly to the reset form so
        // the user sets a new password before they can use the app.
        // Cleared by PasswordResetConfirmScreen on success (calls
        // signOut + clearPasswordRecovery).
        <Root.Screen
          name="PasswordResetConfirm"
          component={PasswordResetConfirmScreen}
        />
      ) : !session ? (
        <Root.Screen name="Auth" component={AuthNavigator} />
      ) : mfaRequired ? (
        // H2 — AAL2 required. Lock the navigator to the challenge
        // screen until refreshAAL flips mfaRequired back to false.
        <Root.Screen name="MFAChallenge" component={MFAChallengeScreen} />
      ) : !hasProfile ? (
        <Root.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <>
          <Root.Screen name="Main" component={TabNavigator} />
          {/* View-profile screen for any non-self user. Lives at the
              root so it can be navigated to from any tab. Slide-from-
              right reads as a stack push regardless of which tab the
              user was on when they tapped through. */}
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
