---
name: guru-music
description: Build and maintain the Guru Music (Guruplay) monorepo, including its listener and artist web app, admin app, shared UI, Supabase data and permissions, music moderation, and root environment configuration. Use for work in this project, not unrelated music applications.
---

# Guru Music project development

Work from the project root containing `package.json` with name `guru-music`. Resolve the root from the current checkout, never from a hardcoded machine path. Read relevant `AGENTS.md` files and the existing `apps/web/AGENT.md` and `apps/admin/AGENT.md` before changing their applications.

## Project map

- `apps/web`: listener and artist application, npm workspace `@guruplay/web`, development port 8080.
- `apps/admin`: administration application, npm workspace `@guruplay/admin`, development port 8081.
- `packages/ui/src`: low-level Radix-based UI components, imported through `@guruplay/ui`.
- `packages/shared/src`: reusable product components, logo asset, network status, and fallback views. Import explicit `@guruplay/shared/logo`, `@guruplay/shared/network-status`, or `@guruplay/shared/fallbacks/*` exports.
- `packages/common/src`: browser-safe utilities, errors, and brand constants. `packages/common/scripts` contains Node-only scripts, including the single admin seed implementation; never import scripts into browser code.
- Keep dependency direction apps → shared → ui → common. Common must not depend on React or application aliases. Scan shared component sources in both Tailwind configurations.
- Both applications use React 18, TypeScript, Vite, React Router, Tailwind, and Supabase JS. Inspect existing hooks before introducing another data-fetching pattern.
- `src/App.tsx` defines routes; `src/context/AuthContext.tsx` manages sessions; `src/context/PlayerContext.tsx` manages playback.
- `src/hooks/use-admin.ts` and `src/pages/Admin.tsx` implement administration; `src/hooks/use-catalog.ts` supplies music data; `src/components/dashboard/UploadSongModal.tsx` handles uploads.
- `src/lib/supabase.ts` contains the browser client and database-facing interfaces. `src/lib/artist.ts` defines account and artist statuses; `src/types/music.ts` defines presentation models.
- SQL migrations currently exist in both `apps/web/supabase/migrations` and `apps/admin/supabase/migrations`. Inspect both before changing the schema. Keep corresponding migrations consistent until a deliberate consolidation establishes a single source. Apply each migration once to the shared database, not once per app.

The two apps contain substantial duplicated domain code. Trace a change through both active routes and consumers. Keep shared behavior consistent without mechanically copying app-specific navigation or introducing an unrelated architectural rewrite.

## Product rules

Use real Supabase data. Reuse `@guruplay/shared/fallbacks/*` for loading, empty, error, and unavailable states; do not substitute fabricated songs, users, analytics, or successful responses when configuration or a query fails.

Account types are `user`, `artist`, and `admin`, stored in `public.users.user_type`. Artist application statuses are `not_applied`, `pending`, `approved`, and `rejected`. Song statuses are `pending`, `approved`, and `rejected`. Account type, artist verification, and song approval are separate concepts.

Only admins and approved artists may upload songs. Artist uploads begin pending; admin uploads may be immediately approved. Public catalog surfaces show approved songs only. Owners may inspect their own unpublished submissions and admins may review all submissions. Carry these rules through search, artist pages, playlists, direct links, and playback, not just the home listing.

## Supabase and authorization

Treat the connected Supabase project as the shared backend. Read the relevant migrations and verify the available schema before inventing tables, RPCs, or storage buckets. A configured client does not prove that local migrations have been applied remotely.

Enforce access in database policies and trusted server functions. Route guards and hidden controls improve the interface but do not authorize operations. Never allow profile updates or client-supplied metadata to grant admin privileges or approve an artist or song.

