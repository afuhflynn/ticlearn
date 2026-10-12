# Review, feature/0002-prompt-registry, 2026-10-12

**Reviewed by**: opencode/space-bunny-free (author model not recorded)
**Scope**: 42 files (23 modified, 19 new including the 3 spec documents), uncommitted
**Verdict**: Blocked

## Summary

This change moves every model call onto OpenRouter behind an ordered twelve model chain, adds a Postgres circuit breaker, a shared deadline, a per student XAF cost ledger, two usage read routes, and a gated Fusion helper. The shape is right and the layering is genuinely good: one chain definition, one breaker, one writer, call sites that changed only by threading a `userId`. Typecheck is clean, Biome is clean, and 231 tests pass. The problem is that the streaming path does not work as designed. `streamText` returns lazily, so the fallback loop in `streamChat` never catches anything, which means AC-6 is unmet on the only streaming route in the product, the breaker never sees a stream failure, and no usage row is written when a stream fails. Alongside that, the probe single flight leaks permanently on the fail fast path, chat's stream timeout was cut twelvefold, and the breaker marks a model healthy when its probe fails. The error classification that everything else hangs off is also both too aggressive (any 4xx is fatal, so one unavailable model in the middle kills the request) and too loose (substring matching on provider text can turn a 502 into a fatal schema error).

## Blockers

### 🔴 Streaming fallback never engages because `streamText` does not throw, `lib/ai/orchestrator.ts:234`

**Problem**: `streamChat` wraps `streamText` in a `try`/`catch` and expects a synchronous throw to move to the next model. In AI SDK 6 (`node_modules/ai/dist/index.d.ts:2812`) `streamText` is a plain function that returns a `StreamTextResult` immediately; the provider request only starts when the stream is consumed. A 429, 500, timeout, or connection reset therefore surfaces through the result's error stream, never through the `catch`. The loop always returns on the first iteration, so the code after it is unreachable in production.

Three consequences follow:
- AC-6 ("fallback only before the first token") is not implemented on the path that matters. The only streaming route is `app/api/ai/chat/route.ts:345`, and it handles its own errors with `toUIMessageStreamResponse({ onError })`, which returns `"Failed to generate response."` to the student.
- `markProbeStart(modelId)` at line 230 is never paired with `markProbeDone`, because `onFinish` does not fire on a failed stream. The probe leaks (see next blocker).
- No usage row is written for a failed stream, so AC-4's ledger silently omits every failed chat turn. `logUsage` is only wired into `onFinish`.

`docs/specs/0003-ai-model-chain/verify.md:21,31` claims AC-6 was proven by tripping the head and streaming from the next model. Tripping the head puts it past cooldown and therefore still *runnable*, so that run shows either "the head served it" or "the head failed and nothing retried". It is not evidence for the AC.

**Why it matters**: the feature's headline promise, study never blocks when one lab is down, does not hold for chat. And the fix is not a one liner: the walk needs to consume the first text delta (or the stream's `onError`/`onStart`) before committing to a model, then return a stream that has already proven its first token.

**Suggested fix**: either await a first-chunk/`onStart` gate before returning the result, and route pre first token errors back into the loop, or drive the retry from the result's error stream. Whichever you pick, add the `onError` callback so a post-first-token failure writes a zero cost usage row and records the transport failure. Update `verify.md` so the AC-6 evidence is a real pre first token fault rather than a tripped breaker.

### 🔴 `markProbeStart` leaks on the fail fast path and can strand a model permanently, `lib/ai/orchestrator.ts:146`

**Problem**: all three walk entry points call `markProbeStart(modelId)` before the attempt and rely on `recordSuccess` or `recordTransportFailure` to call `markProbeDone`. The fail fast branch at lines 187-189 throws straight past both, so the entry stays in the `probeInFlight` set forever. `splitChain` (`lib/ai/breaker.ts:46`) refuses to return an open, cooled down model while it is in that set, so from then on the model is never probed again and its `trippedAt` never advances: it is `open` permanently for the life of the process.

