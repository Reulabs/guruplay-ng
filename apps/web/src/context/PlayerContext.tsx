import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useLibrary,
  useSettings,
  usePersonalMutation,
} from "@/hooks/use-personal";
import { useToast } from "@/hooks/use-toast";
import { Track } from "@/types/music";
import { supabase } from "@/lib/supabase";
import { PlaybackEventType, PlaybackState } from "@guruplay/common/music";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/use-subscription";

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  state: PlaybackState;
  isPreview: boolean;
  showUpgrade: boolean;
  checkoutLoading: boolean;
  likedTrackIds: ReadonlySet<string>;
  progress: number;
  duration: number;
  volume: number;
  queue: Track[];
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  play: (track?: Track) => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  playPlaylist: (tracks: Track[], startIndex?: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  closeUpgrade: () => void;
  startSubscription: () => Promise<void>;
  toggleLike: (trackId: string) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);
export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context)
    throw new Error("usePlayer must be used within a PlayerProvider");
  return context;
};

const getAnonymousId = () => {
  try {
    const key = "guruplay-anonymous-id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return undefined;
  }
};

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { openAuthDialog, isAuthenticated, isAuthDialogOpen } = useAuth();
  const subscription = useSubscription();
  const isPremium = subscription.data?.entitled === true;
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [state, setState] = useState<PlaybackState>("idle");
  const [isPreview, setIsPreview] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  useEffect(() => {
    if (isAuthDialogOpen || isPremium) setShowUpgrade(false);
  }, [isAuthDialogOpen, isPremium]);
  const library = useLibrary();
  const settings = useSettings();
  const mutation = usePersonalMutation();
  const { toast } = useToast();
  const likedTrackIds = useMemo(
    () =>
      new Set(
        (isAuthenticated ? library.data?.saved || [] : []).map(
          (track) => track.id,
        ),
      ),
    [isAuthenticated, library.data?.saved],
  );
  const historyRef = useRef<Track[]>([]);
  const currentTrackRef = useRef<Track | null>(null);
  const preferenceRef = useRef(settings.data?.preferences);
  preferenceRef.current = settings.data?.preferences;
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [queue, setQueue] = useState<Track[]>([]);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");
  const [originalQueue, setOriginalQueue] = useState<Track[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generationRef = useRef(0);
  const sessionRef = useRef<string | undefined>();
  const playRef = useRef<(track?: Track) => void>(() => undefined);

  const record = useCallback(
    async (
      eventType: PlaybackEventType,
      songId: string,
      positionSeconds = 0,
    ) => {
      const event = {
        eventId: crypto.randomUUID(),
        songId,
        eventType,
        positionSeconds: Math.max(0, Math.floor(positionSeconds)),
        clientOccurredAt: new Date().toISOString(),
        streamSessionId: sessionRef.current,
        anonymousId: getAnonymousId(),
      };
      try {
        const { data } = await supabase.auth.getSession();
        await fetch("/api/v1/playback/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(data.session?.access_token
              ? { Authorization: `Bearer ${data.session.access_token}` }
              : {}),
          },
          body: JSON.stringify({ events: [event] }),
          keepalive: true,
        });
      } catch {
        // Playback must continue when telemetry is unavailable.
      }
    },
    [],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState("paused");
  }, []);

  const next = useCallback(() => {
    if (
      currentTrack &&
      state === "playing" &&
      audioRef.current &&
      audioRef.current.currentTime < audioRef.current.duration - 2
    ) {
      void record("skip", currentTrack.id, audioRef.current.currentTime);
    }
    if (queue.length === 0) {
      if (repeat === "all" && originalQueue.length) {
        const replay = shuffle
          ? shuffleArray(originalQueue)
          : [...originalQueue];
        setQueue(replay.slice(1));
        playRef.current(replay[0]);
      }
      return;
    }
    const [track, ...remaining] = queue;
    setQueue(remaining);
    playRef.current(track);
  }, [currentTrack, originalQueue, queue, record, repeat, shuffle, state]);

  const play = useCallback(
    (track?: Track) => {
      if (!track) {
        if (audioRef.current && currentTrack) {
          audioRef.current
            .play()
            .then(() => setState("playing"))
            .catch(() => setState("blocked"));
        }
        return;
      }
      if (!track.previewUrl) {
        setState("error");
        return;
      }
      if (currentTrackRef.current && currentTrackRef.current.id !== track.id)
        historyRef.current.push(currentTrackRef.current);
      currentTrackRef.current = track;
      audioRef.current?.pause();
      setIsPreview(true);
      const generation = ++generationRef.current;
      sessionRef.current = undefined;
      setCurrentTrack(track);
      setProgress(0);
      setDuration(track.duration || 0);
      setShowUpgrade(false);
      setState("loading");

      void (async () => {
        let source = track.previewUrl;
        let preview = true;
        let streamSessionId: string | undefined;
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (accessToken) {
          try {
            const response = await fetch(
              `/api/v1/streams/${track.id}/session`,
              {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
              },
            );
            if (response.ok) {
              const session = await response.json();
              source = session.url;
              streamSessionId = session.id;
              preview = false;
            } else if (response.status !== 402) {
              const failure = await response.json().catch(() => null);
              if (response.status !== 401 && response.status !== 503)
                throw new Error(
                  failure?.error || "Playback authorization failed.",
                );
            }
          } catch {
            // A temporary API issue falls back to a public preview; full audio is never used.
          }
        }
        if (generation !== generationRef.current) return;
        const audio = audioRef.current;
        if (!audio) return;
        sessionRef.current = streamSessionId;
        setIsPreview(preview);
        audio.src = source;
        audio.load();
        try {
          await audio.play();
          if (generation === generationRef.current) {
            setState("playing");
            void record(
              preview ? "preview_start" : "full_play_start",
              track.id,
              0,
            );
          }
        } catch {
          if (generation === generationRef.current) setState("blocked");
        }
      })();
    },
    [currentTrack, record],
  );

  useEffect(() => {
    playRef.current = play;
  }, [play]);

  const previous = useCallback(() => {
    if (progress < 3 && historyRef.current.length) {
      const current = currentTrackRef.current;
      if (current)
        setQueue((tracks) => [
          current,
          ...tracks.filter((track) => track.id !== current.id),
        ]);
      const track = historyRef.current.pop();
      currentTrackRef.current = null;
      playRef.current(track);
    } else {
      if (audioRef.current) audioRef.current.currentTime = 0;
      setProgress(0);
    }
  }, [progress]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current || !Number.isFinite(time)) return;
    const bounded = Math.max(
      0,
      Math.min(time, audioRef.current.duration || 30),
    );
    audioRef.current.currentTime = bounded;
    setProgress(bounded);
  }, []);

  const setVolume = useCallback(
    (newVolume: number) => setVolumeState(Math.max(0, Math.min(1, newVolume))),
    [],
  );
  const addToQueue = useCallback(
    (track: Track) =>
      setQueue((current) =>
        current.some((item) => item.id === track.id)
          ? current
          : [...current, track],
      ),
    [],
  );
  const removeFromQueue = useCallback(
    (trackId: string) =>
      setQueue((current) => current.filter((item) => item.id !== trackId)),
    [],
  );
  const clearQueue = useCallback(() => setQueue([]), []);
  const playPlaylist = useCallback(
    (tracks: Track[], startIndex = 0) => {
      if (tracks.length === 0 || startIndex < 0 || startIndex >= tracks.length)
        return;
      const ordered = shuffle ? shuffleArray(tracks) : [...tracks];
      const first = tracks[startIndex];
      const remainder = shuffle
        ? ordered.filter((track) => track.id !== first.id)
        : [...tracks.slice(startIndex + 1), ...tracks.slice(0, startIndex)];
      setOriginalQueue([...tracks]);
      setQueue(remainder);
      play(first);
    },
    [play, shuffle],
  );

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    return () => {
      audio.pause();
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setProgress(audio.currentTime);
    };
    const onMetadata = () => setDuration(audio.duration);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMetadata);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMetadata);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (currentTrack)
        void record(
          isPreview ? "preview_complete" : "completion",
          currentTrack.id,
          audio.currentTime,
        );
      if (isPreview) {
        setState("ended");
        setShowUpgrade(!isAuthDialogOpen && !isPremium);
        return;
      }
      if (repeat === "one") {
        audio.currentTime = 0;
        audio
          .play()
          .then(() => setState("playing"))
          .catch(() => setState("blocked"));
      } else {
        setState("ended");
        if (preferenceRef.current?.autoplay !== false) next();
      }
    };
    const onError = () => {
      setState("error");
    };
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [
    currentTrack,
    isPreview,
    isAuthDialogOpen,
    isPremium,
    next,
    play,
    record,
    repeat,
  ]);

  useEffect(() => {
    setVolumeState(settings.data?.preferences.volume ?? 0.7);
  }, [settings.data?.preferences.volume]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (
      isAuthenticated ||
      !sessionRef.current ||
      !currentTrack ||
      !audioRef.current
    )
      return;
    audioRef.current.pause();
    audioRef.current.src = currentTrack.previewUrl;
    audioRef.current.load();
    sessionRef.current = undefined;
    setIsPreview(true);
    setState("paused");
    setProgress(0);
  }, [currentTrack, isAuthenticated]);

  const startSubscription = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setShowUpgrade(false);
      openAuthDialog("login");
      return;
    }
    setCheckoutLoading(true);
    try {
      const response = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      const result = await response.json();
      if (!response.ok || typeof result.authorizationUrl !== "string")
        throw new Error(result.error || "Unable to start payment.");
      if (currentTrack)
        sessionStorage.setItem("guruplay-return-track", currentTrack.id);
      window.location.assign(result.authorizationUrl);
    } finally {
      setCheckoutLoading(false);
    }
  }, [currentTrack, openAuthDialog]);

  const toggleLike = useCallback(
    (trackId: string) => {
      if (!isAuthenticated) {
        openAuthDialog("login");
        return;
      }
      if (mutation.isPending) return;
      if (library.error) {
        toast({
          title: "Could not load saved songs",
          description: library.error.message,
        });
        return;
      }
      const liked = likedTrackIds.has(trackId);
      void mutation
        .mutateAsync({
          path: `library/songs/${trackId}`,
          method: liked ? "DELETE" : "PUT",
        })
        .then(() => {
          void record(liked ? "unlike" : "like", trackId);
        })
        .catch((error: Error) =>
          toast({ title: "Could not save song", description: error.message }),
        );
    },
    [
      isAuthenticated,
      likedTrackIds,
      library.error,
      mutation,
      openAuthDialog,
      record,
      toast,
    ],
  );

  const toggle = useCallback(() => {
    if (state === "playing") pause();
    else if (isPremium && isPreview && currentTrack) play(currentTrack);
    else play();
  }, [pause, play, state, isPremium, isPreview, currentTrack]);

  const value: PlayerContextType = {
    currentTrack,
    isPlaying: state === "playing",
    state,
    isPreview,
    showUpgrade: showUpgrade && !isPremium,
    checkoutLoading,
    likedTrackIds,
    progress,
    duration,
    volume,
    queue,
    shuffle,
    repeat,
    play,
    pause,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    addToQueue,
    removeFromQueue,
    clearQueue,
    playPlaylist,
    toggleShuffle: () => {
      setShuffle((current) => !current);
      if (!shuffle) setQueue((current) => shuffleArray(current));
    },
    toggleRepeat: () =>
      setRepeat((current) =>
        current === "off" ? "all" : current === "all" ? "one" : "off",
      ),
    closeUpgrade: () => setShowUpgrade(false),
    startSubscription,
    toggleLike,
  };
  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
};

function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}
