# 0047. UI foundation tokens and primitives

**Date**: 2026-11-04
**Status**: Accepted

## Summary

You open any rebuilt page and you feel one calm home with air plus clear type plus soft cards. This spec sets the shared tokens (the named colors plus type plus spacing that every page reads) plus the shared shapes (the reusable page header plus cards plus lists plus empty plus error states) so ten pages stop drifting. Primary color stays exactly as it is today, air comes from spacing plus radius plus surfaces. A check fails the build when a page invents its own color or control, so the system holds as pages land one by one.

## Requirements

**User stories**:

1. As a student on a small phone, I want every page to read the same way so that I can focus on study instead of relearning the layout.
2. As a student, I want birth entry to feel light with clear day plus month plus year choices so that I finish onboarding in about a minute.
3. As an engineer, I want one place that names the tokens plus the shapes plus the rules so that I never guess which piece to reach for.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

1. **AC-1**: `app/globals.css` keeps primary plus primary foreground exactly as at spec date, supporting tokens plus radius plus shadows tuned for air, and every rebuilt page reads color plus type plus spacing from tokens only with no hex, no `oklch()` literal, no raw palette class and no arbitrary color value in page code. Rebuilt pages are every page except dashboard plus chat.
2. **AC-2**: Shared shapes exist and pages reuse them: page header as new `components/ui/page-header.tsx` with title plus helper plus actions, section card as `components/ui/card.tsx`, list row as `components/ui/item.tsx`, empty as `components/ui/empty.tsx`, error as `components/ui/read-notice.tsx`, skeleton as `components/ui/skeleton.tsx`, form row as `components/ui/field.tsx`, day plus month plus year trio base as new `components/ui/trio-picker.tsx` with day plus month plus year selects. Each built on Radix where a base exists, styled with semantic tokens.
3. **AC-3**: Pages use balanced lists plus prose: lists plus cards plus accordions where scanning helps, short prose kept where teaching or nuance needs it, never forcing every block into bullets. Reviewer passes when each page shows at least one list or card where steps, options or stats exist, and teaching prose over three sentences may stay prose. Human check at review, not automated.
4. **AC-4**: `pnpm ui:check` fails on a new token or control violation outside `components/ui/` while baselined legacy paths only warn, with a per rule total printed. Patterns are hex literal, raw palette class, `dark:` color utility, raw control outside `components/ui/`, bespoke radius value. Allowlist is `transparent` plus `currentColor` plus charts plus code samples. Baseline is `scripts/ui-conventions-baseline.json` with file level warn versus fail.
5. **AC-5**: Empty plus error plus loading reuse the proven shapes (`pending-region`, `process-progress`, `read-notice`, `skeleton`) with one copy tone plus retry where it helps. Tone is plain plus kind: empty names what is missing plus the next tap, error names what happened plus what to do. Retry appears for connection plus timeout failures with label Try again, never for invalid input or auth redirects. First load shows skeleton, refresh keeps content with dim plus thin bar, process shows bar with a real number, lost connection shows notice with retry.
6. **AC-6**: Styling stays Tailwind plus tokens only with no new styling system, phone first with one column until `md`, no new breakpoint. Banned are CSS Modules, CSS in JS, a second utility library, inline style for color or spacing. Keyframes are allowed and must honor reduced motion. Exceptions are side by side actions at `sm` and up, plus tables stacking to cards below `md`.
7. **AC-7**: Proof runs over example pages in both themes with zero serious axe findings: upload plus subscription plus pricing. Focus visible uses full opacity `ring-ring` with width plus offset proven in the gallery. Tap targets at least 44 by 44 on buttons, inputs, selects and triggers, with inline links exempt. Motion honors reduced motion by stripping non essential motion.
8. **AC-8**: Trio base ships day plus month plus year selects with scroll plus type to jump and native `input[type=date]` fallback below `sm` on touch devices. Invalid days disable in place, February clamps including leap years. Months use short names, years list descending one hundred years ending this year, order is day then month then year with clear placeholders and no preselected birth date. Base owns date validity, onboarding owns eligibility plus copy.
9. **AC-9**: No new tables and no migration ship with this standard, no new env vars and no new secrets, no API and no auth change. Proven by an empty migration diff plus an env diff plus a route scan. Gallery plus axe tooling deps are exempt as tooling.

## Decision

**Chosen option**: Option 1: Document plus enforce going forward, with the locked primary plus full shape set.

This spec documents the one token plus shape standard and enforces it on new code from landing onward.

## Standard definition

**Canonical pattern**:

A page is built from `components/ui/` primitives, styled only with semantic tokens, in a mobile first layout that reads calm on a small phone.

```tsx
// app/(dashboard)/upload/page.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { TrioPicker } from "@/components/ui/trio-picker";

export default function UploadPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 md:gap-6 md:py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Upload notes</h1>
        <p className="text-sm text-muted-foreground">
          Add a file, watch real progress, then turn it into practice.
        </p>
      </header>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle>Your files</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No notes yet</EmptyTitle>
              <EmptyDescription>
                Upload your first file to start your quiz loop.
              </EmptyDescription>
            </EmptyHeader>
            <Button className="mt-4 w-full sm:w-auto">Choose a file</Button>
          </Empty>
        </CardContent>
      </Card>

      <TrioPicker label="Study start" />
    </div>
  );
}
```

