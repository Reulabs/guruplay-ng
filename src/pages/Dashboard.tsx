import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Music2, Settings, LogOut, Music, Users, TrendingUp, Clock, Eye, Heart } from "lucide-react";
import UploadSongModal from "@/components/dashboard/UploadSongModal";
import MetricCard from "@/components/dashboard/MetricCard";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import TopSongsTable from "@/components/dashboard/TopSongsTable";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";

interface UploadedSong {
  id: string;
  name: string;
  artist: string;
  coverUrl: string;
  plays: number;
  uploadedAt: string;
}

interface DashboardMetrics {
  totalSongs: number;
  totalPlays: number;
  totalListeners: number;
  avgListenTime: number;
  totalLikes: number;
  playsTrend: number;
  listenersTrend: number;
}

interface WalletSummary {
  balance: number;
  currency: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadedSongs, setUploadedSongs] = useState<UploadedSong[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalSongs: 0,
    totalPlays: 0,
    totalListeners: 0,
    avgListenTime: 0,
    totalLikes: 0,
    playsTrend: 0,
    listenersTrend: 0,
  });

  const [chartData, setChartData] = useState<{ date: string; plays: number; listeners: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData(user.id);
    }
  }, [user]);

  const loadDashboardData = async (userId: string) => {
    setLoading(true);
    try {
      const { data: songs, error: songsError } = await supabase
        .from("songs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (songsError) {
        throw songsError;
      }

      if (songs) {
        setUploadedSongs(
          songs.map((song) => ({
            id: song.id,
            name: song.title,
            artist: song.artist,
            coverUrl: song.cover_url,
            plays: song.total_plays,
            uploadedAt: new Date(song.created_at).toISOString().split('T')[0],
          }))
        );

        const totalPlays = songs.reduce((sum, song) => sum + song.total_plays, 0);
        const totalLikes = songs.reduce((sum, song) => sum + song.total_likes, 0);

        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split('T')[0];
        });

        const analyticsData = await Promise.all(
          last7Days.map(async (date) => {
            const { data } = await supabase
              .from("song_analytics")
              .select("plays, unique_listeners")
              .eq("date", date);

            const dayPlays = data?.reduce((sum, d) => sum + d.plays, 0) || 0;
            const dayListeners = data?.reduce((sum, d) => sum + d.unique_listeners, 0) || 0;

            return {
              date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              plays: dayPlays,
              listeners: dayListeners,
            };
          })
        );

        setChartData(analyticsData);

        const { data: activityData } = await supabase
          .from("user_activity")
          .select("listen_duration, user_id")
          .eq("activity_type", "play");

        const uniqueListeners = new Set(activityData?.map(a => a.user_id) || []).size;
        const avgDuration = activityData && activityData.length > 0
          ? Math.round(activityData.reduce((sum, a) => sum + a.listen_duration, 0) / activityData.length)
          : 0;

        const firstDay = analyticsData[0];
        const lastDay = analyticsData[analyticsData.length - 1];

        const playsTrend =
          firstDay && firstDay.plays > 0
            ? ((lastDay.plays - firstDay.plays) / firstDay.plays) * 100
            : 0;

        const listenersTrend =
          firstDay && firstDay.listeners > 0
            ? ((lastDay.listeners - firstDay.listeners) / firstDay.listeners) * 100
            : 0;

        setMetrics({
          totalSongs: songs.length,
          totalPlays,
          totalListeners: uniqueListeners,
          avgListenTime: avgDuration,
          totalLikes,
          playsTrend,
          listenersTrend,
        });

        const { data: walletRows, error: walletError } = await supabase
          .from("wallets")
          .select("balance, currency")
          .eq("user_id", userId)
          .limit(1);

        if (walletError) {
          throw walletError;
        }

        if (walletRows && walletRows.length > 0) {
          setWallet({
            balance: Number(walletRows[0].balance),
            currency: walletRows[0].currency,
          });
        } else {
          setWallet(null);
        }
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);

      toast({
        variant: "destructive",
        title: "Unable to load dashboard data",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
      });

      setUploadedSongs([]);
      setChartData([]);
      setMetrics({
        totalSongs: 0,
        totalPlays: 0,
        totalListeners: 0,
        avgListenTime: 0,
        totalLikes: 0,
        playsTrend: 0,
        listenersTrend: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      navigate("/login");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
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
            artist: song.artist || "You",
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

      const newSong: UploadedSong = {
        id: data.id,
        name: data.title,
        artist: data.artist,
        coverUrl: data.cover_url,
        plays: 0,
        uploadedAt: new Date().toISOString().split("T")[0],
      };

      setUploadedSongs([newSong, ...uploadedSongs]);
      if (user) {
        loadDashboardData(user.id);
      }

      toast({
        title: "Song uploaded",
        description: "Your track is now available in your catalog.",
      });
    } catch (error) {
      console.error("Error uploading song:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unable to upload song. Please try again.",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Guruplay</h1>
            <p className="text-muted-foreground">Track performance, audience activity, and growth across your music catalog.</p>
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
                trend={
                  metrics.totalPlays > 0 && metrics.playsTrend !== 0
                    ? { value: Number(metrics.playsTrend.toFixed(1)), isPositive: metrics.playsTrend >= 0 }
                    : undefined
                }
                iconColor="text-primary"
              />
              <MetricCard
                title="Total Listeners"
                value={metrics.totalListeners.toLocaleString()}
                icon={Users}
                trend={
                  metrics.totalListeners > 0 && metrics.listenersTrend !== 0
                    ? { value: Number(metrics.listenersTrend.toFixed(1)), isPositive: metrics.listenersTrend >= 0 }
                    : undefined
                }
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
                <AnalyticsChart
                  data={chartData}
                  title="Performance Over Time"
                />
              </div>
              <div>
                <TopSongsTable
                  songs={uploadedSongs.slice(0, 5).map(song => ({
                    id: song.id,
                    title: song.name,
                    artist: song.artist,
                    cover_url: song.coverUrl,
                    total_plays: song.plays,
                  }))}
                />
              </div>
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
                value="—"
                icon={Eye}
                iconColor="text-green-500"
              />
              <MetricCard
                title="Engagement Rate"
                value="—"
                icon={TrendingUp}
                iconColor="text-orange-500"
              />
            </div>
          </TabsContent>

          <TabsContent value="songs" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Guruplay</h2>
              <p className="text-muted-foreground">{uploadedSongs.length} tracks</p>
            </div>

            {uploadedSongs.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-lg border border-border">
                <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No songs uploaded yet</h3>
                <p className="text-muted-foreground mb-4">Start sharing your music with the world</p>
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
                    <div className="aspect-square rounded-md overflow-hidden mb-3">
                      <img
                        src={song.coverUrl}
                        alt={song.name}
                        className="w-full h-full object-cover"
                      />
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
      </main>

      <UploadSongModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleSongUploaded}
      />
    </div>
  );
};

export default Dashboard;
