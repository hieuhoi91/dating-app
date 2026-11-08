# DATING web

Next.js App Router frontend for DATING.

## Backend configuration

Copy `.env.example` to `.env.local`. Set `API_INTERNAL_URL` to the NestJS API
origin reachable by the Next.js server; it is server-only and must not use a
`NEXT_PUBLIC_` prefix. In production, set it to the API's actual Render service
origin, for example `https://your-api-service.onrender.com`, not `localhost`.
Set `NEXT_PUBLIC_NEST_API_URL` to the browser-reachable API origin for Socket.IO,
and `WEB_APP_ORIGIN` to the deployed web origin so NestJS can validate
cookie-authenticated mutations.

All `/api/*` REST requests are forwarded to NestJS, and the authenticated
Socket.IO client connects to the API's `/realtime` namespace. The socket token
is requested through the web server and kept in memory. Configure PostgreSQL
with the API and run its migrations before using the web application.

## Development

Run the API from `../api`, apply its TypeORM migrations, and configure its
PostgreSQL/SMTP/Google/Cloudinary environment first. Then run:

```powershell
pnpm install
pnpm dev
```

Validate the web app with `pnpm lint` and `pnpm build`.
