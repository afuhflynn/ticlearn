# 0005 rationale. Why we strip the platform to notes, quizzes and Tip

This is the decision record. The build spec is [index.md](index.md). This file is for humans and for a future run of `/solution-architect` that updates or supersedes the decision, and it is skipped during a build.

## Context

The product was built for Cameroonian secondary school students: twenty GCE A Level subjects, twenty three O Level programmes, Commercial and TVEE variants, eight HND specialties, blueprints, a question pipeline, mock authoring, a countdown to a hardcoded June 15, and GCE copy in page metadata, navigation, email subjects and share text. The data model is shaped to match: `ExamLevel`, `Program`, `Component` where a component is a paper (`P1`, `P2`) or a year (`Y1`, `Y2`), `Topic` hanging off a component, and enrolment as `ExamProfileProgram`.

That model is not merely mislabelled. It is a different product. `docs/research/audience-and-market.md` records that the target is Cameroonian university students, and that Cameroon universities run internal semester exams with no public archive at all. That last fact is load bearing: the past paper ingest pipeline has no feed. The pipeline, the blueprint weighting, the `ExamSource` year and session archive and the whole public blueprint catalogue exist to import and weight papers that will never arrive. They are not misaligned, they are waiting on data that does not exist.

The forces that shaped the decision:

**No real students to protect.** Spec 0001 is titled "before real students arrive". The same assumption holds here: wiping every account, subscription and payment row costs nothing today and would be expensive in six months. This is the assumption the whole destructive migration rests on, and it is the assumption most likely to be wrong.

**Two parallel mock families that never merged.** `prisma/AGENTS.md` warns that Paper 1 and 2 use `ExamBlueprint`, `BlueprintSection`, `MockAttempt`, `Paper12MockModule` and `Paper12MockModuleItem`, while Paper 3 uses a separate family with confusingly similar names, and that `MockAttempt` and `Paper3MockAttempt` are different tables with different lifecycles. Across 54 source files, 143 route handlers and 62 models, the GCE shape is load bearing in ways a search for the string "GCE" does not find.

**GCE shape is hidden in enum values and string literals.** `ExamSubject` holds twenty GCE codes. `Paper3TaskType` and `Paper3Language` assume Excel, Access, C and Pascal. `lib/paper3/subject-tasks.ts:32` maps programme codes to subjects and treats an empty result as "no restriction", a fail open path. Inngest functions and prompt markdown files reference `"COMPUTER_SCIENCE"` and GCE framing in prose, so deleting an enum does not catch them, which is why AC-2 checks for literals and not for words.

**Eight disagreeing plan limit tables.** `hooks/usePlan.ts:31`, `app/api/usage/route.ts:200`, `app/api/notes/route.ts:86`, `app/api/quizzes/generate/route.ts:72`, `app/api/quizzes/generate/from-weak-areas/route.ts:60`, `lib/ai/tools.ts:486`, and two in `app/api/ai/chat/route.ts` at `:170` and `:205` each hold a plan limits table. They already disagree: the same Paper 3 limit is `-1` in one and `5` in another. They also all key on a synthetic `"FREE"` that is not a value of the `Plan` enum, derived as `status === "ACTIVE" ? plan : "FREE"`, so every one of the eight can get that derivation wrong too.

**The AI tutor is the product.** Once mocks and exams are gone, the value a student gets is that their notes become a quiz and a conversation. So the tutor's quality is not a side concern, it is the whole remaining product. And `docs/research/audience-and-market.md` is blunt about two things that pull against each other: ninety three percent of this audience cheats at university and the AI must read as a tutor and grader, never as an answer machine; and data costs mean the AI allowance has to be budgeted against a one to three thousand XAF monthly ceiling, with AI cost at roughly 130 XAF per month, or 200 with provider fees, against a 2,500 XAF semester pass.

