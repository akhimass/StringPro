-- Pre-validate invite codes before auth.signUp so invalid codes do not create auth users.
-- Does not consume uses; complete_signup_with_codes still consumes atomically after sign-in.

CREATE OR REPLACE FUNCTION public.validate_staff_signup_invite_codes(
  p_want_manager boolean,
  p_want_front_desk boolean,
  p_want_stringer boolean,
  p_code_manager text,
  p_code_front_desk text,
  p_code_stringer text,
  p_code_frontdesk_stringer text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(p_want_manager, false) THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.signup_access_codes c
      WHERE c.code_kind = 'manager'
        AND p_code_manager IS NOT NULL
        AND length(trim(p_code_manager)) >= 4
        AND lower(trim(c.code)) = lower(trim(p_code_manager))
        AND c.uses_remaining >= 1
    );
  ELSIF coalesce(p_want_front_desk, false) AND coalesce(p_want_stringer, false) THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.signup_access_codes c
      WHERE c.code_kind = 'frontdesk_stringer'
        AND p_code_frontdesk_stringer IS NOT NULL
        AND length(trim(p_code_frontdesk_stringer)) >= 4
        AND lower(trim(c.code)) = lower(trim(p_code_frontdesk_stringer))
        AND c.uses_remaining >= 1
    );
  ELSIF coalesce(p_want_front_desk, false) THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.signup_access_codes c
      WHERE c.code_kind = 'frontdesk'
        AND p_code_front_desk IS NOT NULL
        AND length(trim(p_code_front_desk)) >= 4
        AND lower(trim(c.code)) = lower(trim(p_code_front_desk))
        AND c.uses_remaining >= 1
    );
  ELSIF coalesce(p_want_stringer, false) THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.signup_access_codes c
      WHERE c.code_kind = 'stringer'
        AND p_code_stringer IS NOT NULL
        AND length(trim(p_code_stringer)) >= 4
        AND lower(trim(c.code)) = lower(trim(p_code_stringer))
        AND c.uses_remaining >= 1
    );
  END IF;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_staff_signup_invite_codes(boolean, boolean, boolean, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_staff_signup_invite_codes(boolean, boolean, boolean, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_staff_signup_invite_codes(boolean, boolean, boolean, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.validate_staff_signup_invite_codes IS 'Returns true if the invite code matches a usable row for the selected role path (does not consume a use).';
