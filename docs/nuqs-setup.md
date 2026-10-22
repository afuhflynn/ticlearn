# The nuqs adapter and the Suspense boundary, per layout

This is the setup for a layout. Read it before you create a route group, a
layout, or a page that reads the URL.

## The one sentence

The nuqs adapter and the Suspense boundary live in the **route group layout**,
never in the root layout, and every group that reads the URL needs both.

## Why the adapter is not in the root layout

The nuqs adapter reads the search params. Next.js has one rule about that:

> If a route is prerendered, calling `useSearchParams` will cause the Client
> Component tree up to the closest `Suspense` boundary to be client side
> rendered.
> (Next.js docs, `useSearchParams`)

The adapter sits at the top of the tree, so a root level adapter puts the
**whole application** inside that rule. Every route becomes a client side
render, including the public marketing pages, and a page that is prerendered
ships no content in its document at all. The student gets a blank page until
the JavaScript arrives, and the prerender buys nothing.

The adapter is also the reason a root level `Suspense` was in the root layout
in the first place. A `Suspense` in the root layout wraps the whole document,
and Next renders its fallback as the shell and hides the real content in a
`<div hidden id="S:0">` until the client swaps it in. The whole document is
deferred, prerender or not.

Moving both of them down into the route group layouts fixes both problems at
once:

- The marketing group has no adapter and no boundary, so its pages render
  their content into the document, and a student sees the pricing table
  before any JavaScript runs.
- The app groups have their own adapter and their own boundary, so the one
  component that reads the search params is the only thing that waits.

## The setup for a new layout

Ask two questions.

**Does anything in this group read the URL?**

That means `useSearchParams`, `useParams`, or any nuqs hook, which is
`useQueryState` and `useQueryStates`. A nuqs hook is a read of the URL.

- **Yes.** The group needs the adapter and a boundary.
- **No.** The group needs neither.

**Is the group created fresh, or is it a child of another group?**

The adapter does not inherit down the tree in a useful way here, because the
boundary that catches its read has to be inside the same layout. A child
group that sits under a group that already has the adapter and the boundary
inherits both, and it needs nothing of its own. A group created fresh, with
its own `layout.tsx` and no parent layout of its own, needs its own adapter
and its own boundary.

### The template

```tsx
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { RootFallback } from "@/components/layout/RootFallback";

export const metadata: Metadata = {
  ...noIndex,
};

export default function MyGroupLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<RootFallback />}>
      <NuqsAdapter>
        <div className="min-h-screen">{children}</div>
      </NuqsAdapter>
    </Suspense>
  );
}
```

The order matters. The boundary is **outside** the adapter, because the
adapter is the thing that suspends and the boundary is what catches it. The
adapter is **inside** the boundary, so the suspension is caught rather than
escaping to the root of the document.

## What the fallback is

The fallback is the shape of the group, so a student sees what is coming
rather than a blank page. Each group has its own.

| Group | The fallback | Why |
|---|---|---|
| `(dashboard)` | `RootFallback` | The neutral shell, the brand mark and generic blocks |
| `(admin)` | `RootFallback` | The neutral shell, the brand mark and generic blocks |
| `(auth)` | `AuthFormSkeleton` | The outline of an auth form, because every page in the group is a form |
| `(marketing)` | none | The group has no boundary, because nothing in it reads the URL |
| `chat` | none | The group has no boundary, because nothing in it reads the URL |
| `(onboarding)` | none | The group has no boundary, because nothing in it reads the URL |

## The two things that catch people

**A page that reads the URL outside a group that has the adapter.** The
adapter is a context provider. A page that calls `useQueryState` and is not
under a `NuqsAdapter` throws at runtime, and it does so in the browser, not
in the build. If a new group needs the adapter, add it to the group layout
before the first page lands.

**A page that reads the URL directly.** `useSearchParams` and `useParams` do
not need the adapter, but they do need a boundary. `app/primitive-gallery/page.tsx`
has one of its own for this reason, and the pages in `(dashboard)` and
`(admin)` are covered by their group layouts.

## Where this is checked

`pnpm build` fails with `useSearchParams() should be wrapped in a suspense
boundary` when a page reads the URL and nothing above it has a boundary. That
error is the build telling you a group is missing its setup. Add the boundary
to the group layout, not to the page.

The rule is also written into the root `AGENTS.md`, so an agent picks it up
without reading this file.
