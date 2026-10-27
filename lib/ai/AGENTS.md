# AI layer

## Overview

Everything that talks to a model lives in `lib/ai/`. OpenRouter is the single gateway for the existing chain (Tip chat, quiz generation, summarisation, grading). A second, separate provider path routes calls to Meta Model API (Muse Spark 1.3) and Baseten (Muse Spark Open) for the Meta Global AI Developer Hackathon study loop. The two provider paths never share a chain: Muse calls go straight to Meta/Baseten and never fall through to OpenRouter.

## Key files

| File | Owns |
|---|---|
| `lib/ai/instances.ts` | The lazy OpenRouter-compatible provider plus the `muse()` provider for Meta Model API and the `baseten()` provider for Baseten |
| `lib/ai/chain.ts` | Open model IDs, deadlines, classification, model construction; `chainModel` for OpenRouter, `chainMuse` for Meta and Baseten |
| `lib/ai/breaker.ts` | Shared model health and cooldown probes (OpenRouter chain only; Muse calls bypass the breaker) |
| `lib/ai/orchestrator.ts` | Ordered fallback for `generate`, `streamChat` and `generateTextWithFallback` (OpenRouter chain only). `generate` tries Muse first for Muse-registered tasks, then falls through to the OpenRouter chain on failure. |
| `lib/ai/registry.ts` | Named tasks, chain policy and cache TTLs, including hackathon tasks registered for Muse. Tasks carry an optional `provider` field (`openrouter`, `meta`, `baseten`) that decides which client serves them. |
| `lib/ai/cache.ts` | In-memory `Map`, sha256 keys, dies with the process |
| `lib/ai/index.ts` | Extraction from PDF, image and Word, summarisation, quiz and exam generation, grading |
| `lib/ai/study-loop.ts` | Hackathon study loop: course analysis, question generation, answer evaluation, next step recommendation |
| `lib/ai/tools.ts` | Chat tool definitions passed to the model |
| `lib/ai/validators.ts` | `normalizeGeneratedQuestions` |
| `lib/paper3/evaluate.ts` | Paper 3 mock marking, separate from the orchestrator |
| `lib/paper3/grade-short-answer.ts` | Paper 3 short answer grading with a graceful fallback |
| `lib/paper3/prompts.ts` | Paper 3 prompt text |
| `lib/paper3/subject-tasks.ts` | Per subject task definitions |

## Conventions

- Construct OpenRouter models only through `chainModel` in `lib/ai/chain.ts`. Construct Muse models only through `chainMuse`. Never import a provider directly from routes, jobs or components.
- Do not add Muse model IDs to the OpenRouter chain. Muse calls are a separate provider path with no fallback to OpenRouter within the Muse path; the orchestrator handles fallthrough separately.
- A new AI call needs a task registered in `registry.ts` first. `getTaskConfig` throws on an unknown name, which surfaces the mistake at the call site. Tasks can carry an optional `provider` field (`"openrouter"`, `"meta"`, or `"baseten"`; defaults to `"openrouter"`) that decides which client serves the call.
- Never cache grading. Set `cacheTtlMs: 0` for `grading`, `paper3_eval`, and Muse hackathon tasks `answer_evaluation` and `next_step` so a user's answer is always marked fresh.
- `streamChat` is the only streaming entry point. Chat routes call it from `app/api/ai/chat/route.ts`. Muse study loop tasks use `generate` (non-streaming structured output) unless a task specifically needs streaming.
- AI output that reaches the UI goes through `lib/math-format.ts` so KaTeX delimiters render. Skip this and LaTeX shows as raw text.

## Muse provider conventions (hackathon)

- `muse()` in `lib/ai/instances.ts` is a lazy singleton like `openrouter()`. It requires `MUSE_API_KEY` for Meta Model API. Uses `MUSE_BASE_URL` (defaults to `https://api.meta.ai/v1`).
- `baseten()` in `lib/ai/instances.ts` is a lazy singleton for Baseten inference. It requires `BAASETEN_API_KEY`. Uses `BAASETEN_BASE_URL` (defaults to `https://inference.baseten.co/v1`).
- `chainMuse(modelId)` in `lib/ai/chain.ts` routes by model ID prefix: `meta-models/` goes to Baseten, everything else goes to Meta via `muse()`.
- Hackathon tasks (`course_analysis`, `question_gen`, `answer_evaluation`, `next_step`) are registered with `provider: "meta"` and `chain: ["muse-spark-1.3"]`. The visual analysis task (`visual_analysis`) uses `provider: "baseten"` and `chain: ["meta-models/muse-spark-open-1026"]`.
- Muse calls bypass the breaker and cache. They go straight to Meta/Baseten with a per-leg timeout of 8 seconds. On failure, `generate` falls through to the OpenRouter chain.
- Muse calls never fall through to OpenRouter within the Muse path itself, but the orchestrator's `generate` catches Muse failures and retries through the OpenRouter chain.
- Hackathon tasks use `generate` (non-streaming structured output). Streaming and tool-calling tasks stay on OpenRouter.
- Hackathon inference costs are logged separately from student credit deductions in `lib/ai/usage.ts`. Promotional Meta and Baseten credits pay for experiments; student credit spend is unaffected.
- `MUSE_COST_PER_CALL_XAF` in `lib/ai/pricing.ts` is the flat per-call XAF rate used for Muse usage accounting until live pricing is confirmed.

## Gotchas

- `generateCritical` is a byte identical copy of `generate`. The `Critical` suffix is a naming convention for call sites, not a different behaviour. It does not skip the cache and it does not skip the retry.
- `generateTextCritical` is likewise a copy of `generateTextWithFallback`. Nothing iterates the chain.
- The normal chains contain multiple OpenRouter model IDs. A transport failure falls through before a stream's first token; an already started stream stays on its model.
- The cache key is the prompt, not the user. Two users sending the same prompt share a cached answer. That is why the generation tasks cache for 7 to 30 days and the grading tasks do not.
- The cache is per process and is not shared across instances. A serverless deploy gets a cold cache on every cold start.
- The gated Fusion path in `lib/ai/fusion.ts` intentionally uses one explicit OpenRouter model and is not part of the normal fallback walk.
- A live model test requires `OPENROUTER_API_KEY` for OpenRouter chain calls, or `MUSE_API_KEY`/`BAASETEN_API_KEY` for Muse calls. Unit tests mock the AI SDK boundary and prove the chain behavior without contacting providers.
