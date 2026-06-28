export interface Track {
  id: string;
  userId: string;
  title: string;
  artist: string;
  duration: number;
  coverUrl: string;
  audioUrl: string;
  genre: string;
  totalPlays: number;
  totalLikes: number;
  createdAt: string;
}

export interface Artist {
  id: string;
  userId: string;
  name: string;
  bio: string;
  imageUrl: string;
  genres: string[];
  location: string;
}
