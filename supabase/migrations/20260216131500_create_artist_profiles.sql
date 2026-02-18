CREATE TABLE IF NOT EXISTS artist_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  bio text DEFAULT '',
  location text DEFAULT '',
  primary_genre text DEFAULT '',
  avatar_url text DEFAULT '',
  banner_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can read own profile"
  ON artist_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Artists can insert own profile"
  ON artist_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Artists can update own profile"
  ON artist_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

