# 0004. Design system and UI toolkit convention

**Date**: 2026-10-12
**Status**: Proposed

## Summary

Every screen in TiCLearn is built from one owned set of components, and there is a written rule plus an automated check that stops it drifting. We move the shadcn base from Radix to Base UI (the accessible primitives library shadcn now defaults to) because the Radix fork is slowing down, while keeping your violet tinted buttons, your 1.4rem corner radius and your custom shadow scale. We prune the 23 AI Elements nobody imports, build the 6 primitives you are missing, and add a CI check plus an accessibility audit. Everything is captured once in `docs/design-system.md` so nobody invents the pattern again per screen.

## Requirements

**User stories**:

1. As a student, I want every screen to feel like the same product so that I can focus on studying rather than relearning the interface.
2. As a student on a cheap Android phone, I want tap targets, focus rings and text that actually work so that the app is usable on my device.
3. As an engineer, I want the rule and the check to exist so that I do not have to guess which component to reach for.
4. As an engineer, I want shadcn accessibility fixes to reach our components so that I inherit upstream repairs instead of hand applying them.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: `docs/design-system.md` exists and states the component ownership rule, the token rule, the responsive contract for every breakpoint, the accessibility floor, and the boundary rules, and root `AGENTS.md` carries a short must follow summary plus a pointer to it.
- **AC-2**: The 33 Radix backed files in `components/ui/` are Base UI backed at the end, including a rebuilt `sidebar.tsx` and `command.tsx` taken from the current shadcn registry and re-skinned to our tokens. The 11 files that import `sidebar.tsx` or `command.tsx` (8 and 3 respectively, including the navigation shell of every layout and the `PromptInput` composer) compile unchanged against the rebuilt versions, with no edit to the importing files. `components.json` `style` is the Base UI style, so a future `shadcn add` cannot regenerate Radix files.
- **AC-3**: Our visual design survives the base switch. The violet tinted button variants, `--radius: 1.4rem`, `--font-sans` Plus Jakarta Sans, the `--shadow-*` scale and `--tracking-normal` are all still in `app/globals.css` after the switch.
- **AC-4**: `docs/design-system-inventory.md` holds a fenced `json` block, parsed by `pnpm ui:check`, with one object per file in `components/ui/` carrying exactly the keys `file`, `base`, `registryVersion`, `lastRebase`, `exception`. Every file in the directory has an entry and no entry names a file that does not exist.
- **AC-5**: A gallery page at `app/(dev)/primitive-gallery/page.tsx` renders every primitive in `components/ui/`, is reachable without authentication and without a database, and accepts `?theme=light` or `?theme=dark`, forcing the theme by toggling the `dark` class on `<html>` (via the installed `next-themes`, or a direct class toggle, whichever `next-themes` supports for a forced value). Every primitive renders in both themes without a console error.
- **AC-6**: `pnpm ui:check` runs `scripts/check-ui-conventions.mjs` in CI and fails on a new violation, while a baselined legacy file only warns. The script prints a per rule total for each of the four rules. Its test lives at `tests/scripts/check-ui-conventions.test.ts`, following the `scripts/check-prompts.mjs` precedent. Baselines live in `scripts/ui-conventions-baseline.json`, keyed by rule then sorted file path, and a renamed or deleted baselined file warns rather than fails.
- **AC-7**: The four rules are implemented with these exact patterns, so the baseline is reproducible and the counts are not a matter of interpretation:
  1. `palette-colour`: a Tailwind colour utility outside `components/ui/`, matched as `\b(bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|divide|accent|caret|shadow)-(white|black|(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})\b`.
  2. `dark-colour-utility`: a `dark:` prefix on any colour utility that has a semantic token, so `dark:bg-white` and `dark:text-slate-500` fail while `dark:opacity-50` and `dark:ring-ring/50` do not.
  3. `raw-aria`: a `role=` or `aria-*` attribute written outside `components/ui/` and `components/ai-elements/`, where semantics are meant to be implemented rather than consumed.
  4. `hand-rolled-control`: a `<button`, `<input`, `<select` or `<textarea` element outside `components/ui/`.