The rules, in the order they bind:

1. `components/ui/` is the only primitive layer. Check the folder before writing a control. A styled button, a raw input, a modal, a dropdown or a table row style in page code is a defect, not a shortcut.
2. Color is tokens only. No hex, no `oklch()` literal, no `bg-white`, no raw palette class. In dark mode only the `.dark` block changes, never a `dark:` color utility for a color that exists as a token.
3. Semantic pairs only. `bg-primary` with `text-primary-foreground`, `bg-muted` with `text-muted-foreground`. Never a surface with a mismatched foreground.
4. Tokens are only declared in `app/globals.css`, under both `:root` and `.dark`, exposed through `@theme inline`. Primary plus primary foreground stay fixed. Never override a token from a component.
5. `--radius` is the only corner knob. Never write a bespoke radius value on a component.
6. Shared shapes are reused, not reinvented. Page header plus section card plus list row plus empty plus error plus skeleton plus form row come from this standard. A page specific block lives in `components/<feature>/` and only when two or more pages truly share it does it graduate to `components/ui/`.
7. Balanced lists plus prose. Lists plus cards plus accordions carry scanning, short prose carries teaching. Never force a teaching block into bullets to satisfy a rule.
8. Birth trio base lives here. Day plus month plus year selects with scroll plus type to jump, kindly blocking invalid dates, native fallback on small phones. Onboarding owns birth copy plus eligibility rules, never the trio mechanics.
9. Accessibility is part of the build. Every focusable control shows a focus indicator using full opacity `ring-ring`. Touch targets are at least 44 by 44. Every animation respects reduced motion.
10. Responsive contract written once. Mobile first. Unprefixed classes are the phone layout. Content stacks in one column until `md`. No new breakpoint.
11. No new styling systems. Tailwind with tokens is the whole contract. No CSS Modules, no CSS in JS, no second utility library.

**Replaces**:

1. A hand built button, input, select or textarea in page code.
2. Raw palette color instead of a semantic token, such as `bg-white` or `text-slate-500`.
3. A `dark:` color utility for a color that exists as a token.
4. The single date popover used for birth entry, which forces many arrow taps to reach a birth year.
5. A wall of prose where a list plus a short intro would scan in seconds.
6. A one off page shape that duplicates the shared header or card with local classes.

**Enforcement**:

Run `pnpm ui:check` in CI next to the existing prompts check. It fails on a token or control violation whose path is not baselined, and warns on a baselined path. It prints a per rule total. A gallery plus axe scan over example pages in both themes fails on any serious finding. Focus presence is asserted directly since axe has no rule for it.

**Rollout**:

Enforce immediately for new code, with existing violations tracked as debt in the committed baseline. Tokens plus check land before page specs, trio base lands before onboarding, one example page proves the shapes before wide rollout. Baseline lines retire page by page as pages land, so warn debt reaches zero instead of lingering.

**Exceptions**:

Named, each with a written reason in `docs/design-system.md`:

1. Dashboard plus chat keep their shells. This slice explicitly excludes them, so their navigation plus composer stay as is.
2. Raw ARIA inside `components/ui/` is expected and correct. That is where semantics are implemented.
3. `sonner.tsx`, `calendar.tsx`, `carousel.tsx`, `combobox.tsx` keep their noted bases per spec 0004. This standard changes no base.

**Sequencing constraints** (binding on the build, derived from Tracer Bullet. Three constraints only):

1. Tokens plus check land before any page spec starts, so pages build on the real rule from the first slice.
2. Trio base lands before onboarding, so birth entry never ships on a temporary picker.
3. One example page proves header plus card plus list plus empty plus error in both themes before the wide rollout, so drift is caught early.

**Configuration required**:

None. No new env vars, no new secrets.

## Consequences

**Positive**:

1. Ten pages read as one calm product, so study stays the focus instead of the layout.
2. Primary stays trusted while air improves, so the brand holds and reading gets lighter.
3. Birth entry drops from many taps to a quick scroll plus type, so onboarding feels kind.
4. The check plus the gallery prove the system once instead of auditing page after page.

**Negative / tradeoffs**:

1. Locking primary plus enforcing tokens slows a page that wants a custom moment. That page must earn an exception in writing.
2. Balanced lists need editorial care on every page. Copy review becomes real work, not a quick pass.
3. Tuning radius plus shadows plus surfaces shifts many pages at once. Shared surfaces need a visual pass afterwards.
4. The baseline file is maintenance. Each cleaned page should drop its line so the number only moves down.

**Neutral**:

1. No database change, no migration, no new env vars.
2. Dashboard plus chat stay out of this slice by explicit scope.

## Follow-up

- [ ] Scope row 68 in `docs/scope/interface.md` records this spec and its milestones once you confirm.
- [ ] Retire baseline lines as pages land so warn debt reaches zero, with dashboard plus chat staying excluded by scope.
- [ ] Onboarding in scope 71 consumes the trio base for birth copy plus eligibility. Keep that contract in the onboarding spec, not here.
- [ ] Add one example page proving header plus card plus list plus empty plus error in both themes, with axe clean, before wide rollout.
- [ ] `/state-sync` owns `AGENTS.md`. When this standard lands, that skill may point root `AGENTS.md` at it. This spec writes no context file.

## Rationale

Reasoning and options weighed plus evidence are in [rationale.md](rationale.md).