Concretely: a model takes three transport faults and trips. Two minutes later the cooldown passes and a request reaches it. It returns a schema miss or a 400. The request fails fast, the probe leaks, and from that point every request on that instance skips the model forever, while the row in Postgres still reads `open` with a stale `trippedAt`. Every other instance, which has its own `Set`, keeps probing it.

**Why it matters**: the breaker heals in one process and not in another, which is the exact opposite of AC-2's "skipped on every instance". On a long lived Node server or a reused warm lambda this is permanent degradation for the process lifetime, and it is invisible because the breaker row looks like a normal cooldown.

**Suggested fix**: put the probe release in a `finally` around each attempt rather than inside the two recorder functions, so every exit path releases it. Separately, only claim a probe for models that are actually open, rather than for every attempt on the chain.

### 🔴 Chat stream budget cut from 120 seconds to 10, `lib/ai/orchestrator.ts:239`

**Problem**: the chat route previously passed `timeout: { totalMs: 120_000, stepMs: 60_000, chunkMs: 10_000 }`. `streamChat` now passes `timeout: CHAIN_DEADLINE_MS`, a plain number, which AI SDK 6 documents as the total timeout for the call (`node_modules/ai/dist/index.d.ts:590-594, 660-667`). The same route sets `stopWhen: stepCountIs(5)` and hands over the full tool set, so this is a multi step agentic stream now capped at ten seconds end to end. `maxRetries` also dropped from 1 to 0.

**Why it matters**: any chat answer that involves a tool call, a long explanation, or a slower model in the chain is aborted mid stream at ten seconds and the student sees a truncated answer or `"Failed to generate response."` This is the primary student facing AI surface and it will fail routinely.

**Suggested fix**: give streaming its own total budget, the way the object paths get their per attempt slice. A `CHAIN_STREAM_DEADLINE_MS` an order of magnitude above the per attempt cap, with a per attempt cap inside the walk, matches spec invariant 9's shape for jobs and is what the old code already had.

## Major

### 🟠 A failed probe marks the model healthy, which is the opposite of the spec, `lib/ai/breaker.ts:88`

**Problem**: when the breaker trips, line 90 writes `failCount: 0` alongside `status: "open"`. When the cooldown probe then fails, `nextCount` is `0 + 1 = 1`, `shouldOpen` is false, and the update writes `status: "healthy"` with `failCount: 1`. The model is now advertised as healthy to every instance, so full traffic floods a known dead model until three more failures re trip it, then it goes through the same cycle. Spec state transition 3 says "open stays open when the probe fails and trip time resets", and AC-2 assumes the cooldown holds.

**Why it matters**: every cooldown window becomes a thundering herd against a broken model, which is the retry storm AC-7 exists to prevent, and it burns the three-fault threshold repeatedly.

**Suggested fix**: carry the existing status through when the model is already open, so a failed probe resets `trippedAt` and leaves `status: "open"` with the counter restarted. Add the failing probe case to `tests/lib/ai/breaker.test.ts`, which currently covers only the trip and the success paths.

### 🟠 A per model 4xx kills the whole request instead of falling through, `lib/ai/chain.ts:94`

**Problem**: `isFailFastError` returns true for any status in 400-499 other than 429, and `generate` rethrows immediately. A 404 (`model_not_found`) or 403 (no endpoints for this model) is a property of one model, not of the request, so the walk should move on. Today, if model nine of twelve returns 403, every request that falls through the first eight dies there instead of trying the last three. The transport hint list already contains `"no-endpoints"`, which suggests this case was anticipated and then classified the wrong way.

**Why it matters**: a single model becoming unavailable to your account takes down the chain for every request that reaches it, which defeats the purpose of the fallback.

**Suggested fix**: restrict fail fast to statuses that are genuinely request scoped (400, 401, 402, 422) and treat 403 and 404 as model scoped, skipping to the next entry without touching the breaker. Cover both in `tests/lib/ai/chain.test.ts`.

### 🟠 Unclassified errors trip the breaker, breaking invariant 2, `lib/ai/orchestrator.ts:194`

