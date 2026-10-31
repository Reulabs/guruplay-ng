# Library, playlists and settings acceptance

Completed 19 October 2026 against the local listener/admin apps and the real Supabase project `fuquclbwwofwugkxirrl`.

Implemented persistent saved songs, private playlists (create/edit/delete, membership, exact ordering with conflict detection), recently played tracks and history clearing. Added account display-name, volume, autoplay and server-enforced private-session settings. Anonymous and inactive accounts are denied; database policies independently isolate personal data. Unpublished songs cannot be added or exposed through playlists or the library.

Completed support requests and administrator replies, account editing/pause/restore, review audio and rejection reasons, the admin upload route, notifications, queue controls, previous-track behavior and genre stations. Corrected artist metrics to use qualified playback sessions and persistent saves, and admin activity to display the actual audit log. Removed navigation to unsupported album purchases and offline downloads. These flows do not promise public playlist sharing or artist-follow subscriptions.

## Evidence

- 16 groups of live API/database checks, plus 12 recorded browser check groups; see `personal-e2e-status.json` for exact scope.
- Actual generated audio was uploaded and processed. Browser playback covered previews and an existing paid test account, automatic queue advancement, stopping with autoplay off, previous/next and queue clearing.
- Browser forms exercised playlist creation, editing, adding/removing tracks, ordering and reload persistence, settings, a support request and admin response, account editing/pause/restore, rejection and reapproval. The repaired upload link opens the actual upload form.
- Desktop and 390px phone layouts were inspected. Mobile settings and playlist playback had no horizontal overflow. Saved songs and settings survived reload; signed-out library access showed the sign-in gate.
- Real review audio loaded (35-second duration, readyState 4) and played via keyboard. The analytics dashboard showed two qualified test plays, one listener and one saved song.
- Three additive migrations were applied once and recorded remotely; corresponding files match in both apps.
- `npm run check` passed: both lint/typecheck/build targets and eight unit tests. Lint retains four existing Fast Refresh warnings, no errors. Final auth changes were rechecked with lint/typecheck and both builds. Privileged credentials were absent from built browser assets.

Screenshots: `library-playlist-desktop.png`, `library-playlist-mobile.png`, `library-settings-desktop.png`, `library-settings-mobile.png`, `library-support-mobile.png`, `library-analytics.png`.

## Cleanup and limits

Temporary listener/artist accounts, playlists, tickets, songs and stored audio were removed; the existing two public profiles and payment entitlement were preserved. Original admin playback settings were restored. Audit records of test administrator actions remain as normal audit history. The catalog therefore returns its genuine empty state after cleanup.

This is local end-to-end acceptance using the connected backend. Production deployment, Paystack renewal timing and externally delivered webhooks were not exercised in this change. A reusable local Postman collection accompanies the contract; it was authored but was not executed with the Postman CLI. Live requests were executed by `scripts/personal-e2e.mjs` and the browser.
