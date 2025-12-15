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

export const tracks: Track[] = [
  { id: '1', title: 'Midnight Dreams', artist: 'Luna Wave', album: 'Nocturnal', duration: 234, coverUrl: coverImages[0], audioUrl: sampleAudioUrls[0] },
  { id: '2', title: 'Electric Soul', artist: 'Neon Pulse', album: 'Voltage', duration: 198, coverUrl: coverImages[1], audioUrl: sampleAudioUrls[1] },
  { id: '3', title: 'Ocean Breeze', artist: 'Coastal Vibes', album: 'Tides', duration: 267, coverUrl: coverImages[2], audioUrl: sampleAudioUrls[2] },
  { id: '4', title: 'Urban Jungle', artist: 'City Lights', album: 'Metro', duration: 212, coverUrl: coverImages[3], audioUrl: sampleAudioUrls[3] },
  { id: '5', title: 'Starlight', artist: 'Cosmic Echo', album: 'Galaxy', duration: 289, coverUrl: coverImages[4], audioUrl: sampleAudioUrls[4] },
  { id: '6', title: 'Velvet Night', artist: 'Luna Wave', album: 'Nocturnal', duration: 245, coverUrl: coverImages[0], audioUrl: sampleAudioUrls[5] },
  { id: '7', title: 'Digital Rain', artist: 'Neon Pulse', album: 'Voltage', duration: 223, coverUrl: coverImages[1], audioUrl: sampleAudioUrls[6] },
  { id: '8', title: 'Summer Haze', artist: 'Coastal Vibes', album: 'Tides', duration: 256, coverUrl: coverImages[2], audioUrl: sampleAudioUrls[7] },
  { id: '9', title: 'Skyline', artist: 'City Lights', album: 'Metro', duration: 201, coverUrl: coverImages[5], audioUrl: sampleAudioUrls[0] },
  { id: '10', title: 'Nebula', artist: 'Cosmic Echo', album: 'Galaxy', duration: 312, coverUrl: coverImages[4], audioUrl: sampleAudioUrls[1] },
  { id: '11', title: 'Purple Haze', artist: 'Violet Dreams', album: 'Chromatic', duration: 278, coverUrl: coverImages[6], audioUrl: sampleAudioUrls[2] },
  { id: '12', title: 'Golden Hour', artist: 'Sunset Collective', album: 'Horizons', duration: 234, coverUrl: coverImages[7], audioUrl: sampleAudioUrls[3] },
];

export const artists: Artist[] = [
  { id: '1', name: 'Luna Wave', imageUrl: coverImages[0], genres: ['Electronic', 'Ambient'] },
  { id: '2', name: 'Neon Pulse', imageUrl: coverImages[1], genres: ['Electronic', 'Synthwave'] },
  { id: '3', name: 'Coastal Vibes', imageUrl: coverImages[2], genres: ['Chill', 'Lo-fi'] },
  { id: '4', name: 'City Lights', imageUrl: coverImages[3], genres: ['Hip-Hop', 'R&B'] },
  { id: '5', name: 'Cosmic Echo', imageUrl: coverImages[4], genres: ['Electronic', 'Space'] },
  { id: '6', name: 'Violet Dreams', imageUrl: coverImages[6], genres: ['Pop', 'Electronic'] },
  { id: '7', name: 'Sunset Collective', imageUrl: coverImages[7], genres: ['Indie', 'Alternative'] },
];