**Problem**: the final `catch` branch in `generate` pushes the error and then calls `recordTransportFailure(modelId)` unconditionally. An error that is neither fail fast nor transport, for example a bug in the caller's own options, a `TypeError` in result handling, or anything the SDK throws that this classifier has not seen, counts as a transport fault. `generateTextWithFallback` at line 331 is worse: it calls `recordTransportFailure` for every non fail fast error with no transport check at all.

**Why it matters**: invariant 2 says only transport faults trip the breaker. A bug in application code can park a healthy model for two minutes and hide the real error behind a friendly "AI help is briefly unavailable".

**Suggested fix**: only record a transport failure when `isTransportError` is true. Log the unclassified case with enough detail to debug it, and stop pretending it is a transport fault.

### 🟠 `isSchemaError` substring matching can convert a gateway fault into a fatal error, `lib/ai/chain.ts:89`

**Problem**: `SCHEMA_HINTS` contains `"json"`, `"parse"`, `"invalid response"`, and `"did not match"`, matched case insensitively against `` `${error.name}: ${error.message}` ``. Provider errors routinely include a serialized body. A 502 whose body reads `invalid response from upstream`, or an `APICallError` whose metadata mentions a json field, is classified as a schema error, which makes `isTransportError` false and `isFailFastError` true. The request then fails immediately on a model that the very next entry would have served.

**Why it matters**: this is the mechanism AC-1 and AC-3 rest on, and it fails in the unsafe direction, converting a recoverable transport fault into a fatal, breaker-silent error.

**Suggested fix**: classify on structured signals first, the SDK error type and `statusCode`, and keep free text matching as a narrow last resort with much tighter hints. Log every classification decision with the raw message so a misfire is visible.

### 🟠 The trip window is not implemented, `lib/ai/chain.ts:21`

**Problem**: `TRIP_WINDOW_MS = 60_000` is exported and never referenced anywhere outside its declaration. `recordTransportFailure` increments a counter with no time component, so three faults spread across three hours open the breaker, exactly as three faults inside one minute would. The spec's first state transition is "healthy to open when 3 transport faults occur in 1 minute".

**Why it matters**: an unrelated three-off blip over a morning parks a perfectly good model for two minutes of everyone's traffic.

**Suggested fix**: either implement the window, for example by resetting the counter when the previous failure is older than the window, or delete `TRIP_WINDOW_MS` and amend the spec so the code and the contract agree. Do not leave an exported constant that describes behaviour the code does not have.

### 🟠 `streamChat` tries every model when the breaker says all of them are open, `lib/ai/orchestrator.ts:229`

**Problem**: the loop iterates `runnable.length > 0 ? runnable : chain`. When `splitChain` skips everything, the verdict is discarded and the full twelve model chain is walked, each with a ten second budget, in a request handler. `generate` handles the empty case correctly by writing an `all_open` row and throwing the friendly message; `streamChat` does the opposite.

**Why it matters**: this is precisely the retry storm AC-7 names, triggered by exactly the condition AC-7 names, on the route with the least tolerance for a long request. It is also the only path that ignores the breaker verdict entirely.

**Suggested fix**: iterate `runnable` unconditionally, and on an empty list throw `friendlyDown` with `errorCode: "all_open"` after writing the zero cost row, mirroring `generate`.

### 🟠 Several student facing AI calls still write anonymous usage rows, `app/api/ai/chat/route.ts:26`

**Problem**: the `userId` wiring covers quiz, exam, mock, note processing, Paper 3 chat, and Paper 3 short answer marking. These do not:

- `generateTitle` in `app/api/ai/chat/route.ts:26` runs on every chat turn and passes no `userId`. Chat is the highest volume student path, so roughly half of all chat spend is unattributed.
- `lib/inngest/paper3-functions.ts:468, 511, 672` make three `paper3_gen` calls from note upload with no `userId` anywhere in the file.
- `lib/inngest/question-ingest.ts:92` (admin ingest, arguably fine) and `app/api/admin/revision-guides/route.ts:90` (admin, fine).

