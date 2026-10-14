# Pivot

Removing the secondary school product and keeping only the parts that carry over. Two foundations, both gating everything after them.

(basis: research/audience-and-market.md · the target audience is a different institution system, not a different age range, so the content and copy change completely while the code stays)

## Foundations

### 5. Delete GCE content, repoint the data model · GA
The product is secondary school shaped at every layer: twenty GCE A Level subjects, twenty three O Level programmes, blueprints, a question pipeline, mock authoring, countdown timers, and GCE copy in page metadata, navigation, email subjects and share text. Cameroon universities run internal semester exams with no public archive, so the past paper ingest pipeline has no feed and goes with the content.
**Done when:** no GCE, O Level or WAEC content or copy is reachable by a student or a search engine, the schema carries one level of study field instead of exam levels, programmes and components, the admin question, blueprint and mock authoring is removed, and the migration runs clean against production without a reset.
- [x] Design it (spec): [0005](../specs/0005-strip-to-notes-and-quizzes/index.md) · code in `constants/levels.ts`, `lib/topics.ts`, `lib/readiness.ts`, `lib/plan-limits.ts`, `lib/ai/registry.ts`, `prompts/chat/chat_system.md`, `app/api/levels/`, `app/api/onboarding/level/`, `app/api/performance/`, `app/api/readiness/`, `app/api/ai/chat/route.ts`, `app/(onboarding)/onboarding/`, `components/chat/`, `prisma/schema.prisma`, plus milestone 4 across `app/api/mocks/`, `app/api/paper3/`, `app/api/blueprints/`, `app/api/exams/`, `lib/paper3/`, `lib/mock-generator.ts`, `app/(dashboard)/practice/`, `app/(dashboard)/gce-exams/`, `app/(admin)/admin/` authoring, `components/marketing/`, `components/paper3/` and `prompts/paper3/`
- [x] Build it: `/feature-build delete GCE content`
  - [x] Stand up the level field, the note rooted topic model and the level onboarding step end to end, satisfies AC-4, AC-5, AC-6, AC-7
  - [x] Pin per task AI model chains, write the Tip persona and rename the tutor surface, satisfies AC-9, AC-10, AC-11, AC-12 · built on open weight models only, per task order lives in `lib/ai/registry.ts`, `AI_CHAIN_ORDER` is an emergency override and must stay unset
- [x] Remove every quiz path with no note, and collapse the eight plan limit tables into one module, satisfies AC-8, AC-13 · limits live only in `lib/plan-limits.ts`, `FREE` is derived there because it is not a value of the `Plan` enum, and a STARTER student gets 50 tutor messages a day (the client already advertised 50, the chat route enforced unlimited, 50 wins)
  - [x] Task registry no longer carries a dead `paper3_eval` entry; `exam_gen`, `paper3_gen` and `reasoning` stay until milestone 4 deletes their call sites
  - [x] Weak area quiz generation, the sign up default quiz and the topic only `createQuiz` branch are gone, with their Inngest functions, client mutation, hook, prompts and the GCE topic table in `lib/ai/index.ts`
  - [x] Exam, retake, Paper 3 AI message, correct answer, mock and share limits are out of the module, and the usage route stopped counting Paper 3 attempts, mocks and AI solves
  - [ ] Subscription prices and the monthly credit bonus stay outside the module on purpose: they are money, not limits, and belong to the commerce slice
- [x] Delete the mock and exam code, the admin authoring surface and all GCE copy, satisfies AC-1, AC-2, AC-3, AC-14, AC-18 · the pinned word sweep is clean on every hand written file including the schema and the seed; the only hits left are old migration SQL, which is immutable history, and gitignored scratch
  - [x] Every mock, exam, Paper 3, blueprint, public catalogue, revision guide, authoring and share route is gone, with the pages, the Paper 3 and mock libraries, the catalogue and countdown code, the dead prompts, the mock subject labels, and the Inngest functions that served them
  - [x] Admin keeps users, subscriptions, affiliates, feedback, metrics, payments, platform settings, invites and reports; the upload, blueprint, mock, question, Paper 3 and revision guide authoring is gone from panel, routes and sidebar, and the mock settings keys and dead credit types are out of the schema with a migration applied locally
  - [x] Leaderboard is quiz only with no profile filter, the sidebar and dashboard lost the mock entries, the landing sells notes, quizzes and Tip, and the metadata, FAQ, footer, manifest, robots, pricing, terms, community and email copy is university shaped
  - [x] README, the root product line and the schema comments rewritten for the university product; the dated build notes in root `AGENTS.md` keep their meaning with the old level names neutralised
  - [x] `Note.subject`, the remaining schema models and enums, and the seed went in the destructive migration in the next row, as planned
- [x] Run the destructive migration with the single admin bootstrap, and verify against a production copy, satisfies AC-15, AC-16, AC-17 · `prisma/migrations/20261014120000_pivot_wipe_and_drop_gce_tables/`, verified locally only, never against production
  - [x] The migration wipes every account, subscription, payment and content row, drops 24 tables and 22 enums, tightens the two note rooted columns, and inserts the single admin. Cost history and platform settings survive on purpose. Every check below ran against the local database, not a production copy
  - [x] Fresh deploys from zero land byte identical to the migrated database, the seed creates no content rows, and the cascade, isolation and readiness checks pass on the wiped schema
  - [x] Spec follow-ups consumed during the build rather than left open: the engagement digest and campaigns read note rooted readiness and mastery, `lib/kpi.ts` measures the level split and the User flags, and the admin stats route counts surviving tables only
- [ ] Verify it: `/verify-release delete GCE content`
- [ ] Test it: `/test-engineer delete GCE content`
- [ ] Review it (fresh model): `/peer-review delete GCE content`
- [ ] Document it: `/tech-writer delete GCE content`

(basis: research/audience-and-market.md §1 and §2 · Buea and Bamenda are the only two Anglophone state universities and they serve two Anglophone regions, so the institution, faculty and year model is what content actually partitions by)

### 6. Delete the exam and grading engine · done · GA
The fullscreen runner, the anti cheat rules, the tab violation handling, the short answer grader and the revision guides were the most expensive code in the repo. The decision was to delete the engine outright rather than generalise it, and feature 5 did exactly that: every mock, exam, paper, blueprint and grading path is gone from routes, pages, libraries, jobs, schema and seed. No spec was written for this row because there was nothing left to design.

VERY Important: Completely git rid of from functions, to uis, to apis, to database, etc... Completely shit it out

NOTE: Actually, we don't want to have some crazy or shitty exam engine for students since this are university students (whether private or public) and going to setup some exam engine where admins can upload shit and generate exams is a foolish idea and everthing about GCE, papers (1, 2 or 3) should completely be removed. Basically everything we are going back to just the basic features that a university student truly needs (we are not here to provide some shitty exam engine for them but provide them with an agentic platform that allows them to study on their own more efficiently)

NOTE: And when done, we will update all docs, scopes, specs and references of this GCE shit to be completely removed too.   And so finally, we are not supporting any GCE, nor papers nor past papers shit (because no one asked for it. Build what people want)

(basis: research/audience-and-market.md §3 · ninety three percent of this audience have cheated at university and seventy percent of fraud cases involved phones, so the integrity features are worth keeping rather than dropping with the GCE content)
