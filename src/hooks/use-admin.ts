import { useCallback, useEffect, useMemo, useState } from "react";
import { ArtistApprovalStatus, ArtistProfile, UserType } from "@/lib/artist";
import { getAppError, isSchemaTableMissingError } from "@/lib/errors";
import {
  isSupabaseConfigured,
  Song,
  supabase,
  UserActivity,
} from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  user_type: UserType;
  created_at: string;
  last_login: string;
}

export interface AdminActivity extends UserActivity {
  songs?: Pick<Song, "title" | "artist"> | null;
}

export interface AdminState {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  users: AdminUser[];
  artists: ArtistProfile[];
  songs: Song[];
  activity: AdminActivity[];
  refresh: () => Promise<void>;
  updateArtistStatus: (
    profileId: string,
    status: ArtistApprovalStatus.Approved | ArtistApprovalStatus.Rejected,
  ) => Promise<void>;
  deleteSong: (songId: string) => Promise<void>;
}

const emptyState = {
  users: [],
  artists: [],
  songs: [],
  activity: [],
};

export const useAdmin = (): AdminState => {
  const { user, isAuthenticated, isAuthLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [activity, setActivity] = useState<AdminActivity[]>([]);

  const resetData = useCallback(() => {
    setUsers(emptyState.users);
    setArtists(emptyState.artists);
    setSongs(emptyState.songs);
    setActivity(emptyState.activity);
  }, []);

  const refresh = useCallback(async () => {
    if (isAuthLoading) return;

    if (!isSupabaseConfigured) {
      setError("Supabase is not configured.");
      setIsAdmin(false);
      resetData();
      setLoading(false);
      return;
    }

    if (!isAuthenticated || !user) {
      setError(null);
      setIsAdmin(false);
      resetData();
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: account, error: accountError } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", user.id)
      .maybeSingle();

    if (accountError) {
      setError(
        isSchemaTableMissingError(accountError)
          ? "Admin access is not ready yet."
          : getAppError(accountError).message,
      );
      setIsAdmin(false);
      resetData();
      setLoading(false);
      return;
    }

    if (account?.user_type !== UserType.Admin) {
      setIsAdmin(false);
      resetData();
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    const [usersResult, artistsResult, songsResult, activityResult] =
      await Promise.all([
        supabase
          .from("users")
          .select("id,email,display_name,user_type,created_at,last_login")
          .order("created_at", { ascending: false }),
        supabase
          .from("artist_profiles")
          .select("*")
          .order("updated_at", { ascending: false }),
        supabase
          .from("songs")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("user_activity")
          .select("*,songs(title,artist)")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    const firstError =
      usersResult.error ||
      artistsResult.error ||
      songsResult.error ||
      activityResult.error;

    if (firstError) {
      setError(getAppError(firstError).message);
      resetData();
      setLoading(false);
      return;
    }

    setUsers((usersResult.data || []) as AdminUser[]);
    setArtists((artistsResult.data || []) as ArtistProfile[]);
    setSongs((songsResult.data || []) as Song[]);
    setActivity((activityResult.data || []) as AdminActivity[]);
    setLoading(false);
  }, [isAuthenticated, isAuthLoading, resetData, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateArtistStatus = useCallback(
    async (
      profileId: string,
      status: ArtistApprovalStatus.Approved | ArtistApprovalStatus.Rejected,
    ) => {
      const { error: updateError } = await supabase.rpc(
        "review_artist_application",
        {
          profile_id: profileId,
          next_status: status,
        },
      );

      if (updateError) throw getAppError(updateError);
      await refresh();
    },
    [refresh],
  );

  const deleteSong = useCallback(
    async (songId: string) => {
      const { error: deleteError } = await supabase
        .from("songs")
        .delete()
        .eq("id", songId);

      if (deleteError) throw getAppError(deleteError);
      await refresh();
    },
    [refresh],
  );

  return useMemo(
    () => ({
      isAdmin,
      loading,
      error,
      users,
      artists,
      songs,
      activity,
      refresh,
      updateArtistStatus,
      deleteSong,
    }),
    [
      activity,
      artists,
      deleteSong,
      error,
      isAdmin,
      loading,
      refresh,
      songs,
      updateArtistStatus,
      users,
    ],
  );
};
