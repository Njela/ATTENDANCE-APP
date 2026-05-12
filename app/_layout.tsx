import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../src/lib/supabase';
import { getPostLoginRoute } from '../src/services/authService';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;

    const hide = async () => {
      await SplashScreen.hideAsync();
    };
    void hide();

    const seg0 = segments[0];
    const seg1 = segments.at(1);
    if (seg0 === undefined || seg0 === 'index') return;

    const onStudentAuth = seg0 === 'login' || seg0 === 'register';
    const onStaffAuth = seg0 === 'staff' && (seg1 === 'login' || seg1 === 'register');
    const onAuth = onStudentAuth || onStaffAuth;

    let cancelled = false;

    if (!session) {
      if (onAuth) return;
      const target = seg0 === 'staff' ? '/staff/login' : '/login';
      router.replace(target);
      return;
    }

    void (async () => {
      const dest = await getPostLoginRoute();
      if (cancelled) return;
      const isStaffUser = dest === '/staff/dashboard';

      if (onAuth) {
        router.replace(dest);
        return;
      }

      if (isStaffUser && (seg0 === 'checkin' || seg0 === 'reports')) {
        router.replace('/staff/dashboard');
        return;
      }
      if (!isStaffUser && seg0 === 'staff' && seg1 === 'dashboard') {
        router.replace('/checkin');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, segments, router]);

  if (session === undefined) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="staff" options={{ headerShown: false }} />
        <Stack.Screen name="checkin" />
        <Stack.Screen name="reports" />
      </Stack>
    </SafeAreaProvider>
  );
}
