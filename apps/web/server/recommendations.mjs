const DAY = 86_400_000;

export function rankRecommendations(tracks, events, limit = 20, now = Date.now()) {
  const signals = new Map();
  const disliked = new Set();
  const recentlySkipped = new Set();
  const recentActivity = events.slice(0, 300);
  for (const event of recentActivity) {
    const value = signals.get(event.song_id) || { plays: 0, completions: 0, skips: 0, likes: 0, dislikes: 0, lastAt: 0 };
    const ageMs = Math.max(0, now - Date.parse(event.received_at));
    const weight = Math.exp(-ageMs / (21 * DAY));
    if (event.event_type === 'full_play_start') value.plays += weight;
    if (event.event_type === 'completion' || event.event_type === 'preview_complete') value.completions += weight;
    if (event.event_type === 'skip') value.skips += weight;
    if (event.event_type === 'like') value.likes += weight;
    if (event.event_type === 'dislike') value.dislikes += weight;
    value.lastAt = Math.max(value.lastAt, Date.parse(event.received_at) || 0);
    signals.set(event.song_id, value);
    if (event.event_type === 'dislike') disliked.add(event.song_id);
    if (event.event_type === 'skip' && ageMs < 3 * DAY) recentlySkipped.add(event.song_id);
  }

  const genreAffinity = new Map();
  const artistAffinity = new Map();
  for (const track of tracks) {
    const signal = signals.get(track.id);
    if (!signal) continue;
    const positive = signal.completions * 1.3 + signal.likes * 2 + signal.plays * 0.35;
    const negative = signal.skips * 0.8 + signal.dislikes * 3;
    const affinity = positive - negative;
    genreAffinity.set(track.genre, (genreAffinity.get(track.genre) || 0) + affinity);
    artistAffinity.set(track.user_id, (artistAffinity.get(track.user_id) || 0) + affinity);
  }

  const ranked = tracks.filter((track) => !disliked.has(track.id) && !recentlySkipped.has(track.id)).map((track) => {
    const signal = signals.get(track.id) || { plays: 0, completions: 0, skips: 0, likes: 0, dislikes: 0, lastAt: 0 };
    const ageMs = Math.max(0, now - Date.parse(track.created_at));
    const freshness = Math.exp(-ageMs / (45 * DAY));
    const popularity = Math.log1p(Math.max(0, Number(track.total_plays) || 0));
    const affinity = Math.max(-4, Math.min(8, (genreAffinity.get(track.genre) || 0) * 0.18 + (artistAffinity.get(track.user_id) || 0) * 0.12));
    const completion = signal.completions * 1.5 + signal.likes * 2 - signal.skips - signal.dislikes * 4;
    const novelty = signal.lastAt ? 0 : 1;
    const score = affinity + completion + popularity * 0.2 + freshness * 2 + novelty * 0.35;
    const reason = affinity > 0.5 ? `Because you listened to ${track.genre || 'similar'} music` : freshness > 0.7 ? 'A fresh release' : 'Popular on Guruplay';
    return { track, score, reason };
  }).sort((left, right) => right.score - left.score);

  const selected = [];
  const artistCounts = new Map();
  const genreCounts = new Map();
  for (const candidate of ranked) {
    if (selected.length >= limit) break;
    const artistCount = artistCounts.get(candidate.track.user_id) || 0;
    const genreCount = genreCounts.get(candidate.track.genre) || 0;
    if (artistCount >= Math.max(2, Math.ceil(limit * 0.2)) || genreCount >= Math.max(4, Math.ceil(limit * 0.45))) continue;
    selected.push({ songId: candidate.track.id, score: Number(candidate.score.toFixed(4)), reason: candidate.reason });
    artistCounts.set(candidate.track.user_id, artistCount + 1);
    genreCounts.set(candidate.track.genre, genreCount + 1);
  }
  return selected;
}
