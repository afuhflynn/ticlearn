# 0007. URL state convention

**Date**: 2026-10-15
**Status**: In Progress

## Summary

This standard makes the address bar the single home for view state that a student can share or revisit. Tabs, page number, sort order, filters, search text, open panel, and selected view live in the URL through the installed nuqs library (a URL query helper for Next.js). Refresh, back, forward, and shared links then show the same view.

## Context

The project already installed and wired nuqs, yet only three auth pages use it. Around twelve dashboard and admin screens keep tabs and page position in local component state, so refresh loses the view and shared links cannot reproduce it. The shared parser object also declares page and limit as text while typing them as numbers, which forces casts at the call site. On the phones students use, lost state costs data and trust: a study group link should open the same list, and the back button should return to the prior view. Next.js 16 treats page query values as asynchronous, so defaults must be explicit or the first server paint and the later client value can disagree. No new data store is involved; this decision only settles where navigable state lives and how it is typed.

## Options considered

### Option 1: Full URL ownership with shared plus local parsers

Every dashboard and admin screen moves navigable state into the URL. Cross cutting keys stay in one shared module and each screen area owns a named descriptor with strict parsers and defaults. History uses push for view changes and replace for typing and corrections.

**Pros**:

- One pattern everywhere, so sharing, refresh, back, and forward behave the same on all screens.
- Strict parsers remove casts and make bad links fall back to known defaults.

**Cons**:

- Touches many screens, so rollout needs a proven thin thread before wide conversion.
- URLs grow longer on heavily filtered screens.

### Option 2: Share links only, keep local state

Screens keep local state and only build a share link on demand through a separate serializer.

**Pros**:

- Smallest change to existing screens.

**Cons**:

- Two sources of truth coexist, so refresh and back behavior stay inconsistent.
- Every screen needs bespoke share serialization, which recreates the drift this standard exists to end.

### Option 3: One global parser object for every screen

A single schema holds every key for every screen.

**Pros**:

- One file to read.

**Cons**:

- Unrelated screens couple through shared keys, so a rename or default change ripples widely.
- Auth and payment keys mix with ordinary view state, which invites sensitive values into shareable links.

## Decision

**Chosen option**: Option 1: Full URL ownership with shared plus local parsers

The URL owns navigable state on dashboard and admin screens, typed through nuqs with shared cross cutting keys plus one named descriptor per screen area.

## Rationale

Full ownership wins because the failure is inconsistency itself: local state cannot be shared, refreshed, or stepped back through, while a share only layer leaves two patterns alive side by side. The shared plus local split keeps cross cutting keys stable without coupling unrelated screens, and strict per screen values turn bad links into a known default view instead of a broken one. Push history for view changes preserves back and forward; replace for typing and corrections keeps the address bar and history clean. The thin thread rollout proves server refresh, modal links, and type inference on two screens before the pattern spreads, which bounds the risk of a wide migration.

## Standard definition

**Canonical pattern**:

```ts
// nuqs/notes.ts: one named descriptor per screen area
import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

export const notesViewParsers = {
  tab: parseAsStringLiteral(["all", "mine", "shared"]).withDefault("all"),
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(10),
  sort: parseAsStringLiteral(["updated", "title", "score"]).withDefault("updated"),
  order: parseAsStringLiteral(["asc", "desc"]).withDefault("desc"),
  modal: parseAsString.withDefault(""),
  selectedId: parseAsString.withDefault(""),
};

export const notesSearchParamsCache = createSearchParamsCache(notesViewParsers);
```

```tsx
// Client screen: batched view changes share one history entry;
// typing updates on a short pause without flooding history.
import { useQueryState, useQueryStates } from "nuqs";
import { notesViewParsers } from "@/nuqs/notes";

const [view, setView] = useQueryStates(notesViewParsers, {
  history: "push",
  shallow: false,
});
const [q, setQ] = useQueryState("q", notesViewParsers.q.withOptions({
  history: "replace",
  shallow: false,
  throttleMs: 300,
}));
```

Server pages read through the cache or loader from `nuqs/server` and receive values through the page query prop. Client components read through hooks from `nuqs`. The build must keep server only imports out of client bundles and split an area module if the bundler requires it. Server driven updates run inside a transition and the changing region sits inside a loading boundary. The shared module owns page, limit, search text, and sort direction plumbing. Each screen area owns its tab set, sort columns, filters, and modal names. The route inventory records each literal set and default as screens convert.

