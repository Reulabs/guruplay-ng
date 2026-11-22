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

`npm run check` passed both application builds, TypeScript checks, lint and 38 automated tests. Lint retains four pre-existing Fast Refresh warnings. Browser checks confirmed keyboard seeking beyond the preview limit and the paid membership state. Automated checks do not establish full WCAG conformance.

## Hosting

The Cloudflare scheduler is deployed on Workers Free at `guruplay-media-scheduler.theobiabo.workers.dev`, with a two-minute retry trigger and observability enabled. It holds only a dispatch token; the Supabase service-role key stays in Vercel. Production processor deployment and a hosted upload acceptance run are recorded below when completed.

## Scope

The selected product is a NGN 1,000 monthly pass with manual renewal. The earlier proposed artist-priced, song-specific weekly access model is not part of this monthly-pass implementation. Existing Paystack handling is retained for previous customers. Sandbox proof is separate from a real live charge and settlement.

## Production media acceptance

The root Vercel deployment `dpl_7t1C8SuWGpaFhZVRod45kFWiRHXx` reached Ready and is aliased to `www.guruplay.com.ng`. Its packaged Linux FFmpeg/ffprobe function completed generated audio against the real durable queue and private storage. Anonymous processor requests returned 401; authenticated Cloudflare dispatch returned 202.

A separate acceptance run requeued only the generated test track and sent no manual dispatch. The Cloudflare two-minute cron independently claimed and completed it on Vercel with local media workers stopped. The public preview downloaded successfully; a paid sandbox listener obtained the processed private full audio through the sandbox API. The live production API correctly refused to treat that sandbox pass as live entitlement.

The Worker uses `redirect: manual` and accepts only HTTP 202, because Cloudflare does not implement Fetch's `redirect: error` mode. Redirects are refused rather than forwarding credentials. Cloudflare Settings confirmed the dispatch token is encrypted and the cron is Every 2 minutes, with logs and traces enabled.

## Provider limits discovered

The original live key lacked `payments:write`; the user corrected its access. Bachs then returned HTTP 400 `ACCOUNT_NOT_ACTIVATED`: the merchant account requires completed business onboarding and approval before live payments. The user will complete that onboarding. Live checkout acceptance remains blocked by activation. No live card payment was attempted.

An actual sandbox refund request returned `INSUFFICIENT_BALANCE`. Refund authorization, revocation and replay protection passed the local database tests, but a real provider refund webhook remains unverified until the sandbox refund balance is funded. No real funds were moved to work around this limitation.

At the user's request, no further account-wide Bachs branding changes are being made. The application keeps Guruplay red and its own membership copy.

Cleanup removed both disposable accounts, both generated songs, their original/processed audio and every preview under their fixture IDs. The temporary sandbox webhook was deleted; the production webhook was preserved. Existing users and subscriptions were not edited. Both browser builds were scanned against the configured server secrets with no matches.

The membership page reflowed at 320 CSS pixels without horizontal overflow. Screen-reader behavior, 200% text zoom and a full visual-contrast review remain manual checks; no full accessibility-conformance claim is made.
