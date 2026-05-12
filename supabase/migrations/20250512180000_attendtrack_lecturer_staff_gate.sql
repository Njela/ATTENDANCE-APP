-- Fix lecturer RPCs returning { error: 'forbidden' } when JWT has attendtrack_role=lecturer
-- but attendtrack.staff_profiles has no row (older auth trigger, partial migrations, manual users).

-- 1) Backfill staff_profiles for every auth user marked as lecturer in raw_user_meta_data.
INSERT INTO attendtrack.staff_profiles (id, full_name, login_email)
SELECT
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data->>'attendtrack_full_name'), ''), 'Staff'),
  u.email::text
FROM auth.users u
WHERE lower(coalesce(u.raw_user_meta_data->>'attendtrack_role', '')) = 'lecturer'
  AND NOT EXISTS (SELECT 1 FROM attendtrack.staff_profiles sp WHERE sp.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- 2) Staff gate: table row OR lecturer role in auth metadata (same signal the app uses for routing).
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
