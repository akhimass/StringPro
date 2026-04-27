-- Staff self-signup: access codes (manager, front desk, stringer, front desk+stringer) + RPC to assign role after signUp.
-- App stores codes as lowercase 16-char hex; comparisons are case-insensitive.

CREATE TABLE IF NOT EXISTS public.signup_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  code_kind text NOT NULL CHECK (code_kind IN ('manager', 'frontdesk', 'stringer', 'frontdesk_stringer')),
  uses_remaining int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_signup_access_codes_code_lower ON public.signup_access_codes (lower(trim(code)));
CREATE INDEX IF NOT EXISTS idx_signup_access_codes_kind ON public.signup_access_codes (code_kind);

ALTER TABLE public.signup_access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage signup access codes" ON public.signup_access_codes;
CREATE POLICY "Admins manage signup access codes"
  ON public.signup_access_codes
  FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

CREATE OR REPLACE FUNCTION public._consume_signup_code(p_code text, p_kind text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_remaining int;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) < 4 THEN
    RETURN false;
  END IF;
  SELECT c.id, c.uses_remaining
  INTO v_id, v_remaining
  FROM public.signup_access_codes c
  WHERE c.code_kind = p_kind
    AND lower(trim(c.code)) = lower(trim(p_code))
  FOR UPDATE;
  IF v_id IS NULL THEN
    RETURN false;
  END IF;
  IF v_remaining < 1 THEN
    RETURN false;
  END IF;
  UPDATE public.signup_access_codes
  SET uses_remaining = uses_remaining - 1
  WHERE id = v_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_signup_with_codes(
  p_first_name text,
  p_last_name text,
  p_want_manager boolean,
  p_want_front_desk boolean,
  p_want_stringer boolean,
  p_code_manager text DEFAULT NULL,
  p_code_front_desk text DEFAULT NULL,
  p_code_stringer text DEFAULT NULL,
  p_code_frontdesk_stringer text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_full text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  v_full := btrim(p_first_name) || ' ' || btrim(p_last_name);
  IF length(btrim(p_first_name)) < 1 OR length(btrim(p_last_name)) < 1 THEN
    RAISE EXCEPTION 'name_required';
  END IF;
  IF coalesce(p_want_manager, false) THEN
    IF NOT public._consume_signup_code(p_code_manager, 'manager') THEN
      RAISE EXCEPTION 'invalid_manager_code';
    END IF;
    v_role := 'admin';
  ELSIF coalesce(p_want_front_desk, false) AND coalesce(p_want_stringer, false) THEN
    IF NOT public._consume_signup_code(p_code_frontdesk_stringer, 'frontdesk_stringer') THEN
      RAISE EXCEPTION 'invalid_combined_code';
    END IF;
    v_role := 'frontdesk_stringer';
  ELSIF coalesce(p_want_front_desk, false) THEN
    IF NOT public._consume_signup_code(p_code_front_desk, 'frontdesk') THEN
      RAISE EXCEPTION 'invalid_front_desk_code';
    END IF;
    v_role := 'frontdesk';
  ELSIF coalesce(p_want_stringer, false) THEN
    IF NOT public._consume_signup_code(p_code_stringer, 'stringer') THEN
      RAISE EXCEPTION 'invalid_stringer_code';
    END IF;
    v_role := 'stringer';
  ELSE
    RAISE EXCEPTION 'no_role_selected';
  END IF;
  UPDATE public.profiles
  SET
    role = v_role,
    full_name = v_full
  WHERE id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;
  RETURN v_role;
END;
$$;

REVOKE ALL ON FUNCTION public._consume_signup_code(text, text) FROM public;
REVOKE ALL ON FUNCTION public.complete_signup_with_codes(text, text, boolean, boolean, boolean, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.complete_signup_with_codes(text, text, boolean, boolean, boolean, text, text, text, text) TO authenticated;

COMMENT ON TABLE public.signup_access_codes IS 'Invite codes for staff self-signup; generate in Manager → Settings.';