- **AC-8**: All 15 primitives using `focus-visible:ring-ring/50` use full opacity `ring-ring` instead, and the gallery test asserts a non zero `box-shadow` on the `:focus-visible` state of every focusable primitive. (axe has no focus indicator rule, so this is asserted directly rather than through the axe scan.)
- **AC-9**: Six new owned primitives exist, each named here with its consumer and its prop surface:
  1. `components/ui/date-picker.tsx`, built on `Popover` + the retained `Calendar`. Props: `value: Date | null`, `onChange: (d: Date | null) => void`, `placeholder?: string`. Consumer: the first admin or settings screen needing a date filter.
  2. `components/ui/data-table.tsx`, built on `@tanstack/react-table` + our `Table`. Props: `columns`, `rows`, `caption: string` (required, rendered `sr-only`), optional `onRowClick`. Ships an `aria-live="polite"` row range region, `aria-sort` on sortable headers, and an `aria-label` on per row checkboxes. Consumers: every admin list screen.
  3. `components/ui/attachment.tsx`, adopted from shadcn rather than built. Used outside chat (settings, admin upload). Consumer: `app/(dashboard)/upload/page.tsx`.
  4. `components/ui/questionnaire.tsx`, adopted from shadcn rather than built. Consumer: `app/(onboarding)/onboarding/page.tsx`, replacing the hand built 5 step wizard with its own slide transitions.
  5. `components/markdown.tsx`, the one assistant output renderer (Streamdown plus `@streamdown/math` plus `normalizeMathNotation` plus shiki). Props: `children: string`. Consumers: all four current hand wired sites (`components/paper3/Paper3ContentRenderer.tsx`, `components/ai-elements/message.tsx`, `app/(dashboard)/attempts/[id]/page.tsx`, `app/(dashboard)/quizzes/[id]/page.tsx`) plus the exam pages. It lives in `components/` not `components/ui/` because it is a composition over Streamdown, not a primitive.
  6. `components/ui/file-drop.tsx`. Props: `accept?: string`, `multiple?: boolean`, `onFiles: (files: File[]) => void`. Consumer: `app/(dashboard)/upload/page.tsx` and the admin paper3 upload screen. Not in chat, where `PromptInput` handles attachments.
- **AC-10**: The 23 unused AI Elements are deleted and the 9 in use stay. The re add is reproducible: the 9 elements are fetched from the registry and committed in one commit with no SDK change, each file's sha256 recorded in that commit message. Only then, in the following commit, `ai` is bumped to the exact version pinned in the spec's Configuration section, and `pnpm typecheck` passes. No commit mixes a registry fetch with an SDK bump.
- **AC-11**: The `--spacing: 0.27rem` declaration is deleted from `:root` in `app/globals.css` (not set to `0.25rem`; the declaration sits outside `@theme inline` and is what silently rescales every unprefixed spacing unit, so removing it restores the Tailwind default). A committed before and after screenshot set of the shared surfaces and the gallery in both themes is reviewed, and any layout that reads wrong is fixed in the same slice.
- **AC-12**: `components/referral-processor.tsx` uses `Sheet` below `sm` and `Dialog` at `sm` and up instead of its hand rolled `fixed inset-0` overlay. The six other files that use `absolute inset-0` inside a container (sign in, sign up, onboarding, upload, public result, admin paper3 upload) are **not** in scope: they are contained panels, not viewport overlays, and are addressed by the onboarding wizard conversion in AC-9.
- **AC-13**: The CI prerequisites exist for the axe scan: a `playwright.config.*` at the repo root, an `e2e/` directory, a `pnpm build` step and a `playwright install chromium` step in `.github/workflows/ci.yml`, and `@axe-core/playwright` as a dev dependency. The axe scan runs over the gallery in both themes and passes with zero serious or critical findings.

## Decision

**Chosen option**: Option 1: Document, enforce going forward, and clean the layers that are already drifting.

