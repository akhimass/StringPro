-- Staff directory from profiles: anon + staff can read picklist rows; stringers catalog links to profiles.
-- 1) profiles.profile_id N/A — link stringers.profile_id → profiles
-- 2) Trigger keeps stringers row in sync for stringer / frontdesk_stringer roles
-- 3) RLS: replace narrow own-profile SELECT with staff directory + admin; anon picklist

-- ---------- stringers.profile_id ----------
-- Allow multiple catalog rows with the same display name (profile-linked vs legacy).
ALTER TABLE public.stringers DROP CONSTRAINT IF EXISTS stringers_name_key;

ALTER TABLE public.stringers
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS stringers_profile_id_uidx ON public.stringers (profile_id);

-- ---------- Sync profile → stringers row (SECURITY DEFINER) ----------
CREATE OR REPLACE FUNCTION public.sync_profile_to_stringer_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  disp text;
BEGIN
  disp := NULLIF(TRIM(COALESCE(NEW.full_name, '')), '');
  IF disp IS NULL THEN
    disp := 'Staff';
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.role IS DISTINCT FROM NEW.role
     AND OLD.role IN ('stringer', 'frontdesk_stringer')
     AND NEW.role NOT IN ('stringer', 'frontdesk_stringer') THEN
    UPDATE public.stringers
    SET profile_id = NULL
    WHERE profile_id = NEW.id;
  END IF;

  IF NEW.role IN ('stringer', 'frontdesk_stringer') THEN
    INSERT INTO public.stringers (name, profile_id, extra_cost)
    VALUES (
      disp,
      NEW.id,
      COALESCE(
        (SELECT s.extra_cost FROM public.stringers s WHERE s.profile_id = NEW.id LIMIT 1),
        0
      )
    )
    ON CONFLICT (profile_id)
    DO UPDATE SET name = EXCLUDED.name;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_sync_stringer_catalog ON public.profiles;
CREATE TRIGGER trg_profiles_sync_stringer_catalog
  AFTER INSERT OR UPDATE OF role, full_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_stringer_catalog();

-- Backfill stringers rows for existing stringer profiles
INSERT INTO public.stringers (name, profile_id, extra_cost)
SELECT
  COALESCE(NULLIF(TRIM(p.full_name), ''), 'Staff'),
  p.id,
  0
FROM public.profiles p
WHERE p.role IN ('stringer', 'frontdesk_stringer')
  AND NOT EXISTS (SELECT 1 FROM public.stringers s WHERE s.profile_id = p.id)
ON CONFLICT (profile_id) DO NOTHING;

-- ---------- profiles SELECT policies ----------
-- Avoid RLS recursion: do not call get_my_role() (which reads profiles) from policies on profiles.
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND public.role_is_staff(p.role)
  );
$$;

CREATE POLICY "Profiles select own staff directory or admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin_user()
    OR (public.is_staff_user() AND public.role_is_staff(role))
  );

-- Anon drop-off: front desk + stringer names (no email column on profiles)
CREATE POLICY "Anon can read staff picklist profiles"
  ON public.profiles FOR SELECT TO anon
  USING (role IN ('frontdesk', 'frontdesk_stringer', 'stringer'));
