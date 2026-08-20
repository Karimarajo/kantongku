<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/23be34da-a6e4-4f51-8181-6b09f409118d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Local dev server (Docker, Task 1)

To test against a real Postgres + built server on your own machine before
deploying to CT101, without needing Google OAuth credentials:

1. `copy .env.local.example .env.local` and adjust if needed (defaults work
   out of the box).
2. `docker compose -f docker-compose.local.yml up --build`
3. Open http://localhost:3000. Log in without Google via the dev-login-bypass
   endpoint (only active because this compose file forces
   `NODE_ENV=development`; it stays a 404 in production):
   ```
   fetch('/api/dev/login-as-test-user', { method: 'POST', headers: {'Content-Type':'application/json'}, credentials: 'include', body: '{}' }).then(() => location.reload())
   ```
   (run that in the browser console on http://localhost:3000)
4. Seed dummy wallets/pockets/categories/transactions (run from your host,
   not inside the container — the production image doesn't ship `tsx`):
   ```
   set DATABASE_URL=postgres://kantongku_local:kantongku_local_dev@localhost:5432/kantongku
   npx tsx scripts/seed-dummy-data.ts
   ```
   Then log in as one of the seeded emails (see the script's console output
   or its header comment) via the same dev-login-bypass call, passing
   `{ "email": "usera.dummy@kantongku.test" }` as the body.

This is a completely separate stack from `docker-compose.yml` (the CT101
production compose file) — different container names, network, volume, and
env file — so the two never collide.

## Deploy

This app runs as a plain Node/Express process (`server.ts`) with a PostgreSQL database, a Google
OAuth login, and manual QRIS/bank-transfer payments confirmed via a built-in `/admin` console — so
it needs a host that runs a persistent Node service (not a serverless platform like Vercel). See
[DEPLOYMENT.md](DEPLOYMENT.md) for a concrete, step-by-step guide to deploying on Railway or
Render, including every environment variable, the `db/schema.sql` migration, and an end-to-end
test checklist.

<!-- test auto-deploy 11 Agustus 2026 -->
