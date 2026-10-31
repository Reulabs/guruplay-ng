# Guruplay payment verification

Verified on 19 October 2026 against the local apps, the `fuquclbwwofwugkxirrl` Supabase project, and Paystack test mode.

## Result

The browser flow passed: sign in, start the NGN 1,000 monthly checkout, complete Paystack's successful test scenario, return to Guruplay, verify the transaction on the server, and unlock full audio.

| Evidence | Result |
| --- | --- |
| Monthly plan | `PLN_8obho3fastoktts`, NGN 100,000 subunits, monthly, test mode |
| Transaction | `6672804364`, successful, NGN 100,000 subunits |
| Reference | `guru-1792387361190-7b827741846a42f7b77f1495ed65bcee` |
| Stored checkout | Verified |
| Stored recurring subscription | `SUB_y4b6h6z0d11cjuu`, active |
| Confirmed paid period | Through 19 November 2026, 05:23 UTC |
| Duplicate checkout | Rejected with HTTP 409 |
| Unknown payment reference | Rejected with HTTP 404 |
| Signed full-audio response | HTTP 200, audio/mpeg |
| Public access to full audio | Denied, HTTP 400 |

The test used an existing administrator account. No account passwords or existing artist records were changed. The briefly selected `woodenkbd` project received no migrations or data changes.

## Database and media

The intended project finished restoring. Its six earlier migrations were present; these three pending migrations were then applied together in a transaction and recorded in Supabase migration history:

- `20260627120000_add_song_moderation.sql`
- `20260909120000_admin_console.sql`
- `20260924120000_secure_streaming_billing_recommendations.sql`

The audio bucket is private. Preview and cover buckets are public.

A clearly labeled 45-second test tone was uploaded through the dashboard. The worker completed processing on its first attempt. The anonymous browser received a 30-second preview and an upgrade prompt when it ended. The paid browser displayed full-track access and could seek to 35 seconds of the 45-second audio. The test song, original upload, normalized audio, and preview were removed after verification.

Administrator sign-in and dashboard loading also passed. The listener, admin server, and media worker were left running.

## Validation

`npm run check` passed: both application builds, TypeScript checks, lint, and six automated tests. Lint retains four existing React refresh warnings. Six unauthenticated local API checks and the authenticated payment/stream checks above passed. The browser bundles contain neither server credential and no reference to the other project.

The subscription page was also checked at a real 390 by 844 Chrome viewport without horizontal overflow.

## Limits and remaining functionality

This verifies the local browser callback flow with real Paystack test-mode responses. Actual provider webhook delivery to a public deployment, a scheduled renewal, production payments, subscription-management email delivery, and the full artist/listener/admin permission matrix remain unverified.

The application is not feature-complete: library saving and playlists are placeholder pages; Support, Private session, and Settings have no implemented actions; the admin Upload song link points to a route absent from the admin app.

Screenshots and structured details are stored beside this report in `payment-e2e-status.json`, `payment-test-checkout.png`, `payment-test-verified.png`, `payment-preview-cutoff.png`, and `payment-paid-playback.png`.
