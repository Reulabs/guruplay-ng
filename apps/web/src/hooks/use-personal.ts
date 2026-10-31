import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase, Song } from "@/lib/supabase";
import { toTrack } from "@/hooks/use-catalog";
export interface Preferences {
  volume: number;
  autoplay: boolean;
  private_session: boolean;
}
export interface SettingsData {
  display_name: string;
  preferences: Preferences;
}
export interface Playlist {
  id: string;
  name: string;
  description: string;
  revision: number;
  created_at: string;
}
export interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: "open" | "resolved";
  response: string;
  created_at: string;
}
export async function personalRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Sign in to continue.");
  const response = await fetch(`/api/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "The request could not be completed.");
  return result;
}
export function useSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["personal", user?.id, "settings"],
    enabled: !!user,
    queryFn: () => personalRequest<SettingsData>("me/settings"),
    retry: 1,
  });
}
export function usePersonalMutation() {
  const { user } = useAuth();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({
      path,
      method,
      body,
    }: {
      path: string;
      method: string;
      body?: unknown;
    }) => personalRequest(path, method, body),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ["personal", user?.id] });
      await cache.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
}
export function useLibrary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["personal", user?.id, "library"],
    enabled: !!user,
    queryFn: async () => {
      const result = await personalRequest<{
        saved: Song[];
        history: (Song & { played_at: string })[];
      }>("library");
      return {
        saved: result.saved.map(toTrack),
        history: result.history.map((song) => ({
          ...toTrack(song),
          playedAt: song.played_at,
        })),
      };
    },
    retry: 1,
  });
}
export function usePlaylists() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["personal", user?.id, "playlists"],
    enabled: !!user,
    queryFn: () => personalRequest<{ items: Playlist[] }>("playlists"),
    retry: 1,
  });
}
export function usePlaylist(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["personal", user?.id, "playlist", id],
    enabled: !!user && !!id,
    queryFn: async () => {
      const result = await personalRequest<{
        item: Playlist;
        songIds: string[];
        tracks: Song[];
      }>(`playlists/${id}`);
      return { ...result, tracks: result.tracks.map(toTrack) };
    },
    retry: 1,
  });
}