**State sourcing**:

| View value | Source |
|---|---|
| Active tab | Strict literal parser owned by the screen area, defaulting to the area primary view |
| Search text | `q` parser with empty default; screen input stays local while typing and writes to the URL on a trailing 300 ms pause; Enter and blur flush a pending value; Escape reverts the input to the URL value; empty search equals a missing value |
| Page and page size | Integer parsers defaulting to page 1 and the area page size; page floors at 1 and limit clamps from 1 to 100; any search, filter, sort, or size change resets page to 1 in the same batched update; an out of range page shows the empty result |
| Sort column and direction | Strict literal parsers owned by the screen area |
| Filters | Strict or typed parsers owned by the screen area; unknown values coerce to default |
| Open modal | Per screen modal name in `modal` plus an entity id string in `selectedId`; opening uses the existing detail fetch; an invalid or missing id closes the modal and corrects the URL with replace; never tokens, payment ids, private drafts, or passwords |
| Corrections | Invalid or unknown values coerce to the declared default and the URL is corrected with replace |

**Key invariants**:

1. Navigable state lives in the URL on every dashboard and admin screen that has tabs, pagination, sort, filters, search text, an open panel, or a selected view.
2. The shared module owns page, limit, search text, and sort direction plumbing; each screen area owns its tab set, sort columns, filters, and modal names.
3. Every parser declares an explicit default, so server paint and client value agree.
4. Page and limit parse as integers; tab, sort, order, and view parse as strict literals; no cast over a parser value is allowed.
5. More than one key changing for one user action updates in one batched call and one history entry.
6. Tab, page, sort, filter, and modal changes use push history; typing and URL corrections use replace history; shallow false applies only where the server reads the query.
7. Page floors at 1 and limit clamps from 1 to 100; an out of range page shows the empty result.
8. Loading shows a skeleton on the changing list region only; filters stay visible.
9. Exactly one resolved nuqs version exists across the workspace.
10. Auth return links, one time tokens, payment identifiers, and error codes keep current route behavior and stay outside generic shareable view state.
11. A renamed tab, sort, filter, or modal value ships as a new literal; old bookmarks coerce to default.

**Replaces**:

1. Local component state as the home for tabs, page position, sort, filters, or open panels on dashboard and admin screens.
2. Raw address bar reads and writes for view state through handwritten query strings, raw search params access, or imperative router pushes.
3. Text parsers with numeric type annotations plus casts at the call site.
4. Inline parser literals inside components instead of one named descriptor per screen area.

**Enforcement**:

Compile time types plus review and project checks. Type inference carries parser value types end to end with no casts. Review rejects new raw query handling for view state. The project TypeScript check, lint, format, and build must pass, and completion requires a manual matrix covering tabs, pagination, sort, filters, search, modal links, refresh, back, and forward on converted screens.

**Rollout**:

Prove the pattern on a thin thread first: repair the shared schema types, then name one dashboard list and one admin list in the inventory and convert both end to end including defaults, history, server refresh, modal links, and loading behavior. Convert the remaining dashboard and admin screens next. New code complies immediately. The build records a full route inventory listing every dashboard and admin route reviewed, including screens that needed no change, plus each literal set and default.

**Exceptions**:

Auth return links, one time tokens, payment identifiers, and error codes keep their current route behavior. Form drafts, passwords, and private content never enter the URL. Contained panels that are not shareable views stay local.

## Consequences

**Positive**:

1. Shared links, refresh, back, and forward reproduce the same view on every converted screen.
2. Strict parsers remove the current text versus number mismatch and the casts around it.
3. One descriptor per area stops duplicate schemas from drifting apart.

**Negative / tradeoffs**:

1. Many screens change, so review load rises until the inventory closes.
2. Filtered URLs grow longer and noisier than local state.
3. Server refresh on every query change needs loading boundaries and transitions, or navigation feels slower on weak networks.

**Neutral**:

1. No database change, no migration, and no new environment variable.
2. No new dependency; the installed nuqs package carries the pattern.
3. Existing auth pages keep working; only their shared schema typing is repaired.

## Follow-up

1. The build must produce the full dashboard plus admin route inventory, including unchanged screens and each literal set and default.
2. Verify the auth return link round trip before touching auth keys, since the current proxy encodes the return path while setting it.
3. Consider a small convention check later that flags new raw query handling for view state outside the descriptors.
4. Keep this spec and the scope platform row in step once the scope row links this spec and gains milestones.
