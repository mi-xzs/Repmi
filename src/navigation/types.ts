import type { NavigatorScreenParams } from '@react-navigation/native';
import type { HomeStackParamList } from './HomeStackNavigator';
import type { ProfileStackParamList } from './ProfileStackNavigator';

// Auth flow — signed-out stack.
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  PasswordReset: undefined;
  PasswordResetConfirm: undefined;
  MFAChallenge: undefined;
};

// Bottom tabs — the signed-in shell. Home and Profile are themselves
// nested stacks, so their params are the nested stack's param list.
export type RootTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Analytics: undefined;
  Achievements: undefined;
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
