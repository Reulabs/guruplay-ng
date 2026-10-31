# Upload UX and acceptance contract

The persistent header Upload link opens `/upload`. Anonymous visitors are prompted to sign in on that route and continue after authentication. Listeners and unapproved artists receive their actual application state and a route to their application. Only active admins or approved artists can enter the audio/details/review workflow. Existing server and storage authorization remains authoritative.

A single upload uses the existing private audio and cover storage followed by `POST /api/v1/media/songs/upload`, with `{audioPath,title,artist,genre,coverUrl}` and Bearer authentication. A successful 202 response returns `{id,processingStatus}` and means the upload was received, not that it is published. The result polls the owner-scoped `my_songs` record. Ready + approved means published; pending moderation remains private; failed/quarantined media shows an actionable failure.

Audio input supports MP3, WAV, FLAC, M4A, AAC, OGG and OPUS, non-empty and at most 200 MiB. Optional covers support JPEG, PNG and WebP at most 10 MiB. Metadata requires a trimmed title, artist and genre within the existing server bounds. Submit is single-flight, retains input on failure, and never reports an ambiguous network outcome as a successful publish. Stages show actual operations without invented upload percentages.

Catalog loading uses layout-matching skeletons. Empty and failed catalogs retain muted non-animated placeholders with an explicit fallback and retry action. No fabricated tracks or endless animation. The original primary color remains `0 84% 60%`.

The reference inspected was https://audiomack.com/ and its Song upload entry. Its next step required email confirmation, so no external media was uploaded and no confirmation email was sent. Real upload acceptance is performed against Guruplay using clearly marked, disposable generated audio.

The new client supplies an optional UUID `uploadId`. Legacy callers may omit it. The server uses this UUID as the song ID, and retries by the same active uploader with identical title/artist/genre return the existing durable job instead of creating another release. A reused ID owned by another uploader returns 404; changed details return 409. Files remain intact after an uncertain registration response so a retry cannot damage a completed upload.
