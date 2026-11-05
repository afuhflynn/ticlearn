# Running background jobs off Vercel (worker hosting)

## Why

Inngest Cloud never runs your code. It stores events and calls **your**
serve endpoint (`/api/inngest`). Today that endpoint lives on the Vercel
Hobby deployment, so every background invocation inherits the Hobby
function limits: a long visual-analysis run or a stacked model fallback
can be killed mid-flight and the dashboard shows it as failed.

Moving the workers means pointing the Inngest app at a host without
those caps. No code changes are needed: same repo, same routes, same
`/api/inngest` path — only the URL Inngest calls changes. The website
itself stays on Vercel; `inngest.send` from the web app is one fast HTTP
call and works fine on Hobby.

## Recipe

1. Deploy this repo to Fly.io, Render, Railway, or any VPS using the
   root `Dockerfile` (`output: "standalone"` is already set in
   `next.config.ts`, so Vercel builds are unaffected).
2. Copy **every server env var** from Vercel to the worker host, unchanged:
   `DATABASE_URL` (same Postgres both sides read and write),
   `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `OPENROUTER_API_KEY`,
   `MUSE_API_KEY`, `BAASETEN_API_KEY`, `BLOB_READ_WRITE_TOKEN`,
   UploadThing keys, auth secrets, cron secrets. No new values, same account.
3. Inngest dashboard → Apps → `ticlearn` → change the sync URL to
   `https://<worker-host>/api/inngest` → **Sync**. The function list must
   show the current set (including `visual-analysis/process` and
   `visual-analysis/analyze-page`); stale entries mean the sync failed.
4. Upload a test note and watch both `note/uploaded` and per-page
   `note/analyze-page` runs complete on the worker host's logs.
5. Rollback is the reverse: sync the URL back to
   `https://ticlearn.ticsummit.org/api/inngest`.

## Notes

- Keep the two deploys on the **same commit**. The web app and the worker
  share the database and the event names; a version skew between them is
  the classic source of "events go nowhere" mysteries.
- The chat route (`app/api/ai/chat`) still runs on Vercel, so Hobby
  function caps still apply to long *turns* (e.g. drawings that stack
  model fallbacks). If those still die after the workers move, that is a
  separate web-tier limit: the options are Vercel Pro or making draws
  asynchronous.
- Resync the Inngest app after **every** deploy that adds, removes, or
  renames a function — syncs are manual (no Vercel integration linked).
