# Guruplay

Music discovery, private libraries, artist uploads and moderation, with subscription-based full-track listening.

The npm workspace contains the listener/artist app in `apps/web`, the admin app in `apps/admin`, and shared packages in `packages`. Use Node.js 22 and npm from the repository root.

## Development

1. Run `npm ci`.
2. Create a root `.env` using `.env.example` and supply your Supabase project configuration. Configure Paystack test credentials and a matching monthly plan when testing subscriptions. Keep service-role and payment secrets server-side.
3. Run the applications in separate terminals:

```sh
npm run dev:web
npm run dev:admin
npm run worker:media --workspace=@guruplay/web
```

The listener app runs on port 8080 and admin on 8081. The media worker requires FFmpeg and ffprobe, processes uploaded audio, and creates public previews. Both applications and server scripts read the root environment file.

Apply the Supabase migrations to your intended project once. Corresponding migration copies under the two apps target the same database and must not be applied twice. Only approved artists and admins can upload; artist submissions require moderation, and public catalog records also require completed audio processing.

## Verification

```sh
npm run check
```

This runs lint, TypeScript checks, automated tests and both application builds. Live integration scripts are opt-in and require a running app and explicitly disposable fixtures.

See [platform operations](docs/music-platform-operations.md), [personal API](docs/personal-api.md), [upload contract](docs/upload-ux-contract.md), and [UI acceptance results](docs/ux-e2e-report.md) for setup and verification details.
