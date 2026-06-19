import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Eye,
  Heart,
  Loader2,
  LogOut,
  Music,
  Music2,
  Plus,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import UploadSongModal from "@/components/dashboard/UploadSongModal";
import MetricCard from "@/components/dashboard/MetricCard";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import TopSongsTable from "@/components/dashboard/TopSongsTable";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { ArtistApprovalStatus, ArtistProfile, UserType } from "@/lib/artist";
import {
  AppErrorCode,
  getAppError,
  isSchemaTableMissingError,
} from "@/lib/errors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import Typography from "@/components/ui/typography";
import { useToast } from "@/hooks/use-toast";
import { genres } from "@/data/mockData";

interface UploadedSong {
  id: string;
  name: string;
  artist: string;
  coverUrl: string;
  plays: number;
  likes: number;
  uploadedAt: string;
}

interface DashboardMetrics {
  totalSongs: number;
  totalPlays: number;
  totalListeners: number;
  avgListenTime: number;
  totalLikes: number;
}

interface ArtistApplicationForm {
  artistName: string;
  genre: string;
  location: string;
  websiteUrl: string;
  socialUrl: string;
  bio: string;
}

const emptyMetrics: DashboardMetrics = {
  totalSongs: 0,
  totalPlays: 0,
  totalListeners: 0,
  avgListenTime: 0,
  totalLikes: 0,
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAuthLoading, logout, openAuthDialog } =
    useAuth();
  const { toast } = useToast();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(
    null,
  );
  const [uploadedSongs, setUploadedSongs] = useState<UploadedSong[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const [chartData, setChartData] = useState<
    { date: string; plays: number; listeners: number }[]
  >([]);
  const [formData, setFormData] = useState<ArtistApplicationForm>({
    artistName: "",
    genre: "",
    location: "",
    websiteUrl: "",
    socialUrl: "",
    bio: "",
  });

  const isApprovedArtist =
    artistProfile?.user_type === UserType.Artist &&
    artistProfile.approval_status === ArtistApprovalStatus.Approved;
  const canUpload = Boolean(isApprovedArtist);

  const loadDashboardData = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setArtistProfile(null);
      setUploadedSongs([]);
      setMetrics(emptyMetrics);
      setChartData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: profileData, error: profileError } = await supabase
      .from("artist_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      if (isSchemaTableMissingError(profileError)) {
        setArtistProfile(null);
        setUploadedSongs([]);
        setMetrics(emptyMetrics);
        setChartData([]);
        setLoading(false);
        return;
      }

      toast({
        title: "Could not load artist profile",
        description: getAppError(profileError).message,
      });
    }

    const nextProfile = profileData as ArtistProfile | null;
    setArtistProfile(nextProfile);

    if (
      !nextProfile ||
      nextProfile.approval_status !== ArtistApprovalStatus.Approved ||
      nextProfile.user_type !== UserType.Artist
    ) {
      setUploadedSongs([]);
      setMetrics(emptyMetrics);
      setChartData([]);
      setLoading(false);
      return;
    }

    const { data: songsData, error: songsError } = await supabase
      .from("songs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (songsError) {
      toast({
        title: "Could not load songs",
        description: getAppError(songsError).message,
      });
      setUploadedSongs([]);
      setMetrics(emptyMetrics);
      setChartData([]);
      setLoading(false);
      return;
    }

    const songs = songsData || [];
    const songIds = songs.map((song) => song.id);

    setUploadedSongs(
      songs.map((song) => ({
        id: song.id,
        name: song.title,
        artist: song.artist,
        coverUrl: song.cover_url,
        plays: song.total_plays || 0,
        likes: song.total_likes || 0,
        uploadedAt: new Date(song.created_at).toISOString().split("T")[0],
      })),
    );

    const last7Days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date.toISOString().split("T")[0];
    });

    const { data: analyticsData } = songIds.length
      ? await supabase
          .from("song_analytics")
          .select("date,plays,unique_listeners,avg_listen_duration")
          .in("song_id", songIds)
          .in("date", last7Days)
      : { data: [] };

    const { data: activityData } = songIds.length
      ? await supabase
          .from("user_activity")
          .select("listen_duration,user_id")
          .in("song_id", songIds)
          .eq("activity_type", "play")
      : { data: [] };

    const nextChartData = last7Days.map((date) => {
      const rows = (analyticsData || []).filter((row) => row.date === date);
      return {
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        plays: rows.reduce((sum, row) => sum + (row.plays || 0), 0),
        listeners: rows.reduce(
          (sum, row) => sum + (row.unique_listeners || 0),
          0,
        ),
      };
    });

    const totalPlays = songs.reduce(
      (sum, song) => sum + (song.total_plays || 0),
      0,
    );
    const totalLikes = songs.reduce(
      (sum, song) => sum + (song.total_likes || 0),
      0,
    );
    const uniqueListeners = new Set(
      (activityData || []).map((activity) => activity.user_id),
    ).size;
    const avgListenTime =
      activityData && activityData.length > 0
        ? Math.round(
            activityData.reduce(
              (sum, activity) => sum + (activity.listen_duration || 0),
              0,
            ) / activityData.length,
          )
        : 0;

    setChartData(nextChartData);
    setMetrics({
      totalSongs: songs.length,
      totalPlays,
      totalListeners: uniqueListeners,
      avgListenTime,
      totalLikes,
    });
    setLoading(false);
  }, [toast, user]);

  useEffect(() => {
    if (!isAuthLoading) {
      loadDashboardData();
    }
  }, [isAuthLoading, loadDashboardData]);

  useEffect(() => {
    if (!artistProfile) return;

    setFormData({
      artistName: artistProfile.artist_name || "",
      genre: artistProfile.genre || "",
      location: artistProfile.location || "",
      websiteUrl: artistProfile.website_url || "",
      socialUrl: artistProfile.social_url || "",
      bio: artistProfile.bio || "",
    });
  }, [artistProfile]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleApply = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      openAuthDialog("login");
      return;
    }

    setIsApplying(true);

    const { error } = await supabase.from("artist_profiles").upsert(
      {
        user_id: user.id,
        artist_name: formData.artistName,
        genre: formData.genre,
        location: formData.location,
        website_url: formData.websiteUrl,
        social_url: formData.socialUrl,
        bio: formData.bio,
        user_type: UserType.Listener,
        approval_status: ArtistApprovalStatus.Pending,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      const appError = getAppError(error);
      toast({
        title:
          appError.code === AppErrorCode.SchemaTableMissing
            ? "Artist applications are being prepared"
            : appError.code,
        description:
          appError.code === AppErrorCode.SchemaTableMissing
            ? "Please try again in a moment."
            : appError.message,
      });
      setIsApplying(false);
      return;
    }

    toast({
      title: "Application submitted",
      description: "Your artist profile is now pending admin approval.",
    });
    setIsApplying(false);
    loadDashboardData();
  };

  const handleSongUploaded = async (song: {
    name: string;
    artist: string;
    album: string;
    genre: string;
    description: string;
    coverUrl: string;
    audioFile: File | null;
  }) => {
    if (!user || !artistProfile || !canUpload) {
      throw new Error("Only approved artists can upload songs.");
    }

    const { error } = await supabase.from("songs").insert({
      user_id: user.id,
      title: song.name,
      artist: song.artist || artistProfile.artist_name,
      cover_url: song.coverUrl,
      audio_url: song.audioFile ? song.audioFile.name : "",
      duration: 0,
      genre: song.genre,
      total_plays: 0,
      total_likes: 0,
    });

    if (error) {
      throw getAppError(error);
    }

    toast({
      title: "Song uploaded",
      description: `${song.name} was added to your artist catalog.`,
    });
    loadDashboardData();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const applicationStatusCopy = useMemo(() => {
    if (!artistProfile) return null;

    if (artistProfile.approval_status === ArtistApprovalStatus.Pending) {
      return {
        title: "Application under review",
        description:
          "Your artist profile has been submitted. Upload access unlocks after admin approval.",
      };
    }

    if (artistProfile.approval_status === ArtistApprovalStatus.Rejected) {
      return {
        title: "Application needs updates",
        description:
          "Review your profile details and resubmit your application.",
      };
    }

    return null;
  }, [artistProfile]);

  const renderUnauthenticated = () => (
    <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
      <Music className="mx-auto mb-4 h-12 w-12 text-white/45" />
      <Typography as="h1" variant="h1" weight="bold">
        Log in to access the artist dashboard
      </Typography>
      <Typography variant="body" tone="muted" className="mt-2">
        Apply as an artist, manage approvals, and upload tracks from one
        workspace.
      </Typography>
      <Button
        onClick={() => openAuthDialog("login")}
        className="mt-6 rounded-full px-6 font-bold"
      >
        Log in
      </Button>
    </div>
  );

  const renderApplicationForm = () => (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <Typography
            variant="eyebrow"
            weight="bold"
            className="mt-6 text-white/45"
          >
            Artist access
          </Typography>
          <Typography as="h1" variant="h1" weight="bold" className="mt-3">
            Apply as an artist
          </Typography>
          <Typography variant="body" tone="muted" className="mt-2">
            Build your verified artist profile. Upload access unlocks after an
            admin reviews and approves your application.
          </Typography>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <Typography as="h2" variant="h3" weight="bold">
            Review checklist
          </Typography>
          <div className="mt-5 grid gap-3">
            {[
              "Use your real artist or stage name",
              "Select the genre that best fits your catalog",
              "Add a bio that helps listeners understand your sound",
              "Include at least one official website or social profile",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <Typography variant="body-sm" className="text-white/65">
                  {item}
                </Typography>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Typography as="h2" variant="h2" weight="bold">
              Artist profile
            </Typography>
            <Typography variant="body-sm" tone="muted" className="mt-2">
              This information is used for your public artist identity and admin
              review.
            </Typography>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-bold text-white/55">
            {artistProfile?.approval_status || ArtistApprovalStatus.NotApplied}
          </div>
        </div>

        {applicationStatusCopy && (
          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
            <Typography variant="body" weight="bold" className="text-amber-200">
              {applicationStatusCopy.title}
            </Typography>
            <Typography variant="body-sm" className="mt-1 text-amber-100/70">
              {applicationStatusCopy.description}
            </Typography>
          </div>
        )}

        <form onSubmit={handleApply} className="mt-8 grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="artistName">Artist name</Label>
              <Input
                id="artistName"
                value={formData.artistName}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    artistName: event.target.value,
                  }))
                }
                className="h-11 border-white/10 bg-white/[0.06]"
                placeholder="e.g. Drew Young"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genre">Primary genre</Label>
              <Select
                value={formData.genre}
                onValueChange={(value) =>
                  setFormData((current) => ({ ...current, genre: value }))
                }
                required
              >
                <SelectTrigger
                  id="genre"
                  className="h-11 border-white/10 bg-white/[0.06]"
                >
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-neutral-950 text-white">
                  {genres.map((genre) => (
                    <SelectItem key={genre.id} value={genre.name}>
                      {genre.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
                className="h-11 border-white/10 bg-white/[0.06]"
                placeholder="City, country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website</Label>
              <Input
                id="websiteUrl"
                type="url"
                value={formData.websiteUrl}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    websiteUrl: event.target.value,
                  }))
                }
                className="h-11 border-white/10 bg-white/[0.06]"
                placeholder="https://yourdomain.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="socialUrl">Social profile</Label>
            <Input
              id="socialUrl"
              type="url"
              value={formData.socialUrl}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  socialUrl: event.target.value,
                }))
              }
              className="h-11 border-white/10 bg-white/[0.06]"
              placeholder="https://instagram.com/artist"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Artist bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  bio: event.target.value,
                }))
              }
              className="min-h-36 resize-none border-white/10 bg-white/[0.06]"
              placeholder="Describe your sound, background, notable releases, and what listeners should expect."
              required
            />
          </div>
          <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Typography variant="body-sm" className="text-white/45">
              Admin approval is required before uploads are enabled.
            </Typography>
            <Button
              type="submit"
              className="w-full rounded-full px-6 font-bold sm:w-fit"
              disabled={isApplying}
            >
              {isApplying
                ? "Submitting..."
                : artistProfile
                  ? "Resubmit application"
                  : "Submit application"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderApprovedDashboard = () => (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Typography as="h1" variant="h1" weight="bold" className="mb-1">
            Analytics Dashboard
          </Typography>
          <Typography variant="body" tone="muted">
            Track your music performance and audience engagement
          </Typography>
        </div>
        <Button
          onClick={() => setIsUploadOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Upload Song
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="songs">Songs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Plays"
              value={metrics.totalPlays.toLocaleString()}
              icon={TrendingUp}
              iconColor="text-primary"
            />
            <MetricCard
              title="Total Listeners"
              value={metrics.totalListeners.toLocaleString()}
              icon={Users}
              iconColor="text-blue-500"
            />
            <MetricCard
              title="Avg. Listen Time"
              value={formatTime(metrics.avgListenTime)}
              icon={Clock}
              subtitle="per session"
              iconColor="text-purple-500"
            />
            <MetricCard
              title="Total Likes"
              value={metrics.totalLikes.toLocaleString()}
              icon={Heart}
              iconColor="text-pink-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AnalyticsChart data={chartData} title="Performance Over Time" />
            </div>
            <TopSongsTable
              songs={uploadedSongs.slice(0, 5).map((song) => ({
                id: song.id,
                title: song.name,
                artist: song.artist,
                cover_url: song.coverUrl,
                total_plays: song.plays,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Uploaded Songs"
              value={metrics.totalSongs}
              icon={Music}
              subtitle="total tracks"
              iconColor="text-primary"
            />
            <MetricCard
              title="Profile Views"
              value={0}
              icon={Eye}
              iconColor="text-green-500"
            />
            <MetricCard
              title="Engagement Rate"
              value="0%"
              icon={TrendingUp}
              iconColor="text-orange-500"
            />
          </div>
        </TabsContent>

        <TabsContent value="songs" className="space-y-6">
          <div className="flex items-center justify-between">
            <Typography as="h2" variant="h2" weight="bold">
              Your Songs
            </Typography>
            <p className="text-muted-foreground">
              {uploadedSongs.length} tracks
            </p>
          </div>

          {uploadedSongs.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-lg border border-border">
              <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No songs uploaded yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Start sharing your music with the world
              </p>
              <Button
                onClick={() => setIsUploadOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload Your First Song
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {uploadedSongs.map((song) => (
                <div
                  key={song.id}
                  className="bg-card rounded-lg p-4 border border-border hover:bg-card/80 transition-colors group"
                >
                  <div className="aspect-square rounded-md overflow-hidden mb-3 bg-muted">
                    {song.coverUrl ? (
                      <img
                        src={song.coverUrl}
                        alt={song.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music className="m-auto h-full w-16 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="font-semibold truncate">{song.name}</h3>
                  <p className="text-sm text-muted-foreground">{song.artist}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{song.plays.toLocaleString()} plays</span>
                    <span>{song.uploadedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Music2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">Guruplay</span>
            </Link>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAuthLoading || loading ? (
          <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading dashboard
          </div>
        ) : !isAuthenticated ? (
          renderUnauthenticated()
        ) : canUpload ? (
          renderApprovedDashboard()
        ) : (
          renderApplicationForm()
        )}
      </main>

      {artistProfile && (
        <UploadSongModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          artistName={artistProfile.artist_name}
          onUpload={handleSongUploaded}
        />
      )}
    </div>
  );
};

export default Dashboard;
