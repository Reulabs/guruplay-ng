# Admin deployment and artist discovery

The public Artists route is for discovering musicians. Its empty state now reads “No artists here just yet” and “Check back soon to discover new music.” It does not describe moderation or expose approval controls.

Artist approval remains enforced by the database, through `review_artist_application` and the active-administrator check in `is_admin()`. No new approval privileges or database migration were needed.

## Verification

- `npm run check`: both applications type-checked and built, 26 tests passed, and lint reported zero errors with four existing Fast Refresh warnings.
- The real Supabase permission check verified administrator approval, denied review RPCs for anonymous/listener/pending/approved-artist callers, denied direct approval changes and self-promotion, and public visibility only after administrator approval. All temporary profiles and accounts were removed. See `admin-artist-approval-status.json`.
- Admin routing now sends nested management requests through its explicit function and preserves pagination and filters. Shared music API routes cover support and private review previews. Regression tests preserve the listener routing behavior.
- Admin sign-in now asks for an existing administrator account and offers no public registration form. Database and API permissions remain the authority after login.
- The admin dashboard route redirects other account types to the restricted-access page. That page offers account switching and a working link back to the listener site.

## Hosting

The separate Vercel project is `eazicred/guruplay-admin`, rooted at `apps/admin` with shared workspace sources enabled. It uses the existing Supabase project and needs only the public URL and anon key. Same-origin API rewrites forward authenticated requests to the existing Guruplay server at `www.guruplay.com.ng`.

Privileged API handlers run in the listener's existing trusted server environment, using its existing server-only credential. The admin project receives no service-role secret. The admin API verifies an active administrator on every request; artist approval also remains enforced by its database RPC. This avoids duplicating the credential in a second project.

The admin interface is deployed at `https://admin.guruplay.com.ng`, with verified DNS and HTTPS. Its production source is `9acdf88f3b8aa02bd7f61384030e82485925c5b6` and deployment ID is `dpl_EMgvLZwan9nzYvDPQ8Rwi3NBnu6S`. The shared server was deployed from `9cb4e7efd4fc3302133e0f15711adf1e992bb8d7`.

All ten backend acceptance checks passed through the deployed admin domain. They include anonymous/non-admin denial, filtered administrator reads, a persisted edit to a disposable account, and authorization for support and review-preview routes. The scripted test accounts, profiles and audit entries were removed. Vercel configuration confirmed that the admin project has only the two public Supabase variables.

Live Chrome checks confirmed that a normal account sees restricted access, `/dashboard` redirects it to that restriction, and account switching opens administrator sign-in. The administrator then approved a separate disposable applicant using the live console. The persisted profile status, artist eligibility and public visibility were verified, and the disposable account/profile were removed. The existing artist record was not reviewed or changed.
