-- Use an explicit HTTP conflict code rather than a transaction-retry SQLSTATE.
CREATE OR REPLACE FUNCTION public.mutate_playlist(target uuid, action text, song uuid DEFAULT NULL, ordered_ids uuid[] DEFAULT NULL, expected_revision integer DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE p public.playlists; members uuid[];
BEGIN
 SELECT * INTO p FROM public.playlists WHERE id=target FOR UPDATE;
 IF NOT FOUND OR NOT public.owns_active_account(p.user_id) THEN RAISE EXCEPTION 'Playlist not found' USING ERRCODE='P0002'; END IF;
 IF action='add' THEN
  IF NOT EXISTS(SELECT 1 FROM public.public_catalog WHERE id=song) THEN RAISE EXCEPTION 'Song is unavailable' USING ERRCODE='P0002'; END IF;
  IF (SELECT count(*) FROM public.playlist_songs WHERE playlist_id=target)>=500 THEN RAISE EXCEPTION 'Playlist limit is 500 songs' USING ERRCODE='22023'; END IF;
  INSERT INTO public.playlist_songs(playlist_id,song_id,position) SELECT target,song,coalesce(max(position),-1)+1 FROM public.playlist_songs WHERE playlist_id=target ON CONFLICT DO NOTHING;
 ELSIF action='remove' THEN
  DELETE FROM public.playlist_songs WHERE playlist_id=target AND song_id=song;
 ELSIF action='order' THEN
  IF expected_revision IS DISTINCT FROM p.revision THEN RAISE EXCEPTION 'Playlist changed. Reload and try again.' USING ERRCODE='PT409'; END IF;
  SELECT coalesce(array_agg(song_id ORDER BY song_id),'{}'::uuid[]) INTO members FROM public.playlist_songs WHERE playlist_id=target;
  IF ordered_ids IS NULL OR cardinality(ordered_ids)<>cardinality(members) OR (SELECT coalesce(array_agg(x ORDER BY x),'{}'::uuid[]) FROM unnest(ordered_ids) x) IS DISTINCT FROM members THEN RAISE EXCEPTION 'Order must contain every song exactly once' USING ERRCODE='22023'; END IF;
  UPDATE public.playlist_songs s SET position=o.ordinality-1 FROM unnest(ordered_ids) WITH ORDINALITY o(id,ordinality) WHERE s.playlist_id=target AND s.song_id=o.id;
 ELSE RAISE EXCEPTION 'Invalid playlist action' USING ERRCODE='22023'; END IF;
 UPDATE public.playlists SET revision=revision+1 WHERE id=target;
END;
$$;
