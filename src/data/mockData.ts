export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl: string;
  audioUrl: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  tracks: Track[];
  createdBy: string;
}

export interface Artist {
  id: string;
  name: string;
  imageUrl: string;
  genres: string[];
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  coverUrl: string;
  year: number;
  tracks: Track[];
}

// Sample audio URLs (royalty-free music)
const sampleAudioUrls = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
];

// Cover images (using placeholder gradients represented by colors)
const coverImages = [
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=300&h=300&fit=crop',
];

export const tracks: Track[] = [];

export const artists: Artist[] = [];

export const playlists: Playlist[] = [];

export const albums: Album[] = [];

export const genres: { id: string; name: string; color: string }[] = [];

export const moods: { id: string; name: string; emoji: string; color: string }[] = [];
