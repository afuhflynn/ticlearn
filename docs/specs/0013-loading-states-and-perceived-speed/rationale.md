# 0013. Loading states and perceived speed: rationale

**Date**: 2026-10-19

## Context

The state of the code on 2026-10-19 is this. There is not one `loading.tsx` file in `app/`, and the single `Suspense` in the root layout has no fallback, so a document that cannot stream paints nothing at all. Fifteen skeleton render sites exist, and they cover four of the fifteen student routes; the other eleven routes show a bare `Loader2` spinner. There are 78 spinner render sites across 36 files, 68 of them in `app/`, plus 81 `animate-spin` usages, and twenty seven of those spinners block a whole page or a whole region for a single card. No delay threshold exists anywhere, so every fast query flashes a spinner. The note upload and the text extraction show an indeterminate spinner with no percentage, and the only real percentage bar in the codebase is the chat attachment strip. In the chat, the thinking line appears only before the first token, and once the tokens start the bubble simply grows with no cue that it is still being written.

The student is on a two gigabyte Android phone on a congested mobile network, and data costs them money. A blank screen reads as a broken app, and a student who has waited ten seconds on an extraction will assume the upload was lost. A skeleton is not a cure for either, because a skeleton that does not match the shape of the real content causes the student to read the content twice, and a skeleton used for a process reads as a failed job. The research in `docs/research/seo-and-rendering.md` section 7 already sets the rules this spec applies: no spinner for a wait under a second, a skeleton only where the shape is genuinely known, a progress bar for a process, and a plain line with a time estimate for anything over ten seconds.

Three forces shape what can be built. The design system in `docs/design-system.md` owns the primitives, allows tokens only, and already ships four of the pieces this feature needs: `Skeleton`, `Progress`, `Spinner` and `Empty`. Of the four, `Skeleton` and `Progress` are used, `Spinner` is used only inside buttons, and `Empty` is used in no place at all. The engineer asked in writing for shadcn skeletons at the level of the section rather than a whole page block, because a screen that blocks on one slow card is the pattern being escaped. And the two neighbouring platform specs fix the boundaries: spec 0010 owns caching and the rule that a screen the student has seen should paint its previous data, and spec 0012 owns the render strategy and hands the loading boundaries to this row in writing.

The consequence of not deciding is that the next screen invents its own loader, which is exactly how 78 spinner render sites and 15 skeletons came to coexist in one codebase. Each one is locally reasonable, and the result reads as an app that is always busy and never finished.

## Options considered

### Option 1: Section skeletons in the screens, with shared primitives

Each screen draws its own skeleton for the cards that are still loading, using one shared region component and one shared refresh bar. Content already on screen stays on screen while fresh data loads. A process gets a progress bar, a long AI answer gets a caret, and no screen ever shows a spinner.

**Pros**:
- The indicator sits exactly where the wait is, so one slow card never blocks the rest of the page.
- A skeleton that mirrors the real layout causes no layout shift, so the page does not jump when the content lands.
- One shared component means the rule is written once, and the checker can enforce it.

**Cons**:
- Every screen needs its own skeleton file, so the work is spread across the tree rather than living in one place.
- The rule is more demanding than a single spinner, so it needs the enforcement to survive.

### Option 2: A route level loading file on every route

One `loading.tsx` per route group, showing a full page skeleton while the route resolves.

**Pros**:
- One file per route is easy to find and easy to review.
- It needs no change inside any screen.

**Cons**:
- Twenty six of the thirty seven page files are client components that fetch after the page has painted, so a route level boundary would resolve in a fraction of a second and flash. It would be the flash this feature exists to remove.
- It blocks the whole page for one slow region, which is the pattern the scope row for this feature asks to escape.
- It says nothing about what happens after the data arrives, which is where most of the region spinners live.

### Option 3: Keep the spinners and add a delay threshold

Leave the indicators as they are, and show a spinner only when a wait is long enough to notice.

**Pros**:
- The smallest change by far, and it removes the flash.
- No new primitives and no new files.

**Cons**:
- A spinner tells the student nothing about what is coming, and the research is explicit that a spinner for a single module and a skeleton for a full page load are not interchangeable.
- It does nothing about the blank page, the bare root `Suspense`, the chat answer, or the process indicators, which are four of the five things the scope row names.
- It leaves the app reading as busy rather than as working, which is the feeling this row is trying to remove.

### Option 4: One generic skeleton and one shared loading component for every screen

A single `Skeleton` block used everywhere, wrapped in one component that every screen mounts.

**Pros**:
- The least code of all the options, and the rule is impossible to misunderstand.
- One component to maintain.

**Cons**:
- Every surface looks the same while it loads, and a student learns nothing about the shape of the page they are about to get.
- A generic block cannot mirror a list of three cards, a chart panel, or a settings form, so it either lies about the shape or leaves a hole.

## Rationale

The engineer chose, against my recommendation, that a loader appears at once rather than after a delay, and that the scope row's rule about a one second wait is amended so that no spinner appears for a short wait. That is coherent, and the reason it holds is that a skeleton matching the real layout causes no layout shift, so showing it immediately costs nothing and buys the student the shape of the page a second earlier. The old criterion was written about loaders in general, and a spinner is exactly the case where the rule bites, because a spinner that appears and disappears in two hundred milliseconds is the flash students notice. So the criterion is narrowed rather than dropped: the shape comes at once, the spinner never comes at all (basis: `docs/research/seo-and-rendering.md` section 7, the rule that no indicator appears for a wait under a second, narrowed here to spinners, and the layout shift argument in the same section).

The one thing this spec cannot do is make the app faster, and it should not be sold as if it could. The real latency wins are already built: spec 0010 made the data arrive sooner and stopped the round trips that were never needed, and spec 0012 made the shell paint before the data arrives. What this spec owns is the narration of the wait that remains, and the honest part of that narration is that a skeleton is a promise about the shape of what is coming. That promise is only keepable where the shape is genuinely known, which is why AC-6 draws the line and why the chat answer, whose shape is not knowable, streams instead (basis: the research on skeleton screens, and the rule that a skeleton is for a full page load and a spinner for a single module).

The processes are the case where the cost of getting it wrong is highest, because a student who sees an indefinite bar during an extraction concludes the upload was lost and tries again, and a duplicate upload costs them their data allowance twice. So the note pipeline records the stage it is in, which is one nullable column, and the interface shows the stage list and the step count, which is a real number and not a decoration. The quiz is deliberately left without a stage column, because a quiz is one model call and the honest indicator there is a plain line with a time estimate, not a stage list that would be theatre.
