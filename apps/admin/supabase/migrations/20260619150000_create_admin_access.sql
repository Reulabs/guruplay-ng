ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'user';

UPDATE public.users
SET user_type = 'user'
WHERE user_type IS NULL
   OR user_type NOT IN ('user', 'artist', 'admin');

ALTER TABLE public.users
  ALTER COLUMN user_type SET DEFAULT 'user';

ALTER TABLE public.users
  ALTER COLUMN user_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_user_type_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_user_type_check
      CHECK (user_type IN ('user', 'artist', 'admin'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND user_type = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_type()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_type
  FROM public.users
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.review_artist_application(
  profile_id uuid,
  next_status artist_approval_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  IF next_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid artist review status' USING ERRCODE = '22023';
  END IF;

  SELECT user_id
  INTO target_user_id
  FROM public.artist_profiles
  WHERE id = profile_id
  FOR UPDATE;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Artist profile not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.artist_profiles
  SET approval_status = next_status,
      updated_at = now()
  WHERE id = profile_id;

  UPDATE public.users
  SET user_type = CASE
    WHEN next_status = 'approved' THEN 'artist'
    ELSE 'user'
  END
  WHERE id = target_user_id
    AND user_type <> 'admin';
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Admins can read users'
  ) THEN
    CREATE POLICY "Admins can read users"
      ON public.users FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Admins can update users'
  ) THEN
    CREATE POLICY "Admins can update users"
      ON public.users FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artist_profiles'
      AND policyname = 'Admins can read artist profiles'
  ) THEN
    CREATE POLICY "Admins can read artist profiles"
      ON public.artist_profiles FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artist_profiles'
      AND policyname = 'Admins can update artist profiles'
  ) THEN
    CREATE POLICY "Admins can update artist profiles"
      ON public.artist_profiles FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'songs'
      AND policyname = 'Admins can manage songs'
  ) THEN
    CREATE POLICY "Admins can manage songs"
      ON public.songs FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'song_analytics'
      AND policyname = 'Admins can read analytics'
  ) THEN
    CREATE POLICY "Admins can read analytics"
      ON public.song_analytics FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_activity'
      AND policyname = 'Admins can read activity'
  ) THEN
    CREATE POLICY "Admins can read activity"
      ON public.user_activity FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;
END $$;
