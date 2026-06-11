<div align="center">

# Repmi

**Welcome to Repmi !**

A motivational workout tracker that introduces game-like elements to help users stay consistent, with a clear visual representation of their metrics.

**A production-grade mobile fitness tracker — workout logging, deep analytics, gamification, and social features — built with React Native, Expo, TypeScript, and Supabase.**

![React Native](https://img.shields.io/badge/React_Native-0.81-20232A?logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_+_RLS-3FCF8E?logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/license-Source--Available-lightgrey)




**Please visit this link to try the live demo: [Repmi](https://repmi.co.uk/)** &nbsp;·&nbsp;

To similute accuracy - Please try the web demo on a mobile phone. While the web demo is fully functional on desktop, viewing it on a mobile device is recommended for an experience that accurately reflects the intended design.

</div>

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

<details>
<summary>Creating a Workout</summary>
<br>
<p align="center">
  <img src="assets/screenshots/emptyworkout.png" width="230" alt="Empty workout" />
  &nbsp;
  <img src="assets/screenshots/create.png" width="230" alt="Empty workout" />
  &nbsp;
  <img src="assets/screenshots/createsection.png" width="230" alt="Create section" />
  &nbsp;
  <img src="assets/screenshots/emptysection.png" width="230" alt="Empty section" />
  &nbsp;
  <img src="assets/screenshots/warmup.png" width="230" alt="Warm-up" />
  <img src="assets/screenshots/workout.png" width="230" alt="Workout" />
  &nbsp;
  <img src="assets/screenshots/workoutbottom.png" width="230" alt="Workout bottom" />
</p>
</details>

<details>
<summary>Active Workout</summary>
<br>
<p align="center">
  <img src="assets/screenshots/active.png" width="230" alt="Active workout" />
  &nbsp;
  <img src="assets/screenshots/change.png" width="230" alt="Weight adjustment" />
  &nbsp;
  <img src="assets/screenshots/rest.png" width="230" alt="Rest timer" />
</p>
</details>

<details>
<summary>Post-Workout</summary>
<br>
<p align="center">
  <img src="assets/screenshots/RPE.png" width="230" alt="RPE" />
  &nbsp;
  <img src="assets/screenshots/xpscreen.png" width="230" alt="XP summary" />
  &nbsp;
  <img src="assets/screenshots/Statcard.png" width="230" alt="Stat card" />
</p>
</details>

### Analytics & progression

The Analytics section is split across three tabs — Workout, Weekly, and Overall. All of these give users a layered view of their training data from a per workout, weekly or an overall perspective.

Workout tab — Includes session statistics (count, duration, averages), an exercise progression chart with automatic personal-record detection, as well as support for all exercise types: weighted, bodyweight, timed, and distance. Each type has a dedicated chart — line charts for weight progression, stacked bar charts for bodyweight reps, and duration/distance bar charts for cardio-style movements. An estimated 1RM is calculated automatically for weighted exercises using the Epley formula.
An RPE chart visualises exertion over time, colour-coded by zones allowing users to visualise their exertion and when to scale up or down.

Weekly tab — The Weekly Tab is a digest of the current week. This highlights total sessions, time, sets, volume, and consistency against a target — alongside a muscle distribution chart and a workout breakdown identifying the top exercise and most-trained muscle group for that week. Allowing users to visually see how their regimens might change week from week.

Overall tab — all-time cumulative stats: total sessions, time, weight lifted, reps, and sets. Features a muscle distribution chart, a top-5 exercises by volume breakdown, an exercise frequency radar chart, as well as a streak calendar with full month navigation. Consistency is scored over a rolling 90-day window and users consistency goals.


<details>
<summary>Workout Tab</summary>
<br>
<p align="center">
  <img src="assets/screenshots/workoutmain.png" width="230" alt="Workout tab" />
  &nbsp;
  <img src="assets/screenshots/prprogression.png" width="230" alt="PR progression" />
  &nbsp;
  <img src="assets/screenshots/workoutan.png" width="230" alt="Workout analytics" />
</p>
</details>

<details>
<summary>Weekly Tab</summary>
<br>
<p align="center">
  <img src="assets/screenshots/weekly.png" width="230" alt="Weekly tab" />
  &nbsp;
  <img src="assets/screenshots/weeklym.png" width="230" alt="Weekly metrics" />
  &nbsp;
  <img src="assets/screenshots/muscleweekly.png" width="230" alt="Muscle distribution" />
</p>
</details>

<details>
<summary>Overall Tab</summary>
<br>
<p align="center">
  <img src="assets/screenshots/radar.png" width="230" alt="Overall" />
  &nbsp;
  <img src="assets/screenshots/overallradar.png" width="230" alt="Overall chart" />
  &nbsp;
  <img src="assets/screenshots/consitency.png" width="230" alt="Consistency" />
</p>
</details>


### Gamification - A game-like reward systemn to encourage motivation

Repmi uses a gamification system designed to visually reward consistency and progression.

XP & Levels — XP is earned at the end of every workout based on several factors: a base show-up bonus, total volume lifted, sets completed, session duration, and whether an RPE score was logged. This is furthered by an XP multiplier applied for maintaining streaks — ranging from 1.1x for a 2-day streak up to 2.0x for a 7-day streak. The XP system accumulates toward levels that are visually displayed on the users profile.

Achievements — Several unlockable achievements covering different target areas. This includes session milestones (1, 10, 50, 100 sessions), streak milestones (3, 7, 30 days), volume milestones (10K, 100K, 500K kg), as well as behavioural achievements such as Early Birds and Exercise Variety. Each achievement carries an XP reward and a rarity tier — Common through to Legendary — as well as a coin reward.

Coins — Are a secondary currency earned through workouts, achievements, level-ups, streak milestones, as well as weekly consistency bonuses. These are primarily spent to unlock cosmetic changes within the app.

Leaderboard — In order to encourage motivation, users are able to follow other users which adds them to their leaderboard. The leaderboard ranks all users by total XP (all-time) or XP earned in the last 7 days (weekly) - With an animated podium for the Top 3.

Roadmap — The app currently introduces a season-based progression system, allowing users to collect titles and badges that can be equipped on their profile. The icons are currently placeholders with plans to expand this to use custom-designed assets over time. The system is designed around rarity tiers, with the highest titles becoming increasingly difficult to obtain in order to drive competitiveness. The coin and cosmetics economy will also be expanded further to include custom themes, streak bonuses, XP boosters, and more.

<details>
<summary>Achievements</summary>
<br>
<p align="center">
  <img src="assets/screenshots/achieve.png" width="230" alt="Achievements tab" />
  &nbsp;
  <img src="assets/screenshots/obtained.png" width="230" alt="Obtained" />
  &nbsp;
  <img src="assets/screenshots/obtainedshow.png" width="230" alt="Obtained see more" />
  &nbsp;
  <img src="assets/screenshots/obtainedzoom.png" width="230" alt="Obtained zoom" />
  &nbsp;
  <img src="assets/screenshots/locked.png" width="230" alt="Locked" />
</p>
</details>

<details>
<summary>Season & Titles</summary>
<br>
<p align="center">
  <img src="assets/screenshots/season.png" width="230" alt="Season" />
  &nbsp;
  <img src="assets/screenshots/titles.png" width="230" alt="Titles" />
  &nbsp;
  <img src="assets/screenshots/store.png" width="230" alt="Store" />
</p>
</details>

<details>
<summary>Leaderboard & Social</summary>
<br>
<p align="center">
  <img src="assets/screenshots/leaderboard.png" width="230" alt="Leaderboard" />
  &nbsp;
  <img src="assets/screenshots/standings.png" width="230" alt="Standings" />
  &nbsp;
  <img src="assets/screenshots/add.png" width="230" alt="Add user" />
  &nbsp;
  <img src="assets/screenshots/profile.png" width="230" alt="Profile" />
</p>
</details>

### Profile
User profiles, follow / follow-request flows with private-account support.

<details>
<summary>👤 Profile</summary>
<br>
<p align="center">
  <img src="assets/screenshots/profilexample.png" width="260" alt="User profile" />
  &nbsp;
  <img src="assets/screenshots/profilebottom.png" width="260" alt="Profile bottom" />
</p>
</details>


## Tech Stack

| Layer | Technology |
|---|---|
| **Language** | TypeScript (strict mode) |
| **Framework** | React Native 0.81 + Expo SDK 54 — iOS, Android & Web |
| **Navigation** | React Navigation (native-stack + bottom-tabs) |
| **State** | 6 React Context providers with offline-aware Zod-validated local cache |
| **Backend** | Supabase — Postgres, Auth (MFA/TOTP), Row-Level Security, versioned SQL migrations |
| **Validation** | Zod — workout & session payloads + cached data |
| **Animation** | Reanimated + Worklets, react-native-svg, expo-linear-gradient |
| **Security** | freerasp (RASP), expo-local-authentication, expo-secure-store, expo-screen-capture |
| **Observability** | Sentry (opt-in, privacy-gated) |
| **Tooling** | ESLint, Prettier, EAS Build (CI/CD) |

## Architecture

<p align="center">
  <img src="assets/architecture.svg" alt="Repmi system architecture — a React Native (Expo) client with a native RASP gate, biometric/screen-capture device security, a Zod-validated service layer and an encrypted offline cache, talking to Supabase over HTTPS with the anon key only; Supabase enforces RLS, MFA/TOTP, audit logging, rate limiting, JSONB guards and versioned migrations." width="780" />
</p>

- **Service layer** isolates backend access; screens never call Supabase directly for data (only auth flows use the client SDK directly).
- **Row-Level Security is the access boundary** — the app ships only the public *anon* key; the database enforces who can read/write each row.
- **Offline-aware** — a secure local cache (encrypted on native , validated with Zod) keeps the app responsive and resilient.

## Security Highlights

This is what sets Repmi apart from a typical portfolio app:

- **Row-Level Security (RLS)** — every table is protected by Postgres RLS policies; access control lives in the database, not just the client.
- **Multi-factor authentication (TOTP)** — enrolment with QR + manual secret, challenge on sign-in, and **screen-capture prevention** while the secret is visible.
- **Biometric app lock** — Face ID / fingerprint gate on foreground via `expo-local-authentication`.
- **Encrypted session storage** — auth tokens stored in the platform secure store (iOS Keychain / Android EncryptedSharedPreferences) on native, not plain `AsyncStorage`.
- **Runtime app self-protection (RASP)** — `freerasp` detects root/jailbreak and blocks the app on compromised devices.
- **Audit logging & rate limiting** — sensitive actions are logged; abuse-prone endpoints (e.g. username checks) are rate-limited at the DB layer.
- **Input validation & moderation** — Zod schemas validate the workout & session payloads sent to Supabase; profanity/content filtering on user-generated text.
- **Privacy by design** — crash reporting is **opt-in only**, explicit health-data consent screen, and a full account-deletion flow.
- **Log redaction** — the logger/observability layer scrubs passwords, tokens, and auth headers before anything is recorded.

## Project Structure

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

## Running Locally

**Prerequisites:** Node 18+, [Expo CLI](https://docs.expo.dev/), and a free [Supabase](https://supabase.com/) project.

```bash
git clone https://github.com/mi-xzs/repmi.git && cd repmi
npm install
cp .env.example .env      # add your Supabase URL + anon key
supabase db push          # apply schema (migrations in supabase/migrations)
npm run web               # or: npm run ios / npm run android
```

> Native modules (secure store, biometrics, RASP) need a **dev build**, not Expo Go — the `ios`/`android` scripts handle that.

## Roadmap

- [ ] iOS release (TestFlight)
- [ ] Custom Asset badges- Themes, icons covers
- [ ] Futher earnable coin uses - Xp boosters, Streak Freeze..etc
- [ ] Apple Health / Google Fit integration
- [ ] Workout templates & program builder
- [ ] Workout scan from other media conversion 
- [ ] Expanded social feed

## 📄 License

This project is **source-available for viewing and evaluation only** — see [`LICENSE`](./LICENSE).
You're welcome to read and run it locally to assess it; it is not open-source and may not
be reused or redistributed. For inquiries: `legal@repmi.co.uk`.




