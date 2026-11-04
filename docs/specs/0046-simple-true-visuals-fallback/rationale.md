# Rationale: 0046 Simple true visuals with fallback

## Context

You draw today through a draw tool plus an art card plus a unified read, and students meet science asks like light rays on small phones with costly data. The current path works but the look plus the layout plus the fallback wording are not yet locked, so a weak draw can still feel like a dead end. The forces here are reading clarity in bright light, low data cost, and trust that every attempt still teaches. Without a clear rule the builder invents the style per ask and failures land unevenly.

## Options considered

### Option 1: Polish in place on the current art path

You keep the current draw tool plus the current art card plus the current read and retry paths and you tighten style plus layout plus fallback wording. Small edits in the prompt plus the card plus the chat art wrapper.

**Pros**:
- Smallest change with the least risk to what already ships.
- Keeps owner checks plus caps plus reads exactly as they run today.

**Cons**:
- Leaves any deeper render limits in place since you change look and fallback only.

### Option 2: Rebuild the art renderer around one vector path

You replace the two format paths with one vector path for every diagram and you restyle the renderer at the same time.

**Pros**:
- One path to own and test instead of two.

**Cons**:
- Forces the model to draw flows as free form art which reads worse for sequences and charts.
- Larger rewrite of a path that already works for quiz plus flashcards plus diagrams.

### Option 3: Rich colored art with decorative styling

You allow fills plus color accents plus shadows for a livelier feel.

**Pros**:
- Livelier cards on large screens.

**Cons**:
- Harder to read in sunlight on cheap phones and heavier on data.
- Breaks the quiet study look the thread already uses.

## Rationale

You already own a working draw path with owner checks plus daily caps plus a unified read plus a retry control, and the gap is look plus layout plus fallback clarity rather than missing plumbing. Keeping the two format split lets flows use a plain text diagram language (mermaid, a simple text way to describe charts and flows) while rays and circuits use a scalable vector image (svg, a crisp image format that stays sharp when zoomed). That split matches how the model already draws and it keeps physics art truthful instead of forcing it into boxes and arrows.
