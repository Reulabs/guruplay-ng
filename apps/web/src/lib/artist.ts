export enum UserType {
  User = "user",
  Artist = "artist",
  Admin = "admin",
}

export enum ArtistApprovalStatus {
  NotApplied = "not_applied",
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
}

export interface ArtistProfile {
  id: string;
  user_id: string;
  artist_name: string;
  bio: string;
  genre: string;
  location: string;
  website_url: string;
  social_url: string;
  approval_status: ArtistApprovalStatus;
  created_at: string;
  updated_at: string;
}
