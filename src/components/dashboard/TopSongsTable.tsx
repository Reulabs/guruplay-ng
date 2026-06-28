import { TrendingUp, Music } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EmptyState from "@/components/fallbacks/EmptyState";

interface Song {
  id: string;
  title: string;
  artist: string;
  cover_url: string;
  total_plays: number;
  trend?: number;
}

interface TopSongsTableProps {
  songs: Song[];
}

const TopSongsTable = ({ songs }: TopSongsTableProps) => {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Top Performing Songs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {songs.length === 0 ? (
          <EmptyState
            icon={Music}
            title="No songs uploaded yet"
            description="Performance data will appear after your first upload."
            className="min-h-48 border-0 bg-transparent"
          />
        ) : (
          <div className="space-y-3">
            {songs.map((song, index) => (
              <div
                key={song.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-8 text-center font-bold text-muted-foreground">
                  #{index + 1}
                </div>
                {song.cover_url ? (
                  <img
                    src={song.cover_url}
                    alt={song.title}
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div
                    className="h-12 w-12 rounded bg-white/[0.06]"
                    aria-hidden
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{song.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {song.artist}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {song.total_plays.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">plays</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopSongsTable;