shadcn/ui stays the only primitive layer and AI Elements stays the only AI surface layer, both owned locally in this repo and customised in place. The 33 Radix backed primitives move to Base UI, brought current on the existing Radix base first so the diff is reviewable, with the design tokens and the rounded radius protected throughout. A node script in CI enforces the colour, `dark:`, ARIA and control rules against a committed baseline, and a Playwright plus axe scan over a primitive gallery proves the accessibility floor. Six missing primitives get built, 23 unused AI Elements get pruned, the referral overlay gets converted, `--spacing` returns to the Tailwind default, and the AI SDK is upgraded against vendored element files rather than a live registry fetch.

## Standard definition

**Canonical pattern**:

A screen is built from `components/ui/` primitives, styled only with semantic tokens, in a mobile first layout.

```tsx
// app/(dashboard)/quizzes/[id]/page.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const attempts = await listAttempts(id);

  // Mobile first. Unprefixed classes are the phone layout.
  // sm: and up are the additions, never a rewrite of the base.
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 md:gap-6 md:py-10">
      <Card>
        <CardHeader className="gap-1">
          <CardTitle>Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            caption="Your attempts on this quiz, newest first"
            rows={attempts}
            columns={[
              { key: "score", header: "Score", sortable: true },
              { key: "takenAt", header: "Taken", sortable: true },
            ]}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="w-full sm:w-auto">Retake quiz</Button>
        <Button variant="outline" className="w-full sm:w-auto">
          Share result
        </Button>
      </div>
    </div>
  );
}
```

The rules, in the order they bind:

1. **`components/ui/` is the only primitive layer.** Check `ls components/ui/` before writing a control. A styled `<button>`, a raw `<input>`, a modal, a dropdown or a table row style is a defect, not a shortcut.
2. **The base is Base UI.** Every Radix backed primitive is Base UI backed, with a named, reasoned exception list for anything with no Base UI equivalent.
3. **Colour is tokens only.** No hex, no `oklch()` literal, no `bg-white`, no `text-slate-500`. In dark mode only the `.dark` block changes, never a `dark:` utility for a colour that exists as a token.
4. **Semantic pairs only.** `bg-primary` with `text-primary-foreground`, `bg-muted` with `text-muted-foreground`. Never a surface with a mismatched foreground.
5. **Tokens are only declared in `app/globals.css`,** under both `:root` and `.dark`, exposed through `@theme inline`. Never override a `--*` token from a component.
6. **`--radius` is the only corner knob.** Never write a `rounded-*` outside the `--radius` derived scale (`rounded-sm/md/lg/xl` and the `rounded-*` variants that read from `--radius`); a bespoke radius on a component is a violation.
7. **Anything rendering `UIMessage.parts` uses `components/ai-elements/`.** Never hand roll a chat message, a reasoning block, a tool card or a composer. The composer is always `PromptInput`.
8. **Assistant markdown goes through `components/markdown.tsx`.** Never import `react-markdown` inline. `lib/math-format.ts` stays the one place `\[…\]` and `\(…\)` are normalised.
9. **Custom primitives live in `components/ui/`;** compositions live in `components/<feature>/`. A primitive is built only when the need is recurrent across 2 or more screens and no registry, AI Element or listed community registry covers it.
10. **Accessibility is part of the design.** Every focusable component shows a focus indicator at 3:1 or better non text contrast using full opacity `ring-ring`. Touch targets are at least 44 by 44px; targets reachable only by pointer (a mouse only menu item, a desktop only control) may be 24 by 24px. Every animation respects `prefers-reduced-motion`. Charts ship a visually hidden data table. Any menu item showing a keyboard shortcut implements it.
11. **The responsive contract, written once.** Mobile first. The unprefixed classes are the phone layout; `sm:` 640px, `md:` 768px, `lg:` 1024px, `xl:` 1280px only add. Content stacks in one column until `md`, navigation collapses to a `Sheet` below `sm`, data tables switch to stacked cards below `md`, and no layout depends on a raw pixel width or a hand written `matchMedia` breakpoint. No new breakpoint beyond these four.
12. **No new styling systems.** Tailwind v4 with tokens is the whole styling contract. No CSS Modules, no CSS in JS, no second utility library.

