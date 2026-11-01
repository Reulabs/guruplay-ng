import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { hasEntitlement, verifyPaystackSignature } from './music-api.mjs';
import { rankRecommendations } from './recommendations.mjs';

test('monthly entitlement honors the paid period and only the configured grace window', () => {
  const subscription = { status: 'active', paid_through: '2026-06-01T00:00:00.000Z' };
  assert.equal(hasEntitlement(subscription, Date.parse('2026-06-01T23:59:59.000Z')), true);
  assert.equal(hasEntitlement(subscription, Date.parse('2026-06-02T00:00:00.000Z')), true);
  assert.equal(hasEntitlement(subscription, Date.parse('2026-06-02T00:00:01.000Z')), false);
  assert.equal(hasEntitlement({ ...subscription, status: 'cancelled' }, Date.parse('2026-06-01T00:00:00.000Z')), false);
});

test('Paystack signatures are checked against the exact raw body', () => {
  const raw = Buffer.from('{"event":"charge.success","data":{"id":42}}');
  const secret = 'test-secret';
  const signature = createHmac('sha512', secret).update(raw).digest('hex');
  assert.equal(verifyPaystackSignature(raw, signature, secret), true);
  assert.equal(verifyPaystackSignature(Buffer.from(`${raw.toString()} `), signature, secret), false);
  assert.equal(verifyPaystackSignature(raw, 'invalid', secret), false);
});

test('recommendations filter disliked and recently skipped tracks and diversify artists', () => {
  const now = Date.parse('2026-09-24T12:00:00Z');
  const tracks = Array.from({ length: 8 }, (_, index) => ({
    id: `song-${index}`, user_id: index < 4 ? 'artist-a' : `artist-${index}`,
    genre: index % 2 ? 'afrobeats' : 'jazz', total_plays: 100 - index,
    created_at: new Date(now - index * 86_400_000).toISOString(),
  }));
  const events = [
    { song_id: 'song-1', event_type: 'dislike', received_at: new Date(now).toISOString() },
    { song_id: 'song-5', event_type: 'skip', received_at: new Date(now).toISOString() },
    { song_id: 'song-2', event_type: 'completion', received_at: new Date(now).toISOString() },
  ];
  const items = rankRecommendations(tracks, events, 6, now);
  assert.equal(items.some((item) => item.songId === 'song-1'), false);
  assert.equal(items.some((item) => item.songId === 'song-5'), false);
  const selectedArtists = items.map((item) => tracks.find((track) => track.id === item.songId)?.user_id);
  assert.ok(selectedArtists.filter((artistId) => artistId === 'artist-a').length <= 2);
});
