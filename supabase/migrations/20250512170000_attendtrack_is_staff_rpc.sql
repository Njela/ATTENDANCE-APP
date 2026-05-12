-- Client RPC for post-login routing. MUST run after 20250512150000_attendtrack_staff_lecturer.sql
-- (creates attendtrack.staff_profiles and public.attendtrack_private_is_staff).
-- If you see "relation staff_profiles does not exist", apply the full 20250512150000 migration first.

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
