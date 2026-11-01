import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  FileAudio,
  ImagePlus,
  Loader2,
  Music2,
  Upload as UploadIcon,
} from "lucide-react";
import { Button } from "@guruplay/ui/button";
import { Input } from "@guruplay/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@guruplay/ui/alert-dialog";
import EmptyState from "@guruplay/shared/fallbacks/EmptyState";
import ErrorState from "@guruplay/shared/fallbacks/ErrorState";
import MusicSkeleton from "@guruplay/shared/fallbacks/MusicSkeleton";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { MUSIC_GENRES } from "@/config/music";
import {
  audioFileError,
  coverFileError,
  SongUpload,
  uploadSong,
  UploadStage,
} from "@/lib/upload-song";
import { cn } from "@guruplay/ui/utils";

const accountSchema = z.object({
  user_type: z.enum(["user", "artist", "admin"]),
  account_status: z.enum(["active", "paused", "deleted"]),
});
const artistSchema = z
  .object({
    artist_name: z.string(),
    approval_status: z.enum(["not_applied", "pending", "approved", "rejected"]),
  })
  .nullable();
const songSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  approval_status: z.enum(["pending", "approved", "rejected"]),
  processing_status: z.enum([
    "uploaded",
    "processing",
    "ready",
    "failed",
    "quarantined",
  ]),
  rejection_reason: z.string().nullable().optional(),
});
const size = (file: File) => `${(file.size / 1024 / 1024).toFixed(1)} MB`;
const stages = {
  audio: "Uploading your audio",
  cover: "Uploading your artwork",
  register: "Saving your release",
} satisfies Record<UploadStage, string>;

function useLocalFile(file: File | null) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

