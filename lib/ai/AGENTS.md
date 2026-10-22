# AI layer

## Overview

Everything that talks to a model lives in `lib/ai/`. OpenRouter is the single gateway, while the orchestrator walks an ordered multi-model chain with a shared breaker and usage ledger. Paper 3 follows the same orchestrator path where it calls the shared AI helpers.

## Key files

| File | Owns |
|---|---|
| `lib/ai/instances.ts` | The lazy OpenRouter-compatible provider and server-side key check |
| `lib/ai/chain.ts` | Open model IDs, deadlines, classification and model construction |
| `lib/ai/breaker.ts` | Shared model health and cooldown probes |
| `lib/ai/orchestrator.ts` | Ordered fallback for `generate`, `streamChat` and `generateTextWithFallback` |
| `lib/ai/registry.ts` | Named tasks, chain policy and cache TTLs |
| `lib/ai/cache.ts` | In-memory `Map`, sha256 keys, dies with the process |
| `lib/ai/index.ts` | Extraction from PDF, image and Word, summarisation, quiz and exam generation, grading |
| `lib/ai/tools.ts` | Chat tool definitions passed to the model |
| `lib/ai/validators.ts` | `normalizeGeneratedQuestions` |
| `lib/paper3/evaluate.ts` | Paper 3 mock marking, separate from the orchestrator |
| `lib/paper3/grade-short-answer.ts` | Paper 3 short answer grading with a graceful fallback |
| `lib/paper3/prompts.ts` | Paper 3 prompt text |
| `lib/paper3/subject-tasks.ts` | Per subject task definitions |

## Conventions

- Construct models only through `chainModel` in `lib/ai/chain.ts`. The OpenRouter key stays server side.
- Do not import a provider directly from routes, jobs or components.
- A new AI call needs a task registered in `registry.ts` first. `getTaskConfig` throws on an unknown name, which surfaces the mistake at the call site.
- Never cache grading. Set `cacheTtlMs: 0` for `grading` and `paper3_eval` so a user's answer is always marked fresh.
- `streamChat` is the only streaming entry point. Chat routes call it from `app/api/ai/chat/route.ts`.
- AI output that reaches the UI goes through `lib/math-format.ts` so KaTeX delimiters render. Skip this and LaTeX shows as raw text.

## Gotchas

- `generateCritical` is a byte identical copy of `generate`. The `Critical` suffix is a naming convention for call sites, not a different behaviour. It does not skip the cache and it does not skip the retry.
- `generateTextCritical` is likewise a copy of `generateTextWithFallback`. Nothing iterates the chain.
- The normal chains contain multiple OpenRouter model IDs. A transport failure falls through before a stream's first token; an already started stream stays on its model.
- The cache key is the prompt, not the user. Two users sending the same prompt share a cached answer. That is why the generation tasks cache for 7 to 30 days and the grading tasks do not.
- The cache is per process and is not shared across instances. A serverless deploy gets a cold cache on every cold start.
- The gated Fusion path in `lib/ai/fusion.ts` intentionally uses one explicit OpenRouter model and is not part of the normal fallback walk.
- A live model test requires `OPENROUTER_API_KEY` to be available to the server process. Unit tests mock the AI SDK boundary and prove the chain behavior without contacting providers.
