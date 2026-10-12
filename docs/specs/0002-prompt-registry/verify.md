# Verify: prompt registry · spec 0002 · updated 2026-10-12
_Steps derived from spec 0002 Done when outcomes. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Edit `prompts/tools/web_search.md` wording slightly, send a chat message needing web context → model behavior reflects the edit on the next request → Done when 3, 4
- [ ] Revert the edit, reload → prior behavior returns with no rebuild → Done when 3
- [ ] Break one header (unknown model) in a scratch copy pointed at by `PROMPTS_DIR` → request using it fails fast naming the prompt, no student data in the log → fail fast path
## Commands
- [ ] `pnpm prompts:check` → ok, all files validated, no inline prompt text → Done when 1, 2
- [ ] `pnpm typecheck` → clean
- [ ] `pnpm test --run` → green including `tests/lib/prompts/loader.test.ts`
- [ ] Add `const prompt = \`scratch\`` to a temp file → check fails naming it; remove → passes → enforcement
## Acceptance-criteria coverage
- Done when 1 (no inline strings) … covered by prompts:check code scan
- Done when 2 (model plus settings in front matter) … covered by prompts:check header validation
- Done when 3 (edit live on next request) … covered by manual edit step
- Done when 4 (tool text same home) … covered by manual chat step plus `prompts/tools/` files

## Conformance hardening (2026-10-12 build)
_Steps for the spec standard gaps closed after the first verify run. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Generate a quiz from a note, an exam mock, a Paper 3 mock plus submit, and a web context chat through the running app → each answers from its prompt file wording → Done when 3
- [ ] Break a title generation prompt behind `PROMPTS_DIR` → chat still titles itself with the static fallback text, no throw, no student data in the log → fallback path
## Commands
- [ ] `pnpm prompts:check` → ok including heat 0 to 1 plus cap plus cacheSpanMs plus needs flags validation → Done when 2
- [ ] Call a `needsTools` prompt file without offering tools (scratch script through `getPromptSync` with no `use` flags) → typed error naming the prompt → needs enforcement
- [ ] Run any generation twice with identical input → second call hits the file span cache keyed with prompt name plus version; run a grading call twice → never cached → file span wins, grading stays zero
- [ ] Read the server logs for one generation → line carries prompt name plus version plus model with no slot values → traceability
## Acceptance-criteria coverage
- Done when 2 … covered by extended header validation step
- Done when 3 … covered by live app pass plus fallback step
- Spec standard (needs flags, file span wins, cache key, logs, fallback) … covered by the four command steps

## Fixture driven full pass (2026-10-12 build)
_Fixture user plus seed data let the four families run inside the running app. `/verify-release` reruns these; `/test-engineer` locks the durable ones. Space model calls about 15 seconds apart (free tier quota is 5 per minute)._
## Setup commands
- [ ] `set -a; source .env; set +a; pnpm db:seed` → exam structure present → seed
- [ ] `set -a; source .env; set +a; npx -y tsx scripts/seed-verify-fixture.ts` → prints userId plus profileId plus blueprintId plus noteId, 500 credit balance → fixtures
- [ ] `pnpm dev` plus `npx -y inngest-cli@latest dev -u http://localhost:3000/api/inngest` → both ready → harness
- [ ] Sign in through the app with the fixture email (scripted signup hits the bot shield by design, use a real browser or the server auth API), keep the session cookie → session
## UI / manual
- [ ] POST quiz generate with the fixture noteId (5 MCQ) → poll to READY with 5 questions → Done when 3
- [ ] POST exam mock generate with the fixture blueprintId → 200 with 5 questions → Done when 3
- [ ] POST Paper 3 mock generate (ADMIN fixture user, DATABASE focus, 5 questions) → job completes to DRAFT with 5 questions (parse retries expected) → Done when 3
- [ ] Create a chat conversation, send one message → stream ends in finish stop plus DONE → Done when 3, 4
## Acceptance-criteria coverage
- Done when 3 … covered by the four drive steps
- Done when 4 … covered by the chat drive step
