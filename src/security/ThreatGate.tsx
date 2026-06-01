// src/security/ThreatGate.tsx  (native: iOS / Android)
//
// H9 — Runtime app self-protection (RASP) gate via freerasp/Talsec.
// This is the NATIVE implementation. The web build resolves
// `ThreatGate.web.tsx` instead (freerasp is a native-only library with
// no browser implementation, and a browser has no rooted-device threat
// model), so freerasp is never bundled for web.

import React, { useState } from 'react';
import { useFreeRasp } from 'freerasp-react-native';
import SecurityBlockedScreen from '../screens/SecurityBlockedScreen';

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

export default function ThreatGate({ children }: { children: React.ReactNode }) {
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
