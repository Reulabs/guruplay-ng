import { z } from "zod";
import { supabase } from "@/lib/supabase";

export type UploadStage = "audio" | "cover" | "register";
export interface SongUpload {
  id: string;
  userId: string;
  title: string;
  artist: string;
  genre: string;
  audio: File;
  cover: File | null;
}

export function audioFileError(file: File): string | null {
  if (!/\.(mp3|wav|flac|m4a|aac|ogg|opus)$/i.test(file.name))
    return "Choose an MP3, WAV, FLAC, M4A, AAC, OGG or OPUS audio file.";
  if (file.size === 0) return "This file is empty. Choose another audio file.";
  if (file.size > 200 * 1024 * 1024)
    return "This audio file is too large. The limit is 200 MB.";
  return null;
}

export function coverFileError(file: File): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return "Choose a JPEG, PNG or WebP image.";
  if (file.size === 0 || file.size > 10 * 1024 * 1024)
    return "Choose a cover image between 1 byte and 10 MB.";
  return null;
}

export async function uploadSong(
  input: SongUpload,
  onStage: (stage: UploadStage) => void,
) {
  const audioError = audioFileError(input.audio);
  const coverError = input.cover ? coverFileError(input.cover) : null;
  if (audioError || coverError)
    throw new Error(audioError || coverError || "Choose a valid file.");
  const { data, error: authError } = await supabase.auth.getSession();
  if (authError || !data.session || data.session.user.id !== input.userId)
    throw new Error("Your session has expired. Sign in before uploading.");
  const filename = (name: string) =>
    name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-160);
  const audioPath = `${input.userId}/${input.id}-${filename(input.audio.name)}`;
  const coverPath = input.cover
    ? `${input.userId}/${input.id}-${filename(input.cover.name)}`
    : null;
  let registering = false;
  try {
    onStage("audio");
    const audio = await supabase.storage
      .from("song-audio")
      .upload(audioPath, input.audio, {
        contentType: input.audio.type || "application/octet-stream",
        upsert: false,
      });
    if (audio.error && audio.error.statusCode !== "409")
      throw new Error(audio.error.message);
    let coverUrl = "";
    if (input.cover && coverPath) {
      onStage("cover");
      const cover = await supabase.storage
        .from("song-covers")
        .upload(coverPath, input.cover, {
          contentType: input.cover.type,
          upsert: false,
        });
      if (cover.error && cover.error.statusCode !== "409")
        throw new Error(cover.error.message);
      coverUrl = supabase.storage.from("song-covers").getPublicUrl(coverPath)
        .data.publicUrl;
    }
    onStage("register");
    registering = true;
    const response = await fetch("/api/v1/media/songs/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({
        uploadId: input.id,
        audioPath,
        coverUrl,
        title: input.title.trim(),
        artist: input.artist.trim(),
        genre: input.genre.trim(),
      }),
      signal: AbortSignal.timeout(30000),
    });
    const result: unknown = await response.json();
    if (!response.ok)
      throw new Error(
        result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
          ? result.error
          : "The upload could not be confirmed. Check My uploads or retry this upload.",
      );
    return z
      .object({ id: z.string().uuid(), processingStatus: z.string() })
      .parse(result);
  } catch (error) {
    if (!registering) {
      const audioCleanup = await supabase.storage
        .from("song-audio")
        .remove([audioPath]);
      const coverCleanup = coverPath
        ? await supabase.storage.from("song-covers").remove([coverPath])
        : null;
      if (audioCleanup.error || coverCleanup?.error)
        throw new Error(
          "The upload was interrupted and its files could not be cleared. Retry this upload before starting another.",
        );
    }
    throw error instanceof Error
      ? error
      : new Error(
          "The upload could not be confirmed. Check My uploads before trying again.",
        );
  }
}