`docs/scope/platform.md` states the fault fix "threaded `userId` through every student facing route and job". That is not true of chat titles or Paper 3 generation.

**Why it matters**: AC-4 promises per student cost. The student view will read low for exactly the two features students use most, and the admin per model split will show a large anonymous bucket with no way to attribute it. This is the same class of bug the fault fix just repaired, so it is a partial fix, not a closed one.

**Suggested fix**: thread `session.user.id` (or the note owner) into `generateTitle`, and into the Paper 3 source processing job from the event payload. Then extend `tests/lib/ai/user-attribution.test.ts` so it fails when a student facing orchestrator call has no `userId`, which it currently does not.

### 🟠 Per row `Math.ceil` inflates every student facing XAF total by orders of magnitude, `lib/ai/pricing.ts:52`

**Problem**: `usdToXaf` ceils to a whole XAF, and `logUsage` calls it per row before the write. A `gpt-5-nano` title call of 500 input tokens costs about USD 0.000025, which is XAF 0.016, which ceils to 1. Every call with any cost therefore contributes at least 1 XAF, so a student's day reads at least one XAF per action. Fifty actions a day shows roughly 50 XAF against a true cost near 1 XAF.

**Why it matters**: the number exists so "cost feels clear" to a student and so "pricing stays sound" to an admin. Per row ceil makes both wrong in the same direction, by up to a factor of the XAF rate. The repo rule that money is whole XAF is about what is billed and displayed at a boundary, not about every ledger row.

**Why it is still worth raising**: the spec's value sourcing item 4 prescribes "ceil to whole XAF at write time", so this is a spec defect faithfully implemented. That is exactly the moment to escalate it rather than ship it quietly.

**Suggested fix**: raise it back through `/architect` and change the contract, store the fractional XAF (or the USD and the rate, which is already stored) and ceil only when a total is presented. If the schema must keep `Int`, ceil at the daily aggregation boundary in `dailyTotals` instead.

### 🟠 `USD_TO_XAF_RATE` is documented and required by the spec but never read, `.env.example:119`

**Problem**: the spec's Configuration required item 4 names `USD_TO_XAF_RATE`, and `.env.example` documents it. No code reads it. `logUsage` resolves the rate from `platformSettings.usdToXafRate` (`lib/ai/usage.ts:88`) and falls back to the `650` constant. An operator who sets the env var to track a moving rate gets no change and no warning.

**Why it matters**: the repo rule about `.env.example` is that it documents real configuration. A documented knob that does nothing is worse than a missing one, because an operator will trust it.

**Suggested fix**: decide which source is canonical. Since `PlatformSettings` is the admin tunable pattern this codebase already uses for credit costs and multipliers, keep that and delete `USD_TO_XAF_RATE` from `.env.example` and from the spec, or read the env as the default and let settings override it.

### 🟠 Two sources for the Fusion gate, and the cost cap does not gate, `lib/platform-settings.ts:61`

**Problem**: the change adds `aiFusionAllow` to `PlatformSettings`, to `PlatformSettingsSnapshot`, and to `DEFAULT_PLATFORM_SETTINGS`, and nothing reads it. `fusionAllowed()` at `lib/ai/fusion.ts:9` reads `process.env.AI_FUSION_ALLOW` only. Separately, `runFusionResearch` computes cost after the call and only `console.warn`s when it exceeds `FUSION_MAX_COST_USD`, so the "cost cap" the spec asks for does not cap anything.

**Why it matters**: the repo rule is explicit that a new abstraction must replace an existing one and must not sit beside it, and this adds a second, unread source for one decision. An admin toggling the setting in the panel would see no effect, which is a silent failure in a billing gate.

**Suggested fix**: pick one source. If settings is canonical, have `fusionAllowed()` read it. And make the cap real by bounding the request (a token cap or a pre-flight abort) rather than warning after the money is spent.

### 🟠 A missing OpenRouter key produces a raw provider error for every student, `lib/ai/instances.ts:5`

