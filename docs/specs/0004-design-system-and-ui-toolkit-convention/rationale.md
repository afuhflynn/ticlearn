# Rationale: design system and UI toolkit convention

## Context

> ⚠️ Premise note: this topic ended up spanning three independently implementable decisions: the written UI standard (the core of this spec), the Base UI migration of the primitive layer, and an AI SDK 7 major upgrade. The migration and the SDK upgrade are not design system decisions at all; they ride along because the standard cannot be true on screen while 46 primitives sit on the old base, and because moving to the current AI Elements registry without moving the SDK drifts them apart. They are marked as separate sequencing constraints and separate acceptance criteria (AC-2, AC-3, AC-8) so they can be pulled out into their own specs if you would rather ship the standard first. The engineer was told this and chose to keep them together, on the grounds that a standard that lands before the cleanup it describes will not survive contact with the next feature.

TiCLearn is a Next.js 16 App Router application on React 19 and Tailwind v4, with shadcn/ui already initialised (`radix-nova` style, `neutral` base, lucide icons) and the Vercel AI Elements registry wired into `components.json`. There are 56 files in `components/ui/` and 32 in `components/ai-elements/`, and the styling contract already lives in `app/globals.css` under `@theme inline`.

The problem is not that the toolkit is wrong. It is that the toolkit is unwritten. Three things are true at once and they compound each other.

First, 46 of 55 registry primitives have been customised away from upstream. This is deliberate design work: `button.tsx` replaces the stock variants with a violet tinted system (`border-primary/35`, `bg-primary/10`, `dark:border-primary/45`), the radius is a very soft `1.4rem`, and there is a custom `--shadow-*` scale built from `--shadow-x/y/blur/spread/opacity/color` plus `--tracking-normal: -0.025em` and Plus Jakarta Sans / Lora / IBM Plex Mono. That is a real visual asset that any off the shelf kit would flatten (basis: `docs/research/ui-toolkit.md` §1.5).

Second, because the local file is now the source of truth, there is no upstream diff to merge. Every future shadcn accessibility fix must be hand applied forever. The research measured this against the live `radix-nova` registry item by item (basis: `docs/research/ui-toolkit.md` §1.4).

Third, the base itself is the slow one. shadcn made Base UI the default in July 2026, and this project is still on the Radix base with a single Base UI component (`combobox.tsx`) already proving the pattern works (basis: `docs/research/ui-toolkit.md` §2.4).

The drift is already visible in the feature code: 59 files reach for raw Tailwind palette colour instead of a semantic token, 38 use a `dark:` colour utility, 75 files outside `components/ui/` contain a raw `<button>`, `<input>`, `<select>`, `<textarea>` or `onClick`, 7 screens hand roll a full viewport overlay with `fixed inset-0`, and ReactMarkdown plus KaTeX is wired by hand in at least 4 places. In the other direction, the token discipline in one respect is genuinely clean: zero `--*` overrides outside `app/globals.css` and zero `.dark` blocks elsewhere. The rule was followed exactly where it was written down, and broken exactly where it was not.

The cross cutting bar for this project is that every screen must work on a two gigabyte Android phone, which makes the accessibility floor and the responsive contract load bearing rather than nice to have.

## Options considered

### Option 1: Document, enforce going forward, and clean what is already drifting

Write the rule into `docs/design-system.md`, point `AGENTS.md` at it, add a CI check with a committed baseline so new violations fail and legacy ones warn, run an axe scan over a primitive gallery, move the base to Base UI, build the 6 missing primitives, prune the 23 dead AI Elements, convert the 7 overlays and reset `--spacing`. New code complies immediately; existing violations are tracked as debt that shrinks.

**Pros**:

- Stops new drift at the moment it starts, which is the only point where stopping it is cheap.
- The upstream fix flow becomes real once the base matches the current default.
- The baseline gives a number that only goes down, so progress is visible without a dedicated cleanup project.
- The gallery proves the shared layer once, in both themes, instead of auditing screen by screen forever.

**Cons**:

- The largest build of the five options. 46 primitives rebased, 6 built, 23 deleted, 7 overlays converted.
- Ships an AI SDK major upgrade that is unrelated to the design system and carries its own risk.

