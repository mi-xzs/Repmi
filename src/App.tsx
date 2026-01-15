import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './services/AuthContext';
import { ProfileProvider } from './services/ProfileContext';
import { SettingsProvider } from './services/SettingsContext';
import { WorkoutProvider } from './services/WorkoutContext';
import { XPProvider } from './services/XPContext';
import { CoinProvider } from './services/CoinContext';
import RootNavigator from './navigation/RootNavigator';
import { ensureRestTimerChannel } from './services/notifications';

export default function App() {
  // One-time setup of the Android notification channel used by the rest
  // timer.  Cheap, idempotent, no-op on iOS.
  useEffect(() => {
    ensureRestTimerChannel();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthProvider>
          <ProfileProvider>
            <SettingsProvider>
              <WorkoutProvider>
                <XPProvider>
                  <CoinProvider>
                    <RootNavigator />
                  </CoinProvider>
                </XPProvider>
              </WorkoutProvider>
            </SettingsProvider>
          </ProfileProvider>
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
