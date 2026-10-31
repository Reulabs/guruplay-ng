-- Account administration and song review reasons.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active'
  CHECK (account_status IN ('active', 'paused', 'deleted'));
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE OR REPLACE FUNCTION public.is_active_account()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND account_status = 'active');
$$;
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'admin' AND account_status = 'active');
$$;

-- A permissive policy cannot override this restriction, including for old JWTs.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['users','songs','artist_profiles','song_analytics','user_activity','notifications'] LOOP
  IF to_regclass('public.' || t) IS NOT NULL THEN
   EXECUTE format('CREATE POLICY "Active accounts only" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_account()) WITH CHECK (public.is_active_account())', t);
  END IF;
 END LOOP;
END $$;
-- New profiles are bootstrapped by AuthContext; permit only their initial user row.
DROP POLICY "Active accounts only" ON public.users;
CREATE POLICY "Active profiles readable" ON public.users AS RESTRICTIVE FOR SELECT TO authenticated
 USING (public.is_active_account());
CREATE POLICY "Active profiles editable" ON public.users AS RESTRICTIVE FOR UPDATE TO authenticated
 USING (public.is_active_account()) WITH CHECK (public.is_active_account());
CREATE POLICY "Active profiles deletable" ON public.users AS RESTRICTIVE FOR DELETE TO authenticated
 USING (public.is_active_account());
CREATE POLICY "Active storage access" ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.is_active_account()) WITH CHECK (public.is_active_account());

-- Account lifecycle fields can only be changed by the trusted API. Existing
-- admins are protected from deletion, suspension, and role demotion.
CREATE OR REPLACE FUNCTION public.guard_account_management()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
  IF coalesce(auth.role(), '') <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin')
     AND (NEW.account_status <> 'active' OR NEW.user_type <> 'user') THEN
   RAISE EXCEPTION 'Account management requires the admin API' USING ERRCODE = '42501';
  END IF;
 ELSE
  IF OLD.user_type = 'admin' AND (NEW.user_type <> 'admin' OR NEW.account_status <> 'active') THEN
   RAISE EXCEPTION 'Administrator accounts are protected' USING ERRCODE = '42501';
  END IF;
  IF NEW.account_status IS DISTINCT FROM OLD.account_status AND coalesce(auth.role(), '') <> 'service_role'
     AND current_user NOT IN ('postgres', 'supabase_admin') THEN
   RAISE EXCEPTION 'Account management requires the admin API' USING ERRCODE = '42501';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_account_management BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.guard_account_management();

DROP FUNCTION IF EXISTS public.review_song(uuid, public.song_approval_status);
CREATE OR REPLACE FUNCTION public.review_song(target_song_id uuid, next_status public.song_approval_status, reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501'; END IF;
 IF next_status NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid review status'; END IF;
 IF next_status = 'rejected' AND (length(trim(coalesce(reason, ''))) < 5 OR length(reason) > 2000) THEN
  RAISE EXCEPTION 'Provide a rejection reason between 5 and 2000 characters';
 END IF;
 UPDATE public.songs SET approval_status = next_status,
  rejection_reason = CASE WHEN next_status = 'rejected' THEN trim(reason) ELSE NULL END,
  reviewed_at = now(), reviewed_by = auth.uid(), updated_at = now()
 WHERE id = target_song_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Song not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.review_song(uuid, public.song_approval_status, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_song(uuid, public.song_approval_status, text) TO authenticated;

-- Direct table mutations must obey the same rejection requirements as the RPC.
CREATE OR REPLACE FUNCTION public.guard_song_review()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NEW.approval_status = 'rejected' AND
    (length(trim(coalesce(NEW.rejection_reason, ''))) < 5 OR length(NEW.rejection_reason) > 2000) THEN
  RAISE EXCEPTION 'A rejection reason is required';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_song_review BEFORE INSERT OR UPDATE OF approval_status, rejection_reason ON public.songs
FOR EACH ROW EXECUTE FUNCTION public.guard_song_review();

CREATE TABLE public.admin_audit_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
 action text NOT NULL, target_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.is_admin());
CREATE INDEX ON public.admin_audit_log (created_at DESC);

NOTIFY pgrst, 'reload schema';
