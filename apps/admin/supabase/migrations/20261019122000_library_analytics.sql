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

  WITH like_counts AS (
    SELECT song_id, count(*) AS likes FROM public.saved_songs GROUP BY song_id
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

CREATE OR REPLACE FUNCTION public.artist_listening_metrics()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.owns_active_account(auth.uid()) THEN RAISE EXCEPTION 'Active account required' USING ERRCODE='42501'; END IF;
 WITH sessions AS (
  SELECT e.song_id,e.stream_session_id,max(e.user_id::text) AS listener,min(e.received_at) AS started,max(e.position_seconds) AS listened
  FROM public.playback_events e JOIN public.songs s ON s.id=e.song_id AND s.user_id=auth.uid()
  WHERE e.stream_session_id IS NOT NULL AND e.event_type IN ('heartbeat','completion')
  GROUP BY e.song_id,e.stream_session_id
 ), qualified AS (
  SELECT x.* FROM sessions x JOIN public.songs s ON s.id=x.song_id
  WHERE x.listened>=least(30,greatest(1,floor(coalesce(s.duration,0)*0.5)::integer))
 ), daily AS (
  SELECT d::date AS day,count(q.song_id) AS plays,count(DISTINCT q.listener) AS listeners
  FROM generate_series(current_date-6,current_date,interval '1 day') d LEFT JOIN qualified q ON q.started::date=d::date GROUP BY d
 )
 SELECT jsonb_build_object(
  'totalPlays',(SELECT count(*) FROM qualified),
  'totalListeners',(SELECT count(DISTINCT listener) FROM qualified),
  'avgListenTime',(SELECT coalesce(round(avg(listened)),0) FROM qualified),
  'totalLikes',(SELECT count(*) FROM public.saved_songs f JOIN public.songs s ON s.id=f.song_id WHERE s.user_id=auth.uid()),
  'series',(SELECT jsonb_agg(jsonb_build_object('date',day,'plays',plays,'listeners',listeners) ORDER BY day) FROM daily)
 ) INTO result;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.artist_listening_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.artist_listening_metrics() TO authenticated;
