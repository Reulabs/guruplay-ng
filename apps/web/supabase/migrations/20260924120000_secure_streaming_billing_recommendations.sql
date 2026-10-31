-- Secure streaming, recurring billing, durable media processing, and playback telemetry.
-- This migration intentionally fails closed: approved songs are not returned by
-- public_catalog until a trusted worker has produced a preview.

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'uploaded'
    CHECK (processing_status IN ('uploaded', 'processing', 'ready', 'failed', 'quarantined'));

CREATE TABLE IF NOT EXISTS public.song_assets (
  song_id uuid PRIMARY KEY REFERENCES public.songs(id) ON DELETE CASCADE,
  full_object_path text,
  preview_object_path text,
  detected_mime_type text,
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  bitrate integer CHECK (bitrate IS NULL OR bitrate > 0),
  checksum_sha256 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.guard_ready_song_asset()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.songs
    WHERE id = NEW.song_id AND processing_status = 'ready'
  ) AND (NEW.full_object_path IS NULL OR NEW.preview_object_path IS NULL) THEN
    RAISE EXCEPTION 'Ready songs require full and preview objects';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_ready_song_asset ON public.song_assets;
CREATE TRIGGER guard_ready_song_asset
BEFORE INSERT OR UPDATE ON public.song_assets
FOR EACH ROW EXECUTE FUNCTION public.guard_ready_song_asset();

CREATE OR REPLACE FUNCTION public.guard_song_ready_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.processing_status = 'ready' AND OLD.processing_status IS DISTINCT FROM 'ready'
     AND NOT EXISTS (
       SELECT 1 FROM public.song_assets
       WHERE song_id = NEW.id AND full_object_path IS NOT NULL AND preview_object_path IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'Song assets must be processed before the song becomes ready';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_song_ready_transition ON public.songs;
CREATE TRIGGER guard_song_ready_transition
BEFORE UPDATE OF processing_status ON public.songs
FOR EACH ROW EXECUTE FUNCTION public.guard_song_ready_transition();

ALTER TABLE public.song_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.song_assets FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.media_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id uuid NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  job_type text NOT NULL DEFAULT 'prepare_audio' CHECK (job_type = 'prepare_audio'),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'retry', 'completed', 'dead')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_expires_at timestamptz,
  leased_by text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (song_id, job_type)
);
CREATE INDEX IF NOT EXISTS idx_media_jobs_claim
  ON public.media_jobs(status, available_at, lease_expires_at);
