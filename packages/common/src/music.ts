export type MediaProcessingStatus =
  | "uploaded"
  | "processing"
  | "ready"
  | "failed"
  | "quarantined";

export type PlaybackState =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "blocked"
  | "error"
  | "ended";

export type PlaybackAccess = "preview" | "full";

export type SubscriptionStatus =
  | "inactive"
  | "active"
  | "non_renewing"
  | "attention"
  | "completed"
  | "cancelled";

export interface Entitlement {
  entitled: boolean;
  status: SubscriptionStatus;
  paidThrough: string | null;
  graceEndsAt: string | null;
}

export interface PlaybackSession {
  id: string;
  songId: string;
  url: string;
  expiresAt: string;
  access: "full";
}

export type PlaybackEventType =
  | "impression"
  | "preview_start"
  | "preview_complete"
  | "full_play_start"
  | "heartbeat"
  | "completion"
  | "skip"
  | "like"
  | "unlike"
  | "dislike";

export interface PlaybackEvent {
  eventId: string;
  songId: string;
  streamSessionId?: string;
  anonymousId?: string;
  eventType: PlaybackEventType;
  positionSeconds: number;
  clientOccurredAt: string;
}

export interface RecommendationItem {
  songId: string;
  score: number;
  reason: string;
}

export interface Track {
  id: string;
  userId: string;
  title: string;
  artist: string;
  duration: number;
  coverUrl: string;
  previewUrl: string;
  availability: "ready";
  genre: string;
  totalPlays: number;
  totalLikes: number;
  createdAt: string;
}

export interface Artist {
  id: string;
  userId: string;
  name: string;
  bio: string;
  imageUrl: string;
  genres: string[];
  location: string;
}
