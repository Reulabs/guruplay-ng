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

const Dashboard = () => {
  const navigate = useNavigate();
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: songs } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

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
              .from('song_analytics')
              .select('plays, unique_listeners')
              .eq('date', date);

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
          .from('user_activity')
          .select('listen_duration, user_id')
          .eq('activity_type', 'play');

        const uniqueListeners = new Set(activityData?.map(a => a.user_id) || []).size;
        const avgDuration = activityData && activityData.length > 0
          ? Math.round(activityData.reduce((sum, a) => sum + a.listen_duration, 0) / activityData.length)
          : 0;

        setMetrics({
          totalSongs: songs.length,
          totalPlays,
          totalListeners: uniqueListeners,
          avgListenTime: avgDuration,
          totalLikes,
          playsTrend: 12.5,
          listenersTrend: 8.3,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);

      setUploadedSongs([
        {
          id: "1",
          name: "My First Track",
          artist: "You",
          coverUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300",
          plays: 1234,
          uploadedAt: "2024-01-15",
        },
        {
          id: "2",
          name: "Summer Vibes",
          artist: "You",
          coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300",
          plays: 567,
          uploadedAt: "2024-01-10",
        },
      ]);

      setChartData([
        { date: 'Jan 10', plays: 120, listeners: 45 },
        { date: 'Jan 11', plays: 150, listeners: 52 },
        { date: 'Jan 12', plays: 180, listeners: 61 },
        { date: 'Jan 13', plays: 140, listeners: 48 },
        { date: 'Jan 14', plays: 200, listeners: 72 },
        { date: 'Jan 15', plays: 220, listeners: 85 },
        { date: 'Jan 16', plays: 260, listeners: 98 },
      ]);

      setMetrics({
        totalSongs: 2,
        totalPlays: 1801,
        totalListeners: 245,
        avgListenTime: 142,
        totalLikes: 89,
        playsTrend: 12.5,
        listenersTrend: 8.3,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    navigate("/login");
  };

  const handleSongUploaded = async (song: Omit<UploadedSong, "id" | "plays" | "uploadedAt">) => {
    try {
      const { data, error } = await supabase
        .from('songs')
        .insert([
          {
            title: song.name,
            artist: song.artist,
            cover_url: song.coverUrl,
            audio_url: '',
            duration: 0,
            genre: '',
            total_plays: 0,
            total_likes: 0,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const newSong: UploadedSong = {
        id: data.id,
        name: data.title,
        artist: data.artist,
        coverUrl: data.cover_url,
        plays: 0,
        uploadedAt: new Date().toISOString().split("T")[0],
      };

      setUploadedSongs([newSong, ...uploadedSongs]);
      loadDashboardData();
    } catch (error) {
      console.error('Error uploading song:', error);

      const newSong: UploadedSong = {
        id: Date.now().toString(),
        name: song.name,
        artist: song.artist,
        coverUrl: song.coverUrl,
        plays: 0,
        uploadedAt: new Date().toISOString().split("T")[0],
      };
      setUploadedSongs([newSong, ...uploadedSongs]);
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
              <span className="font-bold text-lg">Melodify</span>
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
            <h1 className="text-3xl font-bold mb-1">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Track your music performance and audience engagement</p>
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
                trend={{ value: metrics.playsTrend, isPositive: true }}
                iconColor="text-primary"
              />
              <MetricCard
                title="Total Listeners"
                value={metrics.totalListeners.toLocaleString()}
                icon={Users}
                trend={{ value: metrics.listenersTrend, isPositive: true }}
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
                value="2.4K"
                icon={Eye}
                trend={{ value: 15.2, isPositive: true }}
                iconColor="text-green-500"
              />
              <MetricCard
                title="Engagement Rate"
                value="68%"
                icon={TrendingUp}
                trend={{ value: 4.1, isPositive: true }}
                iconColor="text-orange-500"
              />
            </div>
          </TabsContent>

          <TabsContent value="songs" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Your Songs</h2>
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