### Option 2: Document and enforce going forward, but no cleanup

Same rule and same checks, but no base switch and no pruning. The 46 customised files stay as they are and the 23 dead elements stay on disk.

**Pros**:

- Much smaller build. The check and the doc are days, not weeks.
- Zero risk to the navigation shell, the composer or the toast system.

**Cons**:

- The base stays on the fork the research calls slow, so the fix flow stays manual forever. This is the whole reason the scope row says "switch the shadcn base off the slowing Radix fork".
- The 23 dead AI Elements stay as drift risk. One of them families needs `@xyflow/react`, which was never installed, so it can never work.

### Option 3: Stay on Radix, allow Base UI only where it is better

Keep Radix as the base, allow Base UI only where it is clearly better, and write down the allowed exceptions.

**Pros**:

- Cheapest of the base options. shadcn continues to ship Radix versions, so the manual fix flow keeps working.
- No visual risk from a 46 file rewrite.

**Cons**:

- Permanent mixed bases, which is the inconsistency the project already suffers from with one combobox.
- Contradicts where shadcn is going, so the manual fix flow gets longer over time rather than shorter.

### Option 4: Big bang rewrite of the whole UI layer

Replace `components/ui/` wholesale with a clean Base UI install and reapply the design afterwards.

**Pros**:

- Theoretically the cleanest end state.
- One big diff rather than 46 small ones.

**Cons**:

- The classic big bang rewrite failure mode: no working increment, no safe revert, and the review is unreviewable.
- The design system is load bearing for every other slice in `docs/scope/`, so a broken intermediate state blocks everything after it.

## Rationale

Option 1 wins because the drift is not a style disagreement, it is an unwritten contract. The evidence for that is unusually clean: the one rule that *is* written down (tokens only in `app/globals.css`) has exactly zero violations, and every unwritten rule has violations everywhere. A standard that is not enforced is not a standard, so enforcement is the load bearing part of this decision, not a nice addition. That is also why the check is a plain node script rather than a Biome plugin or a new lint toolchain: `pnpm prompts:check` over `scripts/check-prompts.mjs`, with a test at `tests/scripts/check-prompts.test.ts`, is already the project's precedent for exactly this shape of gate, and the CI workflow already has the step (basis: your `AGENTS.md`, the Biome and CI conventions; `.github/workflows/ci.yml`).

The base switch to Base UI is the expensive call and it was made deliberately. The force is that the local files are the source of truth now, so the manual fix flow grows without bound; matching shadcn's current default is the only choice that makes upstream repairs arrive for free. The cost is a 46 file rebase with real visual risk, and that risk is what the other decisions in this spec exist to control: bring shadcn current on the old base first so the diff separates the upgrade from the base swap, slice one primitive at a time, and capture a gallery screenshot before and after each slice so damage is visible per file rather than discovered at the end. The tokens and the rounded radius are protected explicitly (AC-3) because losing the violet system or the 1.4rem radius would cost more than the upgrade gains (basis: `docs/research/ui-toolkit.md` §1.5, the theme as a real asset).

On rollout, the baseline is the mechanism that makes enforcement possible without blocking unrelated work. 59 files use raw palette colour and 38 use `dark:` utilities today; failing on all of them would turn CI red on work unrelated to the toolkit and park the feature. Failing only on new violations lets the number fall from 97 at whatever rate screens get touched. The engineer chose warning on a renamed or deleted baselined file over failing, which is the right call: a renamed file is a bookkeeping event, and a CI gate that fails on bookkeeping trains people to reach for a force push instead of fixing things (basis: strangler migration, enforce forward and let debt drain).

The `--spacing: 0.27rem` reset is worth calling out because it is a deliberate acceptance of visible change. That value silently rescales every unprefixed Tailwind spacing unit in the app, which is exactly the class of invisible surprise this standard exists to eliminate. The engineer chose the Tailwind default of `0.25rem` over keeping the non standard base, accepting an approximately 7 percent shrink in every gap in one change, in exchange for a value that means what it says (basis: your `AGENTS.md`, Tailwind 4 theme tokens live in `@theme inline`).