**Production is not clean.** `docs/prisma-migration-repair-without-reset.md` records an orphan `_prisma_migrations` row on Neon for a migration folder that does not exist in the repository, plus recorded drift on `exam_blueprints` and `mock_attempts`. Root `AGENTS.md` records that the Paper 3 `shareId` change was pushed with `db:push` rather than a migration and a manual migration was written afterwards to fix the drift.

The consequence of not deciding: the product continues to sell GCE preparation to university students, the schema keeps two mock families nobody can maintain, and the tutor keeps answering from hardcoded secondary school topic lists.

## Options considered

### Option 1: Delete the secondary school product outright, keep level only

Delete every mock, exam and paper family, every GCE shaped table and enum, and every GCE string. Replace the academic model with one level of study field. Content hangs off notes. Rebuild the tutor as Tip with a teaching persona.

**Pros**:
- Nothing GCE shaped survives, so it cannot drift back.
- The schema is one field and a note rooted tree, small enough to hold in your head.
- The AI gets a real grounding source: the student's own notes, not a hardcoded topic list.
- A fresh clone is trivial to run and there is no content to keep current.

**Cons**:
- Loses the integrity features, which the research argues are worth keeping for exactly this audience.
- Loses any timed assessment, so the product cannot claim to prepare a student for an exam.
- The migration is irreversible and destroys payment history.
- Ready for the first time in this pass, the reset touches more surface than a trim: admin authoring, attempt filtering, the share card and readiness all lose their reason to exist.

### Option 2: Build the full academic catalogue

Institution, Faculty, Course, AcademicTerm, CourseOffering and Topic, with an admin screen to curate every row and students browsing a picker to find their course.

**Pros**:
- Students browse real content and find their exact course.
- Course structure supports selling to a faculty and marketing a university's whole course list later.
- Progress could accumulate across a whole course rather than per note.

**Cons**:
- Cameroon universities publish no catalogue feed, so every row is typed by a human, forever. For two universities with real faculties that is on the order of a hundred offerings before a student sees anything useful.
- Departments get renamed constantly, and stale rows silently mislabel a student's progress.
- Five taps before content, and a student whose course is not listed is stuck, unless we also allow free text, which collapses the whole thing back into Option 1 with a broken dropdown in front of it.
- The one thing it buys that matters, a better aimed AI, is available for one field and one prompt line.

### Option 3: Strip the naming, generalise the exam engine

Delete the GCE strings and the school level enums, repoint the models at level of study, and keep the fullscreen runner, anti cheat rules, tab violation handling and the short answer grader for a later spec to generalise to any course.

**Pros**:
- Keeps the most expensive and most defensible code in the repository.
- Keeps a timed assessment, which is what the product is ultimately for.
- The migration is a rename rather than a destruction.

**Cons**:
- Carries the Paper 3 subject enum forward, which currently holds only ICT and Computer Science, so it stays wrong until the next spec.
- Leaves 27 Paper 3 routes and a 936 line hook to maintain against a model with no content, in the interval between specs.
- Two parallel mock families survive the cut and keep the drift alive.
- Defers the actual decision on whether mocks belong in this product at all.

### Option 4: Keep the tables, empty

Change the copy, leave the schema in place, and delete only what a user can reach.

**Pros**:
- Smallest diff and an easy revert.
- Nothing is destroyed, so the migration risk is low.

**Cons**:
- Leaves both mock families in the schema with nothing using them, which is precisely the drift `prisma/AGENTS.md` warns about.
- Every query against an empty table still needs to work, so the code keeps branches for products that no longer exist.
- Costs a second, larger migration later, and the second one is the risky one.

## Rationale

Option 1 wins on the specific force that dominates this decision: **the product is not mislabelled, it is the wrong product, and it has no data to migrate from.** Option 3's premise is that the exam engine is a valuable asset worth generalising. That premise is undercut by the research finding that there is no public paper archive, because the engine's content pipeline has no feed and the engine was weighted for GCE paper structure. Generalising the runner is real work; feeding it is the harder problem, and it is not solved by renaming anything.