export default function Upload() {
  const { user, isAuthLoading, openAuthDialog } = useAuth();
  const cache = useQueryClient();
  const [step, setStep] = useState(0);
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState<string | null>(null);
  const [genre, setGenre] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<UploadStage>("audio");
  const [attempt, setAttempt] = useState<SongUpload | null>(null);
  const [submittedId, setSubmittedId] = useState("");
  const [discard, setDiscard] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const audioUrl = useLocalFile(audio);
  const coverUrl = useLocalFile(cover);

  const access = useQuery({
    queryKey: ["upload-access", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [account, profile] = await Promise.all([
        supabase
          .from("users")
          .select("user_type,account_status")
          .eq("id", user.id)
          .single(),
        supabase
          .from("artist_profiles")
          .select("artist_name,approval_status")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (account.error || profile.error)
        throw new Error(
          "We couldn’t check your upload access. Please try again.",
        );
      return {
        ...accountSchema.parse(account.data),
        profile: artistSchema.parse(profile.data),
      };
    },
    retry: 1,
  });
  const result = useQuery({
    queryKey: ["upload-result", user?.id, submittedId],
    enabled: !!user && !!submittedId,
    queryFn: async () => {
      const response = await supabase
        .from("my_songs")
        .select("id,title,approval_status,processing_status,rejection_reason")
        .eq("id", submittedId)
        .single();
      if (response.error)
        throw new Error(
          "We couldn’t refresh the release status. Your upload may still be processing.",
        );
      return songSchema.parse(response.data);
    },
    refetchInterval: (query) =>
      query.state.data &&
      ["ready", "failed", "quarantined"].includes(
        query.state.data.processing_status,
      )
        ? false
        : 2500,
    retry: 1,
  });
  const isAdmin = access.data?.user_type === "admin";
  const canUpload =
    access.data?.account_status === "active" &&
    (isAdmin ||
      (access.data?.user_type === "artist" &&
        access.data.profile?.approval_status === "approved"));
  const artistName =
    attempt?.artist ??
    artist ??
    access.data?.profile?.artist_name ??
    user?.displayName ??
    "";

  useEffect(() => {
    if (result.data?.processing_status === "ready")
      void cache.invalidateQueries({ queryKey: ["public-catalog"] });
  }, [cache, result.data?.processing_status]);
  useEffect(() => {
    if (submittedId) window.scrollTo({ top: 0, behavior: "auto" });
  }, [submittedId]);
  useEffect(() => {
    if (!audio || submittedId) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [audio, submittedId]);
  useEffect(() => {
    setStep(0);
    setAudio(null);
    setCover(null);
    setTitle("");
    setArtist(null);
    setGenre("");
    setAttempt(null);
    setSubmittedId("");
    setError("");
  }, [user?.id]);

  const reset = () => {
    setAudio(null);
    setCover(null);
    setTitle("");
    setArtist(null);
    setGenre("");
    setStep(0);
    setAttempt(null);
    setSubmittedId("");
    setDuration(null);
    setError("");
    setDiscard(false);
  };
  const selectAudio = (file?: File) => {
    if (!file || attempt || busy) return;
    const failure = audioFileError(file);
    setError(failure || "");
    if (failure) {
      setAudio(null);
      setDuration(null);
      return;
    }
    setAudio(file);
    setDuration(null);
    if (!title.trim())
      setTitle(
        file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[_-]+/g, " ")
          .slice(0, 160),
      );
  };
  const selectCover = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const failure = coverFileError(file);
    setError(failure || "");
    if (!failure) setCover(file);
    event.target.value = "";
  };
  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length !== 1) {
      setError("Choose one audio file for this release.");
      return;
    }
    selectAudio(event.dataTransfer.files[0]);
  };
  const next = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (step === 0 && !audio) {
      setError("Choose an audio file to continue.");
      return;
    }
    if (step === 1 && (!title.trim() || !artistName.trim() || !genre.trim())) {
      setError("Add a song title, artist name and genre.");
      return;
    }
    setStep((current) => Math.min(2, current + 1));
  };
  const submit = async () => {
    if (busy || !user || !audio || !canUpload) return;
    const submission = attempt || {
      id: crypto.randomUUID(),
      userId: user.id,
      audio,
      cover,
      title: title.trim(),
      artist: artistName.trim(),
      genre: genre.trim(),
    };
    setAttempt(submission);
    setBusy(true);
    setError("");
    try {
      const receipt = await uploadSong(submission, setStage);
      setSubmittedId(receipt.id);
      await cache.invalidateQueries({ queryKey: ["personal", user.id] });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "We couldn’t confirm the upload. Check My uploads before trying again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const heading = (
    <div className="mb-8">
      <Link
        to="/"
        className="mb-7 inline-flex items-center gap-2 text-xs font-medium text-white/45 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to discover
      </Link>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        Guruplay for artists
      </p>
      <h1 className="text-3xl font-black tracking-[-0.04em] md:text-4xl">
        Your next release starts here.
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-white/45">
        Bring your sound to Guruplay. Add your audio, tell us about the track,
        and review your release.
      </p>
    </div>
  );
  if (isAuthLoading || (user && access.isLoading))
    return (
      <div className="p-5 md:p-9">
        {heading}
        <MusicSkeleton rows count={4} />
      </div>
    );
  if (!user)
    return (
      <div className="p-5 pb-32 md:p-9 md:pb-32">
        {heading}
        <EmptyState
          icon={UploadIcon}
          title="Sign in to upload your music"
          description="Use your Guruplay account to continue. New artists can apply for upload access from their dashboard."
          actionLabel="Sign in to continue"
          onAction={() => openAuthDialog("login")}
        />
        <p className="mt-5 text-center text-sm text-white/45">
          New to Guruplay?{" "}
          <button
            className="font-semibold text-white hover:underline"
            onClick={() => openAuthDialog("signup")}
          >
            Create an account
          </button>
        </p>
      </div>
    );
  if (access.error)
    return (
      <div className="p-5 md:p-9">
        {heading}
        <ErrorState
          description={access.error.message}
          onRetry={() => void access.refetch()}
        />
      </div>
    );
  if (!canUpload) {
    const status = access.data?.profile?.approval_status;
    const active = access.data?.account_status === "active";
    return (
      <div className="p-5 pb-32 md:p-9 md:pb-32">
        {heading}
        <EmptyState
          icon={Music2}
          title={
            !active
              ? "Your account is unavailable"
              : status === "pending"
                ? "Your artist application is under review"
                : status === "rejected"
                  ? "Your artist application needs an update"
                  : "Make it official. Become a Guruplay artist."
          }
          description={
            !active
              ? "Contact support to check your account access."
              : status === "pending"
                ? "You’ll be able to upload once your artist profile is approved. You can check your application in your dashboard."
                : "Create or update your artist profile. Uploading becomes available after your application is approved."
          }
        />
        <div className="mt-5 flex justify-center">
          <Button asChild className="rounded-full px-6">
            <Link to={active ? "/dashboard" : "/support"}>
              {active
                ? status
                  ? "View application"
                  : "Create artist profile"
                : "Get support"}
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  if (submittedId) {
    const failed = ["failed", "quarantined"].includes(
      result.data?.processing_status || "",
    );
    const ready = result.data?.processing_status === "ready";
    const live = ready && result.data?.approval_status === "approved";
    const rejected = result.data?.approval_status === "rejected";
    return (
      <div className="mx-auto max-w-3xl p-5 pb-48 pt-10 md:p-9 md:pb-40 md:pt-14">
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 md:p-10">
          <span className="mb-6 grid h-12 w-12 place-items-center rounded-full bg-primary/10">
            <CircleCheck className="h-6 w-6 text-primary" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
            {live ? "Release published" : "Upload received"}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
            {failed
              ? "Your audio needs another look."
              : rejected
                ? "Your release needs an update."
                : live
                  ? "Your track is live."
                  : ready
                    ? "Submitted for review."
                    : "Your sound is on its way."}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/50">
            {failed
              ? "The audio could not be processed. Check that the file plays correctly, then upload a supported version."
              : rejected
                ? result.data?.rejection_reason ||
                  "Review your release in My uploads for more details."
                : live
                  ? "Your release is now available in the Guruplay catalog."
                  : ready
                    ? "Your audio is ready. An administrator will review the track before it appears in the public catalog."
                    : "We’re preparing the audio for listening. You can leave this page and check its status in My uploads."}
          </p>
          <div className="my-7 flex items-center gap-4 rounded-lg bg-white/[0.035] p-4">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt="Your release artwork"
                className="h-16 w-16 rounded-md object-cover"
              />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-md bg-white/5">
                <Music2 className="h-6 w-6 text-white/30" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate font-bold">{attempt?.title || title}</h2>
              <p className="mt-1 truncate text-xs text-white/45">
                {artistName} · {genre}
              </p>
              <p className="mt-2 text-xs text-primary">
                {failed
                  ? "Processing failed"
                  : live
                    ? "Published"
                    : ready
                      ? "Awaiting review"
                      : "Processing audio"}
              </p>
            </div>
          </div>
          {result.error && (
            <div className="mb-5">
              <ErrorState
                description={result.error.message}
                onRetry={() => void result.refetch()}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-full">
              <Link
                to={
                  live
                    ? `/search?q=${encodeURIComponent(attempt?.title || title)}`
                    : "/dashboard"
                }
              >
                {live ? "Listen to your release" : "My uploads"}
              </Link>
            </Button>
            <Button variant="outline" className="rounded-full" onClick={reset}>
              Upload another track
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl p-5 pb-48 md:p-9 md:pb-40">
      {heading}
      <ol
        aria-label="Upload steps"
        className="mb-8 grid grid-cols-3 gap-2 border-b border-white/10 pb-6"
      >
        {["Audio", "Details", "Review"].map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 text-xs font-semibold sm:gap-3 sm:text-sm",
              index === step ? "text-white" : "text-white/35",
            )}
          >
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs",
                index <= step
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-white/15",
              )}
            >
              {index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
        <form onSubmit={next} className="min-w-0">
          <div className="rounded-2xl border border-white/10 bg-[#121212] p-5 sm:p-7">
            {step === 0 ? (
              <>
                <h2 className="text-xl font-bold tracking-tight">
                  Start with your audio.
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  One track. Your original sound.
                </p>
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={drop}
                  className={cn(
                    "mt-7 flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed px-5 py-8 text-center transition-colors",
                    dragging
                      ? "border-primary bg-primary/5"
                      : "border-white/20 bg-white/[0.015]",
                  )}
                >
                  <FileAudio className="mb-4 h-9 w-9 text-primary" />
                  <p className="max-w-full break-words text-sm font-semibold">
                    {audio ? audio.name : "Drag your audio file here"}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-white/40">
                    {audio
                      ? `${size(audio)} · Ready for the next step`
                      : "Or choose a file from your device"}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5 rounded-full border-white/20 px-6"
                    onClick={() => audioInput.current?.click()}
                  >
                    {audio ? "Choose another file" : "Choose audio file"}
                  </Button>
                  <input
                    id="audio-file"
                    aria-label="Audio file"
                    ref={audioInput}
                    type="file"
                    accept=".mp3,.wav,.flac,.m4a,.aac,.ogg,.opus"
                    className="sr-only"
                    onChange={(event) => {
                      selectAudio(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </div>
                {audioUrl && (
                  <audio
                    key={audioUrl}
                    controls
                    preload="metadata"
                    aria-label="Preview selected audio"
                    src={audioUrl}
                    className="mt-5 h-10 w-full"
                    onLoadedMetadata={(event) =>
                      setDuration(
                        Number.isFinite(event.currentTarget.duration)
                          ? event.currentTarget.duration
                          : null,
                      )
                    }
                  />
                )}
              </>
            ) : step === 1 ? (
              <>
                <h2 className="text-xl font-bold tracking-tight">
                  Tell us about the track.
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  These details help listeners find your release.
                </p>
                <div className="mt-7 space-y-5">
                  <label
                    className="block text-sm font-medium"
                    htmlFor="song-title"
                  >
                    Song title <span className="text-primary">*</span>
                    <Input
                      id="song-title"
                      required
                      maxLength={160}
                      autoFocus
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Name your track"
                      className="mt-2 h-11 bg-white/[0.025]"
                    />
                  </label>
                  <label
                    className="block text-sm font-medium"
                    htmlFor="artist-name"
                  >
                    Artist name <span className="text-primary">*</span>
                    <Input
                      id="artist-name"
                      required
                      maxLength={160}
                      value={artistName}
                      onChange={(event) => setArtist(event.target.value)}
                      className="mt-2 h-11 bg-white/[0.025]"
                    />
                  </label>
                  <label
                    className="block text-sm font-medium"
                    htmlFor="song-genre"
                  >
                    Genre <span className="text-primary">*</span>
                    <select
                      id="song-genre"
                      required
                      value={genre}
                      onChange={(event) => setGenre(event.target.value)}
                      className="mt-2 h-11 w-full rounded-md border border-input bg-[#181818] px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="" disabled>
                        Select a genre
                      </option>
                      {MUSIC_GENRES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div>
                    <p className="text-sm font-medium">
                      Cover artwork{" "}
                      <span className="font-normal text-white/40">
                        · Optional
                      </span>
                    </p>
                    <div className="mt-3 flex items-center gap-4">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt="Selected cover artwork"
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-dashed border-white/15">
                          <ImagePlus className="h-6 w-6 text-white/30" />
                        </span>
                      )}
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => coverInput.current?.click()}
                        >
                          {cover ? "Replace artwork" : "Choose artwork"}
                        </Button>
                        <p className="mt-2 text-xs text-white/35">
                          JPEG, PNG or WebP · Up to 10 MB
                        </p>
                        {cover && (
                          <button
                            type="button"
                            onClick={() => setCover(null)}
                            className="mt-2 text-xs text-white/60 hover:text-white"
                          >
                            Remove artwork
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="file"
                      id="cover-file"
                      ref={coverInput}
                      aria-label="Cover artwork"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={selectCover}
                      className="sr-only"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold tracking-tight">
                  Ready for the first listen?
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Check the details before you upload.
                </p>
                <div className="mt-7 flex items-start gap-5">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt="Release artwork"
                      className="h-24 w-24 shrink-0 rounded-lg object-cover sm:h-32 sm:w-32"
                    />
                  ) : (
                    <span className="grid h-24 w-24 shrink-0 place-items-center rounded-lg bg-white/5 sm:h-32 sm:w-32">
                      <Music2 className="h-8 w-8 text-white/25" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <h3 className="break-words text-lg font-bold">{title}</h3>
                    <p className="mt-2 break-words text-sm text-white/50">
                      {artistName}
                    </p>
                    <p className="mt-3 text-xs text-white/40">
                      {genre} · {audio ? size(audio) : ""}
                      {duration !== null
                        ? ` · ${Math.floor(duration / 60)}:${Math.floor(
                            duration % 60,
                          )
                            .toString()
                            .padStart(2, "0")}`
                        : ""}
                    </p>
                    <p className="mt-4 text-xs leading-5 text-white/40">
                      {isAdmin
                        ? "Your track will be published after audio processing."
                        : "Your track will be reviewed before it appears publicly."}
                    </p>
                  </div>
                </div>
                {busy && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mt-7 flex items-center gap-3 rounded-lg border border-white/10 p-4 text-sm"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    {stages[stage]}…
                  </div>
                )}
                <p className="mt-7 border-t border-white/10 pt-5 text-xs leading-6 text-white/40">
                  Only upload music you own or have permission to share.
                </p>
              </>
            )}
            {error && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm leading-6 text-red-200"
              >
                {error}
                {attempt && (
                  <Link
                    to="/dashboard"
                    className="mt-2 block font-semibold underline"
                  >
                    Check My uploads
                  </Link>
                )}
              </div>
            )}
            <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-6">
              <Button
                type="button"
                variant="ghost"
                className="px-2 text-white/50"
                disabled={busy || !!attempt}
                onClick={() => (step ? setStep(step - 1) : setDiscard(true))}
              >
                {step ? (
                  <>
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back
                  </>
                ) : (
                  "Clear selection"
                )}
              </Button>
              {step < 2 ? (
                <Button
                  type="submit"
                  className="rounded-full px-6"
                  disabled={step === 0 && !audio}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="rounded-full px-6"
                  disabled={busy}
                  onClick={() => void submit()}
                >
                  {busy
                    ? "Uploading…"
                    : attempt
                      ? "Retry this upload"
                      : "Upload track"}
                  {!busy && <UploadIcon className="ml-2 h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </form>
        <aside className="space-y-6 text-xs leading-6 text-white/40">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-white/80">
              A little preparation goes a long way.
            </h2>
            <p>
              Choose the best-quality version of your track. You can preview the
              audio before uploading.
            </p>
          </div>
          <div className="border-t border-white/10 pt-5">
            <p className="font-medium text-white/60">Supported audio</p>
            <p className="mt-1">MP3, WAV, FLAC, M4A, AAC, OGG and OPUS.</p>
            <p>Up to 200 MB per track.</p>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 font-semibold text-white/65 hover:text-white"
          >
            My uploads
            <ArrowUpRightIcon />
          </Link>
        </aside>
      </div>
      <AlertDialog open={discard} onOpenChange={setDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear this selection?</AlertDialogTitle>
            <AlertDialogDescription>
              The selected file and release details will be removed from this
              form. Nothing has been uploaded yet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={reset}>
              Clear selection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="h-3.5 w-3.5"
    >
      <path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