**Replaces**:

- A hand rolled `<button>`, `<input>`, `<select>` or `<textarea>` in app or feature code (75 files today).
- Raw Tailwind palette colour instead of a semantic token.
- A `dark:` colour utility for a colour that exists as a token (38 files), including 4 in `components/ui/button.tsx` itself.
- `focus-visible:ring-ring/50`, which fails 3:1 contrast in light mode (15 primitives).
- The hand rolled `fixed inset-0` viewport overlay in `components/referral-processor.tsx`.
- A hand wired `ReactMarkdown` plus KaTeX block in a component (4 real renderers).
- Installing an AI Element and never importing it (23 of 32 today).

**Enforcement**:

- `scripts/check-ui-conventions.mjs`, run as `pnpm ui:check` and added as a CI step in `.github/workflows/ci.yml` next to the existing `prompts:check` step. It implements the four rules in AC-7 exactly, reads `scripts/ui-conventions-baseline.json`, fails on a violation whose path is not in the baseline for that rule, and warns (exit 0) on a baselined or missing baseline entry. It prints a per rule total. Test at `tests/scripts/check-ui-conventions.test.ts`.
- `docs/design-system-inventory.md`, holding a fenced `json` block with one object per primitive carrying `file`, `base`, `registryVersion`, `lastRebase`, `exception`. The check verifies every `components/ui/` file has an entry and that no entry names a missing file.
- `@axe-core/playwright` over the gallery, both themes, as a Playwright test in CI. Fails on any serious or critical finding. Focus indicator presence is asserted separately (AC-8), since axe has no rule for it.
- Screenshot comparison via Playwright `toHaveScreenshot` with `maxDiffPixelRatio: 0.01`, artifacts under `tests/gallery/__screenshots__/`, used as the per slice visual check during the base migration and as the before/after evidence for the spacing reset. Any diff over the threshold is a human judgement, recorded in the slice commit message rather than auto accepted.

**Rollout**:

Enforce immediately for new code, with existing violations tracked as debt in the committed baseline. The Base UI migration is a one time migration, sliced one primitive per slice (port it, capture the gallery screenshot before and after, compare, move on), so any single primitive that goes wrong is isolated and cheap to revert.

**Exceptions**:

Named, each with a written reason in `docs/design-system.md`, and each recorded in the inventory as an exception:

- `sonner.tsx`: a toast library, not a Radix primitive, with no Base UI equivalent. Stays because `app/layout.tsx` mounts the `<Toaster />`.
- `calendar.tsx`: backed by `react-day-picker`, not a Radix primitive. Stays because `date-picker.tsx` is built on it.
- `carousel.tsx`: backed by `embla-carousel-react`, currently with no live consumer. Stays available; its one importer (`components/ai-elements/inline-citation.tsx`) is pruned by AC-10.
- `combobox.tsx`: already Base UI backed, and is the reference implementation for the base choice.
- Raw ARIA inside `components/ui/` and `components/ai-elements/` is expected and correct: that is where the semantics are implemented.
- The 21 primitives with zero importers are **kept**, not grandfathered. They are available stock, several are needed by the migration itself (`alert-dialog`, `popover`, `pagination`), and `calendar` and `combobox` are load bearing. The only deletions are the four with neither a Base UI equivalent nor a consumer: `drawer.tsx`, `resizable.tsx`, `input-otp.tsx`, `chart.tsx`. (Note: `chart.tsx` is a dependency question, not a styling one; admin metrics currently renders with raw colour, so if a chart component is wanted it is a separate decision. See Follow-up.)

**Sequencing constraints** (binding on the build, derived from Tracer Bullet. Three constraints only; `/feature-build` derives the rest and the slice order):

1. **`components.json` `style` moves to the Base UI style first, before any port.** Otherwise the next `shadcn add` regenerates Radix files and silently reverts the migration.
2. **The focus ring contrast fix lands before the migration, not after.** It touches 15 files that the migration then touches again; doing it first means those files are edited once.
3. **The element re add and the SDK bump are separate commits, vendored first.** A commit that mixes a live registry fetch with a breaking SDK bump cannot be bisected or reverted if the registry changes mid migration.

