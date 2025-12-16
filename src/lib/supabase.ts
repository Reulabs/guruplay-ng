import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Song {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  cover_url: string;
  audio_url: string;
  duration: number;
  genre: string;
  total_plays: number;
  total_likes: number;
  created_at: string;
  updated_at: string;
}

export interface SongAnalytics {
  id: string;
  song_id: string;
  date: string;
  plays: number;
  unique_listeners: number;
  likes: number;
  shares: number;
  avg_listen_duration: number;
  created_at: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  song_id: string;
  activity_type: 'play' | 'like' | 'share';
  listen_duration: number;
  created_at: string;
}
