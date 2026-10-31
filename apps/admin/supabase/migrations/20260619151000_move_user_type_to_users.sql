ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'user';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_user_type_check;

UPDATE public.users
SET user_type = 'user'
WHERE user_type IS NULL
   OR user_type NOT IN ('user', 'artist', 'admin');

ALTER TABLE public.users
  ALTER COLUMN user_type SET DEFAULT 'user';

ALTER TABLE public.users
  ALTER COLUMN user_type SET NOT NULL;

ALTER TABLE public.users
  ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('user', 'artist', 'admin'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'artist_profiles'
      AND column_name = 'user_type'
  ) THEN
    EXECUTE $sql$
      UPDATE public.users AS users
      SET user_type = CASE
        WHEN artist_profiles.user_type::text = 'admin' THEN 'admin'
        WHEN artist_profiles.user_type::text = 'artist'
          OR artist_profiles.approval_status = 'approved' THEN 'artist'
        ELSE users.user_type
      END
      FROM public.artist_profiles AS artist_profiles
      WHERE users.id = artist_profiles.user_id
    $sql$;
  END IF;
END $$;

UPDATE public.users AS users
SET user_type = 'artist'
FROM public.artist_profiles AS artist_profiles
WHERE users.id = artist_profiles.user_id
  AND artist_profiles.approval_status = 'approved'
  AND users.user_type <> 'admin';

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

DROP POLICY IF EXISTS "Users can insert own data" ON public.users;

CREATE POLICY "Users can insert own data"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND user_type = 'user');

DROP POLICY IF EXISTS "Users can update own data" ON public.users;

CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND user_type = public.current_user_type());

DROP POLICY IF EXISTS "Users can create own artist profile" ON public.artist_profiles;

CREATE POLICY "Users can create own artist profile"
  ON public.artist_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND approval_status = 'pending');

DROP POLICY IF EXISTS "Users can update own pending or rejected artist profile" ON public.artist_profiles;

CREATE POLICY "Users can update own pending or rejected artist profile"
  ON public.artist_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND approval_status IN ('pending', 'rejected'))
  WITH CHECK (auth.uid() = user_id AND approval_status = 'pending');

ALTER TABLE public.artist_profiles
  DROP COLUMN IF EXISTS is_artist;

ALTER TABLE public.artist_profiles
  DROP COLUMN IF EXISTS is_approved;

ALTER TABLE public.artist_profiles
  DROP COLUMN IF EXISTS user_type;