**Configuration required**:

- `ai`: pinned to the exact version recorded in the AC-10 slice commit, and to that same version in `package.json`. The version is chosen at build time from the current major, then frozen; the spec does not guess a number that will be stale on the day it is read.

## Consequences

**Positive**:

- Every future shadcn accessibility or bug fix reaches our components instead of needing a hand applied patch.
- The colour and control rules stop new drift, and the baseline gives a number that only goes down.
- The gallery page proves the shared layer once, in both themes, instead of auditing forty screen after screen.
- Six primitives that are hand wired in four places today become one owned component each.
- Students on a cheap Android get focus rings that pass contrast and tap targets that work.

**Negative / tradeoffs**:

- The Base UI migration rebases 33 hand tuned files and will surface real visual differences. That is the cost of the choice and it is paid once.
- The `--spacing` reset shrinks every unprefixed gap in the app by about 7 percent in a single change. Shared surfaces need a spacing pass afterwards.
- The AI SDK major upgrade is a breaking migration touching the chat route, the tools and every element. It is the highest risk task and it is unrelated to the design system itself.
- Rebuilding `sidebar.tsx` and `command.tsx` touches the navigation shell of every layout and the `PromptInput` composer, so both need a real manual pass, not only a screenshot.
- A baseline file listing the legacy paths is itself a maintenance burden and must be allowed to shrink.
- The axe scan needs a build step, a browser install and a gallery route reachable without auth, so CI grows three jobs' worth of setup for one check.
- Screenshot comparison at `maxDiffPixelRatio: 0.01` produces false positives on font rendering differences across machines; it needs a pinned font environment or it becomes noise people learn to ignore.

**Neutral**:

- No database change, no migration, no new environment variable or secret.
- The 23 dead AI Elements go away; four of them needed `@xyflow/react`, which was never installed.
- `--spacing: 0.27rem` had been silently rescaling every unprefixed Tailwind spacing unit. Deleting the declaration is a visible change, but the value was never a deliberate token, only a leftover.
- `data-slot`, `cn()` for class merging and `React.ComponentProps<typeof Primitive>` for the props spread stay the required shape for every primitive.
- `aspect-ratio`, `direction`, `empty`, `field`, `item`, `kbd`, `native-select` and `slider` stay available despite having no importer. Dead code is normally removed, but these are stock primitives the migration needs and removing them buys nothing.

## Follow-up

- [ ] The spec's `## Requirements` and the "Done when" line in `docs/scope/platform.md` §7 need to stay in step. `/feature-build` should record this spec as the row's source and add the milestones.
- [ ] The baseline file lists every legacy path at the moment the check is written. Each slice that cleans a file should remove its line, so the number is a visible progress meter.
- [ ] `/state-sync` should add the design system pointer to root `AGENTS.md` once `docs/design-system.md` exists. That skill owns `AGENTS.md`; this spec deliberately does not write to it.
- [ ] `app/(admin)/admin/metrics/page.tsx` carries 28 hex literals and renders chart colour series with no `chart.tsx` consumer. If admin charts are wanted, that is a charting decision (which library, which token set for series colour) and should be its own spec, not a cleanup task.
- [ ] `components/pdf/styles.tsx` carries 23 hex literals. PDF rendering may not be able to read CSS custom properties, so this may need a different answer than tokens. Separate decision.
- [ ] The responsive contract names four breakpoints and forbids raw pixel widths, but nothing checks it. A rule for the raw pixel width and `matchMedia` cases (`components/chat/chat-composer.tsx` has one today) would close that gap in a later pass.
- [ ] 9 spec files in `docs/specs/` use the directory shape and the rest do not. Consider a `/state-sync` pass recording the shape rule where spec conventions live.

## Rationale

Reasoning, options weighed, and the evidence behind the numbers are in [rationale.md](rationale.md).