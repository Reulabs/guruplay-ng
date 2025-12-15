import { useParams } from 'react-router-dom';
import { Play, Clock, Heart, MoreHorizontal } from 'lucide-react';
import { playlists } from '@/data/mockData';
import TrackCard from '@/components/cards/TrackCard';
import { usePlayer } from '@/context/PlayerContext';

const PlaylistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { playPlaylist } = usePlayer();

  const playlist = playlists.find((p) => p.id === id);

  if (!playlist) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <p className="text-muted-foreground">Playlist not found</p>
      </div>
    );
  }

  const totalDuration = playlist.tracks.reduce((acc, track) => acc + track.duration, 0);
  const formatTotalDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} hr ${mins} min`;
    }
    return `${mins} min`;
  };

  return (
    <div className="pb-40">
      {/* Header */}
      <div className="p-6 gradient-card">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
          <img
            src={playlist.coverUrl}
            alt={playlist.name}
            className="w-48 h-48 md:w-56 md:h-56 rounded-lg object-cover shadow-2xl"
          />
          <div className="text-center md:text-left">
            <p className="text-sm font-medium uppercase tracking-wide">Playlist</p>
            <h1 className="text-4xl md:text-6xl font-bold mt-2 mb-4">{playlist.name}</h1>
            <p className="text-muted-foreground mb-2">{playlist.description}</p>
            <div className="flex items-center justify-center md:justify-start gap-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{playlist.createdBy}</span>
              <span>•</span>
              <span>{playlist.tracks.length} songs,</span>
              <span>{formatTotalDuration(totalDuration)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => playPlaylist(playlist.tracks)}
          className="p-4 rounded-full gradient-primary text-primary-foreground hover:scale-105 transition-transform shadow-lg"
        >
          <Play className="h-6 w-6 ml-0.5" />
        </button>
        <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
          <Heart className="h-8 w-8" />
        </button>
        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <MoreHorizontal className="h-8 w-8" />
        </button>
      </div>

      {/* Track List Header */}
      <div className="px-6">
        <div className="flex items-center gap-4 px-2 py-2 text-sm text-muted-foreground border-b border-border">
          <span className="w-8 text-center">#</span>
          <span className="flex-1">Title</span>
          <span className="hidden md:block w-40">Album</span>
          <Clock className="h-4 w-4" />
          <span className="w-10" />
        </div>
      </div>

      {/* Track List */}
      <div className="px-6 mt-2">
        {playlist.tracks.map((track, index) => (
          <TrackCard key={track.id} track={track} index={index + 1} showIndex />
        ))}
      </div>
    </div>
  );
};

export default PlaylistDetail;
