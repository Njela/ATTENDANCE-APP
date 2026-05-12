-- Fix: registration "Database error saving new user"
-- A) Trigger INSERT: bypass RLS during signup transaction.
-- B) Store login_email on profile = auth email (real contact email) for Student-ID login without joining auth.users from RPC.

ALTER TABLE attendtrack.student_profiles
  ADD COLUMN IF NOT EXISTS login_email text;

UPDATE attendtrack.student_profiles sp
SET login_email = u.email::text
FROM auth.users u
WHERE u.id = sp.id
  AND (sp.login_email IS NULL OR sp.login_email = '');

CREATE OR REPLACE FUNCTION public.attendtrack_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = attendtrack, public
AS $$
BEGIN
  SET LOCAL row_security = off;

  IF NEW.raw_user_meta_data IS NOT NULL
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
    RAISE EXCEPTION 'student_id_already_registered'
      USING ERRCODE = '23505';
END;
$$;

CREATE OR REPLACE FUNCTION public.attendtrack_lookup_auth_email(p_student_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = attendtrack, public
AS $$
  SELECT login_email::text
  FROM attendtrack.student_profiles
  WHERE upper(trim(student_id)) = upper(trim(p_student_id))
    AND login_email IS NOT NULL
    AND length(trim(login_email)) > 0
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.attendtrack_lookup_auth_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendtrack_lookup_auth_email(text) TO anon, authenticated;
