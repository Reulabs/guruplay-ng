DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
    CREATE TYPE user_type AS ENUM ('listener', 'artist', 'admin');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'artist_approval_status') THEN
    CREATE TYPE artist_approval_status AS ENUM ('not_applied', 'pending', 'approved', 'rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS artist_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  artist_name text NOT NULL,
  bio text NOT NULL,
  genre text NOT NULL,
  location text DEFAULT '',
  website_url text DEFAULT '',
  social_url text DEFAULT '',
  user_type user_type NOT NULL DEFAULT 'listener',
  approval_status artist_approval_status NOT NULL DEFAULT 'pending',
  is_artist boolean GENERATED ALWAYS AS (user_type = 'artist') STORED,
  is_approved boolean GENERATED ALWAYS AS (approval_status = 'approved') STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own artist profile"
  ON artist_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own artist profile"
  ON artist_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND user_type = 'listener' AND approval_status = 'pending');

CREATE POLICY "Users can update own pending or rejected artist profile"
  ON artist_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND approval_status IN ('pending', 'rejected'))
  WITH CHECK (auth.uid() = user_id AND user_type = 'listener' AND approval_status = 'pending');

CREATE INDEX IF NOT EXISTS idx_artist_profiles_user_id ON artist_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_artist_profiles_approval_status ON artist_profiles(approval_status);
