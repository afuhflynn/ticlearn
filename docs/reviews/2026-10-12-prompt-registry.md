# Review, security/hardening-0001 (prompt-registry slice only), 2026-10-12

**Reviewed by**: Muse Spark review agent (author model unknown; fresh eyes, did not write this code)
**Scope**: 54 files, uncommitted working-tree slice only (spec 0002: `lib/prompts/loader.ts`, `lib/ai/orchestrator.ts`, 10 migrated call sites, 38 files under `prompts/`, `scripts/check-prompts.mjs`, `scripts/seed-verify-fixture.ts`, 2 test files). Security-hardening files on the same branch are out of scope.
**Verdict**: Changes requested

## Summary

The slice migrates every AI call site onto a typed file-backed prompt registry and does the hard parts well: the loader fails fast with typed errors, grading/eval prompts verifiably stay uncached, logs exclude slot values, and the test suite (25 tests across the two files, run green) covers needs-flag enforcement, fallback hygiene, file-span-wins, version-bump cache keys, and log redaction. `prompts:check` passes on all 38 files, `typecheck` is clean, and no live inline prompts remain. The headline problem is that the enforcement mechanism itself is holey: the inline-prompt scan misses the most natural variable names, so the spec's "block new inline prompts" guarantee does not hold. The rest is a set of real but non-blocking gaps (untracked system-file settings, an unlogged chat path, leftover unused imports, dev-script sharp edges).

## Major

### 🟠 Inline-prompt scan is trivially bypassable, `scripts/check-prompts.mjs:81-85`
**Problem**: The three patterns only match a variable literally named `prompt` (`const prompt = \``) and `prompt:`/`system:` keys with backtick literals. The most natural authoring names — `const systemPrompt = \`...\``, `const userPrompt = \`...\``, `const promptText = \`...\`` — evade all three (the `[^_a-zA-Z]` guard explicitly excludes them), as does any non-backtick literal. The spec defines inline as "a string literal over 200 chars used as AI input," but the script enforces no length rule in either direction.
**Why it matters**: This script is the spec's enforcement mechanism for Done-when-1 ("no inline strings") and a checked follow-up item. A guard that misses the obvious spelling gives false confidence; the next contributor can reintroduce inline prompts and CI stays green.
**Suggested fix**: Broaden the scan to case-insensitive `prompt`/`system` identifier fragments with string-literal RHS (any quote style) plus a 200-char length threshold per the spec, and add a self-test: a fixture file with `const systemPrompt = \`<long text>\`` that the check must flag.

## Minor

### 🟡 Leftover unused `generateObject` imports in three migrated files, `lib/mock-generator.ts:1`, `lib/inngest/paper3-exam-functions.ts:1`, `lib/inngest/question-ingest.ts:1`
**Problem**: Migration moved these files to orchestrator `generate` but left `import { generateObject } from "ai"` behind; grep confirms zero remaining uses in all three. Biome flags each as `noUnusedImports`.
**Why it matters**: Dead imports mislead the next reader about which layer performs model calls (the repo already suffers orchestrator-bypass drift, per `lib/ai/AGENTS.md` gotchas). Note the repo lint gate is already red at HEAD (pre-existing orchestrator import-order error, verified via `git show HEAD`), so this does not newly break CI — still, remove them while the migration is warm.
**Suggested fix**: Delete the three unused imports (run `biome check --write` on the slice files, excluding pre-existing diagnostics).

### 🟡 System-file settings silently ignored on dual-file calls, `lib/mock-generator.ts:352-365`, `lib/mock-generator.ts:414-431`, `lib/inngest/question-ingest.ts:82-99`, `lib/paper3/grade-short-answer.ts:19-32`
**Problem**: Every two-file call (system prompt + user prompt) loads both files but spreads only the user file's `promptCallFields(settings)`. The system file's heat/cap/cacheSpanMs are read, parsed, and discarded. All pairs happen to share identical values today (0.4/2048, 0.2/2048 for grading), so there is no live behavior bug.
**Why it matters**: The spec's promise is "heat plus caps travel with the text they govern." The first person to tune a system file's heat will see no effect and debug the wrong layer.
**Suggested fix**: Decide and document one rule: either assert the two files' heat/cap agree at load time, or spread an explicit merge (e.g. system heat wins for system-weighted calls). At minimum, note in `promptCallFields` docs that on dual-file calls only the passed settings apply.

