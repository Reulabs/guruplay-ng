# Guruplay music platform operations

## Services

The root `vercel.json` deploys the listener, trusted music/admin APIs and the audio processor. The separate `guruplay-admin` deployment proxies privileged requests to the listener API. Both browser apps use only the public Supabase URL and anon key. Keep the service-role credential, payment keys and dispatch tokens in server-only environments.

Cloudflare's `guruplay-media-scheduler` runs on Workers Free. An authenticated upload dispatch starts processing promptly; a two-minute cron retries queued jobs. It calls the fixed production Vercel `/api/media-worker` endpoint. Supabase stores the durable queue, job leases, original audio and derivatives. Cloudflare holds only `MEDIA_WORKER_SECRET`, never the Supabase service-role key.

The Vercel function runs packaged Linux FFmpeg/ffprobe, processes one claimed job per invocation and uses `waitUntil` with a 300-second maximum duration. Jobs keep bounded command timeouts, five-minute renewable leases, exponential backoff and a dead state after eight attempts. The default upload limits remain 200 MB and 15 minutes. Monitor Vercel execution/storage quotas and job backlog as usage grows; the free scheduler does not make audio processing unlimited or free on every Vercel plan.

## Deployment

1. Apply each migration once to the shared Supabase project. Matching migrations under both apps are mirrors, not separate databases. The secure streaming migration is `20260924120000_secure_streaming_billing_recommendations.sql`; Bachs adds `20261122100000_bachs_monthly_passes.sql`.
2. Set server-only Vercel Production variables: `SUPABASE_SERVICE_ROLE_KEY`, `BACHS_ENVIRONMENT=live`, `BACHS_SECRET_KEY`, `BACHS_WEBHOOK_SECRET`, `PUBLIC_APP_URL=https://www.guruplay.com.ng`, `CRON_SECRET`, `MEDIA_WORKER_SECRET` and `MEDIA_WORKER_URL`. Both Supabase public variables are also required.
3. Deploy the root Vercel project. The media function includes only the Linux x64 binaries; verify its bundle and execution limits during deployment.
4. Register the Bachs webhook at `https://www.guruplay.com.ng/api/v1/webhooks/bachs`, subscribing to `checkout.completed`, `checkout.expired`, `collection.succeeded` and `refund.paid`. Store its signing secret as `BACHS_WEBHOOK_SECRET`.
5. Build the dependency-free scheduler with `node workers/media-scheduler/build.mjs`. From `workers/media-scheduler`, use official `cf` 1.0.0-rc.2: `cf deploy --prebuilt --dry-run`, then `cf deploy --prebuilt --secrets-file <protected-json-file>`. The JSON file must contain only the matching `MEDIA_WORKER_SECRET`; remove it afterward. Source configuration fixes the account, cron, compatibility date and observability settings.
6. Set `MEDIA_WORKER_URL` to the deployed workers.dev origin. Verify public `/health`, anonymous dispatch rejection, an authenticated dispatch and a completed real upload with local workers stopped. Cron changes can take several minutes to propagate.

For a self-hosted alternative, the existing `apps/web/Dockerfile.worker` and `npm run worker:media --workspace=@guruplay/web` remain supported. Production uses the Cloudflare/Vercel setup above.

## Payments and playback

New purchases use Bachs: **₦1,000 for one calendar month, renewed manually**. No recurring mandate is created. Price, currency and purpose are fixed on the server; browser-submitted amounts are ignored. A successful redirect alone never grants access. The server checks the stored checkout, payment, owner, email, environment, amount and currency before atomically granting one pass. Repeated callbacks/webhooks cannot extend that pass. Full refunds revoke its access.

Use `BACHS_ENVIRONMENT=sandbox` with `BACHS_SANDBOX_SECRET_KEY` and `BACHS_SANDBOX_WEBHOOK_SECRET` for testing. Sandbox and live passes are isolated. The original `BACHS_SECRETE_KEY` and `BACHS_LIVE_SECRETE_KEY` names remain accepted as live-key aliases; prefer the canonical name for deployments. Bachs requires a public HTTPS callback, including in sandbox.

The root Vercel cron reconciles payments daily at 03:00 UTC using `CRON_SECRET`. Browser verification and signed, replay-protected webhooks handle immediate fulfillment. Existing Paystack subscriptions, transaction verification, webhooks and management remain supported for prior customers; keep their original credentials if there are still legacy subscriptions. New checkout does not require a Paystack plan.

Paid full audio uses short-lived private URLs, at most five minutes and no longer than the confirmed Bachs pass period. Bachs access ends at expiry without a grace period. Existing Paystack periods retain their prior 24-hour grace behavior. The player also refreshes/downgrades access when the pass expires. Successful listener checkout returns home; artists/admins return to their dashboard. Premium users see a profile badge and no membership offer.

## Media and moderation

Only admins and approved artists may upload. Artist submissions stay pending until an administrator approves them; admin submissions can be approved immediately. Processing must also reach `ready` before music appears in the public catalog. The `song-audio` bucket stays private; public previews are limited to 30 seconds. Public catalog rows never expose full-audio URLs. Import external legacy audio into private storage before publishing it.

## Verification

Run `npm run check` for lint, TypeScript, automated tests and both builds. `scripts/bachs-e2e.mjs` is an opt-in, phased integration harness using disposable accounts, actual sandbox checkout and generated audio. Its setup refuses to overwrite an existing fixture and its cleanup removes only fixture-owned records/files. Never reset the shared database to test permissions. See `bachs-e2e-report.md` for the dated acceptance evidence and remaining limits.
