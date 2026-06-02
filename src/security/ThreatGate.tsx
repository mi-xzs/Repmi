// src/security/ThreatGate.tsx  (native: iOS / Android)
//
// H9 — Runtime app self-protection (RASP) gate via freerasp/Talsec.
// This is the NATIVE implementation. The web build resolves
// `ThreatGate.web.tsx` instead (freerasp is a native-only library with
// no browser implementation, and a browser has no rooted-device threat
// model), so freerasp is never bundled for web.
//
// Expo Go: the freerasp native module is NOT compiled into the Expo Go
// client, so `useFreeRasp` would crash on launch (it mounts at the root
// of the app). Under Expo Go we therefore render children directly —
// same posture as the web build — so the app boots for UI testing. There
// is no device-integrity protection in Expo Go, which is acceptable: Expo
// Go is itself a debuggable host and never ships to users. A dev/standalone
// build (expo run:android / EAS) includes the native module and runs the
// real gate below.

import React, { useState } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import SecurityBlockedScreen from '../screens/SecurityBlockedScreen';

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// freerasp config. The watcherMail field is used by Talsec's remote
// dashboard to deliver incident notifications; if you don't have a
// Talsec account this can stay as a developer contact email and the
// local listeners still fire.
const TALSEC_CONFIG = {
  watcherMail: 'support@repmi.co.uk',
  androidConfig: {
    packageName: 'com.mixzs.repmi',
    // PLACEHOLDER — replace with the SHA-256 fingerprint of the
    // production release-signing keystore (see SECURITY_MANUAL_STEPS.md
    // → "1. Generate the production Android upload keystore"). The
    // empty list during dev means freerasp skips integrity checks; in
    // a production build the matching cert hash is required.
    certificateHashes: [],
  },
  iosConfig: {
    appBundleId: 'com.mixzs.repmi',
    appTeamId: 'TEAMID_PLACEHOLDER',
  },
  isProd: false,
};

// Real RASP gate. Only mounted in builds that actually contain the
// freerasp native module (dev client / standalone), never under Expo Go.
// `useFreeRasp` is pulled in lazily via require so freerasp's module graph
// is never evaluated in the Expo Go bundle.
function NativeThreatGate({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useFreeRasp } = require('freerasp-react-native');
  const [blocked, setBlocked] = useState<string | null>(null);

  // freerasp threat-event hooks. We only HARD-BLOCK on root/jailbreak;
  // debugger / emulator / hooks just log so dev builds aren't bricked.
  useFreeRasp(
    TALSEC_CONFIG,
    {
      privilegedAccess: () => setBlocked('Privileged access detected (root / jailbreak).'),
      // The debug/simulator events are routinely fired during development;
      // log them rather than blocking so engineers can use a debugger.
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
  // Expo Go can't load the freerasp native module — render children
  // directly so the app boots (no device-integrity gate, same as web).
  if (isExpoGo) return <>{children}</>;
  return <NativeThreatGate>{children}</NativeThreatGate>;
}