Existing review RPCs are `review_artist_application(profile_id, next_status)` and `review_song(target_song_id, next_status)`. Existing helpers include `is_admin()` and `current_user_type()`. Preserve explicit authorization, validated transitions, reviewer identity, and review time when extending moderation. For privileged SQL functions, set a safe search path, qualify objects as needed, and restrict execution appropriately. Inspect all applicable RLS policies because permissive policies combine.

Keep service-role or secret keys exclusively in trusted scripts or server environments. Supabase Auth administrative operations, such as disabling or deleting an auth account, require a trusted endpoint that verifies the caller's session and admin status. Do not put privileged credentials into the admin browser bundle. Distinguish editing a public profile from changing the corresponding auth account.

Use additive migrations for schema changes; do not rewrite deployed history. Report separately whether migrations were authored, locally verified, or applied remotely. Do not reset or seed a connected database merely to test a UI change.

## Music review and administration

Implement requested admin operations end to end: authorized backend mutation, usable controls, validation, pending state, error handling, and refreshed data. A visible button or local state update is insufficient.

Music review should let admins inspect metadata and preview submitted audio before approving or rejecting it. Surface current status and review results. Persist decisions before showing success and refresh affected catalog and admin views. Handle missing records and concurrent changes without reporting false success.

For user management, inspect existing capabilities and implement the requested actions rather than treating a read-only list as management. Protect against self-escalation and accidental removal of the last administrator when adding role changes. Use explicit confirmations for destructive actions in the product UI. Do not infer permission to delete real accounts while building or testing the feature.

For uploads, check artist eligibility, supported file types, sizes, metadata, ownership, and failure cleanup. Existing buckets are `song-audio` and `song-covers`; uploads use a user ID folder. Review storage access separately from song-row RLS: public bucket URLs can expose pending audio even when a catalog query hides the row. If unpublished media must be private, implement private storage and authorized playback URLs with matching policies.

When adding administration for another domain, first identify its actual tables and user flows. Do not create disconnected settings, fabricated metrics, or controls that only alter component state.

## Root environment configuration

Project requirement: all applications and local scripts use the repository-root `.env` as their shared configuration source. Do not copy credentials into per-app files.

For Vite applications, resolve `envDir` to the repository root independently of the working directory. Keep browser exposure restricted to the intended `VITE_` variables; never spread the entire environment into `define` or remove Vite's prefix boundary. The existing public names are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

Resolve root environment loading for Node scripts as well; workspace scripts run relative to their package. Ensure Turbo build caching accounts for root environment files and relevant public build variables so configuration changes do not reuse stale output. Preserve explicit deployment environment overrides and keep secrets out of tracked examples, logs, bundles, and generated documentation.

Inspect environment variable names or presence without printing values. An `.env.example`, when needed, contains placeholders only. Check ignore rules from the actual Git root, which may be above this project directory.

## Verification and delivery

Use npm and the root `package-lock.json`; do not switch package managers because legacy app-level `bun.lockb` files exist.

Useful root commands:

```sh
npm run dev:web
npm run dev:admin
npm run build
npm run lint
```

Workspace builds use Vite and do not themselves guarantee TypeScript checking. Run appropriate TypeScript checks when types change. Scope linting and builds to affected workspaces when suitable; validate both apps when changing shared UI, environment configuration, or shared contracts.

For permissions or moderation work, verify allowed and denied behavior for anonymous visitors, listeners, pending artists, approved artists, and admins. Check artist submission to admin review to public visibility, rejected submissions, direct unauthorized mutations, and backend failures. Use test fixtures or an isolated environment for destructive cases. If database access or a test account is unavailable, state which behavior remains unverified.

For UI changes, inspect desktop and mobile behavior, keyboard access, loading and failure states, and playback interactions relevant to the change. Preserve existing visual conventions and use shared components.

Report the concrete changes, checks completed, and remaining blockers. Separate implemented behavior from desired behavior. At initial inspection, review RPCs and administration views existed, user management was a read-only list, and Vite and seed scripts still used app-local environment loading; re-check the current files before relying on this baseline.