export const playlists: Playlist[] = [
  {
    id: '1',
    name: 'Chill Vibes',
    description: 'Relaxing tracks for your evening',
    coverUrl: coverImages[2],
    tracks: [tracks[2], tracks[7], tracks[0], tracks[5]],
    createdBy: 'Melodify',
  },
  {
    id: '2',
    name: 'Electronic Beats',
    description: 'High energy electronic music',
    coverUrl: coverImages[1],
    tracks: [tracks[1], tracks[6], tracks[4], tracks[9]],
    createdBy: 'Melodify',
  },
  {
    id: '3',
    name: 'Night Drive',
    description: 'Perfect soundtrack for late night drives',
    coverUrl: coverImages[0],
    tracks: [tracks[0], tracks[5], tracks[3], tracks[8]],
    createdBy: 'Melodify',
  },
  {
    id: '4',
    name: 'Focus Flow',
    description: 'Stay productive with these beats',
    coverUrl: coverImages[4],
    tracks: [tracks[4], tracks[9], tracks[2], tracks[10]],
    createdBy: 'Melodify',
  },
  {
    id: '5',
    name: 'Workout Mix',
    description: 'Get pumped with energetic tracks',
    coverUrl: coverImages[3],
    tracks: [tracks[3], tracks[1], tracks[8], tracks[6]],
    createdBy: 'Melodify',
  },
  {
    id: '6',
    name: 'Discover Weekly',
    description: 'New music picked just for you',
    coverUrl: coverImages[5],
    tracks: [tracks[10], tracks[11], tracks[0], tracks[4]],
    createdBy: 'Melodify',
  },
];

export const albums: Album[] = [
  { id: '1', name: 'Nocturnal', artist: 'Luna Wave', coverUrl: coverImages[0], year: 2024, tracks: [tracks[0], tracks[5]] },
  { id: '2', name: 'Voltage', artist: 'Neon Pulse', coverUrl: coverImages[1], year: 2024, tracks: [tracks[1], tracks[6]] },
  { id: '3', name: 'Tides', artist: 'Coastal Vibes', coverUrl: coverImages[2], year: 2023, tracks: [tracks[2], tracks[7]] },
  { id: '4', name: 'Metro', artist: 'City Lights', coverUrl: coverImages[3], year: 2024, tracks: [tracks[3], tracks[8]] },
  { id: '5', name: 'Galaxy', artist: 'Cosmic Echo', coverUrl: coverImages[4], year: 2023, tracks: [tracks[4], tracks[9]] },
  { id: '6', name: 'Chromatic', artist: 'Violet Dreams', coverUrl: coverImages[6], year: 2024, tracks: [tracks[10]] },
  { id: '7', name: 'Horizons', artist: 'Sunset Collective', coverUrl: coverImages[7], year: 2024, tracks: [tracks[11]] },
];

export const genres = [
  { id: '1', name: 'Pop', color: 'from-pink-500 to-rose-500' },
  { id: '2', name: 'Hip-Hop', color: 'from-orange-500 to-amber-500' },
  { id: '3', name: 'Rock', color: 'from-red-500 to-rose-600' },
  { id: '4', name: 'Electronic', color: 'from-purple-500 to-violet-500' },
  { id: '5', name: 'R&B', color: 'from-indigo-500 to-purple-500' },
  { id: '6', name: 'Jazz', color: 'from-amber-500 to-yellow-500' },
  { id: '7', name: 'Classical', color: 'from-slate-500 to-gray-500' },
  { id: '8', name: 'Country', color: 'from-yellow-500 to-orange-500' },
  { id: '9', name: 'Lo-fi', color: 'from-teal-500 to-cyan-500' },
  { id: '10', name: 'Indie', color: 'from-emerald-500 to-green-500' },
  { id: '11', name: 'Metal', color: 'from-zinc-600 to-neutral-700' },
  { id: '12', name: 'Chill', color: 'from-blue-400 to-cyan-400' },
];

export const moods = [
  { id: '1', name: 'Happy', emoji: '😊', color: 'from-yellow-400 to-orange-400' },
  { id: '2', name: 'Sad', emoji: '😢', color: 'from-blue-500 to-indigo-500' },
  { id: '3', name: 'Energetic', emoji: '⚡', color: 'from-red-500 to-orange-500' },
  { id: '4', name: 'Relaxed', emoji: '😌', color: 'from-green-400 to-teal-400' },
  { id: '5', name: 'Focused', emoji: '🎯', color: 'from-purple-500 to-violet-500' },
  { id: '6', name: 'Romantic', emoji: '💕', color: 'from-pink-400 to-rose-400' },
];
