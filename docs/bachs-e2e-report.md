# Bachs monthly pass acceptance

Verified on 22 November 2026 using real Bachs sandbox requests, the configured Supabase project and disposable Guruplay accounts. No live payment was charged.

## Payment evidence

- Successful hosted checkout charged exactly NGN 1,000 in sandbox. The genuine provider webhook and browser return granted one monthly pass, displayed Premium, hid the membership offer and enabled the generated 45-second full track beyond the 30-second preview.
- Cancelled checkout preserved unpaid access. The documented declined sandbox card displayed a readable failure, with no entitlement granted.
- Concurrent first-time checkout requests reused the same provider session and idempotency key. Browser-submitted price/currency were ignored. Verification of an unpaid checkout, malformed reference and another user's checkout was denied.
- Repeated callbacks and signed webhook delivery did not extend access. Altered raw webhook bytes and stale signatures were rejected. Sandbox access did not unlock the live-mode app.
- Expired access denied full playback. Direct browser reads of the private billing ledger and forged grant RPC calls were denied. Local PostgreSQL tests also covered atomic fulfillment, refund revocation, replay after refund and calendar-month boundaries.
- Settings, favourites and playlist persistence/account isolation passed against the connected database. The refactored FFmpeg processor created a genuine preview and private normalized full audio.

## Application checks

`npm run check` passed both application builds, TypeScript checks, lint and 37 automated tests. Lint retains four pre-existing Fast Refresh warnings. Browser checks confirmed keyboard seeking beyond the preview limit and the paid membership state. Automated checks do not establish full WCAG conformance.

## Hosting

The Cloudflare scheduler is deployed on Workers Free at `guruplay-media-scheduler.theobiabo.workers.dev`, with a two-minute retry trigger and observability enabled. It holds only a dispatch token; the Supabase service-role key stays in Vercel. Production processor deployment and a hosted upload acceptance run are recorded below when completed.

## Scope

The selected product is a NGN 1,000 monthly pass with manual renewal. The earlier proposed artist-priced, song-specific weekly access model is not part of this monthly-pass implementation. Existing Paystack handling is retained for previous customers. Sandbox proof is separate from a real live charge and settlement.
