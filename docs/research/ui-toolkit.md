# UI Toolkit Research and Recommendation

**Date:** 2026-10-12
**Scope:** UI toolkit selection for the Next.js rebuild. Research only; no application code changed.
**Method:** repo inspection (versions, file counts, byte-level diffs against upstream registries) plus scraping of ui.shadcn.com, elements.ai-sdk.dev, base-ui.com, nuqs.dev, and comparison sources. Scratch artifacts in `.firecrawl/`.

---

## 0. TL;DR for the project owner

1. **Stay on shadcn/ui.** Nothing researched beats it for this app. It is now the only layer that gives us *both* accessible primitives (Radix **or** Base UI **or** React Aria) *and* full ownership of the code, and it is the only one where "customised to a top notch look" is a one-file edit rather than a theming DSL.
2. **You are on the wrong base.** `components.json` says `"style": "radix-nova"`. Since **July 2026 shadcn defaults to Base UI** (`base-ui`), and shadcn now ships *three* primitive bases (Radix, Base UI, React Aria) × *six* styles. Radix is explicitly **not deprecated**, so this is a choice, not a fire — but Base UI is the better primitive layer today and you already have `@base-ui/react@1.3.0` installed for exactly one component.
3. **You have lost upgrade safety and do not know it.** 46 of 55 files in `components/ui/` have diverged from upstream `radix-nova`. That is *good* for design and *bad* for maintenance: there is no diff to merge, no upgrade path, and no way to tell your intentional change from a bug fix.
4. **`nuqs` is installed, wired, and then completely ignored.** It is used on 3 auth pages. Meanwhile `page`, `limit`, `tab`, and `activeTab` live in `useState` on ~12 admin/dashboard screens, and the `nuqs/index.ts` schema is **type-unsound** (`page: parseAsString.withDefault("1")` declared as `number`).
5. **You have 32 AI Elements and use 9.** `reasoning` and `tool` are wired in `components/chat/chat-message-list.tsx`, so ChatGPT-quality thinking/tool disclosure is already achievable — it is just underused and running on a local fork that has drifted from upstream.
6. **You are missing the components you care about most.** No `date-picker`, no `data-table`, no `attachment`. All three now exist upstream (`Attachment` is new and has built-in upload states with shimmer). `@tanstack/react-table` is not installed.

---

## 1. Current state, verified

### 1.1 Exact installed versions

From `package.json` and `node_modules` (lockfile-resolved where noted):

| Package | Declared | Locked |
| --- | --- | --- |
| `next` | `16.2.2` | 16.2.2 |
| `react` / `react-dom` | `19.2.4` | 19.2.4 |
| `tailwindcss` | `^4` | **4.2.2** |
| `@tailwindcss/postcss` | `^4` | 4.x |
| `typescript` | `^5` | 5.x |
| `shadcn` (CLI, dev-time) | `^4.1.2` | **4.2.0** |
| `nuqs` | `^2.8.9` | **2.8.9** (latest is 2.10.2) |
| `radix-ui` (unified) | `^1.4.3` | 1.4.3 |
| `@base-ui/react` | `^1.3.0` | 1.3.0 (latest is 1.6.0) |
| `ai` (AI SDK) | `^6.0.149` | **6.0.156** |
| `@ai-sdk/react` | `^3.0.151` | 3.x |
| `@ai-sdk/google` | `^3.0.79` | 3.x |
| `@ai-sdk/openai` | `^3.0.51` | 3.x |
| `lucide-react` | `^1.7.0` | 1.7.0 |
| `next-themes` | `^0.4.6` | 0.4.6 |
| `react-day-picker` | `^9.14.0` | 9.14.0 |
| `cmdk` | `^1.1.1` | 1.1.1 |
| `vaul` | `^1.1.2` | 1.1.2 |
| `sonner` | `^2.0.7` | 2.0.7 |
| `input-otp` | `^1.4.2` | 1.4.2 |
| `recharts` | `^3.8.0` | 3.8.0 |
| `motion` / `framer-motion` | `^12.38.0` | 12.38.0 |
| `class-variance-authority` | `^0.7.1` | 0.7.1 |
| `clsx` | `^2.1.1` | 2.1.1 |
| `tailwind-merge` | `^3.5.0` | 3.5.0 |
| `react-markdown` | `^10.1.0` | 10.1.0 |
| `remark-math` / `rehype-katex` / `remark-gfm` | `6.0.0` / `7.0.1` / `4.0.1` | as declared |
| `react-syntax-highlighter` | `^16.1.1` | 16.1.1 |
| `shiki` | `^4.0.2` | 4.0.2 |
| `streamdown` / `@streamdown/math` | `2.5.0` / `^1.0.2` | as declared |
| `zod` | `^4.3.6` | 4.3.6 |
| `@tanstack/react-query` | `^5.96.2` | 5.96.2 |
| `@uploadthing/react` | `^7.3.3` | 7.3.3 |
| `react-dropzone` | `^15.0.0` | 15.0.0 |
| `use-stick-to-bottom` | `^1.1.3` | 1.1.3 |
| `zustand` | `^5.0.13` | 5.0.13 |
| `@biomejs/biome` | `2.2.0` | 2.2.0 |

**Stack facts confirmed as stated:**
- Tailwind v4 with CSS-first config — yes. `app/globals.css` (252 lines), no `tailwind.config.ts`, `tailwind.config: ""` in `components.json`.
- `reactCompiler: true` in `next.config.ts` — worth knowing, it changes memoisation calculus.
- **Not confirmed as stated:** `radix-ui` and `@base-ui/react` are *both* present as dependencies, but this is accidental, not a deliberate dual-base setup. `@base-ui/react` is imported by exactly **one** file (`components/ui/combobox.tsx`). The rest of `components/ui/` imports from the unified `radix-ui` package (33 import sites). The two are running side by side inside one design system.
- `nuqs` is present at `nuqs/index.ts` — confirmed, and `NuqsAdapter` is correctly mounted in `app/layout.tsx:86` via `nuqs/adapters/next/app`.

### 1.2 Component counts

- `components/ui/` — **55** components
- `components/ai-elements/` — **32** components

Other component folders: `app/` (2), `chat/` (11), `feedback/` (1), `layout/` (5), `marketing/` (3), `onboarding/` (1), `paper3/` (8), `pdf/` (6), `seo/` (3), `user/` (1).

### 1.3 `components.json`

```json
{
  "style": "radix-nova",
  "rsc": true, "tsx": true,
  "tailwind": { "config": "", "css": "app/globals.css",
                "baseColor": "neutral", "cssVariables": true, "prefix": "" },
  "iconLibrary": "lucide",
  "rtl": false, "menuColor": "default", "menuAccent": "subtle",
  "aliases": { "components": "@/components", "utils": "@/lib/utils",
               "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" },
  "registries": { "@ai-elements": "https://ai-sdk.dev/elements/api/registry/{name}.json" }
}
```

Notes:
- `style: "radix-nova"` — the **Radix** base, not the current default **Base UI** base.
- `menuColor: "default"`, `menuAccent: "subtle"`, `baseColor: "neutral"`, `iconLibrary: "lucide"` — these match the **`nova`** preset defaults exactly (see §2.3), so the style choice is coherent, just on the older base.
- The `@ai-elements` registry URL **still works** but now 308-redirects to `elements.ai-sdk.dev/api/registry/{name}.json`. Verified: `curl -sL` returns HTTP 200 with a valid registry item. Worth updating for clarity, not for correctness.
- Missing: `base` and `radius` keys (CLI 4.x wants `base: radix|base`). Harmless today; the CLI infers it.

### 1.4 How well shadcn is being used — the divergence measurement

