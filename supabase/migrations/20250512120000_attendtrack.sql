-- AttendTrack: isolated schema (coexists with other tables in the same Supabase project)
-- Apply: Supabase Dashboard → SQL → paste and run, or `supabase db push` if CLI is linked.

CREATE SCHEMA IF NOT EXISTS attendtrack;

GRANT USAGE ON SCHEMA attendtrack TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS attendtrack.student_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  student_id text NOT NULL UNIQUE,
  full_name text NOT NULL,
  course text NOT NULL DEFAULT 'Mobile Computing',
  biometric_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendtrack.course_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  room text NOT NULL,
  week_number integer NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  geofence_radius_m integer NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_classes_week_number_key UNIQUE (week_number)
);

CREATE TABLE IF NOT EXISTS attendtrack.attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES attendtrack.course_classes (id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  status text NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'absent')),
  marked_at timestamptz,
  lat double precision,
  lng double precision,
  distance_m integer,
  within_geofence boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_logs_user_class_week_key UNIQUE (user_id, class_id, week_number)
);

CREATE INDEX IF NOT EXISTS attendance_logs_user_id_idx
  ON attendtrack.attendance_logs (user_id);

CREATE INDEX IF NOT EXISTS attendance_logs_marked_at_idx
  ON attendtrack.attendance_logs (marked_at DESC);

CREATE OR REPLACE FUNCTION attendtrack.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_profiles_set_updated_at ON attendtrack.student_profiles;
CREATE TRIGGER student_profiles_set_updated_at
  BEFORE UPDATE ON attendtrack.student_profiles
  FOR EACH ROW EXECUTE FUNCTION attendtrack.set_updated_at();

DROP TRIGGER IF EXISTS course_classes_set_updated_at ON attendtrack.course_classes;
CREATE TRIGGER course_classes_set_updated_at
  BEFORE UPDATE ON attendtrack.course_classes
  FOR EACH ROW EXECUTE FUNCTION attendtrack.set_updated_at();

DROP TRIGGER IF EXISTS attendance_logs_set_updated_at ON attendtrack.attendance_logs;
CREATE TRIGGER attendance_logs_set_updated_at
  BEFORE UPDATE ON attendtrack.attendance_logs
  FOR EACH ROW EXECUTE FUNCTION attendtrack.set_updated_at();

