/**
 * Native project + Metro read this file when you run the local tooling.
 * Supabase keys: set ATTENDTRACK_* in `.env` (see `.env.example`).
 */
const fs = require('fs');
const path = require('path');

(() => {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i <= 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = val;
      }
    }
  } catch {
    /* ignore */
  }
})();

module.exports = {
  expo: {
    name: 'AttendTrack',
    slug: 'attendtrack',
    version: '1.0.0',
    icon: './assets/images/icon.png',
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#1A3C8F',
    },
    plugins: [
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'AttendTrack uses your location to verify you are inside the classroom geofence.',
        },
      ],
      'expo-secure-store',
    ],
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'AttendTrack uses your location to verify you are inside the classroom geofence.',
      },
    },
    android: {
      package: 'com.khakasa.attendtrack',
      versionCode: 1,
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#1A3C8F',
      },
    },
    web: {
      bundler: 'metro',
      favicon: './assets/images/favicon.png',
    },
    extra: {
      supabaseUrl:
        process.env.ATTENDTRACK_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey:
        process.env.ATTENDTRACK_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};