I fetched every `radix-nova` registry item from `https://ui.shadcn.com/r/styles/radix-nova/{name}.json` and diffed against the local files, normalising only for formatting (Biome's semicolons and trailing commas) and the alias rewrite (`@/registry/default/ui/*` → `@/components/ui/*`).

**Result:**

| | count |
| --- | --- |
| Identical to upstream `radix-nova` | **9** |
| Customised / forked | **46** |
| Not a registry item | 0 |

Identical: `alert`, `aspect-ratio`, `collapsible`, `direction`, `input`, `kbd`, `skeleton`, `table`, `textarea`.

Customised: `accordion`, `alert-dialog`, `avatar`, `badge`, `breadcrumb`, `button`, `button-group`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `combobox`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `empty`, `field`, `hover-card`, `input-group`, `input-otp`, `item`, `label`, `menubar`, `native-select`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `slider`, `sonner`, `spinner`, `switch`, `tabs`, `textarea`(→see note), `toggle`, `toggle-group`, `tooltip`.

**Interpretation.** This is a *good* sign for design quality and a *real* problem for maintenance. Example from `button.tsx` — the local file replaces the stock variants with a violet-tinted system:

```
upstream default: bg-primary text-primary-foreground hover:bg-primary/80
local default:    bg-primary text-primary-foreground [a]:hover:bg-primary/80
upstream outline: border-border bg-background hover:bg-muted …
local outline:    border border-primary/35 bg-primary/10 text-foreground
                  hover:bg-primary/18 aria-expanded:bg-primary/18
                  dark:border-primary/45 dark:bg-primary/15 …
```

That is deliberate design work, not accidental drift. But because the local file is now the source of truth, **there is no upstream diff to merge**. Every future shadcn fix — including the accessibility patches listed in §2.7 — must be hand-applied. See §7 for the mitigation rule.

Other observed drift signals:
- The `cn` package migration (upstream Sept 2026) has **not** been adopted; `cn` is not in `node_modules` and all 55 files import from `@/lib/utils`. Fine, but it means `npx shadcn add` will keep writing new files against `cn`, creating *mixed* imports inside `components/ui/`.
- 12 files still use `asChild`. Radix upstream still supports it, so no break, but shadcn's own Base UI port renames it to `render`.
- `accordion.tsx:77` uses `h-(--radix-accordion-content-height)`. The current `shadcn/tailwind.css` keyframes prefer `var(--radix-accordion-content-height, var(--accordion-panel-height, auto))`. Cosmetic, but it will drift as Radix renames things.
- 26 files use the newer `data-open:` / `data-closed:` / `data-checked:` custom variants — good, `shadcn/tailwind.css` is imported at `app/globals.css:3` and those variants resolve.
- 27 files carry `focus-visible:ring` — this is exactly the class §2.7 flags for contrast failure. See the convention's a11y rule.

### 1.5 Theme (`app/globals.css`)

This is genuinely well done and clearly hand-tuned:

- Semantic tokens in `:root` and `.dark`, in `oklch()`, including `--primary`, `--accent`, `--chart-1..5`, and the full `--sidebar-*` family. Matches the upstream token contract.
- Custom type stack: `--font-sans: Plus Jakarta Sans`, `--font-serif: Lora`, `--font-mono: IBM Plex Mono`.
- `--radius: 1.4rem` — a very soft, large radius. This is the single most distinctive visual decision in the app.
- A **custom shadow scale** (`--shadow-2xs` … `--shadow-2xl` built from `--shadow-x/y/blur/spread/opacity/color`) exposed through `@theme inline`. That is a genuinely Tailwind-v4-native approach and a real asset.
- `--tracking-normal: -0.025em` with a derived `tighter → widest` scale. Also good.
- `--spacing: 0.27rem` — unusual, and it silently rescales every unprefixed Tailwind spacing unit app-wide. Worth a deliberate decision in the rebuild; it is invisible until it surprises you.
- Custom `.container` max-width ladder in `@layer base` overriding Tailwind's container. Reasonable, but it lives in `globals.css` where a theme change can silently break layout.
- Missing: no custom `@theme inline` entries beyond the stock shadcn set. Any new token (e.g. `--warning`) does not exist yet.

### 1.6 Where the codebase bypasses the primitives

Good news: this is a short list.

- **No hand-rolled ARIA.** `grep` for `role="combobox"|"listbox"|"option"|"dialog"|"menu"|"tab"` outside `components/ui/` and `components/ai-elements/` returns **zero** results. Nobody has reimplemented a widget.
- **Seven files hand-roll a full-viewport overlay** (`absolute inset-0` / `fixed inset-0`) outside the primitive folders: `components/referral-processor.tsx`, `app/(admin)/admin/paper3/upload/page.tsx`, `app/result/[shareId]/page.tsx`, `app/(onboarding)/onboarding/page.tsx`, `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx`, `app/(dashboard)/upload/page.tsx`. These are the rebuild's highest-value candidates for conversion to `Dialog`/`Sheet`. `app/(onboarding)/onboarding/page.tsx` in particular is a 5-step wizard hand-built with its own slide transitions — exactly the shape shadcn's new `Questionnaire` covers.
- **One genuinely divergent primitive:** `components/ui/combobox.tsx` is built on `@base-ui/react` while everything around it is Radix. This is the single biggest internal inconsistency and, ironically, it is the one component where the Base UI base is already ahead.

### 1.7 The real problem: URL state

This is the sharpest finding in the whole review, and it is not a UI-toolkit problem at all — but it belongs here because it governs how every screen in the rebuild is built.

`nuqs` is installed, `NuqsAdapter` is mounted, a schema exists at `nuqs/index.ts`… and then:

```
useQueryState / useQueryStates call sites:  3 files, all under app/(auth)/
createSearchParamsCache / createLoader:     0
```

Meanwhile, local component state is doing the work nuqs exists to do:

| File | State |
| --- | --- |
| `app/(admin)/admin/subscriptions/page.tsx:66` | `useState(1)` |
| `app/(admin)/admin/questions/page.tsx:25` | `useState(1)` |
| `app/(admin)/admin/users/page.tsx:67` | `useState(1)` |
| `app/(admin)/admin/feedback/page.tsx:72` | `useState(1)` |
| `app/(admin)/admin/plan-upgrades/page.tsx:102` | `useState(1)` |
| `app/(admin)/admin/affiliates/page.tsx:67` | `useState(1)` |
| `app/(admin)/admin/paper3/questions/page.tsx:46` | `useState(1)` |
| `app/(admin)/admin/metrics/page.tsx:237,241` | `tab`, `page` |
| `app/(admin)/admin/mocks/p1-p2/page.tsx:136` | `activeTab` |
| `app/(dashboard)/leaderboard/page.tsx:20,21` | `page`, `activeTab` |
| `app/(dashboard)/practice/history/page.tsx:15` | `useState(1)` |
| `app/(dashboard)/paper3-leaderboard/[mockId]/page.tsx:13` | `useState(1)` |

`app/(dashboard)/leaderboard/page.tsx:19` is the revealing one: it imports `useSearchParams` **and** keeps `page`/`activeTab` in `useState` — reading the URL but writing state, so the two can drift.

And the schema itself is wrong. `nuqs/index.ts`:

```ts
export const searchParamsSchema = {
  page:  parseAsString.withDefault("1"),   // ← a STRING
  limit: parseAsString.withDefault("10"),  // ← a STRING
  …
}
type ParamsTypes = Values<{
  page:  SingleParserBuilder<number>;      // ← declares NUMBER
  limit: SingleParserBuilder<number>;      // ← declares NUMBER
  …                                      // ← lie, caught only by `as string` below
}}>
export const buildUrl = (href, overrides = {}, params: ParamsTypes) => {
  …
  newParams.set(key, value as string);      // ← `as string` papering over the lie
```

`parseAsInteger.withDefault(1)` exists. The cast at line ~48 is load-bearing, which is exactly the failure mode `nuqs` was built to eliminate.

---

## 2. shadcn/ui in 2026

Sources: <https://ui.shadcn.com/docs>, <https://ui.shadcn.com/docs/components>, <https://ui.shadcn.com/docs/components-json>, <https://ui.shadcn.com/docs/theming>, <https://ui.shadcn.com/docs/tailwind-v4>, <https://ui.shadcn.com/docs/changelog>, <https://ui.shadcn.com/llms.txt>, plus the `shadcn@4.2.0` CLI bundle in `node_modules`.

### 2.1 What it is now

> "shadcn/ui is a set of beautifully-designed, accessible components and a code distribution platform. … **This is not a component library. It is how you build your component library.**"
> — <https://ui.shadcn.com/docs>

Five stated principles: **Open Code** (top layer is yours to modify), **Composition** (shared composable interface across all components), **Distribution** (flat-file registry schema + CLI), **Beautiful Defaults**, **AI-Ready**.

Note the docs list **two new packages** beyond shadcn/ui itself:
- `@shadcn/react` — headless primitives (`MessageScroller`, `Questionnaire`) with no styling.
- `@shadcn/helpers` — AI SDK integration, including **human-in-the-loop** mocking (`needsApproval`) that streams through the real `useChat` lifecycle (Aug 2026, <https://ui.shadcn.com/docs/helpers/ai-sdk>).

### 2.2 The registry model

The registry is the real product. It is how shadcn distributes components, how third parties extend it, and how AI Elements integrates.

- **Schema:** <https://ui.shadcn.com/schema/registry.json> (index) and <https://ui.shadcn.com/schema/registry-item.json> (item). Items carry `dependencies`, `registryDependencies`, `files[]`, `cssVars`, and `css` (declarative CSS/keyframes patches applied to your `globals.css`).
- **Your project is a registry consumer.** `components.json` `aliases` place generated files; `registries` map namespaces to URL templates.
- **Namespaces:** `@ai-elements/message` resolves through the `registries` map in `components.json`. That is exactly how the AI Elements integration works — no special casing in the CLI.
- **Namespaced + private registries:** <https://ui.shadcn.com/docs/registry/namespace>. Since **Aug 2026**, **private GitHub repositories work as registries** — zero-config if `gh` is logged in, or `GH_TOKEN`/`GITHUB_TOKEN` with `Contents: Read-only` for CI. Files are read via the Contents API **pinned to the resolved commit SHA**. This is the mechanism by which we should ship our own primitives.
- **Dynamic search:** registries can handle `shadcn search` server-side and return a `pagination` object, so large registries don't download the whole catalogue (<https://ui.shadcn.com/docs/registry/dynamic-search>).
- **`registry:base`:** a registry item can pin the underlying primitive library. Without one, items now init as **Base UI** — which is why `radix-nova` had to be explicit.
- **MCP server:** <https://ui.shadcn.com/docs/mcp>. Browse, search, and install from registries in natural language from Claude Code, Cursor, Copilot, Codex.
- **Registry directory:** <https://ui.shadcn.com/docs/registry/registry-index> — a curated index of community registries.

### 2.3 Styles: it is not two any more

This is the most commonly-missed change of 2026. `components.json` `style` is now a **base × style** pair. Verified by reading the CLI's preset tables in `node_modules/shadcn/dist/index.js`:

**Bases (primitive layer):** `radix`, `base` — `new shadcn init -b <radix|base>`. Documentation additionally carries an **aria** tab (`ui.shadcn.com/docs/components/aria/*`), and the Aug 2026 Questionnaire changelog states it is "available for Base UI, React Aria, and Radix across all eight styles."

**Styles (visual layer), 6 values:** `nova`, `vega`, `maia`, `lyra`, `mira`, `luma`.

**Presets** combine base + style + icon library + font, as shipped by the CLI:

| Preset | Icons | Font | Notes |
| --- | --- | --- | --- |
| `nova` | Lucide | Geist | Lucide + Geist, neutral |
| `vega` | Lucide | Inter | |
| `maia` | Hugeicons | Figtree | |
| `lyra` | Phosphor | JetBrains Mono | |
| `mira` | Hugeicons | Inter | |
| `luma` | Lucide | Inter | |

Also configurable: `theme` (26 colours), `baseColor` (neutral/stone/zinc/gray/mauve/olive/mist/taupe), `radius` (default/none/small/medium/large), `menuColor` (default/inverted/default-translucent/inverted-translucent), `menuAccent` (subtle/bold), `iconLibrary` (lucide/hugeicons/tabler/phosphor/remixicon), `font` (24 families), `fontHeading`, `chartColor`, `rtl`.

CLI defaults are `--template=next --preset=base-nova`, i.e. **Base UI + nova**.

The old names still work: `default` is deprecated in favour of `new-york`, and `new-york-v4` remains resolvable. `style` and `baseColor` **cannot be changed after initialization** (<https://ui.shadcn.com/docs/components-json#style>) — a hard constraint for the rebuild.

**So: 2 styles became 3 bases × 6 styles.** Our `radix-nova` is one of 18 combinations, and it is on the non-default base.

### 2.4 Base UI as the default — the single most important finding

> "**Base UI is the default component library in shadcn/ui.** … Base UI is stable. It's at 1.6.0 with 6M+ weekly downloads. … Projects created on shadcn/create now pick Base UI over Radix 2 to 1."
> — <https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default> (July 2026)

And, importantly, the same post is *unusually* restrained:

- "**Radix is not being deprecated.** … You do not need to migrate. Radix is a mature, tested library. We still run it in production today and we're not migrating. If your app works, keep shipping."
- Every update and new component ships for **both** libraries "unless a component only exists in Base UI."
- "**Starting something new? We recommend Base UI.**"

The rationale given: *"the same folks who built Radix are building something new… with everything they learned the first time."* Independent corroboration from GreatFrontEnd's 2026 survey (<https://www.greatfrontend.com/blog/top-headless-ui-libraries-for-react-in-2026>): Radix was acquired by WorkOS and "update velocity has slowed for some complex components (Combobox and multi-select being the ones commonly cited)," while Base UI is "the actively maintained alternative."

**Migration is a skill, not a codemod.** shadcn ships a Radix→Base UI migration skill, precisely because "you own the code. You've added variants, changed classes, threaded new props. A codemod handles the components you never touched and breaks on the ones you did." Each run produces a report in `.migration/` and one commit per component on a branch. Their tested figure: 60+ components, 36 on Radix, ~25 minutes, ~10k tokens per component.

For a rebuild where 46 of 55 components are already bespoke, choosing Base UI **at init** is materially cheaper than any migration later. That is the strongest argument in this document.

### 2.5 Tailwind v4 story

Tailwind v4 is the only supported path. <https://ui.shadcn.com/docs/tailwind-v4>

- `tailwind.config` is **blank** in `components.json`; everything lives in CSS.
- Components ship `data-slot="..."` attributes for targeting instead of config-based extension.
- Variants are declared with `@custom-variant` — and shadcn now ships them as a CSS file: `app/globals.css:3` imports `shadcn/tailwind.css`, which defines `@custom-variant data-open`, `data-closed`, `data-checked`, `data-unchecked`, `data-selected`, `data-side`, `data-orientation`, plus the accordion keyframes with the dual `--radix-accordion-content-height, --accordion-panel-height` fallback.
- The `cn` package (<https://github.com/shadcn-ui/cn>, Sept 2026) replaces the two-dep `twMerge(clsx(...))` helper. `npx shadcn migrate cn` rewrites imports and removes `clsx`/`tailwind-merge` when unreferenced.
- Registry items can carry a declarative `css` block that patches your `globals.css` on install.

Our setup is current. The one live drift is that we have not adopted `cn`.

### 2.6 Theming and theming tools

<https://ui.shadcn.com/docs/theming>

- **Token convention:** semantic background/foreground pairs. `primary` pairs with `primary-foreground`; the `-background` suffix is omitted on the surface token.
- **Token set:** `background`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `chart-1..5`, `sidebar` (+ `-foreground`, `-primary`, `-accent`, `-border`, `-ring`), `radius`.
- **Radius scale:** derived from a single `--radius`. `radius-lg` is the base value; smaller scales down, larger scales up. **Changing `--radius` updates the entire scale.** (Note: our `globals.css:163-166` only defines `sm/md/lg/xl` — the current upstream also defines `xs` and `2xl/3xl/4xl`.)
- **Adding tokens:** define under `:root` and `.dark`, expose via `@theme inline`.
- **Dark mode:** CSS variables + a `.dark` class; `next-themes` is the reference implementation (<https://ui.shadcn.com/docs/dark-mode/next>). We already have this.
- **Typeset:** <https://ui.shadcn.com/docs/typeset> — a single CSS file for rendered markdown typography that scales from its container and reads your theme. Directly relevant to our `react-markdown` + KaTeX surfaces.
- **Interactive theming tools:** <https://ui.shadcn.com/create> builds and exports a full preset (`?base=&style=&baseColor=&theme=&iconLibrary=&font=&radius=…`); the Figma kit is at <https://ui.shadcn.com/docs/figma>. The `create` page is where a bespoke `radix`/`base` + `nova` preset with our Plus Jakarta Sans / Lora / IBM Plex Mono stack should be pinned.

### 2.7 Accessibility — genuinely good, and where it falls short

Accessibility is inherited from the primitive layer, which is the strongest part of the story. **But it is not free.**

The best available independent audit (<https://thefrontkit.com/blogs/shadcn-ui-accessibility-audit-2026>, testing every registry component as of April 2026 against VoiceOver and NVDA) found:

- **34 of 48 components pass WCAG 2.2 AA** out of the box.
- **9 need minor fixes.**
- **5 have real gaps that would fail a procurement audit.**

Its central criticism is sharp and fair:

> "The Radix UI primitives shadcn wraps are excellent. **The shadcn layer on top sometimes undoes that work** with default styling that fails contrast or removes focus indicators. The most common failure: **focus visibility**. Radix gives you correct focus management, then shadcn's default styles use `focus-visible:ring-1 ring-ring/50` which fails the 3:1 non-text contrast ratio in most themes."

Specifics that matter for us:

| Component | Problem |
| --- | --- |
| **Combobox** | The default example (Popover + Command) is missing `aria-haspopup="listbox"`, `aria-expanded`, and `aria-controls` on the trigger. WCAG 4.1.2 and 1.3.1 failures. |
| **Data Table** | No `<caption>`, no live region for pagination changes, sort headers don't announce `aria-sort`, row-select checkboxes unlabelled. Called "the single most common shadcn audit failure we see in client engagements." |
| **Chart (Recharts)** | SVG charts have no accessible alternative — screen readers see an empty `<svg>`. WCAG 1.1.1. |
| **Context Menu** | Displays keyboard shortcuts as text without wiring them up. |
| **Input OTP** | Paste doesn't announce completion to screen readers. |
| **Button** | `focus-visible:ring-ring/50` → 2.4:1 in light mode, below the 3:1 AA threshold. |
| **Slider** | Keyboard step too coarse for fine control. |
| **Command (cmdk)** | Missing `aria-label` on the input. |
| **Carousel** | Autoplay doesn't pause for `prefers-reduced-motion`. |
| **Date Picker** | Month/year navigation accessibility. |

**We are exposed to all of these.** 27 files in `components/ui/` carry `focus-visible:ring`; we have a `combobox.tsx` (Base UI-backed — likely fine); we have `chart.tsx` + Recharts; we have `input-otp.tsx`; we have `carousel.tsx`.

**Accessibility mitigation:** because we own the code, every one of these is a one-line fix in our repo, permanently. That is the shadcn argument in its strongest form: the gaps are *our* gaps, so we can just fix them.

---

## 3. Vercel AI Elements in 2026

Sources: <https://elements.ai-sdk.dev/docs/overview>, <https://elements.ai-sdk.dev/docs/setup>, <https://elements.ai-sdk.dev/components/tool>, <https://elements.ai-sdk.dev/components/prompt-input>, the live registry `https://elements.ai-sdk.dev/api/registry/registry.json`, and diffs of our local files against the live registry.

> "AI Elements is a component library and custom registry built on top of shadcn/ui to help you build AI-native applications faster."
> — <https://elements.ai-sdk.dev/docs/overview>

Three stated properties: fully composable; deep AI SDK integration (streaming, status states, type safety); shadcn/ui foundation (your theme applies automatically).

### 3.1 It is now much larger than what we have

The live registry contains **136 items** — ~63 components plus ~73 `example-*` reference implementations (including `example-demo-chatgpt`, `example-demo-claude`, `example-demo-cursor`, `example-demo-grok`, `example-demo-workflow`). We have **32** locally.

New since our install, grouped by area:

- **Chatbot:** `agent`, `confirmation` variants, `transcription`
- **Code (all new to us):** `agent`, `commit`, `environment-variables`, `file-tree`, `jsx-preview`, `package-info`, `sandbox`, `schema-display`, `snippet`, `stack-trace`, `terminal`, `test-results`
- **Voice (all new to us):** `audio-player`, `mic-selector`, `persona`, `transcription`, `voice-selector`
- **Workflow:** `toolbar` (we have it), `canvas`, `connection`, `controls`, `edge`, `node`, `panel`

### 3.2 Installation and customisation

Prerequisites, stated explicitly (<https://elements.ai-sdk.dev/docs/setup>): **Node 18+, React 19, Next.js 14+ (App Router recommended), AI SDK installed, shadcn/ui initialised, Tailwind CSS 4.**

Two install paths:

```bash
npx ai-elements@latest add message
# or, via the shadcn CLI (this is what components.json enables):
npx shadcn@latest add @ai-elements/message
```

Components land in `@/components/ai-elements/`. There is also a **skill** (<https://elements.ai-sdk.dev/docs/skill>) for agent-driven installation.

Because AI Elements is a plain shadcn registry, **customisation is identical to shadcn**: the file is in our repo and we edit it. There is no separate theming layer. Confirmed by our own `reasoning.tsx`, which is stock AI Elements plus our own `Streamdown` + `@streamdown/math` + `normalizeMathNotation` additions.

### 3.3 AI SDK version assumption — verified against our repo

AI Elements requires **AI SDK** but does not pin a major version in its docs; it is type-coupled to the `ai` package. **We are on `ai@6.0.156`, and the local components typecheck against it.** Verified directly:

- `components/ai-elements/tool.tsx:10` — `import type { ToolUIPart } from "ai"`
- `components/ai-elements/message.tsx:4` — `FileUIPart`, `UIMessage`
- `components/ai-elements/prompt-input.tsx:38` — `ChatStatus`, `FileUIPart`
- `components/ai-elements/attachments.tsx:10` — `FileUIPart`, `SourceDocumentUIPart`
- `components/ai-elements/context.tsx:11` — `LanguageModelUsage`
- `components/ai-elements/image.tsx:2` — `Experimental_GeneratedImage`

And `node_modules/ai/dist/index.d.ts` (v6.0.156) exports `ToolUIPart`, `DynamicToolUIPart`, `UIMessage`, `FileUIPart`, `ReasoningUIPart`, `SourceUrlUIPart`, `SourceDocumentUIPart`, `DataUIPart`, `StepStartUIPart`, `isDataUIPart`. Our server route uses `streamText` + `result.toUIMessageStreamResponse()`, which is the v6 stream protocol AI Elements consumes.

`ToolUIPart["state"]` in v6 has **seven** values: `input-streaming`, `input-available`, `approval-requested`, `approval-responded`, `output-available`, `output-error`, `output-denied`. Our local `tool.tsx` handles exactly these — so **we are compatible with AI SDK 6 and the human-in-the-loop approval states already work.**

**Upgrade risk to record:** AI SDK 7 is a breaking migration (`fullStream`, `tool` context, `finalStep`, system → instructions). If we upgrade `ai`, we must re-run `npx shadcn@latest add @ai-elements/*` to pick up the v7-shaped components, or hand-patch. Pin this in the rebuild.

### 3.4 Coverage of the specific things we need

| Requirement | Component | Status | Notes |
| --- | --- | --- | --- |
| **Thinking block** | `reasoning.tsx` | ✅ installed, ✅ **used** | Wrapped in `Reasoning`/`ReasoningTrigger`/`ReasoningContent` at `components/chat/chat-message-list.tsx:271`. Auto-durations itself, collapses while streaming, renders via Streamdown. Our fork adds KaTeX + `normalizeMathNotation`. |
| **Extended thinking / chain** | `chain-of-thought.tsx` | ✅ installed, ❌ unused | Not imported anywhere. |
| **Tool call rendering** | `tool.tsx` | ✅ installed, ✅ **used** | `components/chat/chat-message-list.tsx:130`. |
| **Reasoning display** | `reasoning.tsx` | ✅ used | See above. |
| **Attachment / file input** | `attachments.tsx` | ✅ installed, ✅ used | In `chat-composer.tsx`. |
| **Prompt input** | `prompt-input.tsx` | ✅ installed, ✅ used | 1463 lines upstream. |

**Usage census** — only these 9 of 32 are imported outside their own folder:
`attachments`, `conversation`, `loader`, `message`, `prompt-input`, `reasoning`, `sources`, `suggestion`, `tool`.
All from `components/chat/{chat-message-list,chat-landing,chat-thread,chat-composer}.tsx`.

**23 installed AI Elements are dead weight.** Given we are doing a rebuild, the correct move is to delete the unused ones and install the ones the rebuild actually needs from the current registry.

### 3.5 Capability detail for the disclosure requirements

**`Tool`** (<https://elements.ai-sdk.dev/components/tool>) — `<Tool>` / `<ToolHeader>` / `<ToolContent>` / `<ToolInput>` / `<ToolOutput>`, built on `Collapsible`.

- Consumes `ToolUIPart` (and `DynamicToolUIPart`) directly — no adapter layer.
- States: `input-streaming` (Pending), `input-available` (Running), `approval-requested` (Awaiting Approval), `approval-responded` (Responded), `output-available` (Completed), `output-error` (Error), `output-denied` (Denied).
- `getStatusBadge(state)` returns a `<Badge>` with icon + label for each state.
- Auto-opens completed and errored tools by default.
- `<ToolInput>` takes `ToolUIPart["input"]`, `<ToolOutput>` takes `output` and `errorText`.
- Accessibility is called out as a feature ("Accessible keyboard navigation and screen reader support").

This is exactly the ChatGPT-style tool disclosure the owner asked about, and it is **already in the repo**.

**`PromptInput`** (<https://elements.ai-sdk.dev/components/prompt-input>) — features list, verbatim highlights:

- Auto-resizing textarea; Enter submits, Shift+Enter newlines
- File attachment support with drag-and-drop
- Built-in screenshot capture action
- Image preview for image attachments
- Configurable constraints: max files, max size, accepted types, via `accept`, `multiple`, `onError` (`max_files` / `max_file_size` / `accept`)
- Automatic submit-button icons based on `status`
- Built-in model selection dropdown; built-in Web Speech API button
- **Optional provider for lifted state** (`usePromptInputAttachments`)
- **Hidden file input synced for native form posts** — this is how server actions receive files
- **Global document drop support (opt-in)**
- Responsive, mobile-friendly controls
- Form resets on submit

Also composable with `<Attachments variant="inline" />` via `usePromptInputAttachments()`.

**`Reasoning`** — collapsible, duration-tracked, `isStreaming` aware, renders with Streamdown (our fork adds math).

**Not yet available to us but worth knowing:** `chain-of-thought` (step-by-step disclosure), `sources`, `inline-citation`, `plan`, `task`, `checkpoint`, `context` (token usage — `LanguageModelUsage`), `agent`, `terminal`, `file-tree`, `schema-display`, `confirmation`.

---

## 4. Alternatives evaluated

Bar for recommending a change: **shadcn style ownership plus Tailwind v4 customisation is a real advantage we would give up.** Applied honestly, nothing clears it.

### 4.1 Primitive layer (headless, unstyled)

#### Base UI (MUI) — <https://base-ui.com/>

- **What it is:** the actively maintained Radix successor, from the MUI team, with full-time engineers. v1.6.0, 6M+ weekly downloads, 25+ components. Installed here already at **1.3.0** (one version behind).
- **Genuinely better at:** faster iteration on the hard primitives. API is `Root`/`Trigger`/`Portal`/`Positioner`/`Popup`/`Arrow`/`Title`/`Description` — a more explicit positioner/popup split than Radix. This is the layer whose Combobox and multi-select are cited as Radix's weak points.
- **Costs you:** it is unstyled, so on its own it is strictly *more* work than shadcn. It is a *substitute for Radix under shadcn*, not a substitute for shadcn.
- **Verdict: adopt as the base, not as the toolkit.** This is exactly what shadcn made Base UI the default for.
- Two setup gotchas worth pre-empting (<https://base-ui.com/react/overview/quick-start>): add `isolation: isolate` to your app root so portaled popups always sit above everything and your `z-index` values don't fight them; and for iOS 26+ Safari, add `body { position: relative }` because backdrops must be `position: absolute` to cover the visual viewport.

#### React Aria Components (Adobe) — <https://react-spectrum.adobe.com/react-aria/>

- **What it is:** hooks-first (`useButton`, `useDialog`, `useTabs`) across 40+ patterns. ~4.47M weekly downloads, ~15.1k stars. The most accessibility-rigorous option available.
- **Genuinely better at:** accessibility conformance; internationalisation — RTL and locale-aware date/number handling out of the box; adaptive interactions.
- **Costs you:** significantly more code per component; verbose; a real learning curve.
- **Now also a shadcn base.** shadcn ships an `aria` docs tab and the Questionnaire changelog says it is available "for Base UI, React Aria, and Radix across all eight styles."
- **Also worth noting:** HeroUI rebuilt on React Aria Components + Tailwind v4 (see §4.2).
- **Verdict: not as our default base.** Its a11y advantage is not the binding constraint — our a11y ceiling is set by shadcn's *styling* layer, which we own and can fix. React Aria would raise the floor but cost the ergonomics we rely on daily. Revisit if a contractual WCAG requirement appears.

#### Ark UI (Chakra / Zag.js) — <https://ark-ui.com/>

- **What it is:** state-machine-driven (Zag/XState) primitives, React + Vue + Solid from one logic implementation. 35+ components, ~634.7k weekly downloads.
- **Genuinely better at:** cross-framework parity — same Combobox behaviour in React and Vue with one implementation. Predictable behaviour on complex components because behaviour is a state chart, not ad-hoc JS.
- **Costs you:** if React-only, React-specific options have more idiomatic APIs; smaller ecosystem.
- **Verdict: no.** No multi-framework requirement.

#### Kobalte — <https://kobalte.dev/>

- **What it is:** "A UI toolkit for building accessible web apps and design systems with **SolidJS**." Accessible, unstyled, zero styles shipped.
- **Genuinely better at:** SolidJS-specific ergonomics; tiny bundle.
- **Costs you:** **it is not React.** Disqualified for this app.

#### Ariakit — <https://ariakit.org/>

- Hooks + components, sits between Radix's composition and React Aria's hooks-first. ~25+ components, ~697.9k weekly downloads. Smallest bundle of the serious options.
- **Genuinely better at:** bundle size; a11y correctness (the audit in §2.7 explicitly suggests Ariakit's `useComboboxState` as the fix for shadcn's combobox ARIA gaps).
- **Costs you:** smallest community and Stack Overflow surface.
- **Verdict: no as a base** (shadcn doesn't support it). **Yes as a reference** — if we need to build a combobox with correct ARIA and shadcn's Base UI combobox falls short, Ariakit's patterns are the reference implementation.

#### Headless UI (Tailwind Labs) — <https://headlessui.com/>

- ~10 components, ~5.49M weekly downloads, ~28.6k stars. Built by the Tailwind team.
- **Genuinely better at:** nothing we need. It is the most beginner-friendly and the *smallest*.
- **Costs you:** no Combobox-with-virtualization, no advanced data-table primitives.
- **Verdict: no.** Strictly a subset of what shadcn offers.

### 4.2 Styled kits / forks

#### Park UI — <https://park-ui.com/> (GitHub: `chakra-ui/park-ui`)

- **What it is:** "Beautifully designed components built with **Ark UI and Panda CSS** that work with a variety of JS frameworks." React and Solid.
- **2026 news:** "🎉 Park UI × Chakra — It's official!" — Park UI is now **part of the Chakra UI organization** (<https://park-ui.com/blog/park-ui-joins-the-chakra-ui-organization>).
- **Genuinely better at:** it is a *cooked* design system with opinionated, cohesive aesthetics out of the box, plus multi-framework support.
- **Costs you:** **Panda CSS.** That is the disqualifier. We have committed to Tailwind v4 with a CSS-first `globals.css`. Adopting Panda means a second styling system, a second token pipeline, and losing the entire `app/globals.css` investment (custom shadow scale, tracking scale, oklch tokens, container ladder). Also shifts primitives to Ark UI, away from shadcn's Radix/Base/Radix-Aria bases.
- **Verdict: no.** The Panda CSS cost alone exceeds the benefit.

#### Origin UI — <https://originui.com>

- **What it is:** "A new, modern UI component library built on top of **Base UI**. Built for developers and AI." ~500+ components, including `Autocomplete`, `Calendar` ("range and multi-select support"), `Checkbox Group`, and a full ARIA-complete set. Docs have moved to `coss.com/ui/docs`.
- **Genuinely better at:** breadth — it is the largest Base UI-styled catalogue, and because it is Base UI-backed its combobox/select primitives are the strong ones. The "built for AI" positioning is real: it is literally a shadcn registry.
- **Costs you:** it is a *third* style opinion competing with our own. Adopting it means importing someone else's `radix-nova`-alternative visual language into a design system we have already tuned (`--radius: 1.4rem`, custom shadows, Plus Jakarta Sans). And it is very new — churn risk.
- **Verdict: use as a source of patterns, not as an install target.** If we build a combobox and Base UI's is missing a piece, Origin UI's Base UI combobox is a legitimate copy source *into our fork*, keeping our tokens.

#### Magic UI — <https://magicui.design>

- **What it is:** "150+ free and open-source **animated** components and effects built with React, TypeScript, Tailwind CSS, and **Motion**." Self-described "Perfect companion for shadcn/ui." Now also has Magic UI Pro (50+ blocks and templates).
- **Genuinely better at:** motion and effects — the animated/decorative layer we do not have and would otherwise hand-build.
- **Costs you:** nothing structural, but nothing structural gained either. It is a supplement, not a replacement.
- **Verdict: adopt narrowly.** Use Magic UI (and Aceternity) **only** for marketing/landing page animation, on a whitelist. Never inside `components/ui/` or product surfaces — these are heavy, and `prefers-reduced-motion` handling is inconsistent.

#### Aceternity UI — <https://aceternity.com>

- Agency-led (12+ years, "exceptionally good-looking websites for startups"). Tailwind + Framer Motion, shadcn-compatible.
- **Genuinely better at:** marketing-page visual polish — backgrounds, cards, glows. Clients include Cursor and Neon.
- **Costs you:** heavier DOM, GPU cost, motion that needs manual `prefers-reduced-motion` handling; production readiness varies.
- **Verdict: same as Magic UI — marketing only, whitelisted.**

#### UI Layouts — <https://ui-layouts.com>

- Copy-paste components, effects, design tools, and blocks. Large Pro tier.
- **Genuinely better at:** block-level layouts (heroes, pricing tables, bento grids).
- **Costs you:** Pro paywall for the best blocks; same motion caveats.
- **Verdict: marketing only, whitelisted.** Note that shadcn's own [Blocks](https://ui.shadcn.com/blocks) (`dashboard-01`, `sidebar-01`, `login-01`, `signup-01`) already covers the *product* side natively and in our own tokens — prefer those.

#### HeroUI (formerly NextUI) — <https://heroui.com>

- **What it is, 2026:** "The web library combines **React Aria Components with Tailwind CSS v4**." 30.9k stars. React web **and React Native** (HeroUI Native v1.0.10). Has MCP packages, llms.txt, an official CLI.
- **Genuinely better at:** it is the strongest *batteries-included* option — genuinely accessible by construction (React Aria underneath), Tailwind v4-native, and it uniquely bridges **web and React Native** from one component set. Excellent docs and agent tooling.
- **Costs you:** it is an **npm component library**, not open-code. Every "customise to a top notch look" becomes either a theme-override or a `className` fight. That is precisely the advantage we would give up, and the owner explicitly values that advantage. Plus we'd be replacing a bespoke, already-tuned design system with their defaults.
- **Verdict: no.** This is the closest genuine competitor and it still loses on the ownership criterion.

#### Mantine — <https://mantine.dev>

- 120+ components, 70 hooks. Strong forms, dates, notifications, modals. Good LLM story now: `llms.txt` / `llms-full.txt`, agent skills, `@mantine/mcp-server`.
- **Genuinely better at:** breadth and ergonomics for app-shell work — `useForm`, `@mantine/dates` with locale-aware pickers, `@mantine/dropzone` with built-in previews and progress. For a forms-and-dates-heavy product this is real.
- **Costs you:** CSS Modules (not Tailwind) as the styling contract — a hard incompatibility with our Tailwind v4 commitment; a runtime theme provider and PostCSS pipeline; a bundled npm dependency rather than owned code; and its `AppShell` would collide with our shadcn `sidebar.tsx`.
- **Verdict: no.** The Mantine dates/dropzone quality is a genuine gap in our stack — see §5, where I recommend closing it with shadcn's `Attachment` plus `react-dropzone` rather than by switching.

### 4.3 Verdict

**Nothing researched beats shadcn/ui + Tailwind v4 for this app.** The two things that genuinely beat it are things it has *absorbed*:

- Base UI's primitive quality → shadcn made it the default base.
- React Aria's accessibility → shadcn ships it as an `aria` base.

Keeping shadcn gives us optionality on the exact axis others are strong on. Leaving it gives that up.

---

## 5. The components we actually need

Legend: ✅ have it · ⬜ missing · 🔧 build custom.

| Need | Use | Notes |
| --- | --- | --- |
| **Date picker** | 🔧 compose `Popover` + `Calendar` as `components/ui/date-picker.tsx` | Upstream now documents a first-class **Date Picker** (<https://ui.shadcn.com/docs/components/base/date-picker>) but it is explicitly *not a component*: "A date picker is built from `Popover` and `Calendar` (**there is no `DatePicker` root component**)". We own the composition. Supports Basic, Range, Date-of-Birth, Time Picker, **Natural Language Picker** ("next Friday"), and RTL. Fix the month/year nav a11y gap (§2.7) while we are in there. |
| **Date range** | 🔧 same `date-picker.tsx`, `mode="range"` | We have `react-day-picker@9.14.0` already. Use `parseAsIsoDate` / a two-key nuqs pair for the URL. |
| **Dropdown menu** | ✅ `dropdown-menu.tsx` | Radix-backed. Add the keyboard-shortcut honesty fix from §2.7. |
| **Select** | ✅ `select.tsx` | Radix-backed. For short, static, native-friendly option sets prefer `native-select.tsx` (mobile gets the OS picker). |
| **Combobox, async search** | ✅ `combobox.tsx`, **rebuild on Base UI** | Ours is the one Base UI component today — keep it, and make it *the* reference. Requirements: `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` on the trigger; loading + empty states; debounced async search (pair with `nuqs` `debounce`); keyboard nav; virtualisation for long lists. Copy patterns from [Origin UI](https://originui.com) combobox/autocomplete if Base UI lacks a piece — into *our* tokens. |
| **Multi select** | ✅ `combobox.tsx` multiple mode | Upstream documents Multiple Selection, Groups, Clear Button, Invalid, Auto Highlight. Alternatively `command.tsx` + checkboxes in a Popover. |
| **Slider** | ✅ `slider.tsx` | Fix the coarse-keyboard-step gap; add `aria-valuetext` for ranges. |
| **Switch** | ✅ `switch.tsx` | |
| **Tabs** | ✅ `tabs.tsx` | Pair with `nuqs` — see §6.7. |
| **Toast** | ✅ `sonner.tsx` | Extend duration for cognitive a11y; keep `richColors` consistent. |
| **Dialog** | ✅ `dialog.tsx` | Convert the 7 hand-rolled overlay files (§1.6). |
| **Drawer** | ✅ `drawer.tsx` (vaul) + `sheet.tsx` | Rule: `Dialog` on ≥sm, `Drawer` on <sm for the *same* interaction. Fix focus-return-on-close. |
| **Tooltip** | ✅ `tooltip.tsx` | |
| **Popover** | ✅ `popover.tsx` | |
| **Accordion** | ✅ `accordion.tsx` | |
| **Table** | ✅ `table.tsx` | |
| **Data table** | 🔧 `components/ui/data-table.tsx` + install `@tanstack/react-table` | **Not installed today (0 matches in package.json).** Upstream's guide uses **TanStack Table v9** (<https://ui.shadcn.com/docs/components/base/data-table>). Must fix, per §2.7: `<caption className="sr-only">`, `aria-live="polite"` row-range announcement, `aria-sort` on sortable headers, per-row checkbox `aria-label`. For a leaderboard/paper3/admin app this is the highest-value missing primitive. |
| **Form field + validation + error** | ✅ `field.tsx` (Base UI Field) | This is the modern replacement for the old `form.tsx` + RHF glue. It gives label/description/error wiring with correct `aria-describedby`. `@hookform/resolvers@5.2.2` and `zod@4.3.6` are installed for schema validation. Ship **one** app-wide pattern: `Field` + `Label` + `Control` + zod, and use it on every form. |
| **Rich text / markdown editor** | 🔧 **No shadcn primitive exists.** | shadcn has no editor. `react-markdown` + `remark-math` + `rehype-katex` + `remark-gfm` + `streamdown` + `shiki` are all installed, so we have an excellent *renderer*. Decision needed: (a) a `components/markdown.tsx` wrapper exposing `Markdown` + `InlineCode` + `CodeBlock` with KaTeX + shiki — a renderer, not an editor; or (b) a real editor (Tiptap/Lexical), which is a genuine new dependency. **Recommendation: (a) now, (b) only if authoring is actually required.** If (b), build it as `components/editor/` and never inline a third-party editor into `components/ui/`. shadcn's [Typeset](https://ui.shadcn.com/docs/typeset) is worth reading first — one CSS file for rendered markdown. |
| **File upload + preview + progress** | ✅ shadcn `Attachment` + our `react-dropzone` + `@uploadthing/react` | **shadcn `Attachment` exists and we don't have it** (<https://ui.shadcn.com/docs/components/base/attachment>): media, metadata, upload states `idle`/`uploading`/`processing`/`error`/`done` with built-in shimmer, `AttachmentGroup` (scrollable, snapping, edge fade), `AttachmentTrigger`, three sizes, orientations, and its own Accessibility section. Install it. Wrap our UploadThing handler behind it. AI Elements' `Attachments` is the chat-specific variant; shadcn `Attachment` is the product-side one. Use shadcn's for settings/admin, AI Elements' inside chat. |
| **Progress bar** | ✅ `progress.tsx` | Wire real upload progress to `Attachment`'s upload state rather than a separate bar. |
| **Skeleton** | ✅ `skeleton.tsx` | Identical to upstream — leave it alone. |
| **Avatar** | ✅ `avatar.tsx` | |
| **Empty state** | ✅ `empty.tsx` | Already present and part of the nova vocabulary. Use everywhere data is absent. |
| **Step / wizard** | ✅ **shadcn `Questionnaire`** (new, Aug 2026) | <https://ui.shadcn.com/docs/components/base/questionnaire>. Single and multiple selection, freeform answers, explicit skipping, previous/next/submit, required and custom validation, controlled navigation, conditional questions, keyboard shortcuts with letter/number hints, native form serialization, and Standalone/Card/Dialog composition. "Use it for agent clarification prompts, **onboarding**, surveys, intake forms, and configuration." Available on all three bases. **This is exactly what `app/(onboarding)/onboarding/page.tsx` hand-rolls today.** Also available headless via `@shadcn/react`. |

**The three gaps to close:** `data-table` (+ `@tanstack/react-table`), `date-picker` (composition), and `Attachment` (install). The one to *adopt* rather than build: `Questionnaire`.

---

## 6. nuqs, properly

Sources: <https://nuqs.dev/docs/basic-usage>, <https://nuqs.dev/docs/options>, <https://nuqs.dev/docs/server-side>, <https://nuqs.dev/docs/adapters>, <https://nuqs.dev/docs/parsers/built-in>, <https://nuqs.dev/changelog>, <https://github.com/47ng/nuqs/issues/1263>. Note `nuqs.com` is currently parked; **`nuqs.dev`** is the live docs site.

We are on **2.8.9**; latest is **2.10.2** (2026-10-08).

### 6.1 What problem it solves

URL query state done properly means: typed, validated, shareable, linkable, SSR-able, and back-button-correct. Doing it by hand with `useState` + `useSearchParams` gives you none of the first five and a broken version of the sixth. The library's framing is that **the URL is the state**, and a parser descriptor is the single schema shared by client and server.

### 6.2 The adapter

Since v2, framework support is via a `NuqsAdapter` provider. For us:

```tsx
// app/layout.tsx  — already correct in this repo
import { NuqsAdapter } from "nuqs/adapters/next/app"
<NuqsAdapter>{children}</NuqsAdapter>
```

Other adapters: `nuqs/adapters/next/pages`, `nuqs/adapters/react`, `nuqs/adapters/remix`, `nuqs/adapters/react-router/v6|v7|v8`, `nuqs/adapters/tanstack-router`. Remix is noted as no longer receiving security updates.

The adapter is required. Without it: `[nuqs] nuqs requires an adapter to work with your framework.`

### 6.3 Client-side use

```ts
const [page, setPage]   = useQueryState("page", parseAsInteger.withDefault(1))
const [tab, setTab]     = useQueryState("tab", parseAsString.withDefault("overview"))
const [q, setQ]         = useQueryStates({ q: parseAsString.withDefault("") })
```

`useQueryStates` batches multiple keys into **one** history entry and **one** `history.replaceState` — this is why batching matters, not just tidiness.

### 6.4 Typing and validators

Built-in parsers (`nuqs.dev/docs/parsers/built-in`): `parseAsString`, `parseAsInteger`, `parseAsFloat`, `parseAsHex`, `parseAsIndex`, `parseAsStringLiteral(...)` for string enums, `parseAsNumericLiteral(...)`, `parseAsIsoDateTime`, `parseAsIsoDate`, `parseAsTimestamp`, plus `parseAsArrayOf`, `parseAsJson`, `parseAsBoolean`.

`.withDefault(v)` narrows the type from `T | null` to `T` — the single most valuable ergonomic in the library, and the thing `nuqs/index.ts` currently gets wrong.

Default behaviour: absent param → `null`. **Invalid value → the default**, if one exists, else `null`. So malformed URLs degrade gracefully instead of throwing.

### 6.5 Clearing and resetting — the rules that bite

Four behaviours, all verified from the docs:

1. **Defaults are internal to React.** The default value is **not written to the URL** unless you set it explicitly *and* use `clearOnDefault: false`.
2. **Setting `null` always removes the param** from the query string.
3. **Setting the state to the default value** (with `clearOnDefault: true`, the v2 default) **removes the param** and returns the default. It does **not** put `?tab=overview` in the URL.
4. **`clearOnDefault` was `false` in 1.x and became `true` in 2.0.0.** This is a behavioural change to know about — `?search=` disappearing from the URL is correct, not a bug.
5. **`clearOnDefault` uses `===` reference equality.** For custom parsers returning objects (e.g. `Date`), supply `eq`, or supply `eq` for a date parser:

```ts
const dateParser = createParser({
  parse:    (v: string) => new Date(v.slice(0, 10)),
  serialize:(d: Date)   => d.toISOString().slice(0, 10),
  eq:       (a: Date, b: Date) => a.getTime() === b.getTime(),
})
```

6. **`defaultRateLimit`** resets debounce/throttle back to default for a single call: `setState("bar", { limitUrlUpdates: defaultRateLimit })`.

### 6.6 Options worth knowing

| Option | Default | When to change |
| --- | --- | --- |
| `history` | `'replace'` | `'push'` for tabs and modals only. Docs: *"Make sure to use this option only if the search params to update contribute to a navigation-like experience (eg: tabs, modals). Overriding the Back behaviour must be a UX enhancement rather than a nuisance."* |
| `shallow` | `true` | `false` when the server must re-render. Pair with the `searchParams` page prop. |
| `scroll` | `false` | `true` on filter changes so users are not left mid-page. |
| `clearOnDefault` | `true` | `false` when the default can change and the URL must stay meaningful. |
| `limitUrlUpdates` | browser-adaptive throttle | `debounce(300)` for search-as-you-type, `throttle(250)` for sliders. |
| `startTransition` | — | From `useTransition`; with `shallow: false` gives `isLoading` while RSC re-renders. **v2 note: passing `startTransition` no longer implies `shallow: false` — set it explicitly.** |

`defaultOptions` on `<NuqsAdapter>` sets global defaults for the whole tree (v2.5.0+).

### 6.7 Patterns

**Tabs** — `history: 'push'`, so Back returns to the previous tab.
```ts
const tabSchema = { tab: parseAsStringLiteral("overview","quiz","global").withDefault("overview") }
const [tab, setTab] = useQueryState("tab", tabSchema.tab.withOptions({ history: "push" }))
```

**Pagination** — reset to 1 when a filter changes. Do it by setting both keys in one batch.
```ts
const [params, setParams] = useQueryStates({
  page:  parseAsInteger.withDefault(1),
  limit: parseAsIntegerLiteral([10, 25, 50, 100]).withDefault(10),
})
// changing a filter:
setParams({ page: 1 })          // one history entry, because batched
```

**Sort** — encode as `sort` + `order` rather than `sort=asc:name`; two parsers are simpler to validate and to serialise.
```ts
const [sort, setSort]   = useQueryState("sort",   parseAsString.withDefault("createdAt"))
const [order, setOrder] = useQueryState("order",  parseAsStringLiteral("asc","desc").withDefault("desc"))
```

**Filters** — debounce the free-text one; leave selects instant.
```ts
const [q, setQ] = useQueryState("q", parseAsString.withDefault("")
  .withOptions({ limitUrlUpdates: debounce(300) }))
```

**Modals** — `history: 'push'` on a `modal` param. Back closes the modal; this is the correct use of push.

**Server side** — `createLoader` (v2.3.0+) and `createSearchParamsCache` (v1.13.0+):
```ts
// nuqs/search-params.ts  — import from "nuqs/server" to avoid "use client"
import { createSearchParamsCache, createLoader, parseAsInteger, parseAsString } from "nuqs/server"
export const leaderboardSearchParams = {
  tab:  parseAsString.withDefault("quiz"),
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(25),
}
export const loadSearchParams   = createLoader(leaderboardSearchParams)
export const searchParamsCache = createSearchParamsCache(leaderboardSearchParams)
```
```ts
// app/(dashboard)/leaderboard/page.tsx
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { tab, page } = await loadSearchParams(searchParams)
  …
}
// Nested server components below the page:
const limit = searchParamsCache.get("limit")
```

Two server-side details worth internalising:
- **Do not forget `await searchParamsCache.parse(searchParams)`** in the page — the cache is seeded there.
- You **do not have to await the loader.** Pass the `Promise` to a child inside `<Suspense>` and benefit from PPR / `dynamicIO`, serving a static outer shell while the search-param-dependent parts stream in. With Next 16 and `reactCompiler: true`, this is a genuinely good pattern for our admin tables.
- `loadSearchParams` accepts a full URL, `?foo=bar`, a `URL`, `URLSearchParams`, a `Request`, a `Record`, or a `Promise` of any of those.
- **Strict mode** (v2.5.0+): `loadSearchParams(x, { strict: true })` throws on an invalid value instead of returning the default.
- **Loaders do not validate.** "If you expect positive integers or JSON-encoded objects of a particular shape, you'll need to feed the result of the loader to a schema validation library, like Zod." (Built-in validation is coming via RFC 446; otherwise use custom parsers.)

### 6.8 Pitfalls

1. **Next 16 adapter detection — [issue #1263](https://github.com/47ng/nuqs/issues/1263) (closed, duplicate).** On Next 16 with `nuqs@2.8.5`, users hit `[nuqs] nuqs requires an adapter to work with your framework` despite a correct `NuqsAdapter`. **Root cause was never Next 16** — it was [issue #798](https://github.com/47ng/nuqs/issues/798): **two different nuqs versions resolved across packages in a workspace/monorepo, so the Context reference differs.** Our `pnpm-workspace.yaml` exists (for `onlyBuiltDependencies`) and our lockfile resolves a single `nuqs@2.8.9`, so we are safe — but the rule is: **nuqs must be a single resolved version across the whole workspace.** This is the exact failure mode to guard against when adding packages.
2. **`clearOnDefault` semantics.** A default is never written to the URL. If a screen must be linkable at its default, set `clearOnDefault: false`.
3. **`shallow: true` is the default**, so the server does **not** re-render on a query change. If server data depends on the query, you need `shallow: false` **plus** `startTransition` **plus** the `searchParams` prop. Forgetting `shallow: false` is the most common "my server data doesn't update" bug.
4. **`startTransition` no longer implies `shallow: false` in v2.** Explicit is now required.
5. **Untyped schemas lie.** Our `parseAsString.withDefault("1")` declared as `number` in `ParamsTypes`, with `value as string` in `buildUrl`, is exactly the class of bug `nuqs` exists to remove. Use `parseAsInteger` and let inference do the work.
6. **Resetting page on filter change** is not automatic. Nobody remembers this; every table gets it wrong once.
7. **`push` everywhere breaks the Back button.** Reserve it for tabs and modals.
8. **v2.10.x has recent transition/queue fixes**: #1568 "keep pending query state in its transition lane" and #1613 "keep flushed queue values until the adapter shows them" (both in 2.10.2), plus #1553/#1558 in 2.10.1 and the 2.10.0 `serverSearch` SSR seeding feature. We are on 2.8.9 and **should upgrade to 2.10.2 before the rebuild** — several of those fixes target exactly the transition bugs users hit with `shallow: false`.
9. **React 19.** No incompatibility. React 19 matters only for the `startTransition`/promise-awaited-transitions behaviour the docs describe for React Router v7+ data routers; Next's model does not require awaiting `navigate()`.

### 6.9 Best-practice rules to adopt

1. **One descriptor module per screen area**, in `nuqs/` (or `<area>/search-params.ts`), exported as a named object. Never inline a parser literal in a component.
2. **Import server-side descriptors from `nuqs/server`** (`createLoader` / `createSearchParamsCache`) so they never drag in `"use client"`.
3. **Every parser has a `.withDefault(...)`.** No bare `parseAsString` for filter state — nullable state is the main source of tedium.
4. **Enums use `parseAsStringLiteral(...)` or `parseAsNumericLiteral(...)`.** Never a free-form string for a closed set.
5. **Use `useQueryStates` when more than one key changes together** — one history entry per logical action.
6. **Changing a filter resets `page` to 1**, in the same batched call.
7. **Free-text search is `debounce(300)`**; selects and toggles are instant.
8. **`history: 'push'` only for tabs and modals.** Everything else inherits `'replace'`.
9. **If the server must react, `shallow: false` + `startTransition` + the `searchParams` prop, together.** All three or none.
10. **Wrap tabbed/paginated/filtered regions in `<Suspense>`** and pass the loader's Promise through, for PPR.
11. **Reset state on mount only when the screen declares `clearOnDefault: false`**, otherwise let defaults vanish from the URL.
12. **One nuqs version in the workspace.** Guard in CI.

---

## 7. Recommended convention

Paste into project instructions.

---

### UI Toolkit Convention

**Stack:** Next.js App Router · React 19 · TypeScript · Tailwind v4 (CSS-first, `app/globals.css`) · shadcn/ui · Vercel AI Elements · nuqs.

#### 1. shadcn/ui is the default

1. **Every screen is built from `components/ui/`.** Before writing a `div` with a click handler, a styled `<input>`, a modal, a dropdown, or a table row style — check `components/ui/` first. `ls components/ui/` before you start.
2. **Do not import a widget library.** No Mantine, no HeroUI, no Chakra, no Ant Design, no Headless UI, no Kobalte. The only permitted primitive dependencies are the ones a `components/ui/` file already uses (`radix-ui`, `@base-ui/react`, `cmdk`, `vaul`, `sonner`, `input-otp`, `react-day-picker`, `@xyflow/react`, `react-resizable-panels`, `embla-carousel-react`).
3. **Install with the CLI, never by pasting:** `npx shadcn@latest add <name>`. Never hand-copy a component from a website into `components/ui/`.
4. **Two bases, on purpose.** `components/ui/` is Radix-backed. **The only sanctioned exception is `combobox.tsx`, which is Base UI-backed** because Base UI's combobox is strictly better. Do not mix bases elsewhere without an ADR. New projects (branches, rewrites) should initialise with `-b base`; do not migrate an existing app.
5. **The registry is the escape hatch.** If a third-party registry has a better primitive, copy it into `components/ui/`, rewrite its classes to our tokens, and delete the registry reference. We own what we ship.

#### 2. AI Elements is the default for anything AI

6. **Anything rendering `UIMessage.parts` uses `components/ai-elements/`.** Never hand-roll a chat message, a reasoning block, a tool card, or a composer.
7. **The required disclosure set — all four are mandatory in every chat surface:**
   - Thinking → `Reasoning` + `ReasoningTrigger` + `ReasoningContent`, filtered with `isReasoningUIPart`.
   - Step-by-step reasoning → `ChainOfThought` (+ `ChainOfThoughtStep`, `ChainOfThoughtTrigger`, `ChainOfThoughtBody`).
   - Tool calls → `Tool` + `ToolHeader` + `ToolContent` + `ToolInput` + `ToolOutput`, driven by `isToolUIPart`. Use `getStatusBadge()` for state. All seven states must render: `input-streaming`, `input-available`, `approval-requested`, `approval-responded`, `output-available`, `output-error`, `output-denied`.
   - Sources → `Sources` / `InlineCitation`; token usage → `Context`.
   Auto-open completed and errored tools; collapse reasoning while streaming.
8. **Composer is always `PromptInput`** — never a bare `<form>` with a textarea. Use its built-in constraints (`accept`, `multiple`, `onError`), its drag-and-drop, its `usePromptInputAttachments()` provider, and its hidden file input so Server Actions receive files.
9. **Two attachment components, one per context.** `PromptInput` + `Attachments` **inside chat**. shadcn `Attachment` **outside chat** (settings, admin uploads). Do not mix them.
10. **Markdown/math is one component.** Render assistant output through our `components/markdown.tsx` (Streamdown + `@streamdown/math` + `normalizeMathNotation` + shiki). Never `react-markdown` inline in a component. `lib/math-format.ts` is the single place `\[…\]`/`\(…\)` are normalised.
11. **Never silently upgrade `ai`.** AI Elements is type-coupled to the `ai` package. Upgrading to AI SDK 7 is a project task: re-run `npx shadcn@latest add @ai-elements/*` for every installed element in the same commit as the `ai` bump.
12. **Delete what you don't use.** An installed AI Element that no component imports is dead weight and drift risk. At the end of any feature, prune the folder.

#### 3. When to build a custom primitive, and where it lives

13. Build a custom primitive **only** when the need is (a) recurrent across ≥2 screens, and (b) not covered by the registry, AI Elements, or a listed community registry (Origin UI, Park UI — read-only sources). "It's easier to write it myself" is not a reason.
14. **Custom primitives live in `components/ui/`** and obey every rule above: tokens only, `cn()` for class merging, `data-slot` on each part, `React.ComponentProps<typeof Primitive>` for the props spread, `"use client"` only if the primitive needs state.
15. **Compositions live in `components/` with a feature name**, not in `components/ui/`. `components/ui/` is primitives; `components/onboarding/`, `components/paper3/` are compositions.
16. **Three primitives to build now** (none exist upstream as components):
    - `components/ui/date-picker.tsx` — `Popover` + `Calendar`. Support single, range, and a `placeholder`; fix month/year nav a11y at the same time.
    - `components/ui/data-table.tsx` — `@tanstack/react-table` + our `Table`. Must ship `<caption className="sr-only">`, an `aria-live="polite"` row-range region, `aria-sort` on sortable headers, and per-row checkbox `aria-label`.
    - `components/markdown.tsx` — the renderer above.
17. **Two to adopt rather than build:** shadcn `Attachment` (upload states + shimmer built in) and shadcn `Questionnaire` (any wizard or multi-step flow — onboarding, intake, surveys).
18. **No hand-rolled overlays.** Any full-viewport overlay is `Dialog` (≥sm) or `Drawer` (<sm). Any listbox is `Combobox`/`Command`. Any `role=` or `aria-*` you write by hand in app code is a bug.

#### 4. Theming and tokens

19. **All colour is tokens.** No hex, no `oklch()` literal, no `text-slate-500`, no `bg-white`, no `dark:` variant for a colour that exists as a token. In dark mode, only the `.dark` block changes — never a `dark:` utility for theme colour.
20. **Semantic pairs only:** `bg-primary` + `text-primary-foreground`, `bg-muted` + `text-muted-foreground`. Never pair a surface with a mismatched foreground.
21. **Never override a `--*` token outside `app/globals.css`.** New tokens are added there under both `:root` and `.dark`, exposed via `@theme inline`.
22. **`--radius` is the single knob** for corner softness. Change it there and the whole scale moves; never write a bespoke `rounded-*` on a component.
23. **Preserve the custom scales.** `--shadow-*` (built from `--shadow-x/y/blur/spread/opacity/color`), `--tracking-*`, `--font-sans` / `--font-serif` / `--font-mono` are deliberate. If a `shadcn add` overwrites them, restore them in the same commit.
24. **Radius, spacing, and tokens go through `app/globals.css`, never a component `className`.** `shadcn` is `radix-nova` + `neutral` + `lucide` + Plus Jakarta Sans / Lora / IBM Plex Mono. Keep it, and pin a custom preset at <https://ui.shadcn.com/create> rather than per-component overrides.
25. **Accessibility is part of the design, not a follow-up.** Every focusable component must show a focus indicator at **≥3:1** non-text contrast (the stock `focus-visible:ring-ring/50` fails in light mode — use full-opacity `ring-ring`). Every interactive target is ≥24×24px. Every animation respects `prefers-reduced-motion`. Charts ship a visually-hidden data table. Any menu item showing a keyboard shortcut actually implements it.

#### 5. URL state (nuqs)

26. **Anything a user might bookmark, share, or reload loses belongs in the URL, via nuqs — not in `useState`.** This means: pagination, page size, tab, sort column and direction, search text, filters, open modal, selected view.
27. **One descriptor object per screen area**, in `nuqs/`. Never inline a parser in a component.
28. **Every parser has `.withDefault(...)`.** Closed sets use `parseAsStringLiteral(...)`. Never a bare `parseAsString` for filter state.
29. **Never hand-roll a `Values<{...}>` type annotation over a parser map, and never `as string`.** Let `nuqs` infer. If the types are wrong, the parser is wrong.
30. **Use `useQueryStates` for multi-key changes** so it is one history entry. **Changing a filter resets `page` to 1** in the same batched call.
31. **Search inputs are `debounce(300)`.** Selects and toggles are instant.
32. **`history: 'push'` only for tabs and modals.** Everything else inherits `'replace'`.
33. **Server-dependent query state needs all three:** `shallow: false`, `startTransition`, and the `searchParams` prop. Wrap those regions in `<Suspense>` and pass the loader's `Promise` through for PPR.
34. **Defaults live in React, not the URL.** Set `clearOnDefault: false` only where the default can change and the URL must stay meaningful. Setting `null` always removes the param.
35. **nuqs must resolve to exactly one version across the workspace.** A second copy breaks `NuqsAdapter` context detection.

#### 6. Boundaries

36. **Marketing/landing only:** Magic UI, Aceternity UI, UI Layouts. Whitelist individual components. Never inside `components/ui/` or a product surface, and never without `prefers-reduced-motion` handling.
37. **Product surfaces:** shadcn Blocks (<https://ui.shadcn.com/blocks>) — `dashboard-01`, `sidebar-01`, `login-01`, `signup-01` — re-tokened to our theme on install.
38. **No new styling systems.** No Panda CSS, no CSS Modules, no CSS-in-JS, no Emotion. Tailwind v4 + tokens is the whole styling contract.

---

## Appendix: source URLs

**Repo-verified (no URL):** `package.json`, `pnpm-lock.yaml`, `components.json`, `app/globals.css`, `app/layout.tsx`, `nuqs/index.ts`, `components/ui/*` (55 files), `components/ai-elements/*` (32 files), `biome.json`, `next.config.ts`, `node_modules/shadcn/dist/index.js`.

**shadcn/ui**
- Intro: <https://ui.shadcn.com/docs>
- Components: <https://ui.shadcn.com/docs/components>
- `components.json`: <https://ui.shadcn.com/docs/components-json>
- Theming: <https://ui.shadcn.com/docs/theming>
- Typeset: <https://ui.shadcn.com/docs/typeset>
- Dark mode: <https://ui.shadcn.com/docs/dark-mode>
- Tailwind v4: <https://ui.shadcn.com/docs/tailwind-v4>
- Changelog: <https://ui.shadcn.com/docs/changelog>
- **Base UI as the Default (Jul 2026):** <https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default>
- React Aria (Jul 2026): <https://ui.shadcn.com/docs/changelog/2026-07-react-aria>
- Questionnaire (Aug 2026): <https://ui.shadcn.com/docs/changelog/2026-08-questionnaire>
- Registry: <https://ui.shadcn.com/docs/registry> · Namespaces: <https://ui.shadcn.com/docs/registry/namespace> · Dynamic search: <https://ui.shadcn.com/docs/registry/dynamic-search>
- MCP: <https://ui.shadcn.com/docs/mcp>
- Blocks: <https://ui.shadcn.com/blocks>
- Date Picker: <https://ui.shadcn.com/docs/components/base/date-picker>
- Data Table: <https://ui.shadcn.com/docs/components/base/data-table>
- Attachment: <https://ui.shadcn.com/docs/components/base/attachment>
- Combobox: <https://ui.shadcn.com/docs/components/base/combobox>
- Questionnaire: <https://ui.shadcn.com/docs/components/base/questionnaire>
- AI SDK helpers: <https://ui.shadcn.com/docs/helpers/ai-sdk>
- Preset builder: <https://ui.shadcn.com/create>
- `llms.txt`: <https://ui.shadcn.com/llms.txt>
- `cn` package: <https://github.com/shadcn-ui/cn>
- a11y audit: <https://thefrontkit.com/blogs/shadcn-ui-accessibility-audit-2026>

**AI Elements**
- Overview: <https://elements.ai-sdk.dev/docs/overview>
- Setup: <https://elements.ai-sdk.dev/docs/setup>
- Tool: <https://elements.ai-sdk.dev/components/tool>
- Prompt Input: <https://elements.ai-sdk.dev/components/prompt-input>
- Reasoning: <https://elements.ai-sdk.dev/components/reasoning>
- Registry: <https://elements.ai-sdk.dev/api/registry/registry.json>
- Repo: <https://github.com/vercel/ai-elements>

**nuqs** (note: `nuqs.com` is parked — use `nuqs.dev`)
- Basic usage: <https://nuqs.dev/docs/basic-usage>
- Options: <https://nuqs.dev/docs/options>
- Adapters: <https://nuqs.dev/docs/adapters>
- Server-side: <https://nuqs.dev/docs/server-side>
- Built-in parsers: <https://nuqs.dev/docs/parsers/built-in>
- Changelog: <https://nuqs.dev/changelog>
- Repo: <https://github.com/47ng/nuqs>
- Next 16 adapter issue: <https://github.com/47ng/nuqs/issues/1263>
- Duplicate-version root cause: <https://github.com/47ng/nuqs/issues/798>

**Alternatives**
- Base UI: <https://base-ui.com/> · quick start: <https://base-ui.com/react/overview/quick-start>
- React Aria: <https://react-spectrum.adobe.com/react-aria/>
- Ark UI: <https://ark-ui.com/>
- Kobalte: <https://kobalte.dev/>
- Ariakit: <https://ariakit.org/>
- Headless UI: <https://headlessui.com/>
- Park UI: <https://park-ui.com/> · joins Chakra: <https://park-ui.com/blog/park-ui-joins-the-chakra-ui-organization>
- Origin UI: <https://originui.com>
- Magic UI: <https://magicui.design>
- Aceternity UI: <https://aceternity.com>
- UI Layouts: <https://ui-layouts.com>
- HeroUI: <https://heroui.com>
- Mantine: <https://mantine.dev>
- 2026 headless UI survey: <https://www.greatfrontend.com/blog/top-headless-ui-libraries-for-react-in-2026>