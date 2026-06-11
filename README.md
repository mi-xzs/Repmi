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

<!--
  All screenshots live in assets/screenshots/ as PNG.
  Mobile shots are tall portrait images, so they're sized with <img width="...">
  (plain ![](...) markdown can't resize them). Rule of thumb:
    • 3 phones per row → width="230"
    • 2 phones per row → width="260"
  The strip below is your 3 strongest shots; the feature tour further down
  pairs each feature with its own screenshots. Just export PNGs with the
  filenames referenced below and they'll appear automatically.
-->

<p align="center">
  <img src="assets/screenshots/home.png" width="230" alt="Home dashboard" />
  &nbsp;
  <img src="assets/screenshots/workout-live.png" width="230" alt="Live workout logging" />
  &nbsp;
  <img src="assets/screenshots/analytics-progression.png" width="230" alt="Progression analytics" />
</p>

## Features

### Home Dashboard
The Home Dashboard is centered around workout cards. These provide a quick visual summary of a workout as well as acting as the navigation point to launch the workout screen. The cards are grouped in several sections: **My Workouts** — containing the workouts a user creates themselves; **Imported Workouts** — routines imported from other users via a shareable link; and a **Favourites** tab which can encompass both for easy access.

The top header provides a quick profile summary highlighting the user's XP and level, alongside an optional water tracker which can be toggled off (or back on in settings).

Each workout card supports swipe actions — swipe left to delete, or right to generate a shareable link that anyone can use to import that workout into their Home Dashboard.

<p align="center">
  <img src="assets/screenshots/homescreen.png" width="230" alt="Home dashboard" />
  &nbsp;
  <img src="assets/screenshots/sharescreen.png" width="230" alt="Workout card swipe actions" />
  &nbsp;
  <img src="assets/screenshots/watertracker.png" width="230" alt="Profile header and water tracker" />
</p>

### Workout tracking - Create, Log and Track Workouts:

Tapping the + button opens the create a workout screen, where users are able to structure sessions using dedicated Warm-up/Cooldown and Main sections, or simply just the main sections.
Each section supports multiple tracking metrics to accommodate a wide range of exercises — including standard weight, bodyweight, timed, and distance-based movements.

Once saved, the workout appears as a workout card on the Home Dashboard. Tapping the card opens a read-only summary of the routine alongside a Start Workout button to begin the workout. During an active workout, users can tick off completed sets — with superset compatibility — and receive haptic feedback on each completion. Weight and exercise selection can also be adjusted on the fly to account for equipment availability or last-minute improvement or scale back.

Upon completion, users are prompted to log an **RPE (Rate of Perceived Exertion)** score. This feeds directly into analytics, giving users a visual record of their exertion over time — making it easy to identify when to push for progression or scale back intensity.

Furthermore, This is followed by an XP summary that awards XP across several factors including progression, consistency, and total volume. This also generates a shareable stat card — a saveable PNG designed to be overlaid on a progress photo and shared to social media.

<p align="center">
  <img src="assets/screenshots/emptyworkout.png" width="230" alt="Empty workout" />
  &nbsp;
  <img src="assets/screenshots/workout.png" width="230" alt="Workout" />
  &nbsp;
  <img src="assets/screenshots/workoutbottom.png" width="230" alt="Workout bottom" />
  &nbsp;
  <img src="assets/screenshots/createsection.png" width="230" alt="Create" />
  <img src="assets/screenshots/emptysection.png" width="230" alt="Create Section" />
  <img src="assets/screenshots/warmup.png" width="230" alt="Warm-up" />
  <img src="assets/screenshots/active.png" width="230" alt="Active workout" />
  <img src="assets/screenshots/change.png" width="230" alt="Weight" />
  <img src="assets/screenshots/rest.png" width="230" alt="Rest timer" />
  <img src="assets/screenshots/RPE.png" width="230" alt="RPE" />
  <img src="assets/screenshots/xpscreen.png" width="230" alt="xp screen" />
  <img src="assets/screenshots/Statcard.png" width="230" alt="Stats" />
</p>

### Analytics & progression

The Analytics section is split across three tabs — Workout, Weekly, and Overall. All of these give users a layered view of their training data from a per workout, weekly or an overall perspective.

Workout tab — Includes session statistics (count, duration, averages), an exercise progression chart with automatic personal-record detection, as well as support for all exercise types: weighted, bodyweight, timed, and distance. Each type has a dedicated chart — line charts for weight progression, stacked bar charts for bodyweight reps, and duration/distance bar charts for cardio-style movements. An estimated 1RM is calculated automatically for weighted exercises using the Epley formula.
An RPE chart visualises exertion over time, colour-coded by zones allowing users to visualise their exertion and when to scale up or down.

Weekly tab — The Weekly Tab is a digest of the current week. This highlights total sessions, time, sets, volume, and consistency against a target — alongside a muscle distribution chart and a workout breakdown identifying the top exercise and most-trained muscle group for that week. Allowing users to visually see how their regimens might change week from week.

Overall tab — all-time cumulative stats: total sessions, time, weight lifted, reps, and sets. Features a muscle distribution chart, a top-5 exercises by volume breakdown, an exercise frequency radar chart, as well as a streak calendar with full month navigation. Consistency is scored over a rolling 90-day window and users consistency goals.


<p align="center">
  <img src="assets/screenshots/workoutmain.png" width="230" alt="Workout tab" />
  &nbsp;
  <img src="assets/screenshots/prprogression.png" width="230" alt="PR" />
  &nbsp;
  <img src="assets/screenshots/workoutan.png" width="230" alt="Workout Analytic" />
  &nbsp;
  <img src="assets/screenshots/weekly.png" width="230" alt="Weekly tab" />
  <img src="assets/screenshots/weeklym.png" width="230" alt="Weekly metrics" />
  <img src="assets/screenshots/muscleweekly.png" width="230" alt="Muscle Dist" />
  <img src="assets/screenshots/radar.png" width="230" alt="Overall" />
  <img src="assets/screenshots/overallradar.png" width="230" alt="Overall chart" />
  <img src="assets/screenshots/consitency.png" width="230" alt="Consistency" />
</p>


### 🎮 Gamification
XP, levels, in-app coins, achievements, and streaks to drive retention — including an animated post-workout XP summary.

<p align="center">
  <img src="assets/screenshots/gamification-levelup.png" width="230" alt="XP & level-up summary" />
  &nbsp;
  <img src="assets/screenshots/gamification-achievements.png" width="230" alt="Achievements" />
  &nbsp;
  <img src="assets/screenshots/gamification-streak.png" width="230" alt="Streak calendar" />
</p>

### 👥 Social
User profiles, follow / follow-request flows with private-account support, and shareable workout cards (rendered to an image for sharing).

<p align="center">
  <img src="assets/screenshots/social-profile.png" width="260" alt="User profile" />
  &nbsp;
  <img src="assets/screenshots/social-sharecard.png" width="260" alt="Shareable workout card" />
</p>

### 🔐 Security & privacy first
MFA, biometric unlock, encrypted session storage, opt-in crash reporting, explicit health-data consent, and self-service account deletion. _(See [Security & Engineering Highlights](#-security--engineering-highlights) for the full breakdown.)_

<p align="center">
  <img src="assets/screenshots/security-mfa.png" width="260" alt="Multi-factor auth setup" />
  &nbsp;
  <img src="assets/screenshots/security-biometric.png" width="260" alt="Biometric app lock" />
</p>

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