ALTER TABLE public.media_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.media_jobs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_media_job(worker_id text)
RETURNS SETOF public.media_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claimed_id uuid;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO claimed_id
  FROM public.media_jobs
  WHERE attempts < 8
    AND (
      (status IN ('queued', 'retry') AND available_at <= now())
      OR (status = 'processing' AND lease_expires_at < now())
    )
  ORDER BY available_at, created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF claimed_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  UPDATE public.media_jobs
  SET status = 'processing', attempts = attempts + 1,
      leased_by = left(worker_id, 200), lease_expires_at = now() + interval '5 minutes',
      updated_at = now()
  WHERE id = claimed_id
  RETURNING *;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_media_job(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_media_job(text) TO service_role;

CREATE TABLE IF NOT EXISTS public.billing_checkout_attempts (
  reference text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_code text NOT NULL,
  expected_amount bigint NOT NULL CHECK (expected_amount > 0),
  currency text NOT NULL CHECK (length(currency) = 3),
  status text NOT NULL DEFAULT 'initialized'
    CHECK (status IN ('initialized', 'verified', 'failed', 'expired')),
  paystack_transaction_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_billing_checkout_user ON public.billing_checkout_attempts(user_id, created_at DESC);
ALTER TABLE public.billing_checkout_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_checkout_attempts FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'paystack' CHECK (provider = 'paystack'),
  customer_code text,
  subscription_code text UNIQUE,
  plan_code text NOT NULL,
  status text NOT NULL
    CHECK (status IN ('active', 'non_renewing', 'attention', 'completed', 'cancelled')),
  paid_through timestamptz NOT NULL,
  provider_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_entitlement ON public.subscriptions(status, paid_through);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription"
  ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.paystack_webhook_events (
  event_key text PRIMARY KEY,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processing', 'processed', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_paystack_events_process ON public.paystack_webhook_events(status, available_at);
ALTER TABLE public.paystack_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.paystack_webhook_events FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.stream_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  song_id uuid NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_user_created ON public.stream_sessions(user_id, created_at DESC);
ALTER TABLE public.stream_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stream_sessions FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.playback_events (
  event_id uuid PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  anonymous_id uuid,
  song_id uuid NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  stream_session_id uuid REFERENCES public.stream_sessions(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'impression', 'preview_start', 'preview_complete', 'full_play_start',
    'heartbeat', 'completion', 'skip', 'like', 'unlike', 'dislike'
  )),
  position_seconds integer NOT NULL DEFAULT 0 CHECK (position_seconds BETWEEN 0 AND 86400),
  client_occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_playback_events_user_received ON public.playback_events(user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_playback_events_song_received ON public.playback_events(song_id, received_at DESC);
ALTER TABLE public.playback_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.playback_events FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.recommendation_snapshots (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  recommendations jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
ALTER TABLE public.recommendation_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.recommendation_snapshots FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_music_aggregates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;

  WITH like_state AS (
    SELECT DISTINCT ON (event.user_id, event.song_id)
      event.song_id, event.user_id, event.event_type
    FROM public.playback_events AS event
    WHERE event.user_id IS NOT NULL AND event.event_type IN ('like', 'unlike')
    ORDER BY event.user_id, event.song_id, event.received_at DESC, event.event_id DESC
  ), like_counts AS (
    SELECT song_id, count(*) FILTER (WHERE event_type = 'like') AS likes
    FROM like_state GROUP BY song_id
  ), play_counts AS (
    SELECT song.id,
      count(DISTINCT event.event_id) FILTER (
        WHERE event.event_type IN ('completion', 'heartbeat')
          AND event.position_seconds >= least(30, greatest(1, floor(coalesce(song.duration, 0) * 0.5)::integer))
      ) AS qualified_plays
    FROM public.songs AS song
    LEFT JOIN public.playback_events AS event ON event.song_id = song.id
    GROUP BY song.id
  )
  UPDATE public.songs AS song
  SET total_plays = least(coalesce(play_counts.qualified_plays, 0), 2147483647)::integer,
      total_likes = least(coalesce(like_counts.likes, 0), 2147483647)::integer,
      updated_at = now()
  FROM play_counts
  LEFT JOIN like_counts ON like_counts.song_id = play_counts.id
  WHERE song.id = play_counts.id;

  DELETE FROM public.song_analytics WHERE date >= current_date - 365;
  INSERT INTO public.song_analytics(song_id, date, plays, unique_listeners, avg_listen_duration)
  SELECT event.song_id, event.received_at::date,
    count(*) FILTER (WHERE event.event_type IN ('completion', 'heartbeat')
      AND event.position_seconds >= least(30, greatest(1, floor(coalesce(song.duration, 0) * 0.5)::integer)))::integer,
    count(DISTINCT event.user_id) FILTER (WHERE event.event_type IN ('completion', 'heartbeat')
      AND event.position_seconds >= least(30, greatest(1, floor(coalesce(song.duration, 0) * 0.5)::integer)))::integer,
    coalesce(avg(event.position_seconds) FILTER (WHERE event.event_type IN ('completion', 'heartbeat')), 0)::integer
  FROM public.playback_events AS event
  JOIN public.songs AS song ON song.id = event.song_id
  WHERE event.received_at >= now() - interval '365 days'
  GROUP BY event.song_id, event.received_at::date;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_music_aggregates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_music_aggregates() TO service_role;

-- Backfill parseable legacy Supabase paths. External URLs stay unavailable until
-- an operator imports them into the private bucket and queues processing.
INSERT INTO public.song_assets (song_id, full_object_path)
SELECT id, substring(audio_url FROM '/song-audio/(.+)$')
FROM public.songs
WHERE coalesce(audio_url, '') <> ''
  AND substring(audio_url FROM '/song-audio/(.+)$') IS NOT NULL
ON CONFLICT (song_id) DO NOTHING;

INSERT INTO public.media_jobs (song_id)
SELECT song_id FROM public.song_assets
WHERE preview_object_path IS NULL
ON CONFLICT (song_id, job_type) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('song-audio', 'song-audio', false), ('song-previews', 'song-previews', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public previews are readable" ON storage.objects;
CREATE POLICY "Public previews are readable"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'song-previews');

DROP VIEW IF EXISTS public.public_catalog;
CREATE VIEW public.public_catalog
WITH (security_barrier = true)
AS
SELECT s.id, s.user_id, s.title, s.artist, s.cover_url, s.duration, s.genre,
       s.total_plays, s.total_likes, s.created_at,
       a.preview_object_path, s.processing_status
FROM public.songs s
JOIN public.song_assets a ON a.song_id = s.id
WHERE s.approval_status = 'approved'
  AND s.processing_status = 'ready'
  AND a.preview_object_path IS NOT NULL;

DROP VIEW IF EXISTS public.my_songs;
CREATE VIEW public.my_songs
WITH (security_barrier = true)
AS
SELECT s.id, s.user_id, s.title, s.artist, s.cover_url, s.duration, s.genre,
       s.total_plays, s.total_likes, s.approval_status, s.rejection_reason,
       s.reviewed_at, s.reviewed_by, s.processing_status, s.created_at, s.updated_at
FROM public.songs s
WHERE s.user_id = auth.uid() OR public.is_admin();

REVOKE SELECT ON public.songs FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.songs FROM authenticated;
GRANT SELECT ON public.public_catalog TO anon, authenticated;
GRANT SELECT ON public.my_songs TO authenticated;

CREATE INDEX IF NOT EXISTS idx_songs_public_catalog
  ON public.songs(approval_status, processing_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_songs_search
  ON public.songs USING gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(artist, '') || ' ' || coalesce(genre, '')));

CREATE OR REPLACE FUNCTION public.search_public_catalog(search_query text, page_number integer DEFAULT 1)
RETURNS SETOF public.public_catalog
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT catalog.*
  FROM public.public_catalog AS catalog
  JOIN public.songs AS song ON song.id = catalog.id
  WHERE length(trim(search_query)) BETWEEN 2 AND 80
    AND to_tsvector('simple', coalesce(song.title, '') || ' ' || coalesce(song.artist, '') || ' ' || coalesce(song.genre, ''))
      @@ websearch_to_tsquery('simple', search_query)
  ORDER BY ts_rank(
    to_tsvector('simple', coalesce(song.title, '') || ' ' || coalesce(song.artist, '') || ' ' || coalesce(song.genre, '')),
    websearch_to_tsquery('simple', search_query)
  ) DESC, song.created_at DESC
  LIMIT 20 OFFSET (greatest(1, least(coalesce(page_number, 1), 1000)) - 1) * 20;
$$;
REVOKE ALL ON FUNCTION public.search_public_catalog(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_public_catalog(text, integer) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
