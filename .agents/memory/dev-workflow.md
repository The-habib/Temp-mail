---
name: Dev workflow setup
description: How the Replit dev workflows must be configured for this monorepo to avoid 502 errors
---

## Rule
Two workflows are required:
1. "Start application" — `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/tempmail run dev` (webview, port 5000)
2. "Start Backend" — `PORT=8080 pnpm --filter @workspace/api-server run dev` (console, port 8080)

Do NOT run `$REPLIT_ARTIFACT_ROUTER` in any workflow unless you first ensure nothing occupies port 8080. The artifact router starts Express internally on port 8080 — if a workflow already has Express on 8080, it will EADDRINUSE crash and the router fails.

## Why
The Replit proxy routes to port 5000 (the webview workflow port). Vite on 5000 proxies `/api/*` and `/webhook/*` to Express on 8080. Running the artifact router in a workflow conflicts with Express already on 8080.

## How to apply
If you see a 502 on the public URL:
1. Check if "Start Backend" is running (Express on 8080)
2. Check if "Start application" is running (Vite on 5000)
3. Make sure nothing else is occupying those ports
4. Use `configureWorkflow` to re-register if workflows were stopped
