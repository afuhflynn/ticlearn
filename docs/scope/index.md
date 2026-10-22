# Scope: TiCLearn for Cameroonian university students

An AI study assistant for Cameroonian university and higher national diploma students, starting with the two English speaking state universities, Buea and Bamenda. Phone first, light on data, paid for by semester pass rather than by month.

**Build approach:** Tracer Bullet (each slice is built through every layer and works before the next one starts).
**Workflow:** Beta (after `/feature-build`, `/verify-release` then `/test-engineer`). The project default level of rigor. `/solution-architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/feature-build` and skip `/solution-architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| A | Accounts and sessions | Carried over | existing |
| B | AI tutor engine | Carried over | existing |
| C | Note upload and text extraction | Carried over | existing |
| D | Quiz engine | Carried over | existing |
| E | Admin console | Carried over | existing |
| F | Leaderboard and community | Carried over | existing |
| G | Mobile money payments | Carried over | existing |
| 1 | Codebase audit and project conventions | Foundation | planned |
| 2 | Security and integrity hardening | Foundation | in-progress |
| 3 | Prompt registry | Foundation | done |
| 4 | AI model chain through OpenRouter | Foundation | in-progress |
| 5 | Delete GCE content, repoint the data model | Foundation | in-progress |
| 6 | Delete the exam and grading engine | Foundation | done |
| 7 | Design system and UI toolkit convention | Foundation | in-progress |
| 8 | URL state convention | Foundation | in-progress |
| 9 | Environment variables documented | Foundation | planned |
| 10 | Database indexes and query rewrites | Foundation | in-progress |
| 11 | Background work moved to Inngest | Foundation | planned |
| 12 | Caching and cold start speed | Foundation | in-progress |
| 13 | Email system rebuild | Foundation | in-progress |
| 41 | Data route caching with revalidation | Foundation | planned |
| 34 | Rendering strategy and streaming boundaries | Foundation | in-progress |
| 35 | Loading states and perceived speed | Foundation | in-progress |
| 42 | Slow screen telemetry | Foundation | planned |
| 14 | Landing page rebuild | Slice 1 | done |
| 15 | Public page set | Slice 1 | done |
| 16 | Onboarding | Slice 1 | done |
| 17 | Pricing page | Slice 1 | done |
| 36 | Technical SEO foundation | Slice 1 | planned |
| 37 | Public course and faculty catalogue | Slice 1 | planned |
| 38 | Public guides and study content | Slice 1 | planned |
| 39 | GEO and AI answer readiness | Slice 1 | planned |
| 40 | Metadata and sharing cards | Slice 1 | planned |
| 18 | Chat interface rebuild | Slice 2 | in-progress |
| 19 | Web search tooling | Slice 2 | needs a decision |
| 20 | Tool controls and course skills | Slice 2 | planned |
| 21 | Note upload experience | Slice 3 | planned |
| 22 | Storage move to Neon object storage | Slice 3 | planned |
| 23 | Quiz generation flow | Slice 3 | planned |
| 24 | Upload limits and usage tracking | Slice 3 | planned |
| 25 | Offline packs and low data mode | Slice 3 | planned |
| 26 | Timed exam runner | Slice 4 | dropped |
| 27 | Grading feedback and result review | Slice 4 | dropped |
| 28 | Semester pass plans and limits | Slice 5 | planned |
| 29 | Mobile money payments for the pass | Slice 5 | planned |
| 30 | Free tier conversion surfaces | Slice 5 | planned |
| 31 | Campus ambassadors | Slice 5 | planned |
| 32 | Conversion analytics | Slice 5 | planned |
| 33 | Mobile responsiveness and device quality | Cross cutting | planned |

## Epics

Each epic is one file with its own feature sections.

- **[Platform](platform.md)** · 17 features, Foundations · the engine under every later slice: security, prompts, the model chain, the database, caching, the design system, email, and how every route renders. Plus one cross cutting bar: every screen has to work on a two gigabyte Android phone.
- **[Carried over](carried-over.md)** · 7 features · what already exists in the codebase, enrolled for context only.
- **[Pivot](pivot.md)** · 2 features, Foundations · removing the secondary school product outright, mocks, exams and papers included.
- **[Market](market.md)** · 9 features, Slice 1 · the landing page, the public pages, onboarding and pricing. What a stranger sees and what a new student does in the first two minutes. Plus the search surface: the public course catalogue, the technical SEO foundation, public guides, and readiness for AI answer engines.
- **[Tutor](tutor.md)** · 3 features, Slice 2 · the chat interface, the web search tool and the controls students get over it.
- **[Content](content.md)** · 5 features, Slice 3 · notes, storage, uploads, quiz generation, limits and offline.
- **[Exam](exam.md)** · 2 features, Slice 4, dropped · the timed runner and the graded result review, cancelled with the exam engine.
- **[Commerce](commerce.md)** · 5 features, Slice 5 · the semester pass, payments, the free tier, ambassadors and conversion analytics.

## Phasing in one line each

- **Foundations** · nothing that ships to a student until the holes are closed and the ground is set. Security first, because twenty findings would let someone take money, read another student's notes, or see an answer key before an exam. Rendering last in the foundations, because every route needs a decision about how it paints and today two layouts block the whole page on a database call.
- **Slice 1, first ten minutes** · a stranger lands, understands, signs up, and knows what the product is for, without uploading anything. And finds us on a search result, and gets a useful answer from an AI assistant.
- **Slice 2, the tutor** · the chat works at the speed a student expects, with thinking and tool use disclosed the way ChatGPT does it, and web search behind a toggle.
- **Slice 3, notes and quizzes** · the student uploads their own notes and turns them into practice. This is the killer loop the product is built around.
- **Slice 4, exams** · dropped. Timed practice with AI grading is not coming; study is notes, quizzes and the tutor.
- **Slice 5, money** · the semester pass, mobile money, and a free tier designed to convert.

## Deferred

Out of scope for the current build pass, kept so the plan stays honest. Each is a real need from the research, not a rejection.

- **French localisation** · the audience is two separate systems, English and French. Research says a francophone student who hits an English only pricing page leaves. English first, French when the francophone launch is close. needs a decision
- **Phone number sign up with a code by text** · deferred by choice for now. Documented in the env inventory as the vars to add later. needs a decision
- **SMS and USSD fallback** · the documented answer to multi day network outages, and the reason one Cameroonian product exists. Not day one work. needs a decision
- **Institution sponsorship** · selling seats to a faculty or student union. The research says this is how the students who can never pay get covered, and it is a bigger revenue line than individual sales. needs a decision · GA
- **Community and affiliate pages** · exist today and were carried over. Both are built around secondary school content and need rethinking or removal alongside the pivot. needs a decision
- **Price sensitivity survey** · the research found no Cameroonian student willingness to pay study. A short survey in the first weeks of the launch would replace every inferred price with a real one. no
- **A Redis or Upstash cache backend** · deferred by choice for now, until the shared table has produced a real hit rate. The trigger is already decided in spec 0010: move when the p95 cache read crosses 30 ms, when hit volume passes roughly a million reads a month, or when we want Redis for a second job such as rate limiting or presence. The store sits behind `lib/cache/`, so the swap is one file and a dependency. no

## Research

Ten research documents sit in [`docs/research/`](../research/README.md). They hold the evidence behind the recommendations here and behind each feature. Read the one that covers your feature before designing it.

## Legend

**The decision box.** Every feature carries exactly one, the sub-task whose label ends with `(spec)`. Its wording varies, so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/solution-architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope-plan` | one box: `Design it (spec): /solution-architect <feature>` |
| `in-progress` (designed) | `/solution-architect` at spec capture | `Design it` ticked; spec linked; `Build it: /feature-build <feature>` + 2 to 5 milestones; the tier's closing boxes |
| `in-progress` (building) | `/feature-build` | milestone sub-boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/verify-release` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | you, when you decide it is; `/state-sync` reconciles | boxes you ran ticked, skipped ones marked skipped; the tier's last stage is the suggested point to call it done |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/solution-architect` first; otherwise straight to `/feature-build`.
- **Atomic build tasks live in the spec's `## Build plan`, not here**.
- **Status** `planned` to `in-progress` to `done`, plus `existing` (pre workflow), `in-progress` for partial, and `dropped` (de scoped, kept for history).
- **Workflow tier tag** beside a heading (e.g. `· GA`) sets that one feature's rigor above or below the project default.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/solution-architect`, the code path by `/feature-build`.