**Problem**: `createOpenAICompatible` is constructed at module load with `process.env.OPENROUTER_API_KEY ?? ""`. There is no validation anywhere. With an empty key OpenRouter returns 401, which `isFailFastError` treats as fatal, so every AI feature in the product fails on the head with the raw `APICallError`, and no usage row is written because the fail fast path skips `logUsage`.

**Why it matters**: the spec calls the key "required in production" and nothing enforces it. A deploy with a missing or rotated key presents as a total, unexplained AI outage rather than a configuration error at boot.

**Suggested fix**: validate the key once at startup or on first use and fail with a clear, non student facing configuration error naming the missing variable. Keep the fail fast classification, since walking the chain on a bad key is pointless, but do not let it reach the student as a provider message.

## Minor

### 🟡 `dailyTotals` silently truncates at 5000 rows, `lib/ai/usage.ts:125`

The query is `orderBy createdAt asc, take: 5000` with grouping done in JavaScript. A heavy student over a wide window gets the oldest 5000 events and a total that is quietly wrong, with no signal that rows were dropped. The admin route does its grouping in SQL via `groupBy` and `aggregate`, so the pattern for doing this correctly is already in the change. Aggregate in SQL per day, or at minimum order descending and tell the caller the window was capped.

### 🟡 `perAttemptBudget` takes a parameter it discards under a misleading name, `lib/ai/chain.ts:112`

The signature is `(totalMs, remaining)` but both call sites pass `(remainingMs, modelsLeft)` (`orchestrator.ts:145`, `:292`). The second argument is a count and is discarded via `void remaining`. Either drop the parameter or rename it. The `Math.max(2000, ...)` floor also means an attempt can be granted up to 2000ms when only 501ms of the shared budget is left, so the worst case overshoots the 10 second budget by roughly 1.5 seconds rather than holding it.

### 🟡 The registry's `chain` field is now dead and env divergent, `lib/ai/registry.ts:23`

`TaskConfig.chain` is written for all eight tasks and read by nobody; `getTaskConfig` is used only for `cacheTtlMs`. `chainModels()` also builds twelve provider instances per task, so ninety six model objects are constructed at module load for no consumer, and it uses `DEFAULT_CHAIN` while the walk uses `getChain()`, which honours `AI_CHAIN_ORDER`. Two sources of chain order, one of them unused. Drop the field, or have the walk read it, but not both.

### 🟡 The allow list is duplicated in the check script and has already diverged, `scripts/check-prompts.mjs:21`

The script hardcodes its own `MODEL_ALLOWLIST`, and it now contains `google/gemini-2.5-flash`, which the loader's list in `registry.ts:17` does not. A prompt header pinned to that id passes `check-prompts.mjs` and then throws at load time. The prior review flagged this duplication and it has been reintroduced with a fresh divergence. Generate the script's list from the registry, or have both read one JSON artifact.

### 🟡 Prompt files still pin a model that is no longer used, `lib/prompts/loader.ts:8`

All 38 prompt files declare `model: gemini-2.5-flash`. The field is validated against the allow list and then never read, because spec invariant 1 says prompts must not pin a model. The schema still requires it, so every prompt file now carries a front matter value that is a lie about where the answer came from. Either make `model` optional and migrate the files, or accept that it is documentation and say so in the schema.

### 🟡 The provider import gate keeps a dead Google import alive, `scripts/check-prompts.mjs:149`

The new check bans provider imports everywhere except `lib/ai/instances.ts`, which still imports and re-exports `google` from `@ai-sdk/google` with no remaining caller anywhere in `lib`, `app`, `components`, or `hooks`. The gate should also fail on an unused provider import in the one allowed file, or the re-export should go and the exemption becomes unnecessary.

### 🟡 Nested context files now contradict the code, `lib/ai/AGENTS.md`

`lib/ai/AGENTS.md` still says instances "re-exports `google` and nothing else", that `@ai-sdk/openai-compatible` is "installed and unused", and that "every `chain` array holds exactly one model. There is no fallback." The root `AGENTS.md` AI summary says the same. These are the files future agents read first, and every one of those statements is now false. Update them in this change.

