# AttendTrack — GPS attendance (React Native Android + Supabase)

Mobile client and **Supabase (Postgres)** backend. Auth, GPS checks, and reports use an isolated `attendtrack` schema. **Distribution is local APK builds** on your machine (Android Studio / Gradle). No cloud build service is required for this repo.

## Features

- Sign up with **Student ID + contact email + password**; sign in with **email or Student ID**
- Optional **Face ID / fingerprint** quick unlock after first password login
- **Server-side geofence** when marking attendance (Postgres RPC + class coordinates from the database)
- **14-week** analytics and **PDF export** (print + share)
- **Lecturer portal** (student sign-in screen → **Teaching staff sign-in**, route `/staff/login`): JKUAT-centred map for the geofence, **open/close attendance registration** (server-enforced), analytics snapshot (migrations `20250512150000` + `20250512160000`)

## Prerequisites

- Node 20+ recommended
- [Supabase](https://supabase.com) project (URL + anon key)
- **Apply the SQL migrations** once (see below)
- **Android:** Android Studio, JDK 17+, `ANDROID_HOME` (or Android SDK path Gradle can see)

## Environment

Copy [.env.example](.env.example) to `.env` and set:

- `ATTENDTRACK_SUPABASE_URL` — project URL  
- `ATTENDTRACK_SUPABASE_ANON_KEY` — **anon** JWT from Supabase → Project Settings → API  

These are read when the native project is generated / when Metro bundles the app (via `app.config.js` → `extra`). If you still have legacy `EXPO_PUBLIC_SUPABASE_*` keys in `.env`, they are used only as a fallback until you rename them.

In Supabase Auth settings, **disable “Confirm email”** for class demos unless you want email confirmation (the app expects an immediate session after sign-up).

## Database (required once)

1. Open Supabase → **SQL Editor** → New query.
2. Paste and run [supabase/migrations/20250512120000_attendtrack.sql](supabase/migrations/20250512120000_attendtrack.sql) (base schema).
3. Paste and run [supabase/migrations/20250512140001_attendtrack_registration_fix.sql](supabase/migrations/20250512140001_attendtrack_registration_fix.sql) (signup trigger + Student ID → email lookup).
4. Paste and run [supabase/migrations/20250512150000_attendtrack_staff_lecturer.sql](supabase/migrations/20250512150000_attendtrack_staff_lecturer.sql) (lecturer profiles, unified signup trigger, staff RPCs for the dashboard).
5. Paste and run [supabase/migrations/20250512160000_attendtrack_attendance_period.sql](supabase/migrations/20250512160000_attendtrack_attendance_period.sql) (`attendance_period_open` on classes + updated `attendtrack_mark_attendance` + staff toggle RPC).

This creates schema `attendtrack`, tables `student_profiles`, `course_classes`, `attendance_logs`, optional `staff_profiles`, RLS, RPCs `attendtrack_mark_attendance` and `attendtrack_get_my_attendance_report`, staff RPCs (`attendtrack_staff_*`), an auth trigger for student and lecturer profiles, and a **demo class for week 1**. Add more `course_classes` rows for other weeks as needed (or use **Teaching staff sign-in** after steps 4–5).

**Lecturer access:** On the student **Sign in** screen, tap **Teaching staff sign-in** (`/staff/login`). Register there or sign in with the same work email and password. After migration `20250512160000`, students can only mark attendance when **Registration open** is enabled for that week on the lecturer dashboard.

**Auth:** Registration uses your **contact email** in Supabase Auth. You can sign in with that **email** or your **Student ID** (`attendtrack_lookup_auth_email`).

## Local Android APK (primary workflow)

1. Install JS dependencies: `npm install`
2. Ensure `.env` has `ATTENDTRACK_SUPABASE_*` set.
3. Generate the `android/` native project (once, or after native dependency changes):

```bash
npm run android:prebuild
```

4. **Debug install** (USB emulator or device, starts Metro):

```bash
npm run android:install
```

5. **Release APK** (after `android/` exists), using your machine’s JDK 17+ and Android SDK. Ensure `.env` is present in the project root so Metro can embed Supabase config when Gradle bundles JS:

```bash
export JAVA_HOME=/path/to/jdk17   # e.g. macOS Homebrew: /opt/homebrew/opt/openjdk@17
export ANDROID_HOME=/path/to/Android/sdk
npm run build:apk
```

(`build:apk` and `android:apk` are the same: `cd android && ./gradlew assembleRelease`.)

**Output:** `android/app/build/outputs/apk/release/app-release.apk` (release build; signing uses the debug keystore unless you configure release signing in Gradle).

A clean run should end with **BUILD SUCCESSFUL**. `npx tsc --noEmit` and `npm run lint` should pass before you ship.

Use Android Studio → **Build → Generate Signed App Bundle or APK** if you prefer UI-driven signing.

### Metro (JavaScript bundler) during development

```bash
npm run metro
```

Connect the device/emulator so the install step can reach the bundler when you use debug flows.

## Technical note (dependencies)

The repo uses **React Native** with a set of **Expo-maintained npm packages** (for example file-based routes, location, secure storage, printing). That is an implementation detail of the libraries: **your workflow here is local Gradle APKs**, not a hosted app store pipeline bundled with this documentation.

## Project layout

| Path | Role |
|------|------|
| `app/` | Screens and routes (`login`, `register`, `checkin`, `reports`, `staff/*`) |
| `app.config.js` | Native app metadata + passes Supabase keys from `.env` into the binary |
| `src/lib/supabase.ts` | Supabase client |
| `src/services/` | Auth, attendance RPC helpers, staff dashboard helpers |
| `src/components/ui/` | Shared UI |
| `supabase/migrations/` | SQL to apply in Supabase |

## Evaluation checklist (rubric)

- **Auth:** Register, login, logout; wrong password shows an error; session restores after restart.
- **GPS:** Deny permission → clear message; grant → coordinates are sent to `attendtrack_mark_attendance`.
- **Geofence:** Outside radius → server error with distance; inside → success; duplicate week → “already marked”.
- **Reports:** Summary and weekly grid match the database; pull-to-refresh reloads.
- **Biometrics:** Quick unlock only works when a Supabase session already exists (device gate, not server-side biometrics).
- **Lecturer:** After migrations `20250512150000` and `20250512160000`, staff sign-in → dashboard: map pin on JKUAT, **Registration open** gates student check-in, analytics snapshot at top.

## Legacy Express/Mongo backend

A separate Node/Mongo API is **not** used by this app. Backend logic for AttendTrack lives in Supabase (`attendtrack` schema + RPCs).

## `.env` hygiene

Keep a single `ATTENDTRACK_SUPABASE_URL` and `ATTENDTRACK_SUPABASE_ANON_KEY`. Remove duplicate lines so the value resolved at build time is unambiguous.

## Course

Mobile Computing — SMA2418
