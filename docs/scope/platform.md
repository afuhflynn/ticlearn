# Platform

The engine under every later slice. Thirteen foundations: security, the prompt registry, the model chain, the database, background work, caching, the design system, and email. Plus one cross cutting bar that every slice is measured against: the screens have to work on the phone our students actually own.

(basis: research/audience-and-market.md · research/env-inventory.md · research/performance-and-database.md · research/ui-toolkit.md · research/security.md · research/email-system.md · research/stack-and-storage.md)

## Foundations

### 1. Codebase audit and project conventions
`AGENTS.md` describes a model chain, an OpenAI direct path and a dead model cache that no longer exist in the code. Everything downstream reads those docs and will build on fiction.
**Done when:** `AGENTS.md` matches the code, and root `AGENTS.md` plus nested area docs name the conventions future work must follow.
- [x] Capture the real conventions: `/codebase-audit`

### 2. Security and integrity hardening · needs a decision · GA
Twenty findings must close before real students use this: a payment webhook that grants a subscription when its secret is unset, an admin route with no role check, a knowledge search that reads every user's notes, rate limiting written but never switched on, and an exam endpoint that sends the answer key to the phone before the exam starts.
**Done when:** every launch blocker in `research/security.md` is closed with a test that fails without the fix, the payment webhook fails closed, no route leaks another user's data, and every AI, upload, contact, signup and admin route has a live rate limit.
- [ ] Design it (spec): `/solution-architect security and integrity hardening`

(basis: research/security.md §launch blockers)

### 3. Prompt registry · needs a decision · GA
Every AI prompt is an inline template literal in about ten files. Move them all to editable markdown with front matter, read at runtime, so a prompt change needs no rebuild and lives in git where it can be reviewed.
**Done when:** no prompt string is inline in code, each prompt file carries its model and settings in front matter, an edit to a file changes behaviour on the next request, and the tool descriptions the model sees load from the same place.
- [ ] Design it (spec): `/solution-architect prompt registry`

(basis: research/chat-experience.md §14 and research/web-search-tooling.md §6 both landed on the same front matter shape, so it is designed once and reused)

### 4. AI model chain through OpenRouter · needs a decision · GA
Today every AI task hardcodes one Gemini model and there is no fallback. Route through OpenRouter and build an ordered chain of at least six models across frontier and open weight labs, with a circuit breaker so a dead model is never retried, and a per request deadline.
**Done when:** a forced failure on the head of the chain falls through to the next model within the deadline, a dead model is skipped for a cool down window, schema failures do not trip the breaker, and per student AI cost is measurable in XAF.
- [ ] Design it (spec): `/solution-architect AI model chain`

(basis: research/stack-and-storage.md §3 · three Google and Anthropic models fail together, so the chain must span labs)

### 5. Delete GCE content, repoint the data model · needs a decision · GA
The product is secondary school shaped at every layer: twenty GCE A Level subjects, twenty three O Level programmes, blueprints, a question pipeline, mocks, countdown timers, and GCE copy in metadata, navigation, emails and share text. Cameroon universities run internal semester exams, so the past paper ingest pipeline has no feed and goes with the content.
**Done when:** no GCE, O Level or WAEC content or copy survives anywhere a student or a search engine can see, the schema carries university institutions, faculties, courses and years, the admin question, blueprint and mock authoring is gone, and the data migration runs clean against production without a reset.
- [ ] Design it (spec): `/solution-architect delete GCE content`

### 6. Generalise the exam and grading engine · needs a decision · GA
The fullscreen runner, the anti cheat rules, the short answer grader and the revision guides are the most expensive code in the repo and they work for university essays. Strip the level names and the ICT and Pascal assumptions out of them so they grade any course.
**Done when:** a mock for any course can be authored, sat fullscreen, graded by AI with written feedback and a per question breakdown, and no module, enum or prompt names a level or a programming language.
- [ ] Design it (spec): `/solution-architect generalise the exam and grading engine`

### 7. Design system and UI toolkit convention · needs a decision · GA
The tokens and the rounded radius are a real asset every kit would replace, so keep them. Document a rule: shadcn and AI Elements are the default, components are owned locally and customised, and a new primitive is built only where shadcn genuinely lacks one. Also switch the shadcn base off the slowing Radix fork and record which of the twenty three unused AI Elements come in.
**Done when:** `docs/research/ui-toolkit.md` §7 is turned into a written convention, the shadcn base is current, the custom primitives the rebuild needs exist as owned components, focus rings pass contrast, no screen hand rolls a control that shadcn already ships, and the responsive contract for every breakpoint is written down once rather than invented per screen.
- [ ] Design it (spec): `/solution-architect design system and UI toolkit convention`