### 🟡 No usage row is written on the fail fast path, `lib/ai/orchestrator.ts:187`

Spec invariant 6 says total failure still writes one zero cost row. A schema miss or a 4xx throws before any `logUsage` call, so the most common real failure, a model returning output that does not match the schema, leaves no evidence in the ledger at all. Write the zero cost row with a distinct error code before rethrowing.

### 🟡 The forced failure flag fires on whatever is first in the runnable list, `lib/ai/orchestrator.ts:149`

The check is `index === 0`, which is the head only when the head is runnable. With the head open and past cooldown the flag fails the first fallback model instead, so the fallback proof in staging does not prove what it claims. Key the flag to `getChain()[0]`.

### 🟡 The admin route returns no per student totals, `app/api/admin/ai-usage/route.ts:98`

Spec API surface item 5 asks for "totals by student plus by model plus by task". The route returns paginated raw rows carrying `userId` plus `byModel` and `byTask` groups, so an admin can see student ids but cannot get a per student total without paging every row and summing client side. Add a `byUser` group alongside the other two.

### 🟡 The spec's shared budget invariant still describes the old rule, `docs/specs/0003-ai-model-chain/index.md:98`

Invariant 3 says the 10 second budget "splits evenly across models left to try". The code caps each attempt at six seconds instead. `docs/scope/platform.md` records this as a deliberate build time change and asks for a spec touch up, which is the right call, but the spec is the contract and the two disagree today. Update invariant 3 and invariant 9 to describe the per attempt cap shape that the code actually implements, including the streaming case which currently has no shared budget at all.

### 🟡 The two new tables have no migration, `prisma/schema.prisma:1098`

`AiModelHealth` and `AiUsageEvent` were applied with `db:push`. Pre existing drift on `affiliate_earnings` is the stated reason. The schema file and every environment database now disagree about how these tables came to exist, and a fresh environment cannot build them. Write the migration by hand with `prisma migrate diff` or resolve the drift first. Both notes are already in `docs/scope/platform.md`, which is the right place for them, but this blocks a clean deploy.

## Nits

- ⚪ `lib/ai/registry.ts:17`, `MODEL_ALLOWLIST` lists `openrouter/fusion`, which has no entry in `MODEL_PRICES`, so fusion cost is estimated with the generic fallback rate.
- ⚪ `lib/ai/orchestrator.ts:35`, `splitChain` is awaited before the cache TTL check is applied, so a cache miss pays a breaker read even when the answer was going to be a hit on the second call. It is after the first cache check, which is the important part.
- ⚪ `lib/ai/breaker.ts:65`, `recordSuccess` writes an upsert on every successful call, so twelve fixed rows take a write on every AI request in the product. The spec's own risk list calls out breaker table contention.
- ⚪ `lib/ai/chain.ts:63`, `SCHEMA_HINTS` includes `"json"`, which is broad enough that any provider error embedding a serialized body is a candidate for misclassification. Called out as part of the classification finding above; worth narrowing regardless.
- ⚪ `lib/ai/fusion.ts:13`, `runFusionResearch` has no caller anywhere in `app`, `lib`, `components`, or `hooks`. That matches the spec's "never called by default", but it means the Fusion path has no runtime evidence at all, only unit tests.

## Strengths

