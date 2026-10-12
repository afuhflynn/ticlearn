# 0002. Prompt registry

**Date**: 2026-10-12
**Status**: Accepted

## Summary

You keep all AI wording in one prompts folder you can edit without a rebuild (a folder of markdown files with a header block). Each file holds its model plus settings where you can review it in git (version history). Code loads text through one helper so edits show on the next request.

## Rationale

Reasoning and options: see rationale.md.

## Decision

**Chosen option**: Option 2: Document plus single migration PR

You move every AI prompt to versioned markdown files under one top folder, load them through one typed helper, and block new inline prompts with an automated check.

## Standard definition

**Canonical pattern**:

```md
---
name: quiz_brief
model: gemini-2.5-flash
version: 3
heat: 0.4
cap: 2048
cacheSpanMs: 1209600000
needsTools: false
needsImages: false
slots:
  - excerpt
---

Analyze the following study notes and return a concise study brief.

Notes:
{{excerpt}}
```

```ts
import { getPrompt } from "@/lib/prompts/loader";

const { text, settings } = await getPrompt("quiz_brief", {
  excerpt,
});
```

Loader is async `getPrompt` (a typed helper) that throws a typed error on missing file plus bad header plus missing slot. It reads the file (markdown body plus header block), checks required slots as strings, ignores extra slots, treats double braces as literal braces, checks model against an allow list (approved names) owned in `lib/ai/registry.ts`, enforces needs flags by throwing when tools or images are required but absent, holds text in memory keyed by file change time, and returns text plus settings. Header uses `gray-matter` (header reader) plus `zod` (schema checker) for typed errors. Header fields are name plus model plus version as required, heat plus cap plus cache span plus needs flags plus slots as optional with defaults heat 0.4 and cap 2048. Heat means temperature 0 to 1. Cap means max output tokens. Timeout plus retries stay in code in the orchestrator (single model caller with 10s limit). File cache span wins except grading plus eval stay zero so marking never caches. Cache key is name plus version plus slot hash. Logs carry name plus version plus model with no slot values. Fallback is one global static text in the loader for the worst case path only. Files ship with the deploy image, so prose edits ride the deploy till a volume or blob store lands.

**Replaces**:

* * Inline template literal prompt in `lib/ai/index.ts`
* * Exported const string plus builder function in `lib/paper3/prompts.ts`
* * Inline job prompt in `lib/inngest/paper3-functions.ts` and `lib/inngest/paper3-exam-functions.ts` and `lib/inngest/question-ingest.ts` and `lib/mock-generator.ts`
* * Inline tool description const in `lib/ai/tools.ts`
* * Direct model string per caller instead of file header plus allow list check

Mapping rule is one file per exported builder plus per tool, under `prompts/<area>/<name>.md` with areas quiz plus exam plus summary plus chat plus paper3 plus tools plus jobs. Name maps to file name. Multi prompt files split by export name.

**Enforcement**:

Typed loader is the sole approved import plus a CI search that fails on new inline prompt text outside the loader. Inline means a string literal over 200 chars used as AI input outside the loader. Configured in `lib/prompts/loader.ts` plus a check script at `scripts/check-prompts` wired into `package.json` scripts and CI. An eslint boundary rule follows as hardening.

**Rollout**:

Single migration PR. After merge, all new code uses the loader at once. No gradual span with two patterns.

**Exceptions**:

Tiny static fallback text for the worst case failure path only, logged with prompt name plus version. No productive prompt text stays inline.

## Consequences

**Positive**:

* * Wording review lives in git as prose, clear for non coders
* * Edits show on the next request with no rebuild
* * Model plus heat plus caps travel with the text they govern
* * Tool text stays beside the prompt that frames it

**Negative / tradeoffs**:

* * First PR touches all AI callers at once, needs full AI pass to verify
* * File reads add a small lookup cost per request, eased by the memory hold
* * Header mistakes fail fast, which can block a deploy till fixed
* * Prompt files need the same care as code, since a prose edit changes behaviour

**Neutral**:

* * Task registry stays as the job list, files hold per prompt values
* * Paper 3 marking code keeps its logic, only its wording moves
* * Cache keys now trace to prompt name plus version in logs

## Follow-up

* [x] Link this spec from the platform scope row for prompt registry so status mirrors the build
* [ ] Run the single migration PR through the running app with quiz plus exam plus Paper 3 plus chat exercised
* [x] Add the CI search that blocks new inline prompt text outside the loader
* [ ] Revisit an admin edit screen only after git based flow proves stable
* [x] Record full inventory during build with each export in `lib/ai/index.ts` plus `lib/paper3/prompts.ts` plus `lib/ai/tools.ts` mapped to file names
* [ ] Track volume or blob store so prose edits can land without a deploy, till then edits ride the deploy
* [ ] Scope user keyed cache as later work, grading plus eval stay uncached
* [ ] Add joint test for tool plus prompt sync and eslint boundary hardening
