# AttendTrack — GPS attendance (React Native + Supabase)

AttendTrack is a **React Native (Expo)** mobile client backed by **Supabase (Postgres)**. Authentication, GPS-backed check-in, weekly reports, and lecturer controls live in an isolated **`attendtrack`** schema with Row Level Security and RPCs.

**Primary delivery:** local **Android** APK builds (Android Studio / Gradle). No hosted cloud build service is required for the workflows documented here.

---

## Features

- **Students:** Sign up with **Student ID + contact email + password**; sign in with **email or Student ID** (server lookup).
- **Biometrics:** Optional **Face ID / fingerprint** quick unlock after a successful password login (device gate only; not a server credential).
- **Geofence:** **Server-side** attendance validation (Postgres RPC + class coordinates in the database).
- **Reports:** **14-week** analytics and **PDF export** (print + share).
- **Teaching staff:** From the student **Sign in** screen, open **Teaching staff sign-in** (`/staff/login`). JKUAT-centred map for the geofence, **open/close attendance registration** per week (server-enforced), and dashboard analytics.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| App | Expo SDK ~54, **expo-router** (file-based routes), TypeScript |
| UI | React Native 0.81, React 19 |
| Backend | Supabase Auth + Postgres (`attendtrack` schema) |
| Location / device | expo-location, expo-local-authentication, expo-secure-store |

---

## Prerequisites

