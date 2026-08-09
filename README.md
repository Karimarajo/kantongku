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

## Deploy

This app runs as a plain Node/Express process (`server.ts`) with a PostgreSQL database, a Google
OAuth login, and manual QRIS/bank-transfer payments confirmed via a built-in `/admin` console — so
it needs a host that runs a persistent Node service (not a serverless platform like Vercel). See
[DEPLOYMENT.md](DEPLOYMENT.md) for a concrete, step-by-step guide to deploying on Railway or
Render, including every environment variable, the `db/schema.sql` migration, and an end-to-end
test checklist.