CREATE OR REPLACE FUNCTION public.attendtrack_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = attendtrack, public
AS $$
BEGIN
  IF NEW.raw_user_meta_data IS NOT NULL
     AND (NEW.raw_user_meta_data ? 'attendtrack_student_id') THEN
    INSERT INTO attendtrack.student_profiles (id, student_id, full_name, course)
    VALUES (
      NEW.id,
      upper(trim(NEW.raw_user_meta_data->>'attendtrack_student_id')),
      coalesce(nullif(trim(NEW.raw_user_meta_data->>'attendtrack_full_name'), ''), 'Student'),
      coalesce(
        nullif(trim(NEW.raw_user_meta_data->>'attendtrack_course'), ''),
        'Mobile Computing'
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'student_id_already_registered';
END;
$$;

DROP TRIGGER IF EXISTS attendtrack_on_auth_user_created ON auth.users;
CREATE TRIGGER attendtrack_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.attendtrack_auth_user_created();

ALTER TABLE attendtrack.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendtrack.course_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendtrack.attendance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendtrack_profiles_select_own" ON attendtrack.student_profiles;
CREATE POLICY "attendtrack_profiles_select_own"
  ON attendtrack.student_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "attendtrack_profiles_update_own" ON attendtrack.student_profiles;
CREATE POLICY "attendtrack_profiles_update_own"
  ON attendtrack.student_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "attendtrack_classes_select_auth" ON attendtrack.course_classes;
CREATE POLICY "attendtrack_classes_select_auth"
  ON attendtrack.course_classes FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "attendtrack_attendance_select_own" ON attendtrack.attendance_logs;
CREATE POLICY "attendtrack_attendance_select_own"
  ON attendtrack.attendance_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, UPDATE ON attendtrack.student_profiles TO authenticated;
GRANT SELECT ON attendtrack.course_classes TO authenticated;
GRANT SELECT ON attendtrack.attendance_logs TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA attendtrack TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA attendtrack TO service_role;

CREATE OR REPLACE FUNCTION public.attendtrack_mark_attendance(
  p_week integer,
  p_lat double precision,
  p_lng double precision
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = attendtrack, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_class attendtrack.course_classes%ROWTYPE;
  v_dist double precision;
  v_existing attendtrack.attendance_logs%ROWTYPE;
  v_row attendtrack.attendance_logs%ROWTYPE;
  r_earth constant double precision := 6371000;
  v_cos double precision;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_week IS NULL OR p_week < 1 OR p_week > 52 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_week');
  END IF;

  SELECT * INTO v_class
  FROM attendtrack.course_classes c
  WHERE c.week_number = p_week AND c.is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'no_active_class',
      'message', 'No active class found for this week'
    );
  END IF;

  v_cos :=
    cos(radians(p_lat)) * cos(radians(v_class.latitude)) *
    cos(radians(v_class.longitude) - radians(p_lng)) +
    sin(radians(p_lat)) * sin(radians(v_class.latitude));
  v_cos := LEAST(1.0::double precision, GREATEST(-1.0::double precision, v_cos));
  v_dist := r_earth * acos(v_cos);

  IF v_dist > v_class.geofence_radius_m THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'outside_geofence',
      'message', format('You are %sm away. Must be within %sm.', round(v_dist)::int, v_class.geofence_radius_m),
      'distance_m', round(v_dist)::int,
      'limit_m', v_class.geofence_radius_m,
      'within_zone', false
    );
  END IF;

  SELECT * INTO v_existing
  FROM attendtrack.attendance_logs a
  WHERE a.user_id = v_uid AND a.class_id = v_class.id AND a.week_number = p_week;

  IF FOUND AND v_existing.status = 'present' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'already_marked',
      'message', 'Attendance already marked for this week',
      'attendance', to_jsonb(v_existing)
    );
  END IF;

  INSERT INTO attendtrack.attendance_logs (
    user_id, class_id, week_number, status, marked_at, lat, lng, distance_m, within_geofence
  )
  VALUES (
    v_uid, v_class.id, p_week, 'present', now(), p_lat, p_lng,
    round(v_dist)::int, true
  )
  ON CONFLICT (user_id, class_id, week_number)
  DO UPDATE SET
    status = 'present',
    marked_at = now(),
    lat = excluded.lat,
    lng = excluded.lng,
    distance_m = excluded.distance_m,
    within_geofence = true,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Attendance marked successfully',
    'distance_m', round(v_dist)::int,
    'within_zone', true,
    'attendance', to_jsonb(v_row)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.attendtrack_mark_attendance(integer, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendtrack_mark_attendance(integer, double precision, double precision) TO authenticated;

CREATE OR REPLACE FUNCTION public.attendtrack_get_my_attendance_report()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = attendtrack, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total_weeks constant integer := 14;
  v_present integer;
  v_absent integer;
  v_rate text;
  v_weekly jsonb;
  v_recent jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT count(*)::integer INTO v_present
  FROM attendtrack.attendance_logs a
  WHERE a.user_id = v_uid AND a.status = 'present';

  v_absent := v_total_weeks - coalesce(v_present, 0);
  v_rate := to_char(
    CASE WHEN v_total_weeks = 0 THEN 0::numeric
         ELSE (coalesce(v_present, 0)::numeric / v_total_weeks::numeric) * 100 END,
    'FM990.0'
  );

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'week', wk.week_num,
        'status', coalesce(a.status, 'absent'),
        'markedAt', a.marked_at,
        'time', CASE
          WHEN a.marked_at IS NULL THEN '—'
          ELSE to_char(a.marked_at AT TIME ZONE 'UTC', 'HH12:MI AM')
        END
      )
      ORDER BY wk.week_num
    ),
    '[]'::jsonb
  )
  INTO v_weekly
  FROM generate_series(1, v_total_weeks) AS wk(week_num)
  LEFT JOIN LATERAL (
    SELECT al.status, al.marked_at
    FROM attendtrack.attendance_logs al
    WHERE al.user_id = v_uid AND al.week_number = wk.week_num
    ORDER BY al.marked_at DESC NULLS LAST
    LIMIT 1
  ) a ON true;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'week_number', q.week_number,
        'status', q.status,
        'marked_at', q.marked_at,
        'distance_m', q.distance_m,
        'within_geofence', q.within_geofence,
        'class', q.class_json
      )
      ORDER BY q.marked_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_recent
  FROM (
    SELECT
      a.id,
      a.week_number,
      a.status,
      a.marked_at,
      a.distance_m,
      a.within_geofence,
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'code', c.code,
        'room', c.room,
        'week_number', c.week_number
      ) AS class_json
    FROM attendtrack.attendance_logs a
    LEFT JOIN attendtrack.course_classes c ON c.id = a.class_id
    WHERE a.user_id = v_uid AND a.marked_at IS NOT NULL
    ORDER BY a.marked_at DESC
    LIMIT 5
  ) q;

  RETURN jsonb_build_object(
    'ok', true,
    'summary', jsonb_build_object(
      'present', coalesce(v_present, 0),
      'absent', greatest(v_absent, 0),
      'rate', v_rate,
      'totalWeeks', v_total_weeks
    ),
    'weeklyData', coalesce(v_weekly, '[]'::jsonb),
    'recentSessions', coalesce(v_recent, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.attendtrack_get_my_attendance_report() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendtrack_get_my_attendance_report() TO authenticated;

INSERT INTO attendtrack.course_classes (
  name, code, room, week_number, start_time, end_time,
  latitude, longitude, geofence_radius_m, is_active
)
VALUES (
  'Mobile Computing',
  'SMA2418',
  'PAM Lab B',
  1,
  '8:00am',
  '11:00am',
  -1.2864,
  36.8172,
  50,
  true
)
ON CONFLICT (week_number) DO NOTHING;
