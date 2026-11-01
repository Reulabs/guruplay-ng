DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'artist_approval_status') THEN
    CREATE TYPE artist_approval_status AS ENUM ('not_applied', 'pending', 'approved', 'rejected');
  END IF;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'user';

UPDATE users
SET user_type = 'user'
WHERE user_type IS NULL
   OR user_type NOT IN ('user', 'artist', 'admin');

ALTER TABLE users
  ALTER COLUMN user_type SET DEFAULT 'user';

ALTER TABLE users
  ALTER COLUMN user_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_user_type_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_user_type_check
      CHECK (user_type IN ('user', 'artist', 'admin'));
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
  approval_status artist_approval_status NOT NULL DEFAULT 'pending',
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
  WITH CHECK (auth.uid() = user_id AND approval_status = 'pending');

CREATE POLICY "Users can update own pending or rejected artist profile"
  ON artist_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND approval_status IN ('pending', 'rejected'))
  WITH CHECK (auth.uid() = user_id AND approval_status = 'pending');

CREATE INDEX IF NOT EXISTS idx_artist_profiles_user_id ON artist_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_artist_profiles_approval_status ON artist_profiles(approval_status);