### 🟡 `cacheTtlMs` accepted but silently ignored on text paths, `lib/ai/orchestrator.ts:120-131`, `lib/ai/orchestrator.ts:171-182`
**Problem**: `generateTextWithFallback` and `generateTextCritical` accept `cacheTtlMs`/`promptRef` in their options, log the ref, but never consult the TTL — spreading `promptCallFields` into them (as `lib/ai/index.ts` grading callers do) implies file-span caching that does not exist.
**Why it matters**: A future caller will reasonably expect a non-zero span on a text path to cache. Today all text-path callers use zero-span grading prompts, so nothing misbehaves — the API is misleading, not broken.
**Suggested fix**: Either implement TTL on the text paths or remove `cacheTtlMs` from `TextGenOptions` so the type system says text is never cached; document the choice next to `promptCallFields`.

### 🟡 Main chat path has no prompt trace log, `app/api/ai/chat/route.ts:355-365`
**Problem**: The route bypasses orchestrator `streamChat` and calls `streamText` directly, applying `promptSettings.heat/cap` manually but never emitting the name/version/model debug line. The spec standard ("logs carry name plus version plus model") and the verify step (read logs, find name+version+model) hold for generate paths but not for the highest-traffic AI path. The title-generation call (`getPromptOrFallback` + raw `generateText`) is likewise untraced and passes no `promptCallFields`.
**Why it matters**: Observability gap only — behavior is correct — but it weakens the "cache keys now trace to prompt name plus version in logs" consequence exactly where debugging chat issues needs it.
**Suggested fix**: Route the chat call through orchestrator `streamChat` with `promptRef` (extend it to accept temperature/cap), or emit the same `console.debug` line at the call site via a shared helper.

### 🟡 Title fallback still costs a model call and yields a riff, not the fallback, `app/api/ai/chat/route.ts:36-49`
**Problem**: On prompt-load failure, `getPromptOrFallback` returns the static text, which is then fed to the model as the titling *prompt* and truncated to 50 chars — producing a model-generated title about the outage message rather than "New Chat," at full model cost in the worst-case path. The verify step expects the chat to "title itself with the static fallback text."
**Why it matters**: Worst-case paths should be cheap and predictable; this one is neither, though it does not throw.
**Suggested fix**: Short-circuit: if the loaded prompt equals `FALLBACK_TEXT`, return "New Chat" without calling the model.

### 🟡 `renderPrompt` leftover check runs on substituted output, `lib/prompts/loader.ts:100-114`
**Problem**: The unresolved-slot check scans the post-substitution text, so a *slot value* containing `{{...}}` (e.g. pasted code, Jinja/Handlebars snippets in notes or paper context) throws `unresolved slot` and fails the request. Relatedly, there is no escape for a prompt body that needs literal double braces.
**Why it matters**: Failures triggered by student content are the worst kind: legitimate notes (e.g. containing `{{variable}}` examples) break quiz/exam generation with a confusing error. Low probability per request, high confusion when hit.
**Suggested fix**: Collect body slot names before substitution, substitute, and verify all-and-only those — or document/implement an escape (e.g. `{{{{` renders literal `{{`).

### 🟡 Declared-but-unused slots are still required from callers, `lib/prompts/loader.ts:94-99`
**Problem**: `renderPrompt` throws for any declared slot missing from `vars`, even if the body never uses it, while `check-prompts` only enforces used⊆declared, not the reverse. A header that accumulates an unused declaration forces every caller to pass a dead value.
**Why it matters**: No live instance today (all 38 files pass both checks), but the two checks permit drift in opposite directions with no alarm.
**Suggested fix**: Have the check script warn on declared-never-used slots, or relax the loader to require only body-used slots.

### 🟡 Dev fixture script is not idempotent and guard is thin, `scripts/seed-verify-fixture.ts:46-53`, `:28-30`, `:42-45`
**Problem**: The docstring claims idempotency, but `grantCredits({amount: 500})` is additive — every rerun tops up another 500. The script unconditionally elevates the fixture email to ADMIN (fine for its throwaway address, sharp if the email ever collides), and the production refusal only triggers on `NODE_ENV === "production"` (an unset `NODE_ENV` slips through).
**Why it matters**: Dev-only blast radius, but a rerun-inflated balance can silently invalidate the credit-exhaustion paths the full AI pass is meant to exercise.
**Suggested fix**: Grant only up to a 500 cap (read balance first), also refuse when `NODE_ENV` is unset, and note the ADMIN elevation in the header comment.

