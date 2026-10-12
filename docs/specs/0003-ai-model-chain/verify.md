# Verify: AI model chain · spec 0003 · updated 2026-10-12
_Steps derived from spec 0003 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## Commands
- [x] `AI_HEAD_FAIL_ONCE=1` in staging, run quiz generation → completes inside 10 seconds via second model → AC-1
- [x] Trip one model 3 times → skipped on next calls until 2 minute cooldown passes → AC-2
- [x] Send output that fails schema → fast failure, breaker count still → AC-3
- [x] `GET /api/me/ai-usage` → daily XAF totals with tokens plus model plus task → AC-4 · FIXED 2026-10-12 by `/fault-fix`: `userId` is now threaded from every student facing route and job into `generate`, so the per student read returns `[{day: 2026-10-12, calls: 2, tokens: 889, costXaf: 3}]` for a real student instead of an empty list · RE PROVEN in run 2
- [x] Confirm chain order holds 12 IDs across 8 labs, no expiry date → AC-5
- [x] Stream chat with forced head fault → fallback before first token, no mid stream switch → AC-6 · RUN 3: proven with a lazy stream mock that matches the real SDK shape (see below). Runs 1 and 2 evidence for this step was invalid and has been replaced.
- [x] Open every model → friendly error plus one zero cost ledger row → AC-7
- [x] `node scripts/check-prompts.mjs` → ok, provider imports only in `lib/ai/instances.ts` → AC-8
- [x] `pnpm typecheck` → green → all ACs
## Acceptance-criteria coverage
- AC-1 covered by forced failure step · AC-2 by trip step · AC-3 by schema step · AC-4 by usage read step · AC-5 by chain order step · AC-6 by stream step · AC-7 by all open step · AC-8 by prompts check step · all eight met as of run 3, after the peer review blockers were fixed
## Notes 2026-10-12
### Run 1 (after `/feature-build`)
- AC-1 evidence: clean call served by `google/gemini-3.7-flash` in 3452ms; forced head fault served by `openai/gpt-5-nano` in 2220ms, inside the 10s budget.
- AC-2 evidence: after 2 faults the model stayed runnable, after 3 it was skipped, a probe success returned it to runnable.
- AC-3 evidence: `AI_NoObjectGeneratedError` thrown on a schema miss, head `failCount` stayed 1 before and after.
- AC-5 evidence: 12 ids across 8 labs read from the live OpenRouter catalog, zero carry an `expiration_date`.
- AC-6 evidence: with the head tripped, `streamChat` streamed a full answer from the next model, no mid stream switch.
- AC-7 evidence: with all 12 open the call threw the friendly message and wrote one row with `costXaf: 0` and `errorCode: all_open`.
- AC-4 evidence: admin aggregation returned 12 calls, 7 XAF, 1080 tokens, plus per model and per task splits; the per student read returned `days: []` because every row was anonymous.
- Direct HTTP proof of both routes was blocked: scripted sign in returns 403 from the Arcjet bot shield by design, and the proxy baseline rate limit returned 429 after repeated probes, so the route handlers were exercised through their real database queries with a signed in session instead.
- Latency note for peer review: the AI SDK logs a warning that `responseFormat` is unsupported on some models and needs `structuredOutputs`; calls still return valid objects.
### Run 2 (after `/fault-fix`, all eight re exercised)
- AC-1 re proven: clean `google/gemini-3.7-flash` 3225ms, forced fault `openai/gpt-5-nano` 1850ms, inside budget.
- AC-2 re proven: runnable after 2 faults, skipped after 3, probe restores it.
- AC-3 re proven: schema miss threw `AI_NoObjectGeneratedError`, head `failCount` 1 before and after, no trip.
- AC-5 re proven: 12 ids, 8 labs, zero expiry dates in the live catalog.
- AC-6 re proven: with the head tripped, `streamChat` streamed a full answer from the next model, no mid stream switch.
- AC-7 re proven: with all 12 open the call threw the friendly message and wrote one row with `costXaf: 0` and `errorCode: all_open`.
- AC-4 proven through the route's own query: two real student calls produced rows both attributed to the student, and `dailyTotals` for that day returned `[{day: 2026-10-12, calls: 2, tokens: 889, costXaf: 3}]`. The empty read from run 1 is gone.
- AC-8 and the typecheck re run green: `node scripts/check-prompts.mjs` ok with provider imports confined to `lib/ai/instances.ts`, `tsc --noEmit` clean.
- One caveat on evidence quality: the AC-4 read was exercised through `dailyTotals`, the exact query the route runs, with a real signed in session, rather than through an HTTP response body. HTTP stayed blocked because the Arcjet `default` bucket returned 429 for every authenticated attempt across two students and several waits, while unauthenticated requests still got 401, so the bucket is user keyed and exhausted. Bot shield also blocks scripted and browser sign in by design. The 401 on the unauthenticated path was observed over real HTTP, so the auth gate itself is proven end to end.
- AC-7 note: a combined trip and restore script can trip all models and restore them in one run, which races the restore against the probe set and produced one false fail. Re run in its own process, AC-7 passes cleanly.
### Run 3 (after `/fault-fix` on the peer review blockers)
- Corrected record: the run 1 and run 2 AC-6 evidence was not valid. Tripping the head leaves it runnable after cooldown, so that run never exercised a stream failure, and the unit tests passed only because the mock made `streamText` throw synchronously, which the real SDK never does. `streamText` returns before the provider is called and reports failure through `onError`.
- AC-6 now proven properly. Four cases pass against a mock that reproduces the real lazy stream: the walk falls through when the head stream yields no token, the returned stream is the one whose first token was already proved (its full text still reads back as `hello`), a stream fault records the transport failure against the dead model, and the probe is released on every exit path so a tripped model is never stranded.
- AC-6 live check: with the head tripped in Postgres, `streamChat` returned a complete answer from the second model (`{"m":"skip"}`); with the head healthy it served from the head. Streaming also served end to end against the real gateway (`{"m":"live"}`).
- AC-2 re proven plus the failed probe fix: runnable after 2 faults, skipped and `open` after 3, a failed probe now leaves `status: open` (it previously wrote `healthy`, which flooded traffic back at a dead model), and a successful probe restores it.
- AC-4 re proven plus the inflation fix: ten calls at 0.39 XAF each now total 4 XAF, where rounding each row first reported 10. `USD_TO_XAF_RATE` is now actually read (verified 700 XAF per USD when set).
- AC-8 and typecheck green: `node scripts/check-prompts.mjs` ok with provider imports confined to `lib/ai/instances.ts`, `tsc --noEmit` clean, and both usage routes' auth gates green (40 tests: 401 without a session, 403 for a non admin on the admin read).
- AC-5 re proven: 12 ids across 8 labs, zero expiry dates in the live catalog. Schema confirmed live: `ai_model_health` and `ai_usage_events` both present and populated.
- Full suite green: 237 tests, 13 files.
- Chat stream budget restored to 120 seconds for the five step tool loop, verified by test.
- Caveat that remains: the AC-4 route reads are still exercised through the route's own queries with a signed in session rather than an HTTP body, for the same two reasons as run 2 (bot shield blocks scripted sign in; the user keyed rate limit bucket stays exhausted across repeated probes).
