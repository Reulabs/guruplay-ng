# Settings, favourites and service feedback

## Production diagnosis

On 1 November 2026, `https://www.guruplay.com.ng/api/v1/me/settings` returned a plain-text Vercel 404. The personal request helper called `response.json()` without handling a non-JSON response, displaying the parser exception to the listener. `/api/v1/library` reached the function but returned 503 because the server credential was missing. Vercel listed only the two public Supabase variables.

## Changes

- Route all nested `/api/v1/*` URLs through one explicit Vercel function. Restore the API path and retain query parameters. Keep raw request bodies available for signed webhooks. Apply the same routing to root and app-directory deployments.
- Translate malformed responses, timeouts, session expiry, rate limits and server failures into readable messages. Validate personal response shapes before rendering settings or mapping songs.
- Use neutral illustrated feedback with a retry action. Remove the red error-panel treatment and filter technical details at the shared presentation boundary. Keep the existing primary colour.
- Add accessible favourite hearts to song rows. Prevent repeated changes while the saved library loads or a save/remove is in progress. Confirm changes only after persistence and cache refresh.

## Validation

- `npm run check`: both applications type-checked and built; 24 tests passed; zero lint errors and four existing Fast Refresh warnings.
- Real Supabase/local API regression: all 14 groups passed, including settings persistence, invalid input, idempotent favourite saves, removal, account isolation, playlists and moderation permissions. See `settings-favourites-api-status.json`.
- Local browser: settings loaded; a real processed disposable song was saved, remained in Favourites after reload, and disappeared after removal. The empty-state illustration appeared.
- Isolated component preview: the exact parser-error example rendered a readable fallback instead of technical details. Retry worked with Enter. At a measured 390px viewport, the feedback had no horizontal overflow. The temporary preview files were removed.

## Hosting

With the user's approval, the existing Supabase service-role credential was configured as a sensitive secret for the Vercel Production environment. No production environment values were downloaded. The exact tested source commit `4153a5a2f96e5b90ecd77c106921e6d1dfea3702` was rebuilt from its existing preview deployment into production on 1 November 2026.

- Deployment: `dpl_GABULPzLK1VDWDrg5M7D1kmJtMQJ`, Ready, aliased to `https://www.guruplay.com.ng` and `https://guruplay.com.ng`.
- Live unauthenticated health returned 200; settings and library returned readable JSON 401 responses instead of a framework 404.
- Authenticated settings, library, playlists and subscription reads returned 200.
- All 14 regression groups passed against the production HTTPS API using disposable accounts and real generated audio. This included settings updates, favourite save/reload/remove, idempotent saves, account isolation and nested playlist mutations. The existing local media worker processed the temporary uploads; this does not establish hosted-worker readiness.
- The signed-in user's live settings and illustrated favourites page loaded in Chrome without technical errors. The user's profile, preferences and saved songs were not edited during browser verification.
- All 31 discovered public JavaScript assets were checked; none contained the server credential.
- Cleanup verification found zero remaining fixture profiles or songs and confirmed that the administrator's original playback preferences were restored. See `settings-favourites-production-status.json`.
