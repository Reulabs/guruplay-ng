import { Artist } from '@/data/mockData';

interface ArtistCardProps {
  artist: Artist;
}

const ArtistCard = ({ artist }: ArtistCardProps) => {
  return (
    <div className="group p-4 rounded-lg bg-card hover:bg-muted/50 transition-all cursor-pointer">
      <div className="relative mb-4">
        <img
          src={artist.imageUrl}
          alt={artist.name}
          className="w-full aspect-square rounded-full object-cover shadow-lg"
        />
      </div>
      <h3 className="font-semibold truncate text-center">{artist.name}</h3>
      <p className="text-sm text-muted-foreground mt-1 text-center">Artist</p>
    </div>
  );
};

export default ArtistCard;
