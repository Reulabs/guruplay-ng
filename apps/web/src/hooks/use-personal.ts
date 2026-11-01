import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { toTrack } from "@/hooks/use-catalog";
import { readApiResponse } from "@guruplay/common/http";
import { z } from "zod";
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
export const playlistSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string(),
    revision: z.number().int(),
    created_at: z.string(),
  })
  .transform(({ id, name, description, revision, created_at }) => ({
    id,
    name,
    description,
    revision,
    created_at,
  }));
export const ticketsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      subject: z.string(),
      message: z.string(),
      status: z.enum(["open", "resolved"]),
      response: z.string(),
      created_at: z.string(),
    }),
  ),
});
const settingsSchema = z
  .object({
    display_name: z.string(),
    preferences: z.object({
      volume: z.number().min(0).max(1),
      autoplay: z.boolean(),
      private_session: z.boolean(),
    }),
  })
  .transform(({ display_name, preferences }) => ({
    display_name,
    preferences: {
      volume: preferences.volume,
      autoplay: preferences.autoplay,
      private_session: preferences.private_session,
    },
  }));
const songSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    title: z.string(),
    artist: z.string(),
    cover_url: z.string().nullable(),
    duration: z.number(),
    genre: z.string().nullable(),
    total_plays: z.number(),
    total_likes: z.number(),
    created_at: z.string(),
    preview_object_path: z.string(),
    processing_status: z.literal("ready"),
  })
  .transform(
    ({
      id,
      user_id,
      title,
      artist,
      cover_url,
      duration,
      genre,
      total_plays,
      total_likes,
      created_at,
      preview_object_path,
      processing_status,
    }) => ({
      id,
      user_id,
      title,
      artist,
      cover_url,
      duration,
      genre,
      total_plays,
      total_likes,
      created_at,
      preview_object_path,
      processing_status,
    }),
  );
const librarySchema = z.object({
  saved: z.array(songSchema),
  history: z.array(
    z.intersection(songSchema, z.object({ played_at: z.string() })),
  ),
});
const playlistContentsSchema = z.object({
  item: playlistSchema,
  songIds: z.array(z.string().uuid()),
  tracks: z.array(songSchema),
});

export async function personalRequest<T>(
  path: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Sign in to continue.");
  let response: Response;
  try {
    response = await fetch(`/api/v1/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
        : AbortSignal.timeout(20000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(
      "We couldn’t connect to Guruplay. Check your connection and try again.",
    );
  }
  const result = await readApiResponse(response);
  const parsed = schema.safeParse(result);
  if (!parsed.success)
    throw new Error(
      "We couldn’t read this part of Guruplay. Please try again shortly.",
    );
  return parsed.data;
}
export function useSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["personal", user?.id, "settings"],
    enabled: !!user,
    queryFn: ({ signal }) =>
      personalRequest("me/settings", settingsSchema, "GET", undefined, signal),
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
    }) => personalRequest(path, z.record(z.unknown()), method, body),
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
    queryFn: async ({ signal }) => {
      const result = await personalRequest(
        "library",
        librarySchema,
        "GET",
        undefined,
        signal,
      );
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
    queryFn: ({ signal }) =>
      personalRequest(
        "playlists",
        z.object({ items: z.array(playlistSchema) }),
        "GET",
        undefined,
        signal,
      ),
    retry: 1,
  });
}
export function usePlaylist(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["personal", user?.id, "playlist", id],
    enabled: !!user && !!id,
    queryFn: async ({ signal }) => {
      const result = await personalRequest(
        `playlists/${id}`,
        playlistContentsSchema,
        "GET",
        undefined,
        signal,
      );
      return { ...result, tracks: result.tracks.map(toTrack) };
    },
    retry: 1,
  });
}