- **Node.js 20+** (recommended)
- A **[Supabase](https://supabase.com)** project (Project URL + **anon** public API key)
- **All SQL migrations applied once**, in order (see [Database](#database-required-once))
- **Android builds:** Android Studio, **JDK 17+**, and `ANDROID_HOME` (or an SDK path Gradle can resolve)

---

## Environment variables

1. Copy [.env.example](.env.example) to `.env` in the project root.
2. Set:

| Variable | Description |
|----------|-------------|
| `ATTENDTRACK_SUPABASE_URL` | Supabase project URL (Project Settings → API) |
| `ATTENDTRACK_SUPABASE_ANON_KEY` | **Anon** JWT (not the service role key) |

These are loaded at dev/build time: [app.config.js](app.config.js) reads `.env` and exposes values under `expo.extra` for [src/lib/supabase.ts](src/lib/supabase.ts).

**Legacy:** If you still use `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, they are used only as a **fallback** when the `ATTENDTRACK_*` variables are unset. Prefer renaming to `ATTENDTRACK_*` and keep a single non-duplicate pair in `.env`.

**Supabase Auth:** For class demos, consider **disabling “Confirm email”** in Auth settings so sign-up yields an immediate session (the app expects that flow unless you add a “check your email” screen).

**Security note:** The anon key is embedded in the client binary, as usual for Supabase public apps. All sensitive rules belong in **RLS policies** and **SECURITY DEFINER** RPCs, not in the app.

---

## Database (required once)

In Supabase → **SQL Editor**, run each file **in the order below** (new query → paste → run). Skipping or reordering can cause missing tables/functions or broken staff routing.

| Order | File | Purpose |
|------:|------|---------|
| 1 | [supabase/migrations/20250512120000_attendtrack.sql](supabase/migrations/20250512120000_attendtrack.sql) | Base `attendtrack` schema: profiles, classes, attendance logs, RLS, core RPCs, demo class for week 1 |
| 2 | [supabase/migrations/20250512140001_attendtrack_registration_fix.sql](supabase/migrations/20250512140001_attendtrack_registration_fix.sql) | Sign-up trigger fixes + Student ID → email lookup for auth |
| 3 | [supabase/migrations/20250512150000_attendtrack_staff_lecturer.sql](supabase/migrations/20250512150000_attendtrack_staff_lecturer.sql) | Lecturer/staff profiles, unified signup trigger, staff RPCs for the dashboard |
| 4 | [supabase/migrations/20250512160000_attendtrack_attendance_period.sql](supabase/migrations/20250512160000_attendtrack_attendance_period.sql) | `attendance_period_open` on classes; updated `attendtrack_mark_attendance` + staff toggle RPC |
| 5 | [supabase/migrations/20250512170000_attendtrack_is_staff_rpc.sql](supabase/migrations/20250512170000_attendtrack_is_staff_rpc.sql) | `attendtrack_is_current_user_staff()` for post-login routing (requires staff tables from step 3) |
| 6 | [supabase/migrations/20250512180000_attendtrack_lecturer_staff_gate.sql](supabase/migrations/20250512180000_attendtrack_lecturer_staff_gate.sql) | Backfill `staff_profiles` for lecturer metadata; hardens `attendtrack_private_is_staff` |
| 7 | [supabase/migrations/20250512190000_attendtrack_staff_set_period_jsonb.sql](supabase/migrations/20250512190000_attendtrack_staff_set_period_jsonb.sql) | `attendtrack_staff_set_attendance_period(jsonb)` for PostgREST compatibility |

After step 4+, students can mark attendance only when **Registration open** is enabled for that week on the lecturer dashboard.

**Auth behaviour:** Registration uses the **contact email** in Supabase Auth. Sign-in accepts that **email** or **Student ID** via `attendtrack_lookup_auth_email` (and related helpers in the app).

**More weeks:** Add `course_classes` rows for additional weeks, or manage them through the staff dashboard where supported by your RPCs.

---

## App routes

| Route | Audience | Role |
|-------|------------|------|
| `/` | — | Resolves session → student or staff home |
| `/login`, `/register` | Students | Auth |
| `/checkin` | Students | GPS check-in against geofence |
| `/reports` | Students | Analytics + PDF |
| `/staff/login`, `/staff/register` | Teaching staff | Staff auth |
| `/staff/dashboard` | Teaching staff | Map, registration toggle, snapshot |

Root layout [app/_layout.tsx](app/_layout.tsx) sends unauthenticated users to `/login` or `/staff/login`, redirects **staff** away from student-only screens, and **students** away from `/staff/dashboard`.

---

## NPM scripts

| Script | Command | When to use |
|--------|---------|-------------|
| `npm run metro` | `expo start` | Dev: JS bundler / Expo dev UI |
| `npm run android:prebuild` | `expo prebuild --platform android` | Generate or refresh `android/` (first time or after native dependency changes) |
| `npm run android:install` | `expo run:android` | Debug install on emulator/device; starts Metro |
| `npm run build:apk` | `cd android && ./gradlew assembleRelease` | Release APK (requires existing `android/`) |
| `npm run android:apk` | same as `build:apk` | Alias |
| `npm run lint` | `expo lint` | ESLint |
| Typecheck | `npx tsc --noEmit` | Not in `package.json`; run before shipping |

---

## Local Android APK (primary workflow)

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure `.env`** with `ATTENDTRACK_SUPABASE_URL` and `ATTENDTRACK_SUPABASE_ANON_KEY`.

3. **Generate the native Android project** (once, or after native changes):

   ```bash
   npm run android:prebuild
   ```

4. **Debug install** (USB emulator or device; connects to Metro):

   ```bash
   npm run android:install
   ```

5. **Release APK** (after `android/` exists). Ensure `.env` is in the project root so config is embedded when JS is bundled.

   ```bash
   export JAVA_HOME=/path/to/jdk17
   export ANDROID_HOME=/path/to/Android/sdk
   npm run build:apk
   ```

   On macOS with Homebrew OpenJDK 17, `JAVA_HOME` is often `/opt/homebrew/opt/openjdk@17`.

**Output:** `android/app/build/outputs/apk/release/app-release.apk` (release build uses the **debug keystore** unless you configure release signing in Gradle).

Use **Android Studio → Build → Generate Signed App Bundle or APK** if you prefer UI-driven signing.

### Metro during development

```bash
npm run metro
```

Keep the emulator or device able to reach the dev machine when using debug flows that load from Metro.

---

## iOS and web (optional)

The project includes **iOS** location strings and **web** bundler settings in [app.config.js](app.config.js). This README targets **Android APK** workflows. For iOS, you can use `expo prebuild --platform ios` and `expo run:ios` once you have Xcode and signing set up. Web is mainly useful for quick UI checks; GPS and store behaviour differ from devices.

---

## Project layout

| Path | Role |
|------|------|
| [app/](app/) | Screens and routes (`login`, `register`, `checkin`, `reports`, `staff/*`) |
| [app.config.js](app.config.js) | Expo config; loads `.env` into `extra` for Supabase |
| [src/lib/supabase.ts](src/lib/supabase.ts) | Supabase client |
| [src/lib/supabaseSecureStorage.ts](src/lib/supabaseSecureStorage.ts) | Secure session storage adapter |
| [src/services/](src/services/) | Auth, attendance, staff dashboard helpers |
| [src/components/ui/](src/components/ui/) | Shared UI |
| [src/components/staff/](src/components/staff/) | Staff map picker (platform variants) |
| [src/theme/tokens.ts](src/theme/tokens.ts) | Design tokens |
| [supabase/migrations/](supabase/migrations/) | SQL to run in Supabase |

---

## Quality checks before submission

```bash
npm run lint
npx tsc --noEmit
```

A clean Android release build should end with **BUILD SUCCESSFUL**.

---

## Evaluation checklist (rubric)

- **Auth:** Register, login, logout; wrong password shows an error; session restores after restart.
- **GPS:** Deny permission → clear message; grant → coordinates are sent to `attendtrack_mark_attendance`.
- **Geofence:** Outside radius → server error with distance; inside → success; duplicate week → “already marked”.
- **Reports:** Summary and weekly grid match the database; pull-to-refresh reloads.
- **Biometrics:** Quick unlock only when a Supabase session already exists (device gate, not server-side biometrics).
- **Lecturer:** Staff sign-in → dashboard: JKUAT map, **Registration open** gates student check-in, analytics snapshot; migrations through `20250512190000` applied.

---

## Troubleshooting

- **“relation … does not exist” / RPC errors:** Re-run migrations **in order**; confirm you are on the correct Supabase project.
- **Staff always forbidden or wrong routing:** Ensure migrations **`20250512170000`** and **`20250512180000`** ran after staff tables exist; lecturer users need `staff_profiles` or `attendtrack_role=lecturer` in metadata as defined by your triggers.
- **Toggle registration fails with function not found:** Apply **`20250512190000`** so `attendtrack_staff_set_attendance_period(jsonb)` exists.
- **Blank Supabase config in builds:** `.env` must be at the repo root; avoid duplicate conflicting keys.

---

## Legacy Express/Mongo backend

This app does **not** use a separate Node/Mongo API. Business logic for AttendTrack lives in **Supabase** (`attendtrack` schema, RLS, and RPCs).

---

## Course

Mobile Computing — **SMA2418**