### 🟡 Check script is stricter than the loader in one place, looser in another, `scripts/check-prompts.mjs:60-68`, `lib/ai/registry.ts:13`
**Problem**: The script *requires* heat/cap/cacheSpanMs on every file while the loader schema defaults them (0.4/2048/0) — two contracts for one header. Conversely, `MODEL_ALLOWLIST` is hardcoded in both `lib/ai/registry.ts` and the script, so adding a model means editing two places with no shared source.
**Why it matters**: The first divergence bites when someone relies on loader defaults and CI rejects the file; the second is classic allowlist drift.
**Suggested fix**: Either make the loader fields required (matching CI) or the script default-aware; import the allowlist from a shared JSON/module instead of duplicating it.

### 🟡 Untested failure seams around an otherwise well-tested slice, `lib/prompts/loader.ts:52-57`, `lib/prompts/loader.ts:215-218`
**Problem**: `getToolDescription` throws at tool-construction time if any `tools/*.md` file is missing or bad — taking down all of chat — with no test. Likewise untested: `safeName` traversal rejection, the `getPromptOrFallback` non-`PromptError` branch, and the check script's own detection power (a fixture evasion case).
**Why it matters**: Per TESTS=configured, new logic without coverage is at least a Minor; the happy paths here are genuinely well covered (25 green tests), these are the remaining seams.
**Suggested fix**: Add loader tests for traversal + tool-description-missing, and a fixture-based test asserting the check script flags a `systemPrompt`-style inline literal.

### 🟡 Per-request filesystem stat traffic, `lib/prompts/loader.ts:139-145`, `lib/ai/tools.ts:107-402`
**Problem**: Every `getPrompt` performs a `statSync` (blocking the event loop), and each chat message constructs 10 tools × `getToolDescription` = 10 stats + potential reads on the hot path. The mtime-ms equality check can also miss sub-millisecond rewrites.
**Why it matters**: Small files, small cost — this is the spec-accepted tradeoff ("small lookup cost eased by the memory hold") — but 10 synchronous stats per chat message is worth one sentence in a perf pass, not a redesign.
**Suggested fix**: No action required pre-merge; optionally memoize tool descriptions per process (they have no slots) or lengthen with a stat-debounce.

## Nits

- ⚪ `scripts/check-prompts.mjs:45`, `void area;` is a dead statement — remove it or use the variable.
- ⚪ `scripts/check-prompts.mjs:95`, assignment inside the `patterns.some(...)` expression trips the repo's own `biome check` (`noAssignInExpressions`); new files should be lint-clean.
- ⚪ `lib/ai/orchestrator.ts:135-169`, `generateCritical` remains a byte-identical copy of `generate` (pre-existing pattern, now extended) — a shared private helper would prevent the two drifting on cache-key/TTL logic.
- ⚪ Cross-slice one-liner (out of scope, no action here): pre-existing unused `aiFeedbackSchema` (`lib/inngest/paper3-exam-functions.ts:33`) and `isPaid` (`app/api/paper3/chat/route.ts:100`) were untouched by this slice.

## Strengths

- Loader design is careful where it counts: typed `PromptError`s naming the prompt, model allowlist owned in the registry, needs-flag enforcement at the call site, slot values excluded from both logs and fallback warnings (verified by test), and a static fallback with no interpolation surface.
- `promptCallFields` is applied uniformly across all 10 migrated call sites, and the zero-span invariant for grading/eval prompts holds in every header and is locked by test (`grade_open_answer`, `explain_mcq_answer`, both `grade_short_answer` files, `code_explanation`, `exam_review_chat` all `cacheSpanMs: 0`).
- Version-keyed cache semantics plus log redaction are covered by genuinely behavioral tests (second-call cache hit, zero-span double-call, version-bump miss, expiry, secret-absence in logs) — 25/25 green on the slice's test files, `prompts:check` green on 38 files, `tsc --noEmit` clean, and a grep sweep confirms no remaining inline prompt literals under common names.

## Test coverage

Covered: slot rendering, missing-slot/allowlist/missing-file errors, mtime reload, needs-tools/images enforcement, fallback without student-data leak, `promptCallFields` mapping, grading zero-span, shipped-file header invariants, file-span-wins/registry-fallback/version-key/expiry/critical-twin, trace-log redaction, unknown-task guard. Ran `tests/lib/prompts/loader.test.ts` + `tests/lib/ai/orchestrator.test.ts`: 25 passed. Gaps (all Minor, listed above): tool-description load failure, traversal rejection, scan-evasion fixture, title-fallback short-circuit, dual-file settings rule. Manual verify steps (live edit→next-request, fallback behind `PROMPTS_DIR`, full four-family app pass) remain for `/verify-release`; the fixture script for that pass is present with the idempotency caveats noted.
