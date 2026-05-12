import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthError, Session } from '@supabase/supabase-js';
import { ATTENDTRACK_SCHEMA, supabase } from '../lib/supabase';
import { studentIdToAuthEmail } from '../utils/authEmail';

export type StudentProfile = {
  id: string;
  student_id: string;
  full_name: string;
  course: string;
  biometric_enabled: boolean;
};

export type StaffProfile = {
  id: string;
  full_name: string;
};

const BIOMETRIC_KEY = 'attendtrack_biometric_enabled';

/** Resolve login identifier to the email used in Supabase Auth. */
export async function resolveLoginEmail(identifier: string): Promise<string> {
  const s = identifier.trim();
  if (s.includes('@')) {
    return s.toLowerCase();
  }
  const { data, error } = await supabase.rpc('attendtrack_lookup_auth_email', {
    p_student_id: s,
  });
  if (!error && data && typeof data === 'string' && data.length > 0) {
    return data.toLowerCase();
  }
  return studentIdToAuthEmail(s);
}

export async function registerAccount(params: {
  studentId: string;
  name: string;
  contactEmail: string;
  password: string;
  course?: string;
}): Promise<{ session: Session; profile: StudentProfile }> {
  const email = params.contactEmail.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: params.password,
    options: {
      data: {
        attendtrack_student_id: params.studentId.trim().toUpperCase(),
        attendtrack_full_name: params.name.trim(),
        attendtrack_course: params.course?.trim() || 'Mobile Computing',
        attendtrack_contact_email: email,
      },
    },
  });
  if (error) throw error;
  if (!data.session) {
    throw new Error(
      'No session returned. In Supabase: Authentication → Providers → Email → disable “Confirm email” for class demos, or confirm your inbox.'
    );
  }
  const profile = await fetchProfile(data.session.user.id);
  if (!profile) {
    throw new Error(
      'Profile was not created. In Supabase SQL editor, run migration 20250512140001_attendtrack_registration_fix.sql.'
    );
  }
  return { session: data.session, profile };
}

export async function fetchIsStaff(userId: string, sessionHint?: Session | null): Promise<boolean> {
  const session = sessionHint ?? (await getSession());
  if (!session?.user?.id || session.user.id !== userId) {
    return false;
  }

  /** Lecturer sign-up sets this on the Auth user; use it so routing works even if a DB read fails. */
  const metaRole = session.user.user_metadata?.attendtrack_role;
  if (String(metaRole || '').toLowerCase() === 'lecturer') {
    return true;
  }

  const { data: rpcStaff, error: rpcError } = await supabase.rpc('attendtrack_is_current_user_staff');
  if (!rpcError && rpcStaff === true) {
    return true;
  }

  const { data, error } = await supabase
    .schema(ATTENDTRACK_SCHEMA)
    .from('staff_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('fetchIsStaff', error.message);
    return false;
  }
  return !!data;
}

export async function getPostLoginRoute(sessionHint?: Session | null): Promise<'/checkin' | '/staff/dashboard'> {
  const session = sessionHint ?? (await getSession());
  if (!session?.user?.id) return '/checkin';
  return (await fetchIsStaff(session.user.id, session)) ? '/staff/dashboard' : '/checkin';
}

export async function fetchStaffProfile(userId: string): Promise<StaffProfile | null> {
  const { data, error } = await supabase
    .schema(ATTENDTRACK_SCHEMA)
    .from('staff_profiles')
    .select('id, full_name')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('fetchStaffProfile', error.message);
    return null;
  }
  return data as StaffProfile | null;
}

export async function registerStaffAccount(params: {
  name: string;
  contactEmail: string;
  password: string;
}): Promise<Session> {
  const email = params.contactEmail.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: params.password,
    options: {
      data: {
        attendtrack_role: 'lecturer',
        attendtrack_full_name: params.name.trim(),
      },
    },
  });
  if (error) throw error;
  if (!data.session) {
    throw new Error(
      'No session returned. In Supabase: Authentication → Providers → Email → disable “Confirm email” for class demos, or confirm your inbox.'
    );
  }
  const staff = await fetchStaffProfile(data.session.user.id);
  if (!staff) {
    throw new Error(
      'Staff profile was not created. Run migration 20250512150000_attendtrack_staff_lecturer.sql in Supabase SQL editor.'
    );
  }
  return data.session;
}

export async function loginWithStudentId(studentId: string, password: string): Promise<Session> {
  const email = await resolveLoginEmail(studentId);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error('No session');
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    console.warn('refreshSession after login', refreshError.message);
    return data.session;
  }
  return refreshed.session ?? data.session;
}

export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(BIOMETRIC_KEY);
  await supabase.auth.signOut();
}

/** Alias for screens that still call `logout`. */
export const logout = signOut;

/** Alias for legacy `login` import; returns the session so callers can route without re-reading storage. */
export async function login(studentIdOrEmail: string, password: string): Promise<Session> {
  return loginWithStudentId(studentIdOrEmail, password);
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function fetchProfile(userId: string): Promise<StudentProfile | null> {
  const { data, error } = await supabase
    .schema(ATTENDTRACK_SCHEMA)
    .from('student_profiles')
    .select('id, student_id, full_name, course, biometric_enabled')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('fetchProfile', error.message);
    return null;
  }
  return data as StudentProfile | null;
}

/** Cached profile for UI (refreshed after login). */
export async function getStudent(): Promise<StudentProfile | null> {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return fetchProfile(session.user.id);
}

export async function setBiometricPreference(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_KEY, enabled ? 'true' : 'false');
  const session = await getSession();
  if (!session?.user?.id) return;
  await supabase
    .schema(ATTENDTRACK_SCHEMA)
    .from('student_profiles')
    .update({ biometric_enabled: enabled })
    .eq('id', session.user.id);
}

export async function getBiometricPreference(): Promise<boolean> {
  return (await AsyncStorage.getItem(BIOMETRIC_KEY)) === 'true';
}

export function mapAuthError(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = String((err as AuthError).message);
    const code = 'code' in err ? String((err as AuthError).code) : '';

    if (
      m.includes('student_id_already_registered') ||
      m.includes('attendtrack_profile_conflict') ||
      code === '23505'
    ) {
      return 'This Student ID is already registered, or this account already exists.';
    }
    if (m.includes('User already registered') || code === 'user_already_exists') {
      return 'An account with this email already exists. Sign in instead.';
    }
    if (m.includes('Invalid login credentials') || code === 'invalid_credentials') {
      return 'Invalid email (or Student ID) or password.';
    }
    if (m.includes('Database error saving new user')) {
      return 'Server rejected signup. Run migration 20250512140001_attendtrack_registration_fix.sql in Supabase, and use a normal email (e.g. Gmail) for registration.';
    }
    if (m.includes('Email rate limit') || code === 'over_email_send_rate_limit') {
      return 'Too many attempts. Wait a minute and try again.';
    }
    if (m.includes('Password')) {
      return m;
    }
    return m.length > 0 ? m : 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
