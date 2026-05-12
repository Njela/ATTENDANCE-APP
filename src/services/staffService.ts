import { supabase } from '../lib/supabase';

export type StaffCourseClass = {
  id: string;
  name: string;
  code: string;
  room: string;
  week_number: number;
  start_time: string;
  end_time: string;
  latitude: number;
  longitude: number;
  geofence_radius_m: number;
  is_active: boolean;
  attendance_period_open?: boolean;
};

export type WeekOverview = {
  week_number: number;
  present: number;
  absent: number;
  marked: number;
};

export type RecentMark = {
  id: string;
  week_number: number;
  status: string;
  marked_at: string | null;
  distance_m: number | null;
  student_id: string;
  student_name: string;
  class_name: string | null;
};

export async function staffListClasses(): Promise<{
  ok: boolean;
  classes?: StaffCourseClass[];
  error?: string;
}> {
  const { data, error } = await supabase.rpc('attendtrack_staff_list_classes');
  if (error) return { ok: false, error: error.message };
  const raw = (data ?? {}) as Record<string, unknown>;
  if (!raw.ok) return { ok: false, error: String(raw.error ?? 'unknown') };
  const arr = raw.classes;
  if (!Array.isArray(arr)) return { ok: true, classes: [] };
  return { ok: true, classes: arr as StaffCourseClass[] };
}

export async function staffUpsertClass(payload: Record<string, unknown>): Promise<{
  ok: boolean;
  error?: string;
}> {
  const { data, error } = await supabase.rpc('attendtrack_staff_upsert_class', {
    p: payload,
  });
  if (error) return { ok: false, error: error.message };
  const raw = (data ?? {}) as Record<string, unknown>;
  if (!raw.ok) return { ok: false, error: String(raw.error ?? 'unknown') };
  return { ok: true };
}

export async function staffSetWeekActive(
  week: number,
  active: boolean
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('attendtrack_staff_set_week_active', {
    p_week: week,
    p_active: active,
  });
  if (error) return { ok: false, error: error.message };
  const raw = (data ?? {}) as Record<string, unknown>;
  if (!raw.ok) return { ok: false, error: String(raw.error ?? 'unknown') };
  return { ok: true };
}

/** Let students mark GPS attendance for this week (or lock them out). */
export async function staffSetAttendancePeriod(
  week: number,
  open: boolean
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('attendtrack_staff_set_attendance_period', {
    p: { week_number: week, attendance_period_open: open },
  });
  if (error) return { ok: false, error: error.message };
  const raw = (data ?? {}) as Record<string, unknown>;
  if (!raw.ok) return { ok: false, error: String(raw.error ?? 'unknown') };
  return { ok: true };
}

export async function staffAttendanceOverview(): Promise<{
  ok: boolean;
  weeks?: WeekOverview[];
  recent?: RecentMark[];
  error?: string;
}> {
  const { data, error } = await supabase.rpc('attendtrack_staff_attendance_overview');
  if (error) return { ok: false, error: error.message };
  const raw = (data ?? {}) as Record<string, unknown>;
  if (!raw.ok) return { ok: false, error: String(raw.error ?? 'unknown') };
  const weeks = Array.isArray(raw.weeks) ? (raw.weeks as WeekOverview[]) : [];
  const recent = Array.isArray(raw.recent) ? (raw.recent as RecentMark[]) : [];
  return { ok: true, weeks, recent };
}
