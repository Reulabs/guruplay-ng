CREATE TABLE public.user_settings (
 user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
 volume real NOT NULL DEFAULT 0.7 CHECK(volume BETWEEN 0 AND 1),
 autoplay boolean NOT NULL DEFAULT true,
 private_session boolean NOT NULL DEFAULT false
);
CREATE TABLE public.saved_songs (
 user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 song_id uuid NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,song_id)
);
CREATE TABLE public.playlists (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 80),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=500),
 revision integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.playlist_songs (
 playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
 song_id uuid NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
 position integer NOT NULL CHECK(position>=0),
 PRIMARY KEY(playlist_id,song_id)
);
CREATE TABLE public.support_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 subject text NOT NULL CHECK(length(trim(subject)) BETWEEN 1 AND 120),
 message text NOT NULL CHECK(length(trim(message)) BETWEEN 10 AND 4000),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
 response text NOT NULL DEFAULT '' CHECK(length(response)<=4000),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.owns_active_account(target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT target=auth.uid() AND EXISTS(SELECT 1 FROM public.users WHERE id=auth.uid() AND account_status='active'); $$;
REVOKE ALL ON FUNCTION public.owns_active_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_active_account(uuid) TO authenticated;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_settings ON public.user_settings FOR ALL TO authenticated USING(public.owns_active_account(user_id)) WITH CHECK(public.owns_active_account(user_id));
CREATE POLICY read_saved ON public.saved_songs FOR SELECT TO authenticated USING(public.owns_active_account(user_id));
CREATE POLICY delete_saved ON public.saved_songs FOR DELETE TO authenticated USING(public.owns_active_account(user_id));
CREATE POLICY insert_saved ON public.saved_songs FOR INSERT TO authenticated WITH CHECK(public.owns_active_account(user_id) AND EXISTS(SELECT 1 FROM public.public_catalog WHERE id=song_id));
CREATE POLICY own_playlists ON public.playlists FOR ALL TO authenticated USING(public.owns_active_account(user_id)) WITH CHECK(public.owns_active_account(user_id));
CREATE POLICY read_playlist_songs ON public.playlist_songs FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.playlists p WHERE p.id=playlist_id AND public.owns_active_account(p.user_id)));
CREATE POLICY read_support ON public.support_tickets FOR SELECT TO authenticated USING(public.owns_active_account(user_id) OR public.is_admin());
REVOKE ALL ON public.user_settings,public.saved_songs,public.playlists,public.playlist_songs,public.support_tickets FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.user_settings,public.playlists TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.saved_songs TO authenticated;
GRANT SELECT ON public.playlist_songs,public.support_tickets TO authenticated;
GRANT ALL ON public.user_settings,public.saved_songs,public.playlists,public.playlist_songs,public.support_tickets TO service_role;
CREATE INDEX playlist_owner_idx ON public.playlists(user_id,created_at DESC);
CREATE INDEX support_owner_idx ON public.support_tickets(user_id,created_at DESC);
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
  IF expected_revision IS DISTINCT FROM p.revision THEN RAISE EXCEPTION 'Playlist changed. Reload and try again.' USING ERRCODE='40001'; END IF;
  SELECT coalesce(array_agg(song_id ORDER BY song_id),'{}'::uuid[]) INTO members FROM public.playlist_songs WHERE playlist_id=target;
  IF ordered_ids IS NULL OR cardinality(ordered_ids)<>cardinality(members) OR (SELECT coalesce(array_agg(x ORDER BY x),'{}'::uuid[]) FROM unnest(ordered_ids) x) IS DISTINCT FROM members THEN RAISE EXCEPTION 'Order must contain every song exactly once' USING ERRCODE='22023'; END IF;
  UPDATE public.playlist_songs s SET position=o.ordinality-1 FROM unnest(ordered_ids) WITH ORDINALITY o(id,ordinality) WHERE s.playlist_id=target AND s.song_id=o.id;
 ELSE RAISE EXCEPTION 'Invalid playlist action' USING ERRCODE='22023'; END IF;
 UPDATE public.playlists SET revision=revision+1 WHERE id=target;
END;
$$;
REVOKE ALL ON FUNCTION public.mutate_playlist(uuid,text,uuid,uuid[],integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mutate_playlist(uuid,text,uuid,uuid[],integer) TO authenticated;
