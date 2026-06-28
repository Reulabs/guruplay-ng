DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'song_approval_status') THEN
    CREATE TYPE public.song_approval_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS approval_status public.song_approval_status,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- Existing catalog entries predate moderation and remain published.
UPDATE public.songs
SET approval_status = 'approved'
WHERE approval_status IS NULL;

ALTER TABLE public.songs
  ALTER COLUMN approval_status SET DEFAULT 'pending',
  ALTER COLUMN approval_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_songs_approval_status
  ON public.songs(approval_status);

DROP POLICY IF EXISTS "Anyone can view songs" ON public.songs;
DROP POLICY IF EXISTS "Users can insert own songs" ON public.songs;
DROP POLICY IF EXISTS "Users can update own songs" ON public.songs;

CREATE POLICY "Published songs are public and owners can review their songs"
  ON public.songs FOR SELECT
  TO public
  USING (
    approval_status = 'approved'
    OR auth.uid() = user_id
    OR public.is_admin()
  );

CREATE POLICY "Artists and admins can upload songs"
  ON public.songs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (public.is_admin() AND approval_status = 'approved')
      OR (
        approval_status = 'pending'
        AND public.current_user_type() = 'artist'
        AND EXISTS (
          SELECT 1
          FROM public.artist_profiles
          WHERE artist_profiles.user_id = auth.uid()
            AND artist_profiles.approval_status = 'approved'
        )
      )
    )
  );

CREATE POLICY "Artists can update pending songs"
  ON public.songs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND approval_status = 'pending')
  WITH CHECK (auth.uid() = user_id AND approval_status = 'pending');

DROP POLICY IF EXISTS "Approved artist profiles are public" ON public.artist_profiles;
CREATE POLICY "Approved artist profiles are public"
  ON public.artist_profiles FOR SELECT
  TO public
  USING (approval_status = 'approved');

CREATE OR REPLACE FUNCTION public.review_song(
  target_song_id uuid,
  next_status public.song_approval_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  IF next_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid song review status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.songs
  SET approval_status = next_status,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
  WHERE id = target_song_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Song not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('song-audio', 'song-audio', true),
  ('song-covers', 'song-covers', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Artists and admins can upload song audio" ON storage.objects;
CREATE POLICY "Artists and admins can upload song audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('song-audio', 'song-covers')
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (
      public.is_admin()
      OR (
        public.current_user_type() = 'artist'
        AND EXISTS (
          SELECT 1 FROM public.artist_profiles
          WHERE user_id = auth.uid() AND approval_status = 'approved'
        )
      )
    )
  );

DROP POLICY IF EXISTS "Owners and admins can manage song files" ON storage.objects;
CREATE POLICY "Owners and admins can manage song files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('song-audio', 'song-covers')
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );
