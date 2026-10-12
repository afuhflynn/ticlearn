# 0001. Rationale: close the security and integrity holes before real students arrive

Decision record. Read by humans and by future design work, not during a build.

## Context

`docs/research/security.md` audited the security relevant surface of this app on 2026-10-12 and returned twenty findings that must close before real students arrive. The scope row `docs/scope/platform.md` §2 carries them, tier GA, and names the same twenty as its done when condition.

The app is a Next.js 16.2 app with 143 route handlers, a better-auth 1.6 auth layer, Prisma 7 on Postgres, an AI chat surface whose tools touch the database, Inngest jobs, UploadThing uploads, Fapshi payments over Mobile Money, and Arcjet already installed for bot detection and signup protection. The stated audience is Cameroonian university students on mobile data, most on a shared two gigabyte Android phone, which shapes every rate limit number: generous bursts, tight sustained rates, and a separate tighter budget on anything that spends money.

Three structural facts shaped this design.

The defences that are written do not run. `lib/arcjet.ts` defines three token buckets that nothing imports, so there is zero application rate limiting on any AI, upload, payment or admin route. The only Arcjet rule that executes is bot detection on the auth route. Meanwhile the defences that do run are narrow: the better-auth built in limiter defaults to 100 requests a minute, which is far too loose for a sign in brute force and does not exist at all in development.

Money and identity have specific holes that are trivially reachable. The Fapshi webhook compares the request header against a template literal, so with the secret unset the expected value is the string `Bearer undefined` and a request carrying that header grants a subscription, creates an affiliate earning and sends email. One admin route under `/api/admin/` has no authentication at all and returns the 50 newest exam questions from the whole database. `app/api/notes/route.ts` accepts an arbitrary URL from the client and the Inngest worker fetches it, which is a server side request forgery primitive for any account holder.

The AI surface is where untrusted content meets tools with side effects. Students upload PDFs and images of handwritten notes, the text is extracted, and it is handed to a model that can create quizzes, search the web and read the database. The only stated defence is a block of instructions in the system prompt asking the model not to be misled, which is a request to a probabilistic system, not a control. Meanwhile `searchKnowledge` queries the shared knowledge table with no user filter and its own description says it includes every user's notes, which is both a cross user data leak and a permanent cross user broadcast channel for injected instructions.

Two forces push against doing all of this at once. The pivot work in the scope deletes the GCE content and repoints the data model, so any fix that depends on GCE specific entities or enum values will be thrown away. And the AI model chain spec will restructure `lib/ai/`, so fixes placed there should be small and self contained enough to survive a move.

## Evidence gathered while designing

Every headline claim was re checked in the working tree on 2026-10-12, not taken on the audit's word.

| Claim | What the code shows today |
|---|---|
| Rate limiters unused | `grep` for the three exported clients across `app/` and `lib/` matches only their own definitions. The only import of `@/lib/arcjet` is the auth route, and it uses only `protect`. |
| Fails open webhook | `app/api/webhooks/fapshi/route.ts:32-38` compares against `Bearer ${process.env.FAPSHI_WEBHOOK_SECRET}` with `!==`. |
| Unauthenticated admin route | `app/api/admin/parse-status/[jobId]/route.ts` has no session call, ignores its `jobId`, and returns `take: 50` rows from `prisma.question`. |
| Mail relay | `app/api/inngest/trigger/route.ts` reads `type`, `email` and `name` from the body and sends a welcome email for any authenticated user. |
| Contact HTML injection | `app/api/contact/route.ts` interpolates `name`, `email`, `subject` and `message` into an HTML email with no escaping. |
| Cross user knowledge read | `lib/ai/tools.ts:578-602` queries `knowledgeChunk` with only a topic name filter and selects `content` verbatim. |
| SSRF | `app/api/notes/route.ts:12` accepts `fileUrl: z.string().url()` with no host restriction. |
| No tests | `vitest` is in `package.json`, `pnpm test` maps to it, and there is no config file and no test file in the tree. |
| No CI | `.github/` does not exist. |
| No headers | `next.config.ts` sets only `reactCompiler`, `allowedDevOrigins` and `serverExternalPackages`. |
| Tracked credentials | `docker-compose.yml` is tracked and contains `admin` / `admin` for pgAdmin on a published port 5050, plus Postgres on 5435. |
| Replay fuel | `subscriptions.fapshi_trans_id` is already unique. `credit_purchase_orders.fapshi_trans_id` is already unique. `affiliate_earnings` has no transaction column at all. |
| Replay guard trap | the FAILED and EXPIRED branches of the webhook already write `subscriptions.fapshi_trans_id`, so a guard on "this id is already on the row" would swallow the successful retry of a failed payment |
| Tool relay route callers | `lib/inngest/trigger.ts` has three live callers: the `databaseHooks.user.create` block in `lib/auth.ts` (every Google sign up) and `app/(auth)/verify-email/page.tsx`. Deleting the route means rewriting that helper to call `inngest.send()` directly |
| Tool count | `createChatTools` defines 11 tools, not 13 |
| Harvest jobs | two are registered, `harvestNoteKnowledge` and `harvestPaper3Knowledge`, so "stop the harvester" is two changes |
| Admin ingest SSRF | `app/api/admin/questions/ingest/route.ts:19` takes a client `fileUrl` that `lib/inngest/question-ingest.ts:21` fetches, the same primitive as the student path |
| Note URL readers | `Note.fileUrl` feeds a download link and a PDF viewer in `app/(dashboard)/notes/[id]/page.tsx`, `app/api/quizzes/[id]/route.ts:31`, and `lib/ai/tools.ts:207`. `lib/file.ts:22` `getSignedDownloadUrl` is a stub that returns the key unchanged, and UploadThing signed URLs are async and expiring |
| Edge runtime split | `proxy.ts:4` imports `./lib/auth`, which reaches Prisma, so a shared env module must be split before the Edge side can import it |
| Dead auth GET | `app/api/auth/[...all]/route.ts:8` destructures `GET` from `toNextJsHandler(auth)`, which yields undefined, so every auth GET is already broken. Unrelated to security, recorded as a follow up |

One correction to the audit: it describes the Arcjet client in `proxy.ts` as constructed on every request. Module scope construction happens once per server instance at cold start. This does not change any decision, but a future reader should not repeat it.

Three Arcjet facts were confirmed against the current docs while designing, and they shaped the abuse limits child.

- The built in characteristics are `ip.src`, `http.host`, a named request header, a named cookie, a named query argument and the request path. There is no `email.hash`. A custom characteristic is allowed: declare the key on the rule and pass the value into `protect`. Two characteristics in one rule produce one fingerprint, not two counters, so the per address OTP limit needs its own rule.
- `protect` requires `requested` for a token bucket rule. The three buckets defined today have never been called, so nobody has had to supply it.
- The Guard Vercel AI SDK adapter is documented for AI SDK v7 and has no v6 path. This is what settles the hand rolled wrapper.

There is no dry run per call; dry run is a rule mode set at configuration time. There is also no offline mode: Arcjet decides locally when it can and otherwise calls its cloud API at 20 to 30 ms, failing open after 2000 ms. That behaviour is why the design accepts fail open and logs it rather than building a local counter as a backstop.

## Options considered

### Option 1: Fix each finding in place, one patch per finding

Twenty small patches, each touching one file, no shared module.

**Pros**: smallest per commit diff, easiest to review one at a time, nothing new to learn.

**Cons**: it is exactly how the current drift happened. `requireAdmin` does not exist because authorisation was copy pasted into 41 files and one was missed. A code shape test cannot assert a convention that has no name. Twenty unconnected patches also mean twenty chances to fix the symptom and leave the hole open one refactor later.

### Option 2: Buy the enforcement, do not write it

Adopt Arcjet Guard for the tool boundary, Arcjet prompt injection detection in front of the model, a WAF at the edge, and treat each finding as a configuration change rather than a code change.

**Pros**: little code, vendor maintained rules, a detector that blocks trivial attacks before they cost tokens.

**Cons**: the Guard adapter does not exist for AI SDK v6, which is what this app runs. A detector is a filter with a false negative rate; the failure mode you cannot accept is a false negative being the difference between "tool executed" and "blocked". And a third WAF layer is triple charging for overlapping coverage while adding three places to look when something breaks. Buying enforcement without writing the boundary checks leaves every finding that is a scoping bug still open.

### Option 3: The full capability architecture

Adopt the CaMeL invariant (data never decides control flow) properly: split tools into read and write sets per entry point, wrap untrusted content in provenance envelopes, require an approval tap before any write, and delete or scope every cross user read.

**Pros**: it is the architecture the research argues for, and it is genuinely correct rather than defensive.

**Cons**: the approval tap depends on `needsApproval` semantics that the research flags as unsettled in v6 and that nobody has tested here. The envelope approach costs study quality, because the agent loses verbatim search inside a student's own notes. And the urgent findings (a webhook that grants subscriptions, an open admin route) get shipped later because the interesting work is in the tool layer.

### Option 4: Close the concrete leaks in code, on shared guards, now

Every finding is closed by a check that runs in code and is enforced by a code shape test. Three surfaces with no real user are deleted. Rate limiting is wired to the buckets that already exist. The tool boundary is a small hand rolled wrapper that every tool must pass through. The engineer's done when condition is met, and the deeper architecture work is sequenced after launch where the risk is measured rather than imagined.

**Pros**: every launch blocker closes. The shared guards make the class of bug (a route that forgot) detectable rather than merely unlikely. It reuses what is installed and adds no runtime dependency.

**Cons**: it is a big diff across 42 admin routes, 143 handlers and 13 tools. The tool wrapper is a boundary we maintain ourselves rather than one a vendor keeps current. And it deliberately defers the approval tap, so a poisoned note can still propose a quiz creation; it just cannot reach another user's data or publish content to everyone.

## Rationale

The twenty findings are not equally interesting, and treating them equally is how they all survived. Four of them are unauthenticated money and data paths that anyone on the internet can reach today: the fails open webhook, the open admin route, the unauthenticated mail relay, and the cross user knowledge read. Those four are not a design problem. They are defects with a known correct fix, and they are what the scope row means by "twenty findings would let someone take money, read another student's notes, or see an answer key". That is why Option 4 leads with them and why the webhook is the first vertical slice in the build plan: it is the only path that moves money, so it proves the whole pattern end to end, and if the pattern does not hold there it will not hold anywhere.

On the enforcement architecture, the deciding force is that a prompt is not a control. The research is right that the current posture is theatrical, but the fix for theatrical architecture is not a better prompt, it is a component that is not the model making the decision. The cheapest correct expression of that in this codebase is the pattern already present at `lib/ai/tools.ts:463-474`, where `createQuiz` re-queries the note with `where: { id: noteId, userId }` and throws. Extending that shape to every argument is a small amount of code with a large effect, and `wrapTool` makes it a property of the tool set rather than a property of one careful developer. The runner up, Arcjet Guard, is better engineering when the adapter catches up to v6, and it should be revisited then. Note also that Option 4 does not contradict the research's own priority list: it takes items 1 to 20 and leaves 21 onward, which is exactly the split the scope row draws.

On rate limiting, the deciding force is the audience. A fixed window or a sliding window punishes exactly the retry burst that a student on a congested mobile network cannot avoid, so every bucket is a token bucket, and every capacity is generous relative to the refill rate. The decision to apply limits in two places, a coarse address only baseline in the proxy plus the named per family buckets in each handler, replaced an earlier single layer choice made during the conversation. The first answer put every bucket in a helper each route calls, on the grounds that a proxy table is harder to test and adds a network call to every request. That reasoning was half right. The proxy table is indeed less testable per request, but it is testable by asserting its configuration, and a single helper call per route makes a regex over 143 files the only thing standing between a forgotten route and an unmetered one. Two layers answer two different questions, which is why both exist. The second decision the audience makes is the fail open default: failing closed on an Arcjet timeout would mean a study app that stops working because a third party had a bad minute, and the loss of abuse protection during that window is bounded and logged.

On the content security policy, the deciding force is the same audience again. A nonce based strict policy is genuinely better against XSS, and in Next 16 it forces every page to render dynamically, disables static generation and CDN caching, and removes partial prerendering. Charging every student on mobile data for a threat this app has no evidence of is the wrong trade. A static policy with `frame-ancestors 'none'`, `object-src 'none'` and `upgrade-insecure-requests` still blocks the framing and transport attacks that matter most, and can be tightened later once someone measures a violation.

The choice to delete rather than filter deserves its own note, because it costs a capability. `searchKnowledge` is undocumented in the system prompt, so no user facing feature depends on it. The knowledge harvester that feeds it runs an extraction pass on every note for no reader. Keeping both with a filter would mean maintaining an owner and trust model on a table whose only reader is the thing being closed. Deleting is honest: the capability is gone, and if official cross user material is wanted later it should be ingested on purpose into a scoped reader. The same logic applies to the mail relay route, whose only callers are internal and already make a self-originating HTTP request that will fail in production, and to the parse status route, which ignores the id it is given and looks like abandoned scaffolding.

Finally, the fail open decision deserves a name, because it looks like negligence and is not. Arcjet's cloud check times out after two seconds and lets the request through. Failing closed instead would mean blocking AI and uploads during an Arcjet outage, on an app whose students pay per session. The design accepts fail open, writes a distinct log event for it, and states the cost plainly: during an Arcjet outage the abuse window is open. That is a better failure mode than a study app that stops working because a third party had a bad minute, and it is visible in the logs rather than silent.

A note on process. An independent model reviewed this spec before it was accepted and caught four things that would not have worked as written: the limit helper could not obtain the address key from 41 argument-less handlers, the one time passcode limit had no implementable location because the route never sees that body, the replay guard as first designed would have swallowed real payments after a failed then successful retry, and deriving the note URL from the upload key would have broken three live readers. All four are now corrected above. The lesson generalises: the launch blockers are cheap to fix badly and easy to fix wrongly, which is why the webhook went first and why AC-3 now names the failed then successful case explicitly.