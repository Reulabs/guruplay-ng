import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UploadSongModal from "@/components/dashboard/UploadSongModal";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Music, Upload } from "lucide-react";

interface ArtistProfileData {
  stage_name: string;
  bio: string;
  location: string;
  primary_genre: string;
  avatar_url: string;
  banner_url: string;
}

interface ArtistSong {
  id: string;
  title: string;
  artist: string;
  cover_url: string;
  total_plays: number;
  created_at: string;
}

interface WalletSummary {
  balance: number;
  currency: string;
}

const ArtistProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ArtistProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [songs, setSongs] = useState<ArtistSong[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const loadProfile = useCallback(async (userId: string, email: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("artist_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setProfile({
          stage_name: data.stage_name,
          bio: data.bio || "",
          location: data.location || "",
          primary_genre: data.primary_genre || "",
          avatar_url: data.avatar_url || "",
          banner_url: data.banner_url || "",
        });
      } else {
        const fallbackName = email ? email.split("@")[0] : "New Artist";
        setProfile({
          stage_name: fallbackName,
          bio: "",
          location: "",
          primary_genre: "",
          avatar_url: "",
          banner_url: "",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to load artist profile",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
      });
    } finally {
      setProfileLoading(false);
    }
  }, [toast]);

  const loadSongs = useCallback(async (userId: string) => {
    setSongsLoading(true);
    try {
      const { data, error } = await supabase
        .from("songs")
        .select("id, title, artist, cover_url, total_plays, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setSongs((data || []).map((song) => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        cover_url: song.cover_url,
        total_plays: song.total_plays,
        created_at: song.created_at,
      })));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to load songs",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
      });
    } finally {
      setSongsLoading(false);
    }
  }, [toast]);

  const loadWallet = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance, currency")
        .eq("user_id", userId)
        .limit(1);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setWallet({
          balance: Number(data[0].balance),
          currency: data[0].currency,
        });
      } else {
        setWallet(null);
      }
    } catch {
      setWallet(null);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const load = async () => {
      await Promise.all([loadProfile(user.id, user.email || ""), loadSongs(user.id), loadWallet(user.id)]);
    };

    load();
  }, [user, loadProfile, loadSongs, loadWallet]);

  const handleProfileChange = (field: keyof ArtistProfileData, value: string) => {
    if (!profile) {
      return;
    }
    setProfile({ ...profile, [field]: value });
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) {
      return;
    }

    setSavingProfile(true);
    try {
      const payload = {
        user_id: user.id,
        stage_name: profile.stage_name,
        bio: profile.bio,
        location: profile.location,
        primary_genre: profile.primary_genre,
        avatar_url: profile.avatar_url,
        banner_url: profile.banner_url,
      };

      const { error } = await supabase
        .from("artist_profiles")
        .upsert([payload], { onConflict: "user_id" });

      if (error) {
        throw error;
      }

      toast({
        title: "Profile updated",
        description: "Your artist profile has been saved.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to save profile",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSongUploaded = async (song: {
    name: string;
    artist: string;
    album: string;
    genre: string;
    description: string;
    coverFile: File | null;
    audioFile: File;
  }) => {
    if (!user) {
      return;
    }

    try {
      const audioPath = `${user.id}/${Date.now()}-${song.audioFile.name}`;

      const { error: audioError } = await supabase.storage.from("song-audio").upload(audioPath, song.audioFile, {
        cacheControl: "3600",
        upsert: false,
      });

      if (audioError) {
        throw audioError;
      }

      const {
        data: { publicUrl: audioUrl },
      } = supabase.storage.from("song-audio").getPublicUrl(audioPath);

      let coverUrl = "";

      if (song.coverFile) {
        const coverPath = `${user.id}/${Date.now()}-${song.coverFile.name}`;

        const { error: coverError } = await supabase.storage
          .from("song-covers")
          .upload(coverPath, song.coverFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (coverError) {
          throw coverError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("song-covers").getPublicUrl(coverPath);

        coverUrl = publicUrl;
      }

      const { data, error } = await supabase
        .from("songs")
        .insert([
          {
            user_id: user.id,
            title: song.name,
            artist: song.artist || profile?.stage_name || "You",
            cover_url: coverUrl,
            audio_url: audioUrl,
            duration: 0,
            genre: song.genre,
            total_plays: 0,
            total_likes: 0,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      const newSong: ArtistSong = {
        id: data.id,
        title: data.title,
        artist: data.artist,
        cover_url: data.cover_url,
        total_plays: data.total_plays,
        created_at: data.created_at,
      };

      setSongs((current) => [newSong, ...current]);

      toast({
        title: "Song uploaded",
        description: "Your track has been added to your catalog.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unable to upload song. Please try again.",
      });
    }
  };

  const initials = profile?.stage_name
    ? profile.stage_name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "AR";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="rounded-xl overflow-hidden bg-gradient-to-r from-purple-700 via-indigo-600 to-slate-900">
        <div className="h-40 sm:h-56 w-full bg-black/20" />
        <div className="px-6 pb-6 sm:pb-8 -mt-16 flex flex-col sm:flex-row sm:items-end gap-4">
          <Avatar className="h-24 w-24 border-4 border-background shadow-xl bg-muted">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.stage_name} />
            ) : (
              <AvatarFallback className="text-2xl font-semibold text-foreground">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 text-white">
            <p className="text-xs uppercase tracking-[0.18em] mb-1">Artist profile</p>
            <h1 className="text-3xl sm:text-4xl font-bold">Guruplay</h1>
            <p className="text-sm text-white/80 mt-1">
              {profileLoading ? "Loading artist profile..." : `${profile?.stage_name || "Guruplay Artist"} • ${songs.length} tracks`}
            </p>
            {profile?.primary_genre && <p className="text-xs text-white/70 mt-1">{profile.primary_genre}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() => setIsUploadOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload song
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle>Guruplay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stage_name">Stage name</Label>
                <Input
                  id="stage_name"
                  value={profile?.stage_name || ""}
                  onChange={(e) => handleProfileChange("stage_name", e.target.value)}
                  disabled={profileLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_genre">Primary genre</Label>
                <Input
                  id="primary_genre"
                  value={profile?.primary_genre || ""}
                  onChange={(e) => handleProfileChange("primary_genre", e.target.value)}
                  placeholder="Afrobeats, Hip-Hop, Amapiano"
                  disabled={profileLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={profile?.location || ""}
                  onChange={(e) => handleProfileChange("location", e.target.value)}
                  placeholder="Lagos, Nigeria"
                  disabled={profileLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={profile?.bio || ""}
                onChange={(e) => handleProfileChange("bio", e.target.value)}
                placeholder="Tell your listeners who you are and what your sound is about."
                rows={4}
                disabled={profileLoading}
              />
            </div>
            <div className="flex justify-end">
              <Button
                className="rounded-full"
                onClick={handleSaveProfile}
                disabled={profileLoading || savingProfile || !profile?.stage_name}
              >
                {savingProfile ? "Saving..." : "Save profile"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Guruplay wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {wallet ? (
              <>
                <p className="text-sm text-muted-foreground">Available balance</p>
                <p className="text-3xl font-bold">
                  {wallet.currency} {wallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Earnings from streams and monetized content are settled into this wallet.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Wallet not available yet.</p>
                <p className="text-xs text-muted-foreground">
                  Complete your artist profile and start uploading music to activate payouts.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Guruplay</CardTitle>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload song
          </Button>
        </CardHeader>
        <CardContent>
          {songsLoading ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              Loading your songs...
            </div>
          ) : songs.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
              <Music className="w-10 h-10 mb-1" />
              <p className="font-medium text-foreground">No songs uploaded yet</p>
              <p className="text-xs text-muted-foreground max-w-md">
                No music has been uploaded yet. Upload high quality audio and artwork to start building your Guruplay catalog.
              </p>
              <Button
                className="mt-2 rounded-full"
                onClick={() => setIsUploadOpen(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload your first song
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center gap-4 px-3 py-2 rounded-md hover:bg-muted/40 transition-colors"
                >
                  <div className="h-12 w-12 rounded-md bg-muted overflow-hidden flex-shrink-0">
                    {song.cover_url ? (
                      <img src={song.cover_url} alt={song.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        <Music className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{song.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {song.artist} • {new Date(song.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{song.total_plays.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">total plays</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UploadSongModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleSongUploaded}
      />
    </div>
  );
};

export default ArtistProfile;
