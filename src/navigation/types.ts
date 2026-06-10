import type { NavigatorScreenParams } from '@react-navigation/native';
import type { HomeStackParamList } from './HomeStackNavigator';
import type { ProfileStackParamList } from './ProfileStackNavigator';

// Auth flow — signed-out stack.
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  PasswordReset: undefined;
  PasswordResetConfirm: undefined;
  EmailConfirm: undefined;
  MFAChallenge: undefined;
};

// Bottom tabs — the signed-in shell. Home and Profile are themselves
// nested stacks, so their params are the nested stack's param list.
export type RootTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  // `tab` selects the screen's sub-tab index — set from the desktop side
  // rail's nested sub-items on web (Analytics: Workout/Weekly/Overall,
  // Achievements: Achievements/Leaderboard/Store).
  Analytics: { tab?: number } | undefined;
  Achievements: { tab?: number } | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

// Root stack — switches between Auth / MFA / Onboarding / Main and hosts
// the root-level screens reachable from any tab.
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  MFAChallenge: undefined;
  Onboarding: undefined;
  Main: NavigatorScreenParams<RootTabParamList> | undefined;
  UserProfile: { userId: string };
  FollowRequests: undefined;
  MFAEnroll: undefined;
  HealthDataConsent: undefined;
  // Hosted at the root (not just under Auth) so the inPasswordRecovery
  // short-circuit in RootNavigator can render the reset form directly,
  // before the Auth stack mounts. See RootNavigator's recovery branch.
  PasswordResetConfirm: undefined;
};

// Makes useNavigation()/useRoute() typed app-wide without passing generics
// at every call site. https://reactnavigation.org/docs/typescript#specifying-default-types
declare global {
  namespace ReactNavigation {
    // Empty-extends is the required form for this module augmentation.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
