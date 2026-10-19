# Review, feature/email-system-rebuild working tree, 2026-10-19

**Reviewed by**: GLM (glm-5.3-flash-free), fresh eyes (author model: unknown)
**Feature reviewed**: "Rendering strategy and streaming boundaries" (spec 0012)
**Scope**: ~54 files, uncommitted working tree only (`git diff HEAD` + untracked files). The branch's committed email-rebuild and AI-chain work is out of scope; the working-tree edits to `tests/lib/ai/*`, `tests/lib/email/*` and `tests/app/api/*` were skipped as belonging to that work.
**Verdict**: Changes requested

## Summary

Spec 0012 lands as designed at its core: the four signed-in layouts are now genuine shells, the onboarding and admin gates live only in `proxy.ts` behind a bounded, fail-open read, the three public pages are server components with named client islands, `lib/metadata.ts` centralises noindex, and the Prisma pool is explicitly bounded with the values the spec's measurements call for. The gate logic, the exemption set and the ordering (level gate before the `/` → `/chat` redirect) are correct and genuinely well tested — the browser checks I ran confirm the gate's behaviour matches the spec. Two user-facing defects keep this from a clean approve: the FAQ accordion can no longer collapse anything, and the pricing cards ship half-finished copy ("per/month" concatenation, a meaningless "Semester · /month" row) that no test asserts against. Both are cheap fixes; neither is a blocker to the rendering strategy itself.

## Major

### 🟠 The FAQ accordion can never collapse, `components/marketing/faq-accordion.tsx:29`

**Problem**: `AccordionContent forceMount` keeps every answer mounted, and Radix's collapsible content computes `isOpen = context.open || isPresent`, which is always true when `forceMount` is passed — so `hidden: !isOpen` is never set and the children are always rendered. Radix's own docs for `forceMount` say you must hide closed content yourself via `data-state`; the shadcn wrapper (`components/ui/accordion.tsx:63-84`) carries no such CSS, and neither does this island. Verified against the running production build on port 3000: every answer starts expanded (each closed item 50 px tall) while its trigger reports `aria-expanded="false"`, and after clicking a trigger twice the item is `data-state="closed"` and still 50 px tall. Clicking is a visual no-op.

**Why it matters**: This contradicts the spec's own per-route table row for `/faq` ("Radix renders each closed answer with `hidden` and `data-state=\"closed\"`") and the island's doc comment ("the accordion still behaves the way a student expects"). Compared to the pre-change accordion, all 18 answers are now permanently expanded on a public page, and `aria-expanded=false` against visible content is an accessibility mismatch. The 18 long answers now dominate the page above the "Still have questions?" block, which is the opposite of what the spec's "indexable but well-formed" intent describes.

**Suggested fix**: Keep the answers in the first HTML, but hide closed ones explicitly — e.g. add a `data-closed:hidden` (or `data-[state=closed]:*[display:none]*` equivalent) class to the `AccordionContent` usage in this island, giving crawlers the source text while keeping the collapse behaviour the old page had. Then add one test that asserts a *closed* answer is not visible (`aria-hidden`/height), not only that `aria-expanded` flips — the current unit and e2e tests both pass against the broken component.

### 🟠 Pricing cards ship half-finished copy, `components/marketing/pricing-plans.tsx:102-111`

**Problem**: Compared with the lifted inline markup, the island grew two pieces of text that read like remnants of an abandoned experiment: the price line now renders `per{plan.period}` — literally "per/month", and on the Free plan where `period` is `undefined`, an orphan "per" — and a new row renders `<span>Semester</span> · <span>{plan.period || "/month"}</span>`, i.e. "Semester · /month", on *both* cards, including FREE, which has no period and no semester anything. Confirmed in the built HTML (`.next/server/app/pricing.html`) and on the live page (rendered text: "0 per/month FCFA" / "3,500 per/month FCFA", plus the Semester rows).

**Why it matters**: This is the page where students pay. "per/month" and "Semester · /month" (implying monthly billing under the free tier) are wrong or meaningless billing copy served to every visitor from the static HTML, and the title mandated by AC-9 promises "Semester Pass Plans" while `constants/plans.ts` has no semester plan — so the copy is at best unfinished, at worst misleading.

**Suggested fix**: Delete the stray "per" prefix and the Semester row, or, if a semester-pass row is genuinely the next change, finish it behind its own spec with a real price and a real period. Add the rendered strings to the pricing island's test so a stray fragment like this fails the suite rather than the public page.

## Minor

### 🟡 404 links go invisible on hover in the light theme, `app/not-found.tsx:43,53`

The new phone and WhatsApp links use `text-primary hover:text-primary-foreground`. In the light theme `--primary-foreground` is pure white (`app/globals.css:15`, `oklch(1 0 0)`), so hovering the purple phone/WhatsApp link on the light 404 background turns it white — invisible exactly while the student is reaching for it. The semantic pair is only valid on a `bg-primary` surface. Use `hover:underline` or `hover:text-primary/80`.

### 🟡 Pool comment misdescribes the code it sits on, `lib/prisma.ts:12-17`

The comment says the proxy holds "a second client and a second pool" and "`max: 5` caps each pool at 10 connections per instance" — both wrong against the spec's own measured reality (three pools per instance because the adapter is built at module scope, ceiling 15) and internally contradictory on its face ("max: 5 … 10 per instance"). AC-15's values are correct and measured; only the comment is stale, and the spec's Follow-up already routes it to `/fault-fix`. It is reported here because it ships in the same change and misleads the next reader of the exact file AC-15 leans on. Fix before merge since it is two lines.

### 🟡 The AC-14 regression net misses data-helper imports, `tests/app/rendering-contracts.test.ts:141-144`

The grep bans `prisma.` and `@/lib/prisma` in authed page files, but the one sanctioned exception imports `@/lib/dashboard-data` — so a future authed page importing the same helper (whose functions all run Prisma) would read per-user rows on the server and prerender them into a cached document without tripping the test. The tree is clean today: only `app/(dashboard)/dashboard/page.tsx` touches the session or a data helper. Extend the test to also ban the known server data helpers (`@/lib/dashboard-data`, and any future ones) in authed pages, so the rule matches the reality of how per-user reads reach a page.

### 🟡 Out-of-scope landing copy and claims ride in the rendering change, `app/(marketing)/page.tsx:19-48`

The homepage's ready-when-you-are copy became "Buea and Bamenda universities" + a stats strip: "2,500+ university students", "+237 222 12 34 56", "150 MB download · ~400 CFA", and two Mobile Money logos. The phone number is consistent with the existing contact page, but the student count and the data-cost figures are unverifiable in code and have no data source behind them; spec 0012's Summary says "Nothing else changes", so content like this belongs to row 14 (landing page rebuild), not to a rendering-strategy slice. Also note the strip is a single unwrapped row on every breakpoint (`flex items-center gap-4`), which on a 360 px phone wraps into a cramped three-cell column at best — check it against the design system's mobile-first rule, or give it a wrap/grid. If the numbers are real, name their source in the commit; if not, move the copy to row 14's work.

### 🟡 The feature's own files fail the repo's lint gate, `app/(marketing)/page.tsx:1,65,70` and `app/not-found.tsx:1`

Biome reports new `assist/source/organizeImports` errors on both files and `lint/performance/noImgElement` on the two Mobile Money `<img>` tags (lines 65 and 70). AGENTS.md requires `pnpm lint` to pass before committing. Run `pnpm format`, and either use `next/image` for the logos or suppress the rule deliberately.

### 🟡 The spec's enforcement step has not landed

The Follow-up's first item — record the rendering rule (carrying AC-14) in root `AGENTS.md` — is unticked, and the current root AGENTS.md carries no rendering rule. That means the convention this whole spec hangs on (shells read nothing; a page under an authed group reads no per-user data) is still only review-enforced, which is exactly the decay the spec predicts. Not a code defect, but it is the debt this merge is about to make easier to create.

## Nits

- ⚪ `proxy.ts:110-115`, `readWithin` never clears its timer, so every gated request leaves a 500 ms pending `setTimeout` behind (plus the losing query running to `statement_timeout`). Harmless on a server; a `clearTimeout` in a `finally` would be tidy.
- ⚪ `components/chat/chat-message-list.tsx.bak` — stray untracked backup file in the tree; delete it, never commit it.
- ⚪ `components/marketing/pricing-plans.tsx:106` uses `ml-2` while the surrounding new code uses `ms-2`.
- ⚪ `app/primitive-gallery/page.tsx` — the island's `useSearchParams` with no Suspense boundary bails the body to client rendering, so "Primitive gallery" is absent from the prerendered HTML. Dev-only page and the pattern predates this change, so no regression, but a `<Suspense>` wrapper would make the "static page + island" story true for it as well.

## Strengths

- `tests/proxy.test.ts` is genuinely behavioural coverage of the hardest part of this change: the gate's ordering (`/` sends a levelless student to `/onboarding`, not `/chat`), both fail-open paths (rejection and the 500 ms timeout, the latter with fake timers), the exemption set including API paths with the assertion that no query ran, and the absolute-URL admin redirect with the accept-invite exemption keyed on the full origin. It tests what the guard does, not how it is written.
- The consolidation is real, not cosmetic: the four layouts are byte-clean shells (verified by fast, well-commented source grep tests plus component-level tests that load the real layouts), the exemption set is declared once and prefix-matched in one function, and the admin role check is the only one in the app. The "two competing patterns" drift this repo fears did not happen here.
- The pool work is exemplary: every value in `lib/prisma.ts` is justified by a recorded measurement, `tests/lib/prisma.test.ts` unmocks the shared `@/lib/prisma` mock in exactly the one file that needs the real adapter, and the spec documents honestly what the values do and do not prove (including the unattributed `idleTimeoutMillis` probe that is still open).
- The unit tests for the three islands assert user-facing flows (the subscribe redirect when signed out, the checkout navigation when signed in, the contact payload shape) through network stubs rather than mirroring implementation.

## Test coverage

- Covered: the onboarding gate (ordering, exemptions, fail open ×2, fresh-read semantics), the admin gate, the signed-out path, the API rate limit, the pool bounds, the noindex helper, the metadata strings byte-for-byte against the spec's table, FAQ list completeness against the page description, plan-list invariants, the route table against the build manifest, layout-shell contracts, island flows (unit + e2e with network stubs and a hydration helper that fixes the pre-hydration click race properly).
- Gaps: the FAQ collapse behaviour is asserted only as `aria-expanded` and "answer visible", both of which pass against the broken component — a closed answer being visually expanded would never fail any test in the suite. The pricing copy defect ("per/month", "Semester · /month") is likewise unasserted. The route-table test stands down when `.next/app-path-routes-manifest.json` is absent (documented in the file), so a CI run without a build would green-light AC-1 silently.
- Note: `pnpm exec vitest run` of the feature's 10 test files passes (107 tests); the full-suite run was not executed because much of it belongs to the out-of-scope email/AI-chain work.
