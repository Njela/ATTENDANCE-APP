# AttendTrack — GPS Student Attendance App (Frontend)

A cross-platform mobile app for GPS-based student attendance tracking built with React Native and Expo.

## Features
- Student ID/password and biometric (Face ID/fingerprint) login
- GPS geofencing — attendance only marked within classroom radius
- Real-time location detection and distance calculation
- 14-week semester attendance tracking
- Analytics reports with bar chart visualization
- PDF export functionality

## Tech Stack
- React Native + Expo
- Expo Router (file-based navigation)
- TypeScript
- Expo Location (GPS)
- Expo Local Authentication (biometrics)
- Axios (API calls)
- AsyncStorage (token storage)

## Screens
- **Login / Auth** — Student ID + password + biometric
- **GPS Check-in** — Map view, geofence, mark attendance
- **Reports & Analytics** — 14-week chart, sessions table, export

## Backend Repository
https://github.com/Njela/AttendTrack-Backend

## Setup
```bash
npm install
npx expo start
```

## Test Credentials
- Student ID: SCM211-0001/2022
- Password: password123

## Course
Mobile Computing — SMA2418