The AI SDK 7 upgrade is the one recommendation in this spec that came with a caution attached, and the engineer chose to include it anyway. It is a breaking migration (`fullStream`, tool context, `finalStep`, `system` becomes `instructions`) touching the chat route, the tools and every element, and it has nothing to do with the design system. It is included because leaving `ai` on 6 while moving to the current AI Elements registry means the elements and the SDK drift apart, and the research is explicit that this is type coupled (basis: `docs/research/ui-toolkit.md` §3.3, the seven `ToolUIPart` states and the AI SDK 7 coupling). The mitigation is that the bump and the element re add must land in the same commit, which converts a slow silent type break into one loud commit that either passes typecheck or does not. Treat it as the highest risk task in the build, not as part of the theme work.

Rebuilding `sidebar.tsx` and `command.tsx` onto shadcn's own Base UI registry versions rather than keeping them as exceptions follows the same logic as the rest of the base switch: these are the two primitives shadcn maintains most actively and most depended on here (8 importers and 3 respectively, including the navigation shell of every layout and the `PromptInput` composer). The one mitigation the engineer agreed to is that those 11 importing files must compile unchanged against the rebuilt versions. An unstated prop rename in a rebuild of a shared primitive is the single most likely way this feature breaks a working app, so it is a gate rather than a hope. `sonner.tsx` is the exception that cannot be removed, because it is a toast library rather than a Radix primitive and `app/layout.tsx` mounts the `<Toaster />`; keeping it costs nothing in base consistency since it was never Radix.

Three corrections came out of the independent cross check and are recorded here because each one changes the work, not just the wording. The base migration is 33 files, not 46, because 46 was the drift from upstream count and using it would have sliced 46 undefined units. The overlay conversion is one file, not seven, because six of the seven use `absolute inset-0` inside a container, which is a contained panel, and converting a panel to a modal would be semantically wrong. And `components.json` still reads `"style": "radix-nova"`, which makes it the first thing to change: without it, the next `shadcn add` in any later feature regenerates Radix files and silently undoes the migration. That last one was the most valuable catch in the pass and it is now sequencing constraint 1.

Two more cross check findings changed the plan rather than the text. The axe scan cannot verify a focus indicator, because axe has no rule for one, so AC-8 now asserts the computed `box-shadow` on `:focus-visible` directly. And a commit that fetches 9 elements from an unversioned live registry at the same moment it bumps a breaking SDK cannot be bisected or reverted if the registry moves mid migration, so the two are now separate commits, vendored first.

## Evidence

Counts below were read from the working tree on 2026-10-12 after pulling `origin/main`, not taken from the research doc. They are the baseline the check ships with, and each was re-verified after an independent cross check pass, which corrected four of them.

| Signal | Count | Where it hurts |
|---|---|---|
| `components/ui/` files | 55 | the layer under every screen |
| Radix backed primitives (the migration scope) | 33 | the base being replaced |
| Base UI backed primitives | 1 (`combobox`) | the pattern already proven here |
| Customised away from upstream shadcn | 46 of 55 | a different number from the Radix set: this is drift from upstream, not the base |
| Third party backed primitives | 7 (`calendar`, `carousel`, `command`, `drawer`, `input-otp`, `resizable`, `sonner`) | the ones with no Base UI equivalent |
| Installed AI Elements never imported | 23 of 32 | dead weight and drift risk |
| AI Elements with a consumer | 9 | `attachments`, `conversation`, `loader`, `message`, `prompt-input`, `reasoning`, `sources`, `suggestion`, `tool` |
| Files using raw Tailwind palette colour outside `components/ui/` | 52 | strict pattern; the looser count in the first survey was 59 |
| Files using a `dark:` colour utility | 38 | includes 4 in `components/ui/button.tsx` |
| Files with hex literals in `app/` plus `components/` | 10 | worst: admin metrics (28), `components/pdf/styles.tsx` (23) |
| Files with hex literals including `lib/` | 12 | adds `lib/email/send.ts` and `lib/inngest/functions.ts` |
| `--*` overrides outside `app/globals.css` | 0 | the written rule was followed |
| `.dark` blocks outside `app/globals.css` | 0 | the written rule was followed |
| Files with raw `<button>`/`<input>`/`onClick` outside `components/ui/` | 75 | worst: exam result page (29), onboarding (22) |
| Hand rolled full viewport overlays (`fixed inset-0`) | 1 | `components/referral-processor.tsx` only |
| Contained panels using `absolute inset-0` | 6 outside `components/ui/` | not viewport overlays, so out of scope for AC-12 |
| Primitives using `focus-visible:ring-ring/50` | 15 | all in `components/ui/`, fails 3:1 in light mode |
| Hand wired ReactMarkdown plus KaTeX sites | 9 files, 4 real renderers | no shared `components/markdown.tsx` |
| Primitives with zero importers | 21 | kept available; only 4 are deleted |
| Breakpoint usage | md 56, sm 36, lg 22, xl 8, 2xl 1 | inconsistent, and nothing writes it down |
| Hand written breakpoint logic | 1 | `components/chat/chat-composer.tsx` `matchMedia("(max-width: 768px)")` |

