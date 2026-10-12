# AI layer

## Overview

Everything that talks to a model lives in `lib/ai/`. One model, one orchestrator, one task registry, one in-memory cache. Paper 3 has its own separate AI code in `lib/paper3/` that does not go through the orchestrator.

## Key files

| File | Owns |
|---|---|
| `lib/ai/instances.ts` | The only provider import, re-exports `google` |
| `lib/ai/orchestrator.ts` | The single model instance, the 10s timeout, `generate` / `streamChat` / `generateTextWithFallback` and their `Critical` aliases |
| `lib/ai/registry.ts` | Eight named tasks, each with a one model `chain` and a cache TTL |
| `lib/ai/cache.ts` | In-memory `Map`, sha256 keys, dies with the process |
| `lib/ai/index.ts` | Extraction from PDF, image and Word, summarisation, quiz and exam generation, grading |
| `lib/ai/tools.ts` | Chat tool definitions passed to the model |
| `lib/ai/validators.ts` | `normalizeGeneratedQuestions` |
| `lib/paper3/evaluate.ts` | Paper 3 mock marking, separate from the orchestrator |
| `lib/paper3/grade-short-answer.ts` | Paper 3 short answer grading with a graceful fallback |
| `lib/paper3/prompts.ts` | Paper 3 prompt text |
| `lib/paper3/subject-tasks.ts` | Per subject task definitions |

## Conventions

- Import models only from `lib/ai/instances.ts`. It re-exports `google` and nothing else.
- Never import `@ai-sdk/openai` or `@ai-sdk/openai-compatible`. They are installed and unused.
- A new AI call needs a task registered in `registry.ts` first. `getTaskConfig` throws on an unknown name, which surfaces the mistake at the call site.
- Never cache grading. Set `cacheTtlMs: 0` for `grading` and `paper3_eval` so a user's answer is always marked fresh.
- `streamChat` is the only streaming entry point. Chat routes call it from `app/api/ai/chat/route.ts`.
- AI output that reaches the UI goes through `lib/math-format.ts` so KaTeX delimiters render. Skip this and LaTeX shows as raw text.

## Gotchas

- `generateCritical` is a byte identical copy of `generate`. The `Critical` suffix is a naming convention for call sites, not a different behaviour. It does not skip the cache and it does not skip the retry.
- `generateTextCritical` is likewise a copy of `generateTextWithFallback`. Nothing iterates the chain.
- Every `chain` array holds exactly one model. There is no fallback. A Gemini outage fails the request outright.
- The cache key is the prompt, not the user. Two users sending the same prompt share a cached answer. That is why the generation tasks cache for 7 to 30 days and the grading tasks do not.
- The cache is per process and is not shared across instances. A serverless deploy gets a cold cache on every cold start.
- Inngest background jobs call `generateObject` directly from the `ai` package in `lib/mock-generator.ts`, `lib/inngest/paper3-exam-functions.ts`, and `lib/inngest/question-ingest.ts`. They bypass the orchestrator, so they set their own timeout.
- `lib/paper3/` is a parallel AI layer. Changing `lib/ai/` does not change how Paper 3 is marked.
- `dispatchPaper3ExamEvaluation` in `lib/inngest/paper3-exam-functions.ts` is exported but never registered in the serve list at `app/api/inngest/route.ts` and never sent. It is dead.