Between Option 1 and Option 2, the deciding force is that **the only academic fact the AI actually needs is how far along the student is.** Option 2 costs perpetual content operations across six tables and a student facing five taps, to deliver an AI hint that one field provides. The engineer rejected Option 2 explicitly after it was laid out, and the rejection was well founded: it is us running their school for them, which nobody asked for. If a university catalogue is ever genuinely wanted, it can be added later as new tables without reshaping the notes first core, which is the property that makes Option 1 a safe foundation rather than a dead end.

Option 4 is rejected because empty tables are not neutral. They are a maintenance surface. Two mock families in a schema with no content is the exact condition the repository's own context file flags as the root of its drift.

The tutor decision follows from the same logic. Once mocks and exams go, Tip is the product, so the spec pins a persona and one testable behaviour (quote the note, ask before answering, refuse a finished answer) rather than leaving "make it intelligent" as a slogan. **Make Tip intelligent** was the request; the honest translation is that intelligence without a grounding source and a cost ceiling is not a requirement, it is a hope. This spec supplies both: the student's own notes as grounding, and the cheap model for chat with the strong model reserved for note processing and quiz work, which matches the measured cost figures.

Two choices cut against good advice, and the engineer made them with the tradeoff stated:

**Wipe inside the migration, with no rollback.** The engineer's first answer was a separate reviewed wipe script, which is the safer shape and preserves the rollback the additive phase otherwise provides. On being shown the two answers conflicted, they chose the migration. The reasoning is that the migration is already the destructive deploy, splitting the destruction across two artifacts adds a step someone will forget, and there are no real users to protect. A cross check pass then sharpened what that actually costs: a failed phase 2 needs a point in time restore **plus** `_prisma_migrations` surgery, on the same database whose drift is already documented. **If the no-real-users assumption ever stops holding, this is the first thing to revisit.**

**Level required at the guard, not in the database.** A NOT NULL column makes sign-up impossible, because `lib/auth.ts:89` inserts a user with no level in hand. The column is nullable and the dashboard and chat guards enforce it. That costs a redirect check on every request instead of a constraint, and it is the right trade: a constraint that makes registration fail is not a constraint, it is an outage.

The premise note this spec could have carried: **a university catalogue is genuinely useful for marketing and for future institutional sales, and we are declining to build it now.** That is a real capability deferred, not a bad idea rejected. It belongs in whichever spec first needs it, and the notes first core does not have to change when it arrives.

## What the cross check changed

An independent read of the first draft found five blockers and fourteen unsettled decisions. The ones that changed the design rather than just its wording:

- **`User.levelOfStudy` cannot be NOT NULL.** It made sign-up impossible. The column is nullable, the guard is the invariant.
- **The wipe left zero admins.** `User.role` is the only admin gate, so AC-14's admin panel was unreachable and nothing could run Inngest or the webhooks. `ADMIN_EMAIL` and a single admin insert now exist, and no new configuration is optional.
- **The additive phase was not additive.** It promised nullable columns then made them not null while the old rows still existed. Every new column is now nullable until the destructive phase.
- **The AI layer description was fiction.** Both drafts of this spec described one Gemini model with a ten second timeout, taken from `AGENTS.md` and `lib/ai/AGENTS.md`. Reality is OpenRouter with a twelve model chain, an `AI_CHAIN_ORDER` override, a 120 second streaming budget and a circuit breaker. `getTaskConfig` throwing on an unknown task turns a forgotten deletion into a startup error, which is good, but it means the four model IDs have to be pinned explicitly rather than inherited.
- **Prompt frontmatter is a second naming site.** All 38 prompt files pin `model:` and `lib/prompts/loader.ts:76` throws `PromptError` on an unknown one, at runtime. Renaming a model without touching the frontmatter breaks the prompt at first load.
- **The migration can be generated, not written.** Generating against an empty database with `migrate dev --create-only` and squashing removes the hand written enum SQL and the `ALTER TYPE` risk entirely. The first draft carried a risk paragraph about enum surgery that no longer applies.
- **Two quiz paths violated AC-8 and neither was in the deletion list.** `generateDefaultQuiz` fires on every sign up from `lib/auth.ts:106` and draws on hardcoded GCE topics, and the chat `createQuiz` tool still permits a topic only quiz. Both are now named.
- **`Topic` keyed on `(noteId, name)` would have listed one topic once per note.** The `Topic` and `TopicNote` split fixes the display while keeping mastery per note.
- **Quiz attempt history already cascaded away today**, so keeping it required changing `QuizAttempt.quizId` to `SetNull` rather than just deciding to keep it.

