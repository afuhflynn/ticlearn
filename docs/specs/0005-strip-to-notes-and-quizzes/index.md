# 0005. Strip the platform to notes, quizzes and Tip

**Date**: 2026-10-13
**Status**: In Progress

## Summary

We delete the entire secondary school product: every mock, every exam, every paper, and all the GCE copy, so that nothing in the code, the database or the marketing can still sell it to a university student. What is left is the smallest set of things a student genuinely needs: upload their own notes, get a quiz from them, and talk to Tip, our AI tutor. We keep one academic fact about each student, their level of study, and use it to aim Tip better. The whole change is one migration that wipes the old data on purpose, with no rollback.

## Requirements

**User stories**:
- As a university student, I want to upload my own notes so that I can study from my own material rather than from someone else's past papers.
- As a university student, I want Tip to teach me rather than hand me answers so that I actually learn the material.
- As a university student, I want to know my level of study once so that Tip explains things at the right depth.
- As a new student, I want to pick my level of study and be asked nothing else academic, so that I reach my first note in one minute.
- As a student, I want my quiz attempt history kept when I delete a note, so that losing a file does not erase what I already practised.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: No GCE, O Level, WAEC, A Level or HND content or copy is reachable by a student anywhere in the product, including marketing pages, navigation, page metadata, the manifest, structured data, the FAQ, the footer, email subjects and share text.
- **AC-2**: No source file outside `docs/`, `.firecrawl/` and generated output contains any GCE shaped literal, not just the visible words. This includes the enum values `"COMPUTER_SCIENCE"`, `"C_PROGRAM"`, `"PASCAL_PROGRAM"`, `"EXCEL_GRID"`, `"SPREADSHEET"`, `"C_PROGRAMMING"`, `"PAPER"`, `"Y1"`, `"Y2"`, `"BLUEPRINT"` and `"TiCExam"`, which read as secondary school even though a search for "GCE" misses them. The verification command is pinned in `## Migration plan` step 4.
- **AC-3**: The database holds no mock, exam, paper, blueprint, exam source, past paper, question bank, exam profile, programme or component row, and none of their tables or enums exists in the schema.
- **AC-4**: The schema holds exactly one academic fact about a student: a level of study. There is no institution, faculty, course, semester, subject or programme table anywhere in the schema.
- **AC-5**: Sign-up works with no level set. The dashboard and chat guards redirect a student who has no level to the level picker, and every other route lets them through. `levelOfStudy` is nullable in the database and required only by the guard.
- **AC-6**: A new student picks their level at onboarding, is shown nothing else academic, and lands on uploading a note. There is no catalogue to browse and no empty content page.
- **AC-7**: A topic belongs to the note it was extracted from. Deleting a note deletes its topics and their mastery records, but keeps the quizzes and quiz attempts generated from it. Mastery is tracked per note topic and is never merged across notes.
- **AC-8**: Quizzes are generated from a note alone. There is no code path that generates a quiz without a note: the weak areas route, the sign up default quiz, and the topic only branch of the chat `createQuiz` tool are all gone.
- **AC-9**: Tip is the name of the AI tutor everywhere a user can see it: the chat panel, the greeting, the placeholder, the chat landing, share text and email subjects.
- **AC-10**: Tip has one consistent voice across every conversation. It quotes the student's own note text back to them, asks a checking question before giving an answer, and does not hand over a finished answer to a direct request for one. The behaviour lives in `prompts/chat/chat_system.md` and is changed there, not in a route.
- **AC-11**: Tip's system prompt includes the student's level of study and the text of the note the conversation is about, and its answers change with the level. A Year 1 student and a final year student asking the same question about the same note get materially different explanations.
- **AC-12**: Model selection for every AI task is pinned in `lib/ai/registry.ts` as an explicit per task chain. Tip's chat runs on the cheap model, and note processing and quiz generation and grading run on the strong model. Every prompt file's `model:` frontmatter names a model that is in the registry's allow list, so no prompt throws `PromptError` at load time.
- **AC-13**: Plan limits are defined in exactly one module, which also owns the `FREE` derivation (a user resolves to `FREE` when they have no active subscription, since `FREE` is not a value of the `Plan` enum). The client hooks, the usage route, the notes route, the quiz routes, the chat route and the chat tools all read that module. No limit for exams, retakes, Paper 3 AI messages or correct answer viewing survives, and no feature that was removed is referenced by a limit.
- **AC-14**: The admin panel keeps user management, payments, platform settings and AI credit costs. The question, blueprint, mock, module and exam authoring screens and their routes are gone. The admin panel does not offer note or quiz management, because no such route exists today and building one is new work outside this spec.
- **AC-15**: The migration leaves exactly one operator: after the wipe it inserts one admin row, from a value in the environment, so the admin panel, the Inngest functions and the webhooks have someone to run them. No other account survives.
- **AC-16**: The migration runs clean against production in one deploy, with no manual repair step and no reset. It wipes all existing accounts, subscriptions and payments as part of the run, and the build documents that this was chosen and is not reversible.
- **AC-17**: `pnpm db:seed` on a fresh clone produces a working database containing only the level of study reference rows. No seed script creates a programme, a subject, a component, a blueprint or a topic.
- **AC-18**: `pnpm lint` and `pnpm build` pass on the stripped tree, and every background job that served a mock, paper, exam grading or the sign up default quiz is deleted rather than left unscheduled.

## Decision

**Chosen option**: Delete the secondary school product outright, replace the academic model with a single level of study field, and rebuild the AI tutor as Tip with a teaching persona.

We delete every mock, exam and paper family rather than generalising them, we keep no academic catalogue, and Tip replaces every existing assistant name.

**Implementation skills**: none. No installed community skill governs Prisma schema surgery, Next.js route deletion, or prompt authoring in this repository, and `AGENTS.md` points at no such skill.

## Feature design

**Data model sketch**:

Level of study is a nullable string on the user, constrained in application code to a fixed set. It is not a table: there is one axis, no second axis has arrived, and a four row table with no writer is indirection that the destructive migration would then have to carry.

| Entity | Key fields | Notes |
|---|---|---|
| `User` | existing, plus `levelOfStudy String?`, `onboardingCompleted Boolean @default(false)`, `onboardingSkipped Boolean @default(false)` | `levelOfStudy` is nullable because `lib/auth.ts:89` inserts a user at sign up with no level in hand. The guard enforces it (AC-5). The two onboarding flags move off `ExamProfile`, which is dropped, so `app/(dashboard)/layout.tsx:26` and its other read sites keep working. |
| `Topic` | `id`, `nameSlug` (String), `name` (String) | The canonical topic. Keyed on a normalized name so display can aggregate. No `noteId`, no `componentId`. |
| `TopicNote` | `id`, `topicId`, `noteId` | New join table. A note has many topics; a topic can appear in many notes. This is what lets mastery stay per note (AC-7) while the weak areas card aggregates by topic name. |
| `TopicPerformance` | `id`, `noteId` (String), `topicId` (String), `masteryScore`, attempt counters, `lastPracticedAt` | Repointed. `examProfileId` is dropped. Gained `onDelete: Cascade` on `topic`, which it does not have today (`prisma/schema.prisma:220`). Unique on `[noteId, topicId]`, `@@index([noteId])`. |
| `Note` | existing, minus `subject` and `topics` | `subject` is NOT NULL today with no source under "shown nothing else academic", and `topics String[]` would duplicate the `Topic` rows. Both dropped. `Note` gains `@@index([userId, createdAt])` for the usage meter. |
| `Quiz` | existing | Unchanged. `noteId` already exists. `onDelete` on `quizId` in `QuizAttempt` changes from `Cascade` to `SetNull` (AC-7). |
| `QuizAttempt` | existing, minus `examProfileId`, `quizId` now `SetNull` | Keeps `noteTitle` and `quizTitle` snapshots, which is what makes `SetNull` safe. |
| `QuizAttemptAnswer` | existing | Already snapshots `question` and `correctAnswer` (`prisma/schema.prisma:533`), so a deleted quiz leaves a readable history. |
| `UserStats` | existing, minus `examProfileId` | Survives for the leaderboard. The `examProfileId: { not: null }` filter in `app/api/leaderboard/route.ts:24` is removed with it. |

