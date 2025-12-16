import { TrendingUp, Music } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
          <div className="text-center py-8 text-muted-foreground">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No songs uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {songs.map((song, index) => (
              <div key={song.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-8 text-center font-bold text-muted-foreground">
                  #{index + 1}
                </div>
                <img
                  src={song.cover_url}
                  alt={song.title}
                  className="w-12 h-12 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{song.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{song.total_plays.toLocaleString()}</p>
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