- The layering is genuinely clean. `chain.ts` owns order and classification, `breaker.ts` owns state, `usage.ts` owns the ledger, `pricing.ts` owns money, and `orchestrator.ts` owns the walk. Each file answers one question and the boundaries do not overlap. That is the opposite of the drift the repo rules are written about.
- The cache-first ordering in `generate` is right: the cache is checked before the breaker is even read, so a hit costs nothing, and the cache key stays model free as invariant 4 requires. `grading` and `paper3_eval` correctly keep `cacheTtlMs: 0`.
- Error classification as a named, exported, unit tested concept rather than inline `instanceof` checks scattered through the walk is a good call, even though two of the classifiers need work.
- `isSchemaError` and `isTransportError` are mutually exclusive by construction, which is what AC-3 needs, and there is a test asserting the breaker is untouched on a schema miss.
- The route handlers follow the house pattern exactly: session, then role, then `limit(bucket, request)`, then zod validation, and `proxy.ts` is correctly not involved. The student read scopes by `session.user.id` before any query runs and there is a test asserting the ledger is never touched for an anonymous caller.
- `logUsage` and the breaker writes both swallow their own failures, so a database hiccup in the metering path cannot fail a student's request. That is invariant 7 implemented, not just claimed.
- The provider import gate in `check-prompts.mjs` is a real enforcement mechanism with three tests including a negative control, not just a convention nobody checks.
- `tests/app/api/me/ai-usage.test.ts` and `tests/app/api/admin/ai-usage.test.ts` test the routes properly: 401 before any query, 403 for a non admin, scoping assertions on the actual query argument, rate limit passthrough, and malformed query rejection. The Douala window assertion pins the timezone behaviour to a real instant rather than to a string.
- `docs/scope/platform.md` records the budget deviation, the missing migration, the low OpenRouter credits, and the AI SDK warning instead of hiding them. That honesty is what made this review efficient.

## Test coverage

231 tests pass across 13 files, and the suite is genuinely good on the non streaming paths. `tests/lib/ai/chain.test.ts` covers chain order, lab diversity, a price entry per chain id, no duplicate ids, env override and blank handling, the full status classification matrix including 429, 400, 401, 402, 500 and 502, and the per attempt budget arithmetic including the deliberate departure from an even split. `tests/lib/ai/chain-walk.test.ts` covers the walk itself: head success, fall through on a transport fault, walking past several dead models, honouring the breaker's runnable list, stopping at the shared deadline, the friendly all down message, the zero cost row with `all_failed` and `all_open`, schema fail fast with no breaker trip, the cache paths, and the output cap defaults. `tests/lib/ai/breaker.test.ts` covers read failure fallback, the cooldown boundary, probe gating, and both recorder paths including write failure swallowing. `tests/lib/ai/pricing.test.ts` covers the XAF maths including the degenerate inputs.

Three gaps matter.

**The streaming tests assert behaviour the SDK cannot produce.** `tests/lib/ai/chain-walk.test.ts:352` mocks `streamText` to throw synchronously and then asserts the loop advanced to the second model. Real `streamText` never throws synchronously, so the test is green and the production behaviour is the opposite. The same is true of the fail fast streaming case at line 384 and the friendly error case at line 374. These five tests give the appearance of AC-6 coverage while covering an unreachable path. A test that drives a real consuming stream, or one that at minimum asserts the `onError` and usage row wiring, would have caught the blocker.

**The probe leak and the failed probe are both untested.** `tests/lib/ai/breaker.test.ts:114` tests `markProbeStart` and `markProbeDone` as isolated functions and never exercises a caller that fails to release. There is no test where a walk attempt throws fail fast and the model is then checked for stranding, and no test where the probe itself fails and the resulting status is asserted. Both blockers sit in exactly the gap.

**The attribution guard is a source regex, not a behaviour test, and it passes on the holes that remain.** `tests/lib/ai/user-attribution.test.ts` scans for `userId` patterns in a 3000 character window. It cannot detect a helper that accepts a `userId` and forgets to forward it, and it only inspects `lib/ai`, `lib/paper3` and `lib/mock-generator.ts`, so it never sees `app/api/ai/chat/route.ts` or `lib/inngest/paper3-functions.ts`, which are two of the remaining anonymous call sites. The file's own doc comment says it exists because "AC-4 regressed once already", which argues for a behavioural test on the routes rather than a pattern match on the source. Note also that it collects only helpers that already mention `userId`, so a helper with no `userId` at all is silently invisible to it.

Everything else new is covered to a good standard. The uncovered logic that remains after those three gaps is the two new route handlers' happy paths against a real Prisma aggregate, which the mock in `tests/setup.ts` covers adequately, and the `perAttemptBudget` overshoot at the 501ms boundary, which is Minor.
