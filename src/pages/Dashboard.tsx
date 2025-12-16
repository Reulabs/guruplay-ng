import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Music2, Upload, Settings, LogOut, BarChart3, Music } from "lucide-react";
import UploadSongModal from "@/components/dashboard/UploadSongModal";

interface UploadedSong {
  id: string;
  name: string;
  artist: string;
  coverUrl: string;
  plays: number;
  uploadedAt: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadedSongs, setUploadedSongs] = useState<UploadedSong[]>([
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

  const handleLogout = () => {
    // TODO: Connect to your backend API for logout
    navigate("/login");
  };

  const handleSongUploaded = (song: Omit<UploadedSong, "id" | "plays" | "uploadedAt">) => {
    const newSong: UploadedSong = {
      ...song,
      id: Date.now().toString(),
      plays: 0,
      uploadedAt: new Date().toISOString().split("T")[0],
    };
    setUploadedSongs([newSong, ...uploadedSongs]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Music className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uploadedSongs.length}</p>
                <p className="text-sm text-muted-foreground">Uploaded Songs</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {uploadedSongs.reduce((sum, song) => sum + song.plays, 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Plays</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">Free</p>
                <p className="text-sm text-muted-foreground">Account Type</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Your Uploads</h2>
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload Song
          </Button>
        </div>

        {/* Songs Grid */}
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
