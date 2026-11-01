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

The live server needs its existing Supabase service-role credential configured as a server-only Vercel secret and a deployment containing the routing fix. These changes require the requested credential-transfer and deployment approval. No production environment values were downloaded.
