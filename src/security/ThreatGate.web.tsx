// src/security/ThreatGate.web.tsx  (web build only)
//
// freerasp/Talsec is a native-only RASP library with no browser
// implementation, and a browser has no rooted/jailbroken-device threat
// model to defend against. The public web demo therefore skips the
// device-integrity gate and renders children directly. The full native
// app uses `ThreatGate.tsx`, which Metro selects on iOS/Android.

import React from 'react';

export default function ThreatGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