And the factual corrections, which were the spec inheriting stale `AGENTS.md` figures: 62 models not 59, seven mock routes not eight, thirteen Paper 3 prompt files not eleven, `KpiEvent` and `AiUsageEvent` are models not enums, seven `UNKNOWN` sentinels across five files not six, and the usage meters are lifetime counts of `Quiz` rather than `QuizAttempt`, so the meter and the enforcement point had to be reconciled rather than described as they were.

## Deletion inventory

The evidence behind the model changes, from a read of the tree. Paths are relative to the repo root. `lib/generated/` is gitignored generated output and is excluded.

### Models dropped

`ExamLevel` (`prisma/schema.prisma:129`), `Program` (`:139`), `Component` (`:154`), `ExamSource` (`:244`), `Question` (`:259`), `ExamBlueprint` (`:282`), `BlueprintSection` (`:308`), `MockAttempt` (`:325`), `Paper12MockModule` (`:353`), `Paper12MockModuleItem` (`:370`), `ExamProfileProgram` (`:384`), `ExamProfile` (`:399`), `ExamSession` (`:546`), `UserTopicBaseline` (`:193`), and the whole Paper 3 family: `Paper3Source` (`:1164`), `Paper3Question` (`:1191`), `Paper3Mock` (`:1236`), `Paper3MockModule` (`:1261`), `Paper3MockQuestion` (`:1279`), `Paper3MockAttempt` (`:1292`), `Paper3UserStats` (`:1321`), `Paper3QuestionAttempt` (`:1341`), `Paper3DetailedResult` (`:1364`), `Paper3Attempt` (`:1387`).

`Topic` (`:176`) and `TopicPerformance` (`:209`) are replaced by the `Topic` and `TopicNote` pair plus a repointed `TopicPerformance`.

### Enums dropped

`ExamSubject` (`:911`, twenty GCE codes), `MockCreationContext` (`:906`), `MockSourceMode` (`:899`), `QuestionSource` (`:892`), `QuestionStatus` (`:1485`), `ExamStatus` (`:939`), `MockStatus` (`:1491`), `MockAttemptStatus` (`:1497`), `Paper3Status` (`:1441`), `Paper3Subject` (`:1413`), `Paper3Category`, `Paper3FocusCategory`, `Paper3SkillType`, `Paper3TaskType` (`:1455`), `Paper3Language`, `Paper3Section`, `Paper3PaperType`, `Paper3SourceType`, `ComponentType` (`:432`), `ProcessingStatus` (used only at `:1303`), `ExamMode`, `RevisionGuideFocus` (`:1133`).

### Routes dropped

All 27 under `app/api/paper3/`, all 7 under `app/api/mocks/`, `/api/exam-levels`, `/api/programs`, `/api/exam-sources`, `/api/exams`, `/api/blueprints`, `/api/blueprints/community`, `/api/quizzes/generate/from-weak-areas`, `/api/questions/practice`, `/api/public/gce-blueprints`, `/api/public/p1p2-mock-modules`, `/api/admin/blueprints/*`, `/api/admin/mocks/*`, `/api/admin/questions/*`, `/api/admin/paper3/*`.

### Files and copy

