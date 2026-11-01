# Admin deployment and artist discovery

The public Artists route is for discovering musicians. Its empty state now reads “No artists here just yet” and “Check back soon to discover new music.” It does not describe moderation or expose approval controls.

Artist approval remains enforced by the database, through `review_artist_application` and the active-administrator check in `is_admin()`. No new approval privileges or database migration were needed.

## Verification

- `npm run check`: both applications type-checked and built, 26 tests passed, and lint reported zero errors with four existing Fast Refresh warnings.
- The real Supabase permission check verified administrator approval, denied review RPCs for anonymous/listener/pending/approved-artist callers, denied direct approval changes and self-promotion, and public visibility only after administrator approval. All temporary profiles and accounts were removed. See `admin-artist-approval-status.json`.
- Admin routing now sends nested management requests through its explicit function and preserves pagination and filters. Shared music API routes cover support and private review previews. Regression tests preserve the listener routing behavior.
- Admin sign-in now asks for an existing administrator account and offers no public registration form. Database and API permissions remain the authority after login.

## Hosting

The separate Vercel project is `eazicred/guruplay-admin`, rooted at `apps/admin` with shared workspace sources enabled. It uses the existing Supabase project. Public Supabase configuration is set. The server-only Production service-role credential requires the separate requested approval before the admin deployment can be completed.
