import { Artist } from '@/data/mockData';

interface ArtistCardProps {
  artist: Artist;
}

const ArtistCard = ({ artist }: ArtistCardProps) => {
  return (
    <div className="group p-3 rounded-lg bg-card hover:bg-secondary transition-colors cursor-pointer">
      <img
        src={artist.imageUrl}
        alt={artist.name}
        className="w-full aspect-square rounded-full object-cover mb-3"
      />
      <h3 className="font-medium text-sm truncate text-center">{artist.name}</h3>
      <p className="text-xs text-muted-foreground mt-0.5 text-center">Artist</p>
    </div>
  );
};

export default ArtistCard;
