Here’s a cleaned-up version you can drop into ‎⁠agent.md⁠:

Recent Changes

Data cleanup and fallbacks

Dummy data has been removed from the application.
When a view has no real data to display, it must render a dedicated fallback component instead of showing empty or placeholder content.

All fallback UI lives under ‎⁠components/fallbacks⁠.
When adding a new empty-state or error-state view, create or reuse a component in this directory rather than inlining ad‑hoc fallback markup.

Song upload permissions and moderation

Only artist profiles and admins are allowed to upload songs.

Any song uploaded by an artist (i.e., not by an admin account) now requires admin approval before it becomes publicly visible. The typical flow is:

1. Artist uploads a song.

2. The song is stored in a pending/needs-approval state.

3. An admin reviews and either approves or rejects the song.

4. Only approved songs are exposed in public listings and user-facing views.

Admins can upload songs that are immediately approved and published, bypassing the pending state.