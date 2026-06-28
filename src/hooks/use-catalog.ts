import { useQuery } from "@tanstack/react-query";
import { ArtistApprovalStatus } from "@/lib/artist";
import { getAppError } from "@/lib/errors";
import { isSupabaseConfigured, Song, supabase } from "@/lib/supabase";
import { Artist, Track } from "@/types/music";

const toTrack = (song: Song): Track => ({
  id: song.id,
  userId: song.user_id,
  title: song.title,
  artist: song.artist,
  duration: song.duration || 0,
  coverUrl: song.cover_url,
  audioUrl: song.audio_url,
  genre: song.genre,
  totalPlays: song.total_plays || 0,
  totalLikes: song.total_likes || 0,
  createdAt: song.created_at,
});

export const useCatalog = () =>
  useQuery({
    queryKey: ["public-catalog"],
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        throw new Error("Connect Supabase to load the music catalog.");
      }

      const [songsResult, artistsResult] = await Promise.all([
        supabase
          .from("songs")
          .select("*")
          .eq("approval_status", "approved")
          .order("created_at", { ascending: false }),
        supabase
          .from("artist_profiles")
          .select("*")
          .eq("approval_status", ArtistApprovalStatus.Approved)
          .order("artist_name"),
      ]);

      const error = songsResult.error || artistsResult.error;
      if (error) throw getAppError(error);

      const tracks = ((songsResult.data || []) as Song[]).map(toTrack);
      const artists: Artist[] = (artistsResult.data || []).map((profile) => {
        const artistTracks = tracks.filter(
          (track) => track.userId === profile.user_id,
        );

        return {
          id: profile.id,
          userId: profile.user_id,
          name: profile.artist_name,
          bio: profile.bio,
          imageUrl:
            artistTracks.find((track) => track.coverUrl)?.coverUrl || "",
          genres: profile.genre ? [profile.genre] : [],
          location: profile.location || "",
        };
      });

      return { tracks, artists };
    },
    retry: 1,
  });
