-- Lecturer / staff: profiles, auth trigger branch, dashboard RPCs (isolated schema)

CREATE TABLE IF NOT EXISTS attendtrack.staff_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  login_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_profiles_login_email_idx
  ON attendtrack.staff_profiles (lower(login_email));

ALTER TABLE attendtrack.staff_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendtrack_staff_select_own" ON attendtrack.staff_profiles;
CREATE POLICY "attendtrack_staff_select_own"
  ON attendtrack.staff_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "attendtrack_staff_update_own" ON attendtrack.staff_profiles;
CREATE POLICY "attendtrack_staff_update_own"
  ON attendtrack.staff_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

GRANT SELECT, UPDATE ON attendtrack.staff_profiles TO authenticated;
GRANT ALL ON attendtrack.staff_profiles TO service_role;

-- Not exposed to PostgREST; only SECURITY DEFINER RPCs call this.
-- Staff if profile row exists OR auth metadata marks lecturer (covers backfill gaps; see 20250512180000).
CREATE OR REPLACE FUNCTION public.attendtrack_private_is_staff(check_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = attendtrack, public
AS $$
  SELECT EXISTS (SELECT 1 FROM attendtrack.staff_profiles WHERE id = check_uid)
  OR EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = check_uid
      AND lower(coalesce(u.raw_user_meta_data->>'attendtrack_role', '')) = 'lecturer'
  );
$$;

REVOKE ALL ON FUNCTION public.attendtrack_private_is_staff(uuid) FROM PUBLIC;

-- Unified signup trigger: lecturer OR student
CREATE OR REPLACE FUNCTION public.attendtrack_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = attendtrack, public
AS $$
DECLARE
  v_role text;
BEGIN
  SET LOCAL row_security = off;
  v_role := lower(coalesce(NEW.raw_user_meta_data->>'attendtrack_role', ''));

  IF NEW.raw_user_meta_data IS NOT NULL AND v_role = 'lecturer' THEN
    INSERT INTO attendtrack.staff_profiles (id, full_name, login_email)
    VALUES (
      NEW.id,
      coalesce(nullif(trim(NEW.raw_user_meta_data->>'attendtrack_full_name'), ''), 'Staff'),
      NEW.email::text
    );
  ELSIF NEW.raw_user_meta_data IS NOT NULL
        AND (NEW.raw_user_meta_data ? 'attendtrack_student_id') THEN
    INSERT INTO attendtrack.student_profiles (id, student_id, full_name, course, login_email)
    VALUES (
      NEW.id,
      upper(trim(NEW.raw_user_meta_data->>'attendtrack_student_id')),
      coalesce(nullif(trim(NEW.raw_user_meta_data->>'attendtrack_full_name'), ''), 'Student'),
      coalesce(
        nullif(trim(NEW.raw_user_meta_data->>'attendtrack_course'), ''),
        'Mobile Computing'
      ),
      NEW.email::text
    );
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'attendtrack_profile_conflict' USING ERRCODE = '23505';
END;
$$;

-- Staff: list all classes (ordered by week)
CREATE OR REPLACE FUNCTION public.attendtrack_staff_list_classes()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = attendtrack, public
AS $$
BEGIN
  IF NOT public.attendtrack_private_is_staff(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'classes', coalesce(
      (
        SELECT jsonb_agg(to_jsonb(c) ORDER BY c.week_number)
        FROM attendtrack.course_classes c
      ),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.attendtrack_staff_list_classes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendtrack_staff_list_classes() TO authenticated;

-- Staff: upsert one class row (unique week_number)
CREATE OR REPLACE FUNCTION public.attendtrack_staff_upsert_class(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = attendtrack, public
AS $$
DECLARE
  w int;
BEGIN
  IF NOT public.attendtrack_private_is_staff(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  w := (p->>'week_number')::int;
  IF w IS NULL OR w < 1 OR w > 52 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_week');
  END IF;

  INSERT INTO attendtrack.course_classes (
    name, code, room, week_number, start_time, end_time,
    latitude, longitude, geofence_radius_m, is_active
  )
  VALUES (
    coalesce(nullif(trim(p->>'name'), ''), 'Class'),
    coalesce(nullif(trim(p->>'code'), ''), 'CODE'),
    coalesce(nullif(trim(p->>'room'), ''), 'Room'),
    w,
    coalesce(nullif(trim(p->>'start_time'), ''), '9:00am'),
    coalesce(nullif(trim(p->>'end_time'), ''), '11:00am'),
    coalesce((p->>'latitude')::double precision, 0),
    coalesce((p->>'longitude')::double precision, 0),
    coalesce((p->>'geofence_radius_m')::int, 50),
    coalesce((p->>'is_active')::boolean, true)
  )
  ON CONFLICT (week_number) DO UPDATE SET
    name = excluded.name,
    code = excluded.code,
    room = excluded.room,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    geofence_radius_m = excluded.geofence_radius_m,
    is_active = excluded.is_active,
    updated_at = now();

  RETURN jsonb_build_object('ok', true, 'week_number', w);
END;
$$;

REVOKE ALL ON FUNCTION public.attendtrack_staff_upsert_class(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendtrack_staff_upsert_class(jsonb) TO authenticated;

-- Staff: set active flag for a week
CREATE OR REPLACE FUNCTION public.attendtrack_staff_set_week_active(p_week int, p_active boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = attendtrack, public
AS $$
DECLARE n int;
BEGIN
  IF NOT public.attendtrack_private_is_staff(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  IF p_week IS NULL OR p_week < 1 OR p_week > 52 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_week');
  END IF;

  UPDATE attendtrack.course_classes
  SET is_active = p_active, updated_at = now()
  WHERE week_number = p_week;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_class_for_week');
  END IF;
  RETURN jsonb_build_object('ok', true, 'updated', n);
END;
$$;

REVOKE ALL ON FUNCTION public.attendtrack_staff_set_week_active(int, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendtrack_staff_set_week_active(int, boolean) TO authenticated;

-- Staff: attendance counts per week + recent marks
CREATE OR REPLACE FUNCTION public.attendtrack_staff_attendance_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = attendtrack, public
AS $$
DECLARE v_weeks jsonb;
DECLARE v_recent jsonb;
BEGIN
  IF NOT public.attendtrack_private_is_staff(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  WITH stats AS (
    SELECT
      week_number,
      count(*) FILTER (WHERE status = 'present')::int AS present,
      count(*) FILTER (WHERE status = 'absent')::int AS absent,
      count(*) FILTER (WHERE marked_at IS NOT NULL)::int AS marked
    FROM attendtrack.attendance_logs
    GROUP BY week_number
  )
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'week_number', s.n,
        'present', coalesce(st.present, 0),
        'absent', coalesce(st.absent, 0),
        'marked', coalesce(st.marked, 0)
      ) ORDER BY s.n
    ),
    '[]'::jsonb
  )
  INTO v_weeks
  FROM generate_series(1, 14) AS s(n)
  LEFT JOIN stats st ON st.week_number = s.n;

  SELECT coalesce(
    jsonb_agg(to_jsonb(x) ORDER BY x.marked_at DESC),
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
      sp.student_id,
      sp.full_name AS student_name,
      c.name AS class_name
    FROM attendtrack.attendance_logs a
    JOIN attendtrack.student_profiles sp ON sp.id = a.user_id
    LEFT JOIN attendtrack.course_classes c ON c.id = a.class_id
    WHERE a.marked_at IS NOT NULL
    ORDER BY a.marked_at DESC
    LIMIT 40
  ) x;

  RETURN jsonb_build_object('ok', true, 'weeks', v_weeks, 'recent', v_recent);
END;
$$;

REVOKE ALL ON FUNCTION public.attendtrack_staff_attendance_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendtrack_staff_attendance_overview() TO authenticated;

-- Client-visible staff check (mobile app after login). Delegates to attendtrack_private_is_staff.
CREATE OR REPLACE FUNCTION public.attendtrack_is_current_user_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = attendtrack, public
AS $$
  SELECT public.attendtrack_private_is_staff(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.attendtrack_is_current_user_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendtrack_is_current_user_staff() TO authenticated;
