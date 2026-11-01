# Guruplay music platform operations

## Services

- The repository-root `vercel.json` deploys the listener from `apps/web/dist` and rewrites all `/api/v1/*` requests to `api/music.mjs`. The adapter restores nested API paths and preserves query parameters and raw webhook bodies. This supports the existing Vercel project whose root directory is the repository root. The admin app remains a separate deployment with root directory `apps/admin`.
- Deploy `apps/web` and `apps/admin` as separate Vercel projects. Both need the root Supabase URL, public anon key, and server-only service role key. The listener project needs the Paystack secret, plan code, plan amount in the Paystack currency's smallest unit, currency, public app URL, and cron secret.
- Build the media worker from `apps/web/Dockerfile.worker` and run `npm run worker:media --workspace=@guruplay/web` in a container with persistent logs and the same Supabase server credentials. The image includes FFmpeg and ffprobe.
- Register the Paystack webhook URL as `https://<listener-domain>/api/v1/webhooks/paystack`. Use HTTPS and keep webhook signature verification enabled.
- Configure `MAX_AUDIO_UPLOAD_BYTES` and `MAX_AUDIO_DURATION_SECONDS` to match the product's upload policy. The worker defaults to 200 MB and 15 minutes.

## Database and media cutover

1. Deploy the listener API and start at least one media worker before applying the secure streaming migration.
2. Apply `20260924120000_secure_streaming_billing_recommendations.sql` once to the shared Supabase project. The matching file under the admin app exists for repository consistency and must not be applied a second time.
3. The migration makes `song-audio` private and the public catalog only returns approved songs with completed preview derivatives. Existing storage paths matching Supabase `song-audio` public URLs are queued for processing. External legacy audio URLs are intentionally withheld; import them into the private bucket and add their `song_assets` rows before they can appear again.
4. Confirm media jobs complete, approved songs appear through `public_catalog`, no public catalog row contains a full audio URL, and direct unauthenticated reads from `song-audio` fail. Purge any CDN cache of old public object URLs after cutover.
5. Confirm new artist uploads create pending song rows and processing jobs. Moderation does not make a song playable until processing reaches `ready`.

## Payments and playback

- Create a monthly Paystack plan in the dashboard and set its plan code, amount, and currency in server environment variables. Never put the secret key or service-role key in Vite variables.
- The checkout return URL verifies the transaction with Paystack from the server. The browser return alone does not grant access. Paystack webhook events are signature checked over the raw request body and are safe to retry.
- Transaction verification accepts Paystack's `plan_object`, plan code string, or plan object. When the transaction does not include its subscription, the API resolves the recurring subscription by customer, plan, card authorization, environment, and creation time before recording it. A subscription still being created leaves checkout pending for verification or reconciliation to retry.
- Accounts with an active entitlement cannot start another subscription checkout.
- Scheduled reconciliation runs every 15 minutes. Vercel supplies the `CRON_SECRET` bearer token to scheduled functions when that environment variable is configured.
- The root deployment does not register a cron schedule. Configure an authenticated 15-minute reconciliation trigger using a scheduler and hosting plan that supports this frequency before enabling production subscriptions. The app-directory cron configuration applies only to deployments rooted at `apps/web`.
- Full URLs are signed for five minutes. Subscription status is checked for each new playback session; the latest confirmed paid period includes a 24-hour grace period.

## Local development

- Copy `.env.example` to the ignored root `.env`, replace all placeholders, and use Paystack test credentials and a test plan.
- Set `PUBLIC_APP_URL=http://127.0.0.1:8080` for local test checkout. HTTP callback URLs are accepted only for loopback hosts with an `sk_test_` secret; live checkout requires HTTPS. The hosted checkout integration authenticates using `PAYSTACK_SECRET_KEY`; `PAYSTACK_PUBLIC_KEY` is retained in the root environment for the account's public test configuration and is not needed to initialize hosted checkout.
- Set `PAYSTACK_PLAN_CODE`, `PAYSTACK_MONTHLY_AMOUNT` (in currency subunits), and `PAYSTACK_CURRENCY` to the same monthly test plan. The plan controls Paystack's actual charge amount. A valid key alone does not configure a subscription product.
- Paystack cannot send webhooks to loopback URLs. Use a reachable HTTPS test deployment or approved tunnel for webhook delivery tests; the browser callback can verify a local checkout independently.
- Run `npm run dev:web`, `npm run dev:admin`, and `npm run worker:media --workspace=@guruplay/web` in separate terminals when exercising end-to-end media flows.
- Apply migrations to an isolated Supabase project for integration checks. Never reset or seed the connected production project to test access control.
