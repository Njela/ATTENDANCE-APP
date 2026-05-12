-- PostgREST was failing to resolve attendtrack_staff_set_attendance_period(int, boolean)
-- ("Could not find the function ... (p_open, p_week) in the schema cache").
-- Replace with a single jsonb parameter (same pattern as attendtrack_staff_upsert_class).

DROP FUNCTION IF EXISTS public.attendtrack_staff_set_attendance_period(int, boolean);

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
