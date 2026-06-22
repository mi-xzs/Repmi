import React, { useState } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import SecurityBlockedScreen from '../screens/SecurityBlockedScreen';

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const TALSEC_CONFIG = {
  watcherMail: 'support@repmi.co.uk',
  androidConfig: {
    packageName: 'com.mixzs.repmi',
    certificateHashes: [],
  },
  iosConfig: {
    appBundleId: 'com.mixzs.repmi',
    appTeamId: 'TEAMID_PLACEHOLDER',
  },
  isProd: false,
};

function NativeThreatGate({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useFreeRasp } = require('freerasp-react-native');
  const [blocked, setBlocked] = useState<string | null>(null);

  useFreeRasp(
    TALSEC_CONFIG,
    {
      privilegedAccess: () => setBlocked('Privileged access detected (root / jailbreak).'),
      debug: () => { if (!__DEV__) console.warn('[freerasp] debugger detected'); },
      simulator: () => { if (!__DEV__) console.warn('[freerasp] simulator detected'); },
      hooks: () => { if (!__DEV__) console.warn('[freerasp] runtime hooks detected'); },
      appIntegrity: () => setBlocked('App integrity check failed.'),
    },
  );

  if (blocked) return <SecurityBlockedScreen reason={blocked} />;
  return <>{children}</>;
}

export default function ThreatGate({ children }: { children: React.ReactNode }) {
  if (isExpoGo) return <>{children}</>;
  return <NativeThreatGate>{children}</NativeThreatGate>;
}
