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
  and the SMTP settings configured in `.env`.
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
between 1 and 50. Replace the SMTP example values with credentials for the
mailer account you send from, and set `WEB_APP_URL` to the web origin. To enable
Google sign-in, uncomment and fill all three Google OAuth variables and set
`GOOGLE_CALLBACK_URL` to the web callback URL `/auth/callback`, then register it
in Google Cloud. `CLOUDINARY_URL` is needed when upload
endpoints are enabled. Do not commit `.env` or expose backend secrets in the
browser.

The API listens on port `4000` by default. `CORS_ORIGIN` is a comma-separated
allowlist; set it to the exact web origins that should be allowed.

```powershell
Invoke-RestMethod http://localhost:4000/health
pnpm test
pnpm build
```