(basis: research/ui-toolkit.md · forty six of fifty five UI files have diverged from upstream, which is right for design and fatal for future accessibility fixes, so the convention must say rebase rather than drift)

### 8. URL state convention
`nuqs` is installed, wired, and then ignored: three call sites, all auth, while tabs and pages sit in component state on twelve admin and dashboard screens. Make the URL the single home for anything a student can share or go back to.
**Done when:** tabs, pagination, sort, filters and open modals live in the URL on every screen that has them, back and forward behave, and the shared parser types check without casts.
- [ ] Adopt the convention: `/feature-build URL state convention`

### 9. Environment variables documented
Forty six variables are read across the app. Five are stale, three of them sitting in the live `.env` doing nothing, and one of those is a real OpenAI key worth revoking. Two template files disagree with each other. Consolidate into one well commented `.env.example` with per provider signup instructions.
**Done when:** one template file, every variable the code reads is in it, stale ones are gone, and each entry says what it is for, its format, whether it is safe to publish, and where to get it.
- [ ] Write the template: `/feature-build environment variables documented`

### 10. Database indexes and query rewrites · needs a decision · GA
Leaderboards run a count per view, admin metrics recompute from raw events with up to sixty two queries per request, the exam endpoint returns whole question rows with answers attached, and there are genuine N plus one loops in the stats route.
**Done when:** the exact composite indexes exist for every leaderboard sort key and every lookup path, the exam endpoint returns questions without answers, counts and metrics come from rollups rather than live aggregation, and no request runs an unbounded query or a loop with a query inside it.
- [ ] Design it (spec): `/solution-architect database indexes and query rewrites`

(basis: research/performance-and-database.md §1 · every recommendation carries exact DDL with column order, so this is design plus execution, not judgement)

### 11. Background work moved to Inngest
Slow work sits inside request handlers: quiz submit grades every question with an AI call in the request, upload triggers a blocking one time pass code sign up, and OTP email send blocks sign up and swallows its own errors. Move it all to jobs so a request only enqueues.
**Done when:** no AI call, PDF extraction, email send, or PDF render runs inline in a request handler, every job has a trigger, a retry policy and an idempotency key, and a failing job does not fail the user action that queued it.
- [ ] Design it (spec): `/solution-architect background work moved to Inngest`

### 12. Caching and cold start speed
The chat route makes about ten serial round trips before it starts streaming, then blocks on a title generation call. There is no caching anywhere, and the AI cache is an unbounded in memory map that is per instance on a serverless deploy.
**Done when:** a new chat starts streaming within the agreed budget, the title call no longer blocks the first token, cache hits are shared across instances, and the heaviest routes answer from cache with revalidation.
- [ ] Design it (spec): `/solution-architect caching and cold start speed`

(basis: research/performance-and-database.md §4 and research/chat-experience.md §5 · the budgets are published and cheap to hit, but only if the serial round trips go)

### 13. Email system rebuild · needs a decision · GA
Fifteen templates are inline literals in one thousand lines, the sending domain's SPF allows Google only so nothing else can send, gradients render white on white in Outlook, only three templates escape user content, and the weekly digest is a one shot email because of a uniqueness constraint. Rebuild the whole set on a real template system with the logo inlined, not attached.
**Done when:** SPF, DKIM and DMARC are correct for the new sender, every template escapes its inputs, the logo inlines as a content ID image, each email has a preheader and a plain text alternative, the weekly digest repeats, and no send blocks a request.
- [ ] Design it (spec): `/solution-architect email system rebuild`

(basis: research/email-system.md · Cameroonian law requires prior consent for email prospecting, so the digest becomes opt in rather than a default)

## Cross cutting

### 33. Mobile responsiveness and device quality
Over ninety percent of our students have no laptop. Most of what we build is read on a two gigabyte Android phone, on a congested mobile network, often on a phone shared with someone else. This is a standing bar rather than a slice: every feature from 14 to 32 is measured against it.
**Done when:** every screen works from a 360 pixel wide phone up to a desktop, no control is smaller than a comfortable thumb target, nothing important needs hover, the layout survives a long unbroken name or a pasted paragraph, text stays readable when the phone is at its largest font setting, safe areas are respected on notched devices, and no page ships a bundle heavy enough to cost the student real money to load.
- [ ] Design it (spec): `/solution-architect mobile responsiveness and device quality`

(basis: research/design-reference.md and research/audience-and-market.md · the design target is a 2 GB RAM 32 GB Android device, and a shimmer that repaints continuously is itself a data cost on that device)
