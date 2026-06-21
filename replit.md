# Temp Mail

A temporary email app that lets users instantly create disposable email addresses — no sign-up needed. Supports Mail.tm, Guerrilla Mail, and TempMail.lol providers.

## How to Run (Development)

Two services must be running at the same time. They are already configured as workflows in Replit — just press the **Run** button or start them from the workflow panel:

| Workflow | What it does | Port |
|---|---|---|
| `artifacts/tempmail: web` | React frontend (Vite) | 18652 |
| `artifacts/api-server: API Server` | Express backend API | 8080 |

To start them manually from the shell:
```bash
# Terminal 1 — API backend
PORT=8080 pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend
PORT=18652 BASE_PATH=/ pnpm --filter @workspace/tempmail run dev
```

## Project Structure

```
artifacts/
  tempmail/          ← React + Vite frontend
  api-server/        ← Express 5 backend API
lib/
  api-client-react/  ← Auto-generated React Query hooks (from OpenAPI spec)
  api-spec/          ← openapi.yaml — single source of truth for all API contracts
  api-zod/           ← Auto-generated Zod schemas
render.yaml          ← Render.com deployment config
```

## Stack

- **Frontend:** React 18, Vite 7, Tailwind CSS, shadcn/ui, React Query, Wouter (routing)
- **Backend:** Express 5, Node.js 24, TypeScript 5.9
- **Monorepo:** pnpm workspaces
- **No database** — sessions are stored in-memory on the server; email data comes from external providers
- **Build:** esbuild (backend), Vite (frontend)

## API

The OpenAPI spec lives at `lib/api-spec/openapi.yaml`. All routes are under `/api`:

| Method | Path | Description |
|---|---|---|
| GET | `/api/healthz` | Health check |
| GET | `/api/domains` | List available email domains |
| GET | `/api/providers` | List email providers |
| POST | `/api/mailbox` | Create a new temp mailbox |
| GET | `/api/mailbox/:id/messages` | List messages in a mailbox |
| GET | `/api/mailbox/:id/messages/:msgId` | Get a specific message |
| DELETE | `/api/mailbox/:id/messages/:msgId` | Delete a message |

## Deployment (Render.com)

The app is configured to deploy as a **single service** on Render — the Express backend serves both the API and the built React frontend in production.

**Build command** (set in Render dashboard → Settings):
```
npx --yes pnpm@10 install --frozen-lockfile && npx pnpm@10 --filter @workspace/tempmail run build && npx pnpm@10 --filter @workspace/api-server run build
```

**Start command:**
```
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

**Environment variables on Render:**
- `NODE_ENV` = `production`
- `PORT` = `10000` (Render sets this automatically)

To redeploy: push changes to GitHub → Render auto-deploys (or use Manual Deploy in the Render dashboard).

## Architecture Decisions

- **No database** — The backend proxies requests to real email provider APIs (Mail.tm, Guerrilla Mail, TempMail.lol). Sessions are kept in a server-side `Map`. This means sessions reset on server restart — acceptable for a temp mail use case.
- **Single Render service** — In production, Express serves the React static build from `artifacts/tempmail/dist/public` + handles all `/api` routes. No CORS issues, no two services to manage.
- **Express 5** — Uses `/{*splat}` syntax for wildcard routes (not `*` which Express 5 / path-to-regexp v8 rejected).
- **OpenAPI-first** — `lib/api-spec/openapi.yaml` is the source of truth. React Query hooks in `lib/api-client-react/src/generated/` are generated from it via Orval. Run codegen with: `pnpm --filter @workspace/api-spec run codegen`

## What's Left / Ideas

- Auto-refresh inbox every 10–15 seconds so emails appear without manual reload
- Copy email address button on the home screen
- Support choosing a provider (Mail.tm vs Guerrilla vs TempMail.lol) from the UI
- Persist session across server restarts (would need a DB or Redis)

## User Preferences

- Wants the app deployable on Render.com (free tier)
- GitHub repo: https://github.com/The-habib/Temp-mail