Dropped models: `ExamLevel`, `Program`, `Component`, `ExamSource`, `Question`, `ExamBlueprint`, `BlueprintSection`, `MockAttempt`, `Paper12MockModule`, `Paper12MockModuleItem`, `ExamProfile`, `ExamProfileProgram`, `ExamSession`, `Paper3Source`, `Paper3Question`, `Paper3Mock`, `Paper3MockModule`, `Paper3MockQuestion`, `Paper3MockAttempt`, `Paper3UserStats`, `Paper3QuestionAttempt`, `Paper3DetailedResult`, `Paper3Attempt`, `UserTopicBaseline`.

`UserTopicBaseline` is dropped rather than repointed. Its only writers were `/api/onboarding/baseline` and the admin panel, both of which go, so keeping it means keeping a table nothing writes. `lib/readiness.ts:85` pillar 1 collapses to a constant.

Dropped enums: `ExamSubject` (20 GCE codes), `MockCreationContext`, `MockSourceMode`, `QuestionSource`, `QuestionStatus`, `ExamStatus`, `ExamMode`, `Paper3Subject`, `Paper3Category`, `Paper3FocusCategory`, `Paper3SkillType`, `Paper3TaskType`, `Paper3Language`, `Paper3Section`, `Paper3PaperType`, `Paper3SourceType`, `Paper3Status`, `ComponentType`, `ProcessingStatus` (used only at `prisma/schema.prisma:1303`), `MockStatus`, `MockAttemptStatus`, `RevisionGuideFocus`.

`CreditType` survives with `PRACTICE_QUESTION`, `MOCK_EXAM` and `MOCK_GENERATION` removed by `ALTER TYPE ... DROP VALUE`, since their writers are deleted. `PlatformSettings` loses `creditCostMockQuestion`, `creditCostMockGeneration`, `mockMinQuestions`, `mockMaxQuestions`, `enforceCreditsForMocks` and `useAceShortAnswerGrading`.

Kept enums: `Plan`, `SubscriptionStatus`, `CreditType`, `QuestionType`, `QuizStatus`, `NoteStatus`, `FileType`.

Relationships after this change: `User` one to many `Note`. `Note` many to many `Topic` through `TopicNote`. `Topic` one to many `TopicPerformance`. `QuizAttempt` one to many `QuizAttemptAnswer`. There is no join table for a student's enrolment in a course, because no course exists.

**Level of study values**: `YEAR_1` "Year 1", `YEAR_2` "Year 2", `YEAR_3` "Year 3", `YEAR_4` "Year 4". HND and diploma programmes are out of scope for now; the value is a string, so adding them later is a zod enum change, not a migration.

**Model selection** (AC-12). The current AI layer routes everything through OpenRouter with a twelve model chain and an `AI_CHAIN_ORDER` override (`lib/ai/instances.ts:17`, `lib/ai/chain.ts:3`). After this change, `lib/ai/registry.ts` gives each task an explicit chain instead of calling the shared chain builder:

| Task | Chain | Reason |
|---|---|---|
| `fast_chat` (Tip's replies) | one cheap model | The chat allowance is budgeted against the measured 130 to 200 XAF per month, and most messages are short. |
| `summarize` (note extraction) | the strong model | Quality is visible immediately, in the student's own note summary. |
| `quiz_gen` (question generation and grading) | the strong model | Wrong questions teach the wrong thing. |
| `reasoning`, `exam_gen`, `paper3_gen`, `paper3_eval`, `grading` | deleted with their features | No task remains for them. |

`getTaskConfig` already throws on an unknown task name, so deleting a task is a startup error rather than a silent no-op. Every prompt file's `model:` frontmatter is updated to a name on the allow list, checked at `lib/prompts/loader.ts:76`.

**API surface**:

Surviving routes (shape unchanged unless noted):

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/levels` | GET | none | `{ levels: [{ value, label }] }`, fixed order | public | none |
| `/api/onboarding/level` | POST | `level: string` (req, one of the four values) | `{ ok }` | session | 422 unknown value |
| `/api/notes` | POST | file upload | `noteId`, `status` | session | 413 too large, 415 bad type |
| `/api/ai/chat` | GET/POST | `conversationId` (req, query param), `messages` | streamed text | session | 429 AI limit |
| `/api/chat/conversations` | POST | `noteId?` | `conversationId` | session | 404 note not owned |
| `/api/quizzes/generate` | POST | `noteId` (req) | `quizId`, `status` | session | 404 note not owned, 429 AI limit |
| `/api/admin/*` | various | existing | existing | admin | 403 non admin |

New route, because the level is now required and there is nothing else to ask: `/api/levels`.

New column: `ChatConversation.noteId String?`, FK to `Note` with `onDelete: SetNull`. It is what gives Tip something to ground on (AC-11). It is set when the student opens a chat from a note, and is left null for a general chat, in which case Tip has no note to quote and says so.

Deleted routes: `/api/exam-levels`, `/api/programs`, `/api/exam-sources`, `/api/exams`, `/api/exams/[id]`, `/api/blueprints`, `/api/blueprints/community`, `/api/mocks/*` (all 7), `/api/quizzes/generate/from-weak-areas`, `/api/questions/practice`, `/api/public/gce-blueprints`, `/api/public/p1p2-mock-modules`, all 27 under `/api/paper3/*`, `/api/admin/blueprints/*`, `/api/admin/mocks/*`, `/api/admin/questions/*`, `/api/admin/paper3/*`.

Repointed routes: `/api/onboarding/*` drops the baseline, topics, exam profile and progress steps and keeps the level step. `/api/usage`, `/api/readiness` and `/api/performance` read note scoped topics, and `/api/performance` loses its `examProfileId_topicId` composite lookup. `/api/stats` loses its `examProfileId` filter. `/api/leaderboard` drops its Paper 3 tabs and its `examProfileId` filter. `/api/admin/plan-upgrades` drops its grouping by `examLevel.name`.

Deleted pages: `/gce-exams`, the `practice/mock/**` and `practice/exam/**` families, `/paper3-leaderboard/**`, and the admin blueprint, mock, question, upload and Paper 3 screens.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Onboarding level picker | the four levels | the `LEVELS` constant in the onboarding page and `/api/levels`, both from the fixed list above |
| Onboarding level submit | the stored level | `User.levelOfStudy`, an input param to `/api/onboarding/level` |
| Dashboard guard | whether to redirect to onboarding | `User.onboardingCompleted`, derived from `User.levelOfStudy` being null |
| Tip system prompt | the student's level | `User.levelOfStudy`, read server side in `/api/ai/chat` |
| Tip system prompt | the note text | `Note.extractedText` plus `KnowledgeChunk` rows, resolved from `ChatConversation.noteId` |
| Tip response | the grounded explanation | the `fast_chat` chain in `lib/ai/registry.ts`, the existing orchestrator timeout and retry |
| Quiz generation | the questions | the `quiz_gen` chain, from `Note.extractedText` |
| Note processing | summary, key points, topic rows | the `summarize` chain, existing note ingestion, which now also inserts `Topic` and `TopicNote` |
| Plan limit check | whether an action is allowed | the single plan limits module, which also derives `FREE` from `Subscription.status` |
| Usage meter | notes used | `Note.count` where `userId` matches, no date filter, matching the existing enforcement in `/api/notes` |
| Usage meter | quizzes used | `Quiz.count` where `userId` matches, no date filter, matching `/api/quizzes/generate` |
| Usage meter | AI messages used | `ChatMessage.count` joined through `ChatConversation` to the user |
| Weak areas card | a topic name and a mastery score | `Topic.name` and the average `TopicPerformance.masteryScore` across the student's `TopicNote` rows |
| Readiness card | a score | `TopicPerformance.masteryScore` only. The baseline pillar is gone, so this is performance and recency, not performance alone. `daysUntilExam` is deleted, not replaced. |
| Tip's visible name | "Tip" | the `TIP_NAME` constant in `components/chat/`, imported by the chat landing, message list and placeholder |
| Admin bootstrap | the admin's email | `ADMIN_EMAIL` env var, read by the migration |

**Key invariants**:
- A student's level, once set, is one of the four values. Enforced by a zod enum at the API boundary and by the seed constant, not by the database.
- A `TopicPerformance` row's `noteId` matches the `noteId` of the `TopicNote` row joining its topic to that note. Enforced on write. The database cannot express this across two tables, and a mismatch would silently report mastery against the wrong note.
- Deleting a `Note` cascades to `TopicNote` and its `TopicPerformance` rows, and `SetNull`s `Quiz.quizId` in attempts, leaving `QuizAttemptAnswer` rows readable through their own `question` and `correctAnswer` snapshots.
- No plan limit literal exists outside the single limits module.
- Model names appear in exactly two places, `lib/ai/registry.ts` and prompt frontmatter, and the loader validates the frontmatter against the registry allow list at load time.

**Security model**:
- Students read and write only rows where `Note.userId` equals their session user. Every note, topic, quiz and attempt query filters on the owner. A student passing another student's `noteId` gets 404, not 403, so the endpoint does not confirm the row exists.
- `ChatConversation.noteId` is resolved server side from the conversation row, never from a client param on the message send, so a student cannot point a conversation at someone else's note.
- Level of study is not sensitive. It is visible to the student and used in their own prompts, never on a public profile.
- Admin routes keep their existing admin role check. The reduced surface narrows what an admin can reach, it does not widen it.
- The migration destroys all user and payment rows and inserts one admin from `ADMIN_EMAIL`. This is data destruction, not a security event: no PII exposure is created. It is recorded because it is irreversible.

**Configuration required**:
- `ADMIN_EMAIL`: the single operator account the migration creates. Required at migration time. Without it the wipe leaves no admin and the Inngest and webhook endpoints have no owner.

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):

There are no automated tests in this repository: Vitest is installed with no config and no test file, and `pnpm test` does not run. Every scenario below is a manual check with the command or click path stated.

- Happy path: a new student signs up, is redirected by the dashboard guard, picks Year 2, uploads a note, gets topics extracted, generates a quiz from that note, and asks Tip a question about it. Tip quotes the note, asks a checking question, then explains at Year 2 depth. Verifies **AC-5**, **AC-6**, **AC-8**, **AC-10**, **AC-11**.
- Sign up with no level: a brand new user lands on the dashboard with `levelOfStudy` null and is redirected rather than erroring. Verifies **AC-5**.
- Data removal: run the pinned grep from `## Migration plan` step 4 and get no hits outside the exempt directories. Verifies **AC-1**, **AC-2**.
- Isolation: student A passes student B's `noteId` to `/api/quizzes/generate` and gets 404. Verifies **AC-8**.
- Cascade: student deletes a note; its topics and mastery records are gone, its quizzes and attempts remain readable, and a sibling note is untouched. Verifies **AC-7**.
- Prompt discipline: ask Tip "just give me the answer" while a note is attached; it responds with a checking question, not a finished answer. Verifies **AC-10**.
- Weak areas display: a student with three notes on photosynthesis sees one row for photosynthesis with an averaged score, not three rows. Verifies **AC-7**.
- Plan limit single source: grep for a plan limit literal outside the limits module and get nothing. Verifies **AC-13**.
- Seed: `pnpm db:seed` on an empty database produces the level rows and no content. Verifies **AC-17**.
- Admin bootstrap: after the migration, log in as `ADMIN_EMAIL` and reach `/admin`. Verifies **AC-15**.
- Build: `pnpm lint` and `pnpm build` both pass on the stripped tree. Verifies **AC-18**.

## Build plan

The project's build approach is Tracer Bullet: stand up a thin end to end thread through every layer first, then thicken. For a deletion that shape inverts usefully. Slice 1 must leave a working site, so it takes the thinnest survivable product end to end (level, note, quiz, chat) before anything else is deleted. Deleting first would leave the site broken for the whole middle of the build and, worse, make a failure indistinguishable from an intended deletion. The destructive migration therefore lands last, after the code no longer references the old schema, so the database never sits in a state the running code cannot read.

1. Generate the migration against an empty database with `prisma migrate dev --create-only` against a throwaway schema that has no GCE tables at all, then squash it into one migration for production. Because there are nothing to preserve, Prisma writes the whole repoint, the drop and the wipe itself, so there is no hand written enum SQL and no `ALTER TYPE` risk. Satisfies **AC-3**, **AC-4**, **AC-16**.
2. Add `User.levelOfStudy`, `onboardingCompleted` and `onboardingSkipped`, the `Topic` and `TopicNote` tables, `noteId` on `TopicPerformance`, `noteId` on `ChatConversation`, the `onDelete` changes, the new indexes, and the level constants and seed. Every column nullable at this stage, because the old rows still exist. Satisfies **AC-4**, **AC-17**.
3. Build the level onboarding step, `/api/levels` and `/api/onboarding/level`, and the dashboard guard that redirects a student with no level. This is the thin end to end thread. The column stays nullable; "has a level" is a guard rule, not a constraint. Satisfies **AC-5**, **AC-6**.
4. Repoint notes, topics, mastery, weak areas and readiness onto the note. Note ingestion now inserts `Topic` and `TopicNote` rows. `Note.subject` and `Note.topics` are dropped. `lib/readiness.ts` loses the baseline pillar and `daysUntilExam`. Satisfies **AC-7**.
5. Pin per task chains in `lib/ai/registry.ts` with the four model IDs above, delete the tasks whose features are gone, and update every prompt file's `model:` frontmatter to a name on the allow list. Verify the loader does not throw. Satisfies **AC-12**.
6. Write the Tip persona into `prompts/chat/chat_system.md`: quote the note, ask before answering, refuse a finished answer. Add `ChatConversation.noteId` to the chat route's grounding and set it when a chat opens from a note. Put the student's level in the system prompt. Rename the Tip surface: the chat landing, the message list, the placeholder, and the `TIP_NAME` constant. Satisfies **AC-9**, **AC-10**, **AC-11**.
7. Remove every quiz generation path that has no note: `/api/quizzes/generate/from-weak-areas`, `generateDefaultQuiz` and its `lib/auth.ts:106` call, the Inngest serve entry, and the topic only branch of the chat `createQuiz` tool. Satisfies **AC-8**.
8. Collapse the eight plan limit tables into one module, strip the removed features out of it, add the `FREE` derivation, and repoint the hooks, the usage route, the notes route, the quiz route and the chat route's two tables. Satisfies **AC-13**.
9. Strip the admin panel to users, payments, settings and AI credit costs, delete the authoring screens, and delete the `PlatformSettings` and `CreditType` entries for removed features. Satisfies **AC-14**.
10. Delete the mock and exam code: both route families, both page families, `/paper3-leaderboard`, the Paper 3 and P1/P2 libraries, the leaderboard tabs, the dashboard cards, the sidebar items, and every Inngest function that served them. Satisfies **AC-3**, **AC-18**.
11. Rewrite the marketing, metadata, SEO, manifest, robots, FAQ, footer, email and share copy for a university student. Delete the countdown. Satisfies **AC-1**.
12. Finalise the migration: the row wipe, the dropped tables and enums in dependency order, and the single admin insert from `ADMIN_EMAIL`. This runs last, after step 10 has removed every reference. Satisfies **AC-15**, **AC-16**.
13. Delete the old seed content and the GCE seed scripts, leaving only the level rows. Verify a fresh clone seeds clean. Satisfies **AC-17**.
14. Run the full verification sweep: the pinned grep, the isolation and cascade checks, `pnpm lint`, `pnpm build`, and the migration against a production copy. Satisfies **AC-1**, **AC-2**, **AC-7**, **AC-16**, **AC-18**.

## Migration plan

**Strategy**: replace directly, in two deploys, with an additive phase then a destructive phase.

This is not a strangler migration and should not be one. A strangler keeps the old and new running side by side, which requires the old schema, the old routes and the old copy to all keep working while the new one is proven. Here there are no real students to serve, the data is explicitly not worth preserving, and the whole point is that nothing GCE shaped survives. A strangler would double the work to protect data we are deleting on purpose, and would leave the old surface reachable, which AC-1 forbids.

**Phases**:

1. **Additive deploy** (steps 1 to 11, minus the finalised migration). New tables and nullable columns, code repointed, GCE surface deleted from routes, pages and copy. The old tables and columns are still present and still hold their old data. Every new column is nullable and nothing reads it yet except the code written in step 3, which is what this phase deploys. **This phase is revertible by reverting the commit.** The one thing it cannot revert is the dropped routes and pages, which is why the schema migration is squashed and held back rather than deployed here.
2. **Destructive migration** (step 12), as a second deploy. All user, subscription, payment and content rows are deleted first, then the dropped tables and enums are dropped in dependency order, then one admin row is inserted from `ADMIN_EMAIL`.

**Rollback**: phase 1 is a commit revert. **Phase 2 has none**, which was chosen deliberately over a separate reviewed wipe script, since that would have preserved a rollback the destructive deploy consumes anyway. The trade: if phase 2 half fails, `migrate deploy` marks the migration failed and will not re-run it, so recovery is a Postgres point in time restore **plus** surgery on `_prisma_migrations` to clear the failed row. Both of those are on the same Neon database whose drift and orphan migration row are already recorded in `docs/prisma-migration-repair-without-reset.md`, so assume the restore is the harder half. Practically acceptable only while there are no real users, which is the same assumption spec 0001 makes.

**Verification command for AC-1 and AC-2**, run from the repo root:

```bash
rg -n --hidden \
  --glob '!docs/**' --glob '!.firecrawl/**' --glob '!node_modules/**' \
  --glob '!lib/generated/**' --glob '!.git/**' \
  -e 'GCE' -e 'WAEC' -e 'O Level' -e 'A Level' -e 'HND' \
  -e 'COMPUTER_SCIENCE' -e 'C_PROGRAM' -e 'PASCAL_PROGRAM' -e 'EXCEL_GRID' \
  -e 'SPREADSHEET' -e 'C_PROGRAMMING' -e '"PAPER"' -e '"Y1"' -e '"Y2"' \
  -e 'BLUEPRINT' -e 'TiCExam' \
  .
```

**Risks**:
- **Existing migration drift**. `docs/prisma-migration-repair-without-reset.md` records an orphan `_prisma_migrations` row on Neon for `20260521120000_add_platform_settings_and_revision_guides`, a folder not in the repository, plus drift on `exam_blueprints` and `mock_attempts`. The repair in `scripts/repair-orphan-migration.sql` must run before `migrate deploy`, or the new migration will refuse to apply. This is a prerequisite, not part of this spec's work, but it blocks it.
- **Prompt frontmatter is a second naming site**. All 38 prompt files pin `model:` in frontmatter and `lib/prompts/loader.ts:76` throws `PromptError` on an unknown model. This fails at runtime, not at compile time, and deleting a task from the registry without updating the frontmatter breaks the prompt at first load.
- **A dangling reference the compiler cannot see**. Strings such as `"UNKNOWN"`, `"COMPUTER_SCIENCE"` and `"PAPER"` are used in Inngest functions, prompts and JSON metadata rather than in typed code, so deleting an enum does not catch them. The verification grep is what catches them.
- **A fail open path**. `lib/paper3/subject-tasks.ts:32` maps programme codes to subjects and treats an empty result as "no restriction", so deleting the programmes would silently widen access rather than close it. That code is deleted outright, which removes the path rather than relying on it.
- **`AiUsageEvent` survives the wipe**. Its `userId` is `onDelete: SetNull` (`prisma/schema.prisma:1115`), so AI cost history remains with null users, as does `DailyMetric` and `Verification`, which have no user foreign key. This is intentional: it preserves the cost data the AI budget is measured against.
- **Prompt drift**. Thirty eight prompt files, thirteen of them `prompts/paper3/*`, carry GCE framing in their preambles. Deleting the Paper 3 models does not delete the prompts unless step 10 does it explicitly.

## Consequences

**Positive**:
- The schema says what the product is. One field and a note rooted content tree, with no shape left over from a product we no longer sell.
- Nothing GCE shaped can drift back, because the tables, enums and columns are gone rather than empty. The two parallel mock families that `prisma/AGENTS.md` warns about no longer exist.
- The AI has a real grounding source. Tip answers from the student's own notes rather than from a hardcoded GCE topic list, which is both more useful and more honest about what the product can do.
- Plan limits are written once. The divergence where the same Paper 3 limit is `-1` in one table and `5` in another becomes impossible, and the `FREE` derivation moves somewhere it cannot be got wrong.
- A fresh clone is trivial to run. One seed with level rows, no content to maintain, nothing to go stale.

**Negative / tradeoffs**:
- We lose the integrity features. The fullscreen runner, anti cheat rules, tab violation handling and AI short answer grader were the most expensive code in the repository and `docs/research/audience-and-market.md` argues they are worth keeping, precisely because this audience cheats heavily. That code is now deleted, and this pivot does not rebuild it.
- Pivot row 6 in `docs/scope/pivot.md`, generalise the exam and grading engine, no longer describes real work. It said a mock for any course can be authored, sat fullscreen and graded. There is no exam engine left to generalise. That row needs rewriting or removing, and it is a scope decision, not an implementation one.
- This is closer to a product reset than a fair trade. The admin question and upload screens, the attempt history filtering, the Paper 3 share card, and readiness all lose their reason to exist, and readiness in particular becomes structurally incapable of producing anything but a performance score. The negative list is long because the deletion is large, and it should be read as a reset, not a trim.
- No timed assessment exists at all. Students cannot test themselves under exam conditions, and the product cannot claim to prepare them for one.
- We lose the practice and mock funnel that likely converted better than notes alone. There is no evidence either way yet, and this is the bet.
- Weak areas depend on a join the spec had to invent. `TopicNote` exists only because `Topic` keyed on `(noteId, name)` would have listed the same topic once per note on the weak areas card. The join is the right fix, but it is a new table and a new read path to get right.
- The migration is irreversible and destroys subscription and payment history. If accounting needs those records, extract them before running it.
- Tip's teaching behaviour is prompt enforced, not code enforced. A sufficiently determined student can probably still talk it into giving an answer.
- Every check in this spec is manual. There is no test suite, so the cascade and isolation guarantees rest on someone running the scenarios by hand.

## Rationale

Reasoning, the options weighed, and the full deletion inventory: see [rationale.md](rationale.md).

## Follow-up

- [ ] Repair the orphan migration row on Neon and the recorded drift before running this spec's migration. This blocks the build and is a prerequisite, not part of it.
- [ ] Rewrite or remove pivot row 6 in `docs/scope/pivot.md`. Its done when describes an exam engine that this spec deletes. Leaving it means the next reader is misled about what is being built.
- [ ] Amend pivot row 5's done when in `docs/scope/pivot.md`. It promises a schema carrying universities, faculties, courses, levels and years. This spec deliberately ships only levels. The row should record that decision so the promise is not read as an oversight.
- [ ] Delete `docs/scope/carried-over.md`'s reference to the GCE half being removed by this decision, or leave it as history. It is one line and reads as a pointer to future work that will not exist.
- [ ] Extract subscription and payment records before running the destructive migration, if accounting needs them. Once it runs they are gone.
- [ ] Configure Vitest so the cascade and isolation guarantees are regression tested rather than manual. Root `AGENTS.md` records three test scripts with no config file and no test file. Until that is fixed, every scenario in this spec is a manual check.
- [ ] Decide whether the Paper 3 share card gets a note product equivalent. It is deleted here with no replacement, and it was a real growth surface.
- [ ] Repoint or remove `/api/admin/reports`, `/api/admin/stats`, `/api/admin/metrics/retention`, `app/(admin)/admin/metrics/page.tsx`, `lib/kpi.ts` and the engagement Inngest functions. All aggregate mock and Paper 3 activity and will return empty or fail. `lib/kpi.ts` also writes a `paper3_exam_completed` `DailyMetric` event that needs renaming or retiring.
- [ ] `lib/ai/AGENTS.md` and `AGENTS.md` both describe a single Gemini model with a ten second timeout. The code routes through OpenRouter with a twelve model chain. Correct both, since this spec's model pinning depends on getting that file right.
- [ ] `prisma/AGENTS.md` records that the seed creates GCE, O Level, Commercial and HND programmes, that there are two parallel mock families, and that `ProcessingStatus` is a general four value enum. All three become false here, and the migration count is off by one.