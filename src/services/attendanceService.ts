import { ATTENDTRACK_SCHEMA, supabase } from '../lib/supabase';

export type MarkAttendanceResult = {
  ok: boolean;
  message?: string;
  error?: string;
  distance_m?: number;
  limit_m?: number;
  within_zone?: boolean;
  attendance?: Record<string, unknown>;
};

export type WeeklyRow = {
  week: number;
  status: string;
  markedAt: string | null;
  time: string;
};

export type ReportResult = {
  ok: boolean;
  summary?: {
    present: number;
    absent: number;
    rate: string;
    totalWeeks: number;
  };
  weeklyData?: WeeklyRow[];
  recentSessions?: unknown[];
  error?: string;
};

export async function markAttendance(
  weekNumber: number,
  latitude: number,
  longitude: number
): Promise<MarkAttendanceResult> {
  const { data, error } = await supabase.rpc('attendtrack_mark_attendance', {
    p_week: weekNumber,
    p_lat: latitude,
    p_lng: longitude,
  });
  if (error) {
    return { ok: false, error: 'rpc_error', message: error.message };
  }
  return (data ?? { ok: false }) as MarkAttendanceResult;
}

export async function getMyAttendanceReport(): Promise<ReportResult> {
  const { data, error } = await supabase.rpc('attendtrack_get_my_attendance_report');
  if (error) {
    return { ok: false, error: error.message };
  }
  const raw = (data ?? { ok: false }) as Record<string, unknown>;
  if (!raw.ok) return raw as ReportResult;
  const weekly = Array.isArray(raw.weeklyData)
    ? (raw.weeklyData as Record<string, unknown>[]).map((w) => ({
        week: Number(w.week),
        status: String(w.status ?? 'absent'),
        markedAt: (w.markedAt as string | null) ?? null,
        time: String(w.time ?? '—'),
      }))
    : [];
  return {
    ok: true,
    summary: raw.summary as ReportResult['summary'],
    weeklyData: weekly,
    recentSessions: (raw.recentSessions as unknown[]) ?? [],
  };
}

export async function fetchActiveClassForWeek(weekNumber: number) {
  const { data, error } = await supabase
    .schema(ATTENDTRACK_SCHEMA)
    .from('course_classes')
    .select('*')
    .eq('week_number', weekNumber)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data as {
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
    /** When false, server rejects mark until lecturer opens the period. */
    attendance_period_open?: boolean;
  } | null;
}
