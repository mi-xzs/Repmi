<div align="center">

# 🏋️ Repmi

**A production-grade mobile fitness tracker — workout logging, deep analytics, gamification, and social features — built with React Native, Expo, TypeScript, and Supabase.**

![React Native](https://img.shields.io/badge/React_Native-0.81-20232A?logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_+_RLS-3FCF8E?logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/license-Source--Available-lightgrey)

<!-- TODO: once deployed, turn these into real links -->
**[🌐 Live Web Demo](#)** &nbsp;·&nbsp; **[📱 Download APK](#)** &nbsp;·&nbsp; **[🎬 Demo Video](#)**

</div>

---

> **Note for reviewers:** Repmi is a complete, real-world application — not a tutorial project.
> It ships with Supabase Row-Level Security, multi-factor auth, biometric locking,
> runtime app-shielding (RASP), audit logging, and rate limiting. The
> [Security & Engineering Highlights](#-security--engineering-highlights) section is the
> best place to gauge engineering depth.

## 📸 Screenshots

<!-- TODO: drop PNGs into assets/screenshots/ and update the paths below.
     Suggested shots: login, home/workout, live workout logging, analytics
     dashboard, achievements, profile. iOS + Android both look great. -->

| Workout logging | Analytics | Gamification | Profile |
|:---:|:---:|:---:|:---:|
| _coming soon_ | _coming soon_ | _coming soon_ | _coming soon_ |

## ✨ Features

- **Workout tracking** — Build structured sessions with warm-up / main / cooldown phases, log sets, reps, weight, distance, duration, and **RPE** (rate of perceived exertion); built-in rest timer and a searchable exercise catalogue.
- **Analytics & progression** — Weight/distance/duration progression charts, muscle-volume breakdowns, radar charts, training heatmaps, streak calendars, and automatic **personal-record detection**.
- **Gamification** — XP, levels, in-app coins, achievements, and streaks to drive retention, with an animated post-workout XP summary.
- **Social** — User profiles, follow / follow-request flows with private-account support, and shareable workout cards (rendered to an image for sharing).
- **Security & privacy first** — MFA, biometric unlock, encrypted session storage, opt-in crash reporting, explicit health-data consent, and self-service account deletion.

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Language** | TypeScript |
| **Framework** | React Native (0.81) + Expo (SDK 54) |
| **Navigation** | React Navigation (native-stack + bottom-tabs) |
| **State** | React Context providers (Auth, Profile, Settings, Workout, XP, Coins) |
| **Backend** | Supabase — Postgres, Auth, Row-Level Security, SQL migrations |
| **Validation** | Zod schemas (payloads + cached data) |
| **Animation** | Reanimated + Worklets |
| **Security** | freerasp (RASP), expo-local-authentication, expo-secure-store, expo-screen-capture |
| **Observability** | Sentry (opt-in, privacy-gated) |
| **Tooling** | ESLint, Prettier, TypeScript strict, EAS Build |

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  React Native client (Expo)                              │
│                                                          │
│  Screens ── Navigation ── Context providers (state)      │
│      │                          │                        │
│      └──────── Services ────────┘                        │
│         (auth, workouts, profile, settings, moderation,  │
│          observability …) — Zod-validated payloads       │
└───────────────────────────┬─────────────────────────────┘
                            │  HTTPS (anon key)
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase                                                │
│  Postgres + Row-Level Security  ·  Auth (+ MFA/TOTP)     │
│  Audit log  ·  Rate limiting  ·  JSONB constraints       │
│  Versioned SQL migrations (supabase/migrations/)         │
└─────────────────────────────────────────────────────────┘
```

- **Service layer** isolates all backend access; screens never call Supabase directly.
- **Row-Level Security is the access boundary** — the app ships only the public *anon* key; the database enforces who can read/write each row.
- **Offline-aware** — a secure local cache (validated with Zod) keeps the app responsive and resilient.

## 🔐 Security & Engineering Highlights

This is what sets Repmi apart from a typical portfolio app:

- **Row-Level Security (RLS)** — every table is protected by Postgres RLS policies; access control lives in the database, not just the client.
- **Multi-factor authentication (TOTP)** — enrolment with QR + manual secret, challenge on sign-in, and **screen-capture prevention** while the secret is visible.
- **Biometric app lock** — Face ID / fingerprint gate on foreground via `expo-local-authentication`.
- **Encrypted session storage** — auth tokens stored in the platform secure store (iOS Keychain / Android EncryptedSharedPreferences), never plain `AsyncStorage`.
- **Runtime app self-protection (RASP)** — `freerasp` detects root/jailbreak and integrity tampering and blocks the app on compromised devices.
- **Audit logging & rate limiting** — sensitive actions are logged; abuse-prone endpoints (e.g. username checks) are rate-limited at the DB layer.
- **Input validation & moderation** — Zod schemas validate all payloads; profanity/content filtering on user-generated text.
- **Privacy by design** — crash reporting is **opt-in only**, explicit health-data consent screen, and a full account-deletion flow.
- **Log redaction** — the logger/observability layer scrubs passwords, tokens, and auth headers before anything is recorded.

## 📁 Project Structure

```
src/
├── screens/            App screens (auth, workout, analytics, profile, MFA …)
├── navigation/         React Navigation stacks & tabs
├── components/
│   ├── ui/             Reusable UI primitives
│   ├── features/       Feature components (workout builder, share card …)
│   ├── analytics/      Charts & progression visualisations
│   └── headers/        Screen headers
├── services/           Backend access, auth, security, observability
├── hooks/              Custom React hooks
├── theme/              Colours, typography, spacing
├── types/              Shared TypeScript types
├── constants/          Exercise catalogue & static data
└── utils/              Helpers (PR detection, validation …)
supabase/
└── migrations/         Versioned SQL: schema, RLS policies, audit log, rate limits
```

## 🚀 Running Locally

**Prerequisites:** Node.js 18+, the [Expo CLI](https://docs.expo.dev/), and a free [Supabase](https://supabase.com/) project. For native builds: Android Studio (Android) and/or Xcode (iOS, macOS only).

```bash
# 1. Clone
git clone https://github.com/mi-xzs/repmi.git
cd repmi

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
#   then fill in your Supabase URL + anon key (and optional Sentry DSN)

# 4. Apply the database schema to your Supabase project
#    (uses the Supabase CLI; migrations live in supabase/migrations)
supabase db push

# 5. Run it
npm start          # Expo dev server (scan QR with a dev build)
# or target a platform:
npm run ios        # iOS simulator (macOS)
npm run android    # Android emulator/device
npm run web        # web build in the browser
```

> Repmi uses native modules (secure store, biometrics, RASP), so it requires a
> **development build** rather than Expo Go. `npm run ios` / `npm run android`
> handle this automatically.

**Quality scripts:** `npm run typecheck` · `npm run lint` · `npm run format`

## 🗺️ Roadmap

- [ ] Public web demo + downloadable Android build
- [ ] iOS release (TestFlight)
- [ ] Apple Health / Google Fit integration
- [ ] Workout templates & program builder
- [ ] Expanded social feed

## 📄 License

This project is **source-available for viewing and evaluation only** — see [`LICENSE`](./LICENSE).
You're welcome to read and run it locally to assess it; it is not open-source and may not
be reused or redistributed. For inquiries: `legal@repmi.co.uk`.

---

<div align="center">
Built by <strong>Repmi Studio</strong> · <a href="https://github.com/mi-xzs">GitHub</a>
<!-- TODO: add LinkedIn + portfolio links -->
</div>
