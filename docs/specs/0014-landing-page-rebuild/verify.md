# Verify: landing page rebuild review repairs · spec 0014 · updated 2026-10-24

_Steps derived from the post review repair pass. `/verify-release` runs these; `/test-engineer` locks the durable ones._

## UI / manual

- [ ] Visit `/` signed out and read the dark band: it says "Free to start: 2 notes and 4 quizzes to try, plus 8 messages to Tip a day.", with "a day" attached to Tip alone → AC-7
- [ ] On a fresh free account, upload two notes, then try a third: refused 403 as an all-time count, and the landing copy nowhere promises a daily note reset → AC-7
- [ ] As a student whose clock is Douala (UTC+1), answer a quiz at 23:30 UTC, open `/dashboard`: the Last quiz card shows the Douala calendar day and the console shows no hydration warning → AC-3
- [ ] On a built server (`pnpm build && pnpm start`), open a note: the PDF pane loads inside the page, while the site itself refuses to be framed from outside → AC-2, AC-17
- [ ] Open admin platform settings: the "Enforce all credit gates" help text names exactly the two switches below it → AC-1

## Commands

- [ ] `pnpm tsc` → no errors
- [ ] `pnpm lint` → no error, no warning in a file this pass touched, 61 warning baseline kept
- [ ] `pnpm test --run` → 71 files, 623 tests pass
- [ ] `pnpm build`, then `curl -sI` the built URL on `/`: CSP carries `frame-src 'self' https://*.ufs.sh https://*.utfs.io; frame-ancestors 'none'` and `X-Frame-Options: DENY`
- [ ] `pnpm honesty:check <built URL>` → passes
- [ ] `NODE_ENV=production pnpm db:seed` with no `SEED_DEMO` → logs "Demo account skipped" and no `demo@tic.local` user exists after it

## Acceptance-criteria coverage

- AC-1 copy and settings · AC-2 headers and honesty script · AC-3 hydration safe dates · AC-7 honest free limits · AC-17 request guard untouched, framing safe
- Readiness value source: the seed gate reads `SEED_DEMO` from the environment and refuses in production without it, varied by setting the variable both ways
