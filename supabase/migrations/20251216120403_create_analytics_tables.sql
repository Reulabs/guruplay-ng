/*
  # Create Analytics Tables for Melodify

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `display_name` (text)
      - `created_at` (timestamptz)
      - `last_login` (timestamptz)
      
    - `songs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `title` (text)
      - `artist` (text)
      - `cover_url` (text)
      - `audio_url` (text)
      - `duration` (integer)
      - `genre` (text)
      - `total_plays` (integer)
      - `total_likes` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `song_analytics`
      - `id` (uuid, primary key)
      - `song_id` (uuid, foreign key)
      - `date` (date)
      - `plays` (integer)
      - `unique_listeners` (integer)
      - `likes` (integer)
      - `shares` (integer)
      - `avg_listen_duration` (integer)
      - `created_at` (timestamptz)
      
    - `user_activity`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `song_id` (uuid, foreign key)
      - `activity_type` (text: play, like, share)
      - `listen_duration` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for reading public song data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create songs table
CREATE TABLE IF NOT EXISTS songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  artist text NOT NULL DEFAULT '',
  cover_url text NOT NULL DEFAULT '',
  audio_url text NOT NULL DEFAULT '',
  duration integer DEFAULT 0,
  genre text DEFAULT '',
  total_plays integer DEFAULT 0,
  total_likes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view songs"
  ON songs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own songs"
  ON songs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own songs"
  ON songs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own songs"
  ON songs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create song_analytics table
CREATE TABLE IF NOT EXISTS song_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id uuid REFERENCES songs(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  plays integer DEFAULT 0,
  unique_listeners integer DEFAULT 0,
  likes integer DEFAULT 0,
  shares integer DEFAULT 0,
  avg_listen_duration integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(song_id, date)
);

ALTER TABLE song_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analytics for own songs"
  ON song_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM songs
      WHERE songs.id = song_analytics.song_id
      AND songs.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert analytics"
  ON song_analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM songs
      WHERE songs.id = song_analytics.song_id
    )
  );

-- Create user_activity table
CREATE TABLE IF NOT EXISTS user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  song_id uuid REFERENCES songs(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('play', 'like', 'share')),
  listen_duration integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON user_activity FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON user_activity FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
CREATE INDEX IF NOT EXISTS idx_song_analytics_song_id ON song_analytics(song_id);
CREATE INDEX IF NOT EXISTS idx_song_analytics_date ON song_analytics(date);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_song_id ON user_activity(song_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);
