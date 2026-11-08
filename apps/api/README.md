## DATING API

The target backend for DATING is a standalone NestJS service. It owns REST APIs and
authenticated Socket.IO connections, uses PostgreSQL through TypeORM, and stores
uploaded images in Cloudinary.

### Migration status

The web now forwards all REST API routes to this service. The application uses
a new PostgreSQL database; legacy users/data are not imported.

Currently implemented:

- `GET /health` checks the PostgreSQL connection.
- `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, and
  `GET /auth/me` provide password authentication with short-lived JWT access
  cookies, rotating opaque refresh tokens, and scrypt password hashes.
- Email verification and password reset use single-use, hashed PostgreSQL tokens
  and either the SMTP or Resend settings configured in `.env`.
- Google OAuth uses a one-time state cookie and verified Google email; configure
  all Google client/callback variables to enable it.
- `GET/PATCH /users/me` read and update the signed-in user's profile. Exact birth
  date and coordinates are kept in the PostgreSQL `private` schema.
- Platform APIs provide profile photos, notifications, relationship events,
  verification records and subscription records.
- Social APIs provide preferences/settings, blocks/reports, discovery,
  Like/Match, conversations and messages.
- Couple APIs provide invitations, overview, questions, challenges, plans,
  journal, memories, feed, media and location lookup.
- Couple location search and reverse geocoding send the entered search term or
  selected coordinates to OpenStreetMap Nominatim. Requests are limited to one
  per second per client IP; review the provider's usage policy before production
  deployment or higher-volume use.
- Socket.IO `/realtime` accepts a short-lived JWT issued by authenticated
  `POST /auth/socket-token`. It emits chat, match, notification and Couple
  updates to authenticated user rooms; clients cannot join arbitrary rooms.
- Authenticated chat supports text and JPEG/PNG/WebP/GIF image attachments up to
  8 MB; chat image uploads are persisted with their Cloudinary URL and public ID.
- Deleted/replaced profile images and deleted Couple memory/feed media are
  queued transactionally in PostgreSQL for Cloudinary deletion. The API retries
  transient failures with bounded exponential backoff; apply all migrations
  before starting the API.

The current request limiter stores counters in the API process. It is suitable
for one instance during the migration; configure a shared Redis-backed limiter
before horizontally scaling the API.

PostgreSQL migrations create the identity, platform, social and Couple schemas.
They do not import legacy users or application data, per the fresh-start choice.
Email verification/password-reset via SMTP and Google OAuth are implemented in
the API and connected through the web proxy. They require your own mailer and
Google OAuth environment values. Register the web callback URL
`https://<web-origin>/auth/callback` in Google Cloud; the web forwards callback
requests to NestJS so auth cookies are set on the web origin.

### Local development

From `apps/api`:

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
pnpm install
pnpm db:migrate
pnpm start:dev
```

Edit `.env` and set a private random `JWT_ACCESS_SECRET` of at least 32
characters, your PostgreSQL `DATABASE_URL`, and exact comma-separated
`CORS_ORIGIN` values. Set
`DATABASE_SSL=true` when required by your provider and choose `DATABASE_POOL_MAX`
between 1 and 50. For SMTP, replace the example values with credentials for the
mailer account you send from, and set `WEB_APP_URL` to the web origin. Gmail
SMTP requires a Google App Password (with 2-Step Verification enabled), not
your regular Gmail password. Alternatively, configure `RESEND_API_KEY`,
`SMTP_FROM` using an address on a domain verified in Resend, and `WEB_APP_URL`;
the API sends through Resend over HTTPS and does not require SMTP credentials.
To enable
Google sign-in, uncomment and fill all three Google OAuth variables and set
`GOOGLE_CALLBACK_URL` to the web callback URL `/auth/callback`, then register it
in Google Cloud. `CLOUDINARY_URL` is needed when upload
endpoints are enabled. Do not commit `.env` or expose backend secrets in the
browser.

### Render deployment

Configure the API web service with these values:

- **Root Directory:** `apps/api`
- **Build Command:** `pnpm install --frozen-lockfile && pnpm build`
- **Start Command:** `pnpm start:prod`
- **Health Check Path:** `/health`

The build command must run before `start:prod`; NestJS writes the entry point to
`dist/main.js`. The production start script applies pending PostgreSQL migrations
before starting NestJS, so the API does not accept requests against an outdated
schema. If the service starts with `Cannot find module
'.../apps/api/dist/main.js'`, check that Render is using this root directory and
that its latest deploy actually completed the build command. Do not set the
start command to `node dist/main.js` from the repository root.

Set the production environment variables required by `validateEnvironment`,
including `DATABASE_URL`, `JWT_ACCESS_SECRET`, `CORS_ORIGIN`,
`WEB_APP_URL`, and `CLOUDINARY_URL`. For email, configure either
`RESEND_API_KEY` and `SMTP_FROM` (an address on a verified Resend domain), or all
SMTP variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
`SMTP_PASSWORD`, and `SMTP_FROM`. Render supplies `PORT`; the API listens on it
automatically. Set `CORS_ORIGIN` to the exact production web origin (for
example, `https://your-web-service.onrender.com`), not `http://localhost:3000`.

The API listens on port `4000` by default. `CORS_ORIGIN` is a comma-separated
allowlist; set it to the exact web origins that should be allowed.

```powershell
Invoke-RestMethod http://localhost:4000/health
pnpm test
pnpm build
```
