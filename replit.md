# Temp Mail

A temporary email app that lets users instantly create disposable email addresses — no sign-up needed. Supports Mail.tm, Guerrilla Mail, and TempMail.lol providers, plus **custom domains via Mailgun** so you can receive real emails on your own domain.

## How to Run (Development)

Two workflows must be running at the same time. Start them from the Replit workflow panel:

| Workflow | Command | Port |
|---|---|---|
| `Start application` | `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/tempmail run dev` | 5000 |
| `Start Backend` | `PORT=8080 pnpm --filter @workspace/api-server run dev` | 8080 |

To start them manually from the shell:
```bash
# Terminal 1 — API backend
PORT=8080 pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (proxies /api and /webhook to port 8080)
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/tempmail run dev
```

> **Important:** Do NOT run `$REPLIT_ARTIFACT_ROUTER` in any workflow during development — it tries to start Express on port 8080 and will crash with `EADDRINUSE` if Start Backend is already running.

## Project Structure

```
artifacts/
  tempmail/          ← React + Vite frontend
  api-server/        ← Express 5 backend API
    src/
      routes/
        index.ts         ← /api router (health, domains, providers, mailbox)
        mailbox.ts       ← Standard provider mailbox logic
        custom-mailbox.ts← Custom domain mailbox (reads from DB)
        setup.ts         ← /api/setup/* — Mailgun wizard endpoints
        push.ts          ← /api/push/* — Web Push subscriptions
        webhook.ts       ← /webhook/mailgun — receives inbound emails
      lib/
        mailgun-config.ts← Reads/writes Mailgun config (env vars or data/mailgun-config.json)
lib/
  api-client-react/  ← Auto-generated React Query hooks (from OpenAPI spec)
  api-spec/          ← openapi.yaml — source of truth for standard API contracts
  api-zod/           ← Auto-generated Zod schemas
  db/                ← Drizzle ORM schema + DB client (PostgreSQL)
    src/schema/emails.ts  ← mailboxes + emails tables
data/
  mailgun-config.json← Written by setup wizard (gitignored; use env vars in prod)
render.yaml          ← Render.com deployment config
```

## Stack

- **Frontend:** React 18, Vite 7, Tailwind CSS, shadcn/ui, React Query, Wouter (routing)
- **Backend:** Express 5, Node.js 24, TypeScript 5.9
- **Database:** PostgreSQL via Drizzle ORM (`lib/db`) — used for custom-domain emails
- **Monorepo:** pnpm workspaces
- **Build:** esbuild (backend), Vite (frontend)

## API Routes

All API routes are under `/api`. Webhook is under `/webhook`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/healthz` | Health check |
| GET | `/api/domains` | List available email domains for a provider |
| GET | `/api/providers` | List providers (includes Custom Domain if configured) |
| POST | `/api/mailbox` | Create a new mailbox (supports `provider: "custom"`) |
| GET | `/api/mailbox/:id/messages` | List messages (reads DB for custom provider) |
| GET | `/api/mailbox/:id/messages/:msgId` | Get a specific message |
| DELETE | `/api/mailbox/:id/messages/:msgId` | Delete a message |
| GET | `/api/setup/status` | Check if Mailgun custom domain is configured |
| POST | `/api/setup/configure` | Run Mailgun wizard: verify key, create catch-all route |
| POST | `/api/push/subscribe` | Register a Web Push notification subscription |
| POST | `/api/push/test` | Send a test push notification |
| POST | `/webhook/mailgun` | Inbound email webhook from Mailgun (token-authenticated) |

## Custom Domain (Mailgun) Feature

Users can set up their own domain to receive real emails. The setup wizard (`/setup`) walks through 4 steps:

1. Create a Mailgun account
2. Enter your domain (e.g. `mail.example.com`)
3. Enter your Mailgun Private API Key — the backend verifies it and **auto-creates a catch-all route** pointing to `/webhook/mailgun`
4. Add the displayed DNS records (MX + SPF) at your registrar

**Config storage** (priority order):
1. Environment variables: `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_WEBHOOK_TOKEN`
2. File: `data/mailgun-config.json` (written by the wizard; use env vars for production)

**Inbound email flow:**
```
Email sent to *@yourdomain.com
  → Mailgun receives it
  → POSTs to /webhook/mailgun (authenticated with MAILGUN_WEBHOOK_TOKEN)
  → Backend saves to PostgreSQL (emails + mailboxes tables)
  → Frontend polls /api/mailbox/:id/messages to display
```

## Database Schema

PostgreSQL (Drizzle ORM). Tables are auto-created on first run.

**`mailboxes`** — custom domain mailboxes
| Column | Type | Notes |
|---|---|---|
| `id` | text (PK) | Prefixed with `cm_` |
| `address` | text (unique) | Full email address |
| `created_at` | timestamp | Auto-set |

**`emails`** — inbound emails received via Mailgun
| Column | Type | Notes |
|---|---|---|
| `id` | serial (PK) | Auto-increment |
| `mailbox_address` | text | Matches `mailboxes.address` |
| `from_address` | text | Sender email |
| `from_name` | text | Sender display name |
| `subject` | text | Email subject |
| `body_html` | text | HTML body (nullable) |
| `body_text` | text | Plain text body (nullable) |
| `received_at` | timestamp | Auto-set |
| `is_read` | boolean | Default false |

## Frontend Pages

| Route | Page |
|---|---|
| `/` | Home / inbox view |
| `/welcome` | Onboarding / welcome screen |
| `/create` | Create mailbox (with provider selector) |
| `/activity` | All active mailboxes |
| `/settings` | App settings and theme |
| `/setup` | Mailgun 4-step setup wizard |

## Deployment (Render.com)

The app deploys as a **single service** on Render — Express serves both the API and the built React frontend in production.

**Build command** (set in Render dashboard → Settings):
```
npx --yes pnpm@10 install --frozen-lockfile && npx pnpm@10 --filter @workspace/tempmail run build && npx pnpm@10 --filter @workspace/api-server run build
```

**Start command:**
```
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

**Environment variables on Render:**
| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Required |
| `PORT` | `10000` | Render sets automatically |
| `DATABASE_URL` | `postgresql://...` | Required for custom domain emails |
| `MAILGUN_API_KEY` | `key-...` | Required for custom domain |
| `MAILGUN_DOMAIN` | `mail.yourdomain.com` | Required for custom domain |
| `MAILGUN_WEBHOOK_TOKEN` | (random secret) | Required for webhook auth |

To redeploy: push to GitHub → Render auto-deploys, or use Manual Deploy in the Render dashboard.

## Architecture Decisions

- **PostgreSQL for custom email only** — Standard provider sessions (Mail.tm, Guerrilla, TempMail.lol) are still kept in-memory server-side Maps. The DB is only used for emails received via Mailgun on custom domains.
- **Mailgun config priority** — Env vars (`MAILGUN_API_KEY`, etc.) always win over the file-based `data/mailgun-config.json`. Use env vars in production; the file is for Replit dev convenience.
- **Webhook token auth** — Mailgun inbound emails are authenticated with a random token stored in the config (not Mailgun's signing key), keeping the webhook simple without requiring the `MAILGUN_WEBHOOK_SIGNING_KEY` secret.
- **Single Render service** — In production, Express serves the React static build from `artifacts/tempmail/dist/public` + handles all `/api` and `/webhook` routes. No CORS issues, no two services to manage.
- **Express 5** — Uses `/{*splat}` syntax for wildcard routes (not `*` which Express 5 / path-to-regexp v8 rejected).
- **OpenAPI-first** — `lib/api-spec/openapi.yaml` is the source of truth for standard endpoints. React Query hooks in `lib/api-client-react/src/generated/` are generated via Orval. Run codegen: `pnpm --filter @workspace/api-spec run codegen`
- **Dev proxy** — Vite's dev server (port 5000) proxies `/api/*` and `/webhook/*` to Express on port 8080. No CORS configuration needed in development.

## What's Left / Ideas

- Auto-refresh inbox every 10–15 seconds so emails appear without manual reload
- Copy email address button on the home screen
- Show DNS record verification status in the setup wizard (poll Mailgun's domain verification API)
- Web Push notifications when a new email arrives (subscriptions are stored, sending logic needs wiring)
- Persist standard provider sessions across server restarts (would need Redis or DB)

## User Preferences

- Wants the app deployable on Render.com (free tier)
- GitHub repo: https://github.com/The-habib/Temp-mail