Two counts in this table were wrong in the first draft and are corrected above. The primitive count was 56, not 55. The full viewport overlay count was 7, not 1: six of the seven originally named files use `absolute inset-0` inside a container, which is a contained panel rather than a viewport overlay, so converting them to `Dialog` or `Sheet` would be semantically wrong. That correction narrowed AC-12 from seven screens to one file. A third correction was the largest of the three: "46 primitives" was the drift from upstream count, not the Radix count. The base migration covers 33 files. Using 46 would have had the build slicing 46 undefined units.

The 21 zero importer primitives are listed so the decision is explicit rather than implied: `alert-dialog`, `aspect-ratio`, `breadcrumb`, `calendar`, `chart`, `combobox`, `context-menu`, `direction`, `drawer`, `empty`, `field`, `input-otp`, `item`, `kbd`, `menubar`, `native-select`, `navigation-menu`, `pagination`, `popover`, `resizable`, `slider`. Only `drawer`, `resizable`, `input-otp` and `chart` are deleted, because they are the only ones with neither a Base UI equivalent nor a consumer. `calendar` is needed by the new `date-picker`, `combobox` is the Base UI reference implementation, and `alert-dialog`, `popover` and `pagination` are stock pieces the migration itself needs.

## References

**Project sources** (verifiable, in this repo):

- `AGENTS.md`: the Tailwind 4 and `@theme inline` token rule, the Biome conventions, the `@/*` alias, the no tests disclaimer
- `docs/research/ui-toolkit.md`: the shadcn and AI Elements landscape, the divergence measurement (§1.4), the theme as an asset (§1.5), where the codebase bypasses the primitives (§1.6), Base UI as the default (§2.4), AI Elements coverage and the AI SDK coupling (§3.1 to §3.5), the recommended convention (§7)
- `docs/scope/platform.md` §7: the feature row this spec is linked to, and its "Done when" line
- `components.json`: `radix-nova`, `neutral`, lucide, `app/globals.css`, the `@ai-elements` registry
- `app/globals.css`: `--radius: 1.4rem`, `--spacing: 0.27rem`, `--font-sans` Plus Jakarta Sans, the `--shadow-*` scale, `--tracking-normal: -0.025em`, `@theme inline`
- `.github/workflows/ci.yml` and `scripts/check-prompts.mjs`: the existing custom check precedent in CI, with its test
- `docs/specs/0002-prompt-registry`: the shape used for a foundation spec that also carries a verify script

**Practices & standards**:

- strangler migration, enforce the new rule forward and let the debt drain through a committed baseline
- reproducible builds, vendoring an upstream fetch before layering a breaking change on top of it so either commit can be bisected and reverted alone
- WCAG 2.1 non text contrast, 3:1 for focus indicators and user interface components
- WCAG 2.1 target size, 24 by 24px minimum for interactive targets
- `prefers-reduced-motion` for any animation
- mobile first responsive design, unprefixed utilities as the base layout and breakpoints as progressive addition
- registry based component ownership, the upstream file is copied into the repo and the repo is the source of truth
- accessibility auditing with axe in CI over a component gallery