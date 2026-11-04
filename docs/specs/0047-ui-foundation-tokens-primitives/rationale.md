# Rationale for 0047 UI foundation tokens and primitives

## Context

Ten pages outside dashboard plus chat must feel like one product, calm plus premium plus easy to scan on a small phone. Today each page invents its own spacing plus headers plus empty states, long prose sits where lists plus cards would scan faster, and birth entry forces many arrow taps to reach a birth year (basis: `docs/scope/interface.md`, `docs/design-system.md`).

The phone in hand is small, often shared, often on costly data. A wall of text plus a tiny tap target plus a drifting header costs real attention plus real money. Primary color is trusted and stays, so calm must come from spacing plus radius plus surfaces plus type, not from a new palette (basis: `app/globals.css`, your primary lock).

If nothing is decided, each of the ten page specs invents its own header plus card plus list, the token check stays blind to the new drift, and onboarding keeps the painful stepper while pages land one by one (basis: vertical slices ship real value early).

## Options considered

### Option 1: Document plus enforce going forward

Define the token plus shape standard, land tuned tokens plus the full shape set plus the trio base, wire the check to fail on new drift, and let legacy paths warn as tracked debt while pages rebuild slice by slice (basis: `docs/design-system.md`, spec 0004, `app/globals.css`).

**Pros**:

1. Pages build on the real rule from the first slice, so drift stops at the source.
2. No big bang rewrite, so students see steady gains while builders keep shipping.
3. Debt is a visible number that only moves down, so progress is honest.

**Cons**:

1. Legacy drift lingers until its page is rebuilt, so two styles coexist for a while.
2. The baseline file needs care, or it becomes noise people learn to ignore.

### Option 2: Document plus single migration PR

Write the standard and convert all ten pages plus admin in one coordinated change, landing tokens plus shapes plus copy cleanup together (basis: strangler pattern for live migrations, applied in reverse here as one cutover).

**Pros**:

1. One clean moment with no mixed styles afterwards.
2. No debt tail and no baseline to maintain.

**Cons**:

1. Blast radius is huge across marketing plus auth plus student plus admin, so review becomes unmanageable.
2. Visual churn lands all at once with no thin thread to prove the system first, so a mistake touches every page.
3. Page specs stall behind the cutover instead of building on a live rule.

### Option 3: Document only

Write the guide, rely on review, add no automated check and no gallery proof (basis: review convention as the weakest enforcement).

**Pros**:

1. Cheapest now, with no CI work and no gallery to maintain.
2. No blocked builds while the team learns the shapes.

**Cons**:

1. Drift returns, since reviewers become the check and attention varies.
2. No number proves the system holds, so decay is silent.
3. Birth trio stays optional, so onboarding may ship on a temporary picker again.

## Rationale

Option 1 fits the forces above. A live product with students plus a ten page rebuild needs a rule that binds from the first slice without freezing all building behind one giant change. Enforce on new code, track legacy as debt, prove once with an example plus a scan (basis: your full shape set pick, your strict check pick, your gate plus scan pick, foundations before features).

Two of your calls reshaped the content and both are honored here. You first picked a full retune, then locked primary, so this standard tunes spacing plus radius plus shadows plus surfaces while primary plus primary foreground stay fixed. You first picked lists always, then warned against overdoing lists, so the rule is balanced lists plus prose with teaching prose protected (basis: your primary lock, your balanced lists pick).

Trio mechanics live in the foundation while birth copy plus eligibility live in onboarding, since mechanics are shared and rules are page specific. No tables, no migration, no API, no auth change ship here because pure visuals need none of them. Ownership stays narrow so pages reuse without forking (basis: your trio base pick, your no entities pick, your no API pick, your owners only pick, boring technology wins). The cross check then asked for pinned values plus contracts plus proof method, and each is now named in the standard: locked primary values with a named banned set, per shape file plus props, a reviewer rule for balanced lists, five check patterns with an allowlist plus a file level baseline, tone plus retry plus state map, ban plus exceptions, three example pages with focus plus target scope, trio validity behavior with native fallback, and empty diff proof for the none claims. A sunset rule retires baseline lines page by page so two styles cannot linger (basis: spec 0004, `scripts/ui-conventions-baseline.json`, your gate plus scan pick).

## References

**Project sources** (verifiable, in this repo):

1. `docs/design-system.md`, the owned primitive plus token plus responsive contract this standard extends.
2. `app/globals.css`, the `:root` plus `.dark` tokens plus radius plus shadows tuned by this standard.
3. `docs/scope/interface.md` scope row 68, the intent plus Done when seeds this spec answers.
4. Spec 0004, the design system convention plus check plus gallery precedent reused here.
5. Root `AGENTS.md`, the Tracer Bullet build plus token plus loading plus nuqs rules this standard honors.

**Practices & standards**:

1. Vertical slices ship real value early.
2. Foundations before features.
3. Boring technology wins.
4. Phone first with one column until wider screens earn more.
5. Lists scan faster than walls of text on small phones, balanced with prose where teaching needs it.

**Links** (web verified only):

1. shadcn Select docs, trio building block: https://ui.shadcn.com/docs/components/select
2. shadcn Theming docs, token discipline: https://ui.shadcn.com/docs/theming
3. Tailwind Theme docs, token driven styling: https://tailwindcss.com/docs/theme
4. Brilliant homepage, personal tutor plus card patterns: https://brilliant.org/
5. ChatGPT, calm minimal chat plus clarity patterns: https://chatgpt.com/
6. Claude patterns, cited by name with no URL since fetch hit the page limit and the address stayed unverified.

## Sample of current state

`components/ui/` holds more than sixty owned files today. Four show the pattern split this standard ends.

1. `components/ui/date-picker.tsx` is a single date popover built on `Popover` plus `Calendar` that closes on select. It fits filtering, not birth entry, where reaching a birth year costs many arrow taps.
2. `components/ui/select.tsx` is Radix backed with the scroll plus type behavior the trio needs. It is the building block the trio base extends, not a pattern to duplicate.
3. `components/ui/card.tsx` plus `components/ui/empty.tsx` are owned shapes with token driven variants. Pages should compose them instead of hand styling panels.
4. Public plus student pages carry long prose where lists plus cards plus a short intro would scan in seconds. That cleanup belongs per page, on top of this standard, never inside it.
