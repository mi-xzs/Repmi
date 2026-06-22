import type { NavigatorScreenParams } from '@react-navigation/native';
import type { HomeStackParamList } from './HomeStackNavigator';
import type { ProfileStackParamList } from './ProfileStackNavigator';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  PasswordReset: undefined;
  PasswordResetConfirm: undefined;
  EmailConfirm: undefined;
  MFAChallenge: undefined;
};

export type RootTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Analytics: { tab?: number } | undefined;
  Achievements: { tab?: number } | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  MFAChallenge: undefined;
  Onboarding: undefined;
  Main: NavigatorScreenParams<RootTabParamList> | undefined;
  UserProfile: { userId: string };
  FollowRequests: undefined;
  MFAEnroll: undefined;
  HealthDataConsent: undefined;
  PasswordResetConfirm: undefined;
};

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
