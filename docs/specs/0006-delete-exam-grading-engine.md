# 0006. Delete the exam and grading engine

**Date**: 2026-10-14
**Status**: Accepted

## Summary

You asked for a clean product for university study, so you removed the whole exam and grading engine. You deleted the runner, the grading paths, the authoring screens, and the related tables and data. You now keep notes, quizzes, and Tip (your AI tutor), and you may use this note as the closed record.

## Context

You pivoted from secondary school preparation to university study. The old product carried mocks, timed exams, papers numbered 1 to 3, blueprints (weighting plans for papers), and a question bank. Cameroon universities run internal semester exams with no public archive, so the ingest pipeline (the code that imports past papers) had no feed.

The engine filled the tree with two parallel mock families, many exam routes, browser takeover rules, tab checks, and grading code. That surface cost upkeep while serving students you no longer target.

With no real students to protect at pivot time, a full wipe was acceptable. The consequence of not deciding was a product that still sold secondary school prep to university students, plus schema drift (old tables lingering with no use).

## Requirements

**User stories**:
1. As a university student, I want notes, quizzes, and Tip and nothing about secondary exams so that I see only what helps me study.
2. As a builder, I want no exam code, route, page, job, table, or seed left so that nothing can drift back.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
1. **AC-1**: You find no `app/api/paper3`, no `app/(dashboard)/practice`, no `lib/paper3`, no exam page, and no grading job in the tree.
2. **AC-2**: The schema holds no mock, exam, paper, blueprint, question bank, or component table or enum.
3. **AC-3**: The migration `20261014120000_pivot_wipe_and_drop_gce_tables` applies clean and leaves one admin from env (environment settings).
4. **AC-4**: `pnpm lint` and `pnpm build` pass on the stripped tree.
5. **AC-5**: No secondary exam copy reaches a student in marketing, nav (navigation), metadata, manifest, FAQ, footer, email, or share text.

## Options considered

Options considered were not documented at decision time.

## Decision

**Chosen option**: Full deletion of the exam and grading engine.

You deleted every mock, exam, paper, blueprint, grading path, and related data, and you kept notes, quizzes, and Tip.

## Rationale

You chose full deletion because the engine served secondary school prep and you now serve university study. The feed for past papers does not exist, so generalising the runner would keep upkeep with no content to run. You accepted loss of timed assessment and integrity checks because a clean core you can maintain beats a large engine you cannot feed.

## Feature design

**Data model sketch**:
1. `User` keeps `levelOfStudy` as nullable string plus onboarding flags.
2. `Note`, `Topic`, `TopicNote`, `TopicPerformance`, `Quiz`, `QuizAttempt`, `QuizAttemptAnswer` remain and stay note rooted (tied to a note).
3. All mock, exam, paper, blueprint, source, bank, profile, program, component, session, and baseline models are gone. The exact 24 tables and 22 enums live in `prisma/migrations/20261014120000_pivot_wipe_and_drop_gce_tables/migration.sql`, which you treat as the source of truth.
4. All related enums are gone. Kept tables stay: auth tables for sign in, plus note rooted study tables. Level rows come from `prisma/seed.ts` (seed script), and quiz generation needs a note `noteId` (note identifier), never a standalone topic.

**State transitions**:
None. No state machine remains for exams.

**API surface**:
1. Deleted: all under `app/api/paper3`, all under `app/api/mocks`, plus `app/api/exam-levels`, `app/api/programs`, `app/api/exams`, `app/api/blueprints`, plus admin authoring routes, plus the public page at `app/result/[shareId]`. You also check `app/api/inngest/route.ts` (background job list), `lib/inngest`, `hooks/usePlan.ts`, `hooks/useUsage.ts`, `lib/query-keys.ts`, `components/paper3`, `prompts/paper3`, and `lib/ai/registry.ts` for stale tasks, so no caller can guess.
2. Kept: `app/api/levels`, `app/api/onboarding/level`, `app/api/notes`, `app/api/quizzes/generate`, `app/api/ai/chat`, admin users and payments.
3. Auth stays session based (signed in user) with admin check for admin routes.

**Value sourcing** (every value each action produces, computes, or displays names where it comes from. This spec is a closed record, not a build contract, so each source below points at the artifact you check):
1. Engine absence for AC-1 comes from tree listing (file search) over `app`, `components`, `lib`, `hooks`, and `prompts`.
2. Schema absence for AC-2 comes from `prisma/schema.prisma` checked against the migration file above.
3. Migration proof for AC-3 comes from migration history plus admin row from `ADMIN_EMAIL`. Auth tables stay, so sign in keeps working and the wipe cannot lock you out when code goes first and migration goes last.
4. Build health for AC-4 comes from `pnpm lint` plus `pnpm build` output.
5. Copy proof for AC-5 comes from text search over marketing, metadata, manifest, robots, FAQ, footer, email, prompts, and seed. Forbidden terms are `GCE`, `WAEC`, `O Level`, `A Level`, `HND`, `Paper 1`, `Paper 2`, `Paper 3`, `mock`, `blueprint`, and `TiCExam`, plus the old enum literals named in spec `0005`. Old share links at `app/result/[shareId]` return 404 (not found).

**Key invariants**:
1. No new exam, mock, paper, or grading code lands without a fresh decision.
2. `levelOfStudy` stays the only academic fact on `User`.
3. Quiz generation always needs a `noteId`.

**Security model**:
Students reach only rows they own, checked by `userId` against the session. Admin routes need admin role. The public exam share surface is gone, so no public exam area remains. The wipe destroyed accounts and content, which you chose and recorded as irreversible.

**Configuration required**:
1. `ADMIN_EMAIL`: the single operator created by the wipe. Required at migration time.

**Critical test scenarios** (each maps to an acceptance criterion in Requirements):
1. Happy path: you list the tree and see no exam folders, you inspect the schema and see no exam tables, you run lint and build clean. Verifies **AC-1**, **AC-2**, **AC-4**.
2. Copy sweep: you search the tree for secondary exam terms and get hits only in `docs` history and old migration SQL. Verifies **AC-5**.
3. Data proof: you confirm the migration row exists and a single admin can sign in. Verifies **AC-3**.

## Build plan

The project build approach is Tracer Bullet (thin end to end thread first, then thicken). For a closed deletion, the plan is a verification sweep in thin order. You may run or skip each step.

1. I recommend you verify the tree: confirm `app/api/paper3`, `app/(dashboard)/practice`, `lib/paper3`, `components/paper3`, `prompts/paper3`, and `app/result/[shareId]` are gone, and confirm no stale exam task in `lib/ai/registry.ts` and no exam function in `app/api/inngest/route.ts`. Satisfies **AC-1**.
2. I recommend you verify the schema: confirm no mock or Paper 3 model or enum in `prisma/schema.prisma`, using the migration file as the exact list. Satisfies **AC-2**.
3. I recommend you verify the migration: confirm `20261014120000_pivot_wipe_and_drop_gce_tables` in history and one admin present, on fresh and on migrated bases. Satisfies **AC-3**.
4. I recommend you verify copy with the forbidden terms in Value sourcing, across marketing, metadata, manifest, robots, FAQ, footer, email, prompts, and seed. Satisfies **AC-5**.
5. I recommend you run `pnpm lint` and `pnpm build` and keep the output. Satisfies **AC-4**.

## Migration plan

**Strategy**: big bang with no rollback (single destructive deploy, chosen on purpose. Soft disable with empty tables was left out because you wanted no drift back and you marked the old data as not important)
**Phases**:
1. Additive code work landed first, with nullable columns and repointed reads. Code deletion goes before the migration, so no route, job, webhook, or registry task can fire into a dropped table.
2. Destructive migration wiped rows, dropped 24 tables and 22 enums, and inserted one admin.
**Rollback**: None. Recovery is point in time restore plus migration table surgery.
**Risks**: Running against production without a copy check, accounting needs for wiped payments, stray Inngest events firing at deleted functions, stale tasks in `lib/ai/registry.ts`, and foreign key cascades breaking the wipe order.

## Consequences

**Positive**:
1. The tree and schema say what the product is: notes, quizzes, and Tip.
2. Nothing secondary shaped can drift back through empty tables.
3. Fresh clones seed clean with only level rows.

**Negative / tradeoffs**:
1. You lose timed assessment, so you cannot claim exam prep under time.
2. You lose fullscreen anti cheat and tab rules, in an audience where cheating is common.
3. You lose payment and content history with the wipe, which you marked as not important.
4. Tip guidance is prompt based (written instruction), so a determined student may still coax an answer.

**Neutral**:
1. Old migration SQL still names the dropped tables, as immutable history.
2. `docs` and research still discuss the old engine for context.

## Follow up

1. I recommend you clear the test mock for `paper3MockAttempt` in `tests/setup.ts` if that file still ships. You may skip if tests stay local.
2. I recommend you update `lib/ai/AGENTS.md` and `app/api/AGENTS.md` where they still describe Paper 3 code as live. You may skip if you keep them as history.
3. I recommend you trim the dated Paper 3 summaries at the bottom of `AGENTS.md` or mark them as past. You may skip if you want the timeline kept.
4. I recommend you keep scope row 6 as done and make no new exam scope. You may skip if planning changes.