`lib/gce-countdown.ts` (hardcoded June 15, `GCE_EXAM_MONTH = 5` at `:2`), `lib/public-gce-catalog.ts` (fallback string `"GCE subject"` at `:57`), `lib/subject-labels.ts`, `lib/mock-generator.ts` (595 lines, `levelLabel = "Cameroon GCE A-Level"` hardcoded at `:355`), `lib/paper3/subject-tasks.ts:32` (`PROGRAM_CODE_TO_SUBJECT`, the fail open map), `lib/ai/index.ts:592` (`DEFAULT_QUIZ_TOPICS`, consumed by `generateDefaultQuiz`), `components/paper3/TiCExamAssistant.tsx`. Pages: `app/(dashboard)/gce-exams/page.tsx`, `app/(dashboard)/paper3-leaderboard/`, the `practice/mock/**` and `practice/exam/**` families, `components/marketing/gce-countdown-inline.tsx`, `app/(marketing)/about/page.tsx`. SEO: `app/layout.tsx:17`, `app/manifest.ts`, `app/robots.ts`, `components/seo/FAQSchema.tsx`, `components/seo/OrganizationSchema.tsx`. Email: `lib/email/send.ts:250`, `:258`, `:709`. Copy constants: `constants/index.ts:20`, `constants/landing.ts:70`. Navigation: `components/layout/AppSidebar.tsx:59`, `components/layout/AdminSidebar.tsx:123`.

Prompts: 38 files under `prompts/`, thirteen of them `prompts/paper3/*` carrying GCE framing (`preamble.md:13`), plus `chat/chat_system.md:16`, `quiz/quiz_from_topic.md:17`, `quiz/quiz_from_weak_areas.md:53`, `exam/exam_questions.md:16`.

### Scripts dropped

`scripts/seed-blueprints.ts` (GCE only, 136 lines), `scripts/seed-programs.ts` (a duplicate competing source for `prisma/seed.ts`, not wired to any npm script), `scripts/seed-verify-fixture.ts` (hard requires a `GCE_AL` programme at `:56` and a `PAPER` component at `:66`, so it breaks). `prisma/seed.ts` is rewritten to level rows only.

### Things that break rather than go stale

`PROGRAM_CODE_TO_SUBJECT` fails open on empty, so deleting programmes would silently widen access; `app/api/mocks/options/route.ts:43` filters `type: "PAPER"`, which returns empty for a university model; `app/(onboarding)/onboarding/page.tsx:62` switches on `GCE_AL | GCE_OL | GCE_AL_COMMERCIAL | GCE_OL_COMMERCIAL | HND` and falls through to a default that disables selection; `app/api/admin/plan-upgrades/route.ts:54` groups upgrades by `examLevel.name`; `app/api/usage/route.ts:96` counts tables that disappear and `:288` keys the free tier's one exam ever gate off them; `app/api/performance/route.ts:31` uses the `examProfileId_topicId` composite key; `app/api/leaderboard/route.ts:24` filters on `examProfileId: { not: null }` and would return empty forever; `lib/auth.ts:106` triggers the GCE default quiz on every sign up; `lib/ai/tools.ts:404` still permits a note-less `createQuiz`.

Seven `UNKNOWN` sentinels survive across five files, in two syntactic forms: `where: { code: { not: "UNKNOWN" } }` at `app/api/mocks/options/route.ts:40`, `app/api/admin/mocks/p1p2/options/route.ts:20` and `app/api/mocks/generate-custom/route.ts:89`, and `p.code !== "UNKNOWN"` predicates at `app/(onboarding)/onboarding/page.tsx:168` **and** `:440`, `app/(admin)/admin/blueprints/create/page.tsx:82` and `app/(admin)/admin/upload/page.tsx:207`.

### Corrections to `prisma/AGENTS.md`

It records 59 models where the schema has 62, and 68 migrations where the count on disk is 67 dated folders plus `migration_lock.toml`. Its seed description, its two parallel mock families warning and its `ProcessingStatus` description all become false here.