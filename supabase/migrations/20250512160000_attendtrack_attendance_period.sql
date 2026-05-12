-- Attendance registration window: lecturer opens/closes when students may mark GPS attendance.
-- Map / location is still set via course_classes lat/lng (app map picker centred on JKUAT).

ALTER TABLE attendtrack.course_classes
  ADD COLUMN IF NOT EXISTS attendance_period_open boolean NOT NULL DEFAULT false;

-- Existing deployments: keep current behaviour for rows that are already the active class for a week.
UPDATE attendtrack.course_classes
SET attendance_period_open = true
WHERE is_active = true;

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

  IF NOT v_class.attendance_period_open THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'attendance_period_closed',
      'message', 'Attendance registration is closed for this week. Your lecturer must open the session before you can check in.'
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
    latitude, longitude, geofence_radius_m, is_active, attendance_period_open
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
    coalesce((p->>'is_active')::boolean, true),
    coalesce((p->>'attendance_period_open')::boolean, false)
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
    attendance_period_open = excluded.attendance_period_open,
    updated_at = now();

  RETURN jsonb_build_object('ok', true, 'week_number', w);
END;
$$;

-- Single jsonb arg so PostgREST/Supabase RPC resolves reliably (avoids (p_week,p_open) vs (p_open,p_week) cache errors).
CREATE OR REPLACE FUNCTION public.attendtrack_staff_set_attendance_period(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = attendtrack, public
AS $$
DECLARE
  n int;
  p_week int := (p->>'week_number')::int;
  p_open boolean := coalesce((p->>'attendance_period_open')::boolean, (p->>'open')::boolean);
BEGIN
  IF NOT public.attendtrack_private_is_staff(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  IF p_week IS NULL OR p_week < 1 OR p_week > 52 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_week');
  END IF;

  UPDATE attendtrack.course_classes
  SET attendance_period_open = p_open, updated_at = now()
  WHERE week_number = p_week;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_class_for_week');
  END IF;
  RETURN jsonb_build_object('ok', true, 'updated', n, 'attendance_period_open', p_open);
END;
$$;

REVOKE ALL ON FUNCTION public.attendtrack_staff_set_attendance_period(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendtrack_staff_set_attendance_period(jsonb) TO authenticated;
