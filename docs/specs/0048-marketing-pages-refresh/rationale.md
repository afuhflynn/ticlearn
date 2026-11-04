# 0048 rationale. Marketing pages refresh

## Context

The public pages sell the product before signup, and research on this market is blunt about trust. Students decide on the promise of free use, the price of the pass, the payment path over Mobile Money, and a working contact link. When a page names a limit the app does not enforce, or a price the payment route does not charge, or a surface the product no longer ships, the next page loses the student.

Several earlier specs rebuilt these pages section by section and cut dead surfaces. The landing page follows an approved mockup with eight server sections. The pricing page reads from one plan catalogue. The about, FAQ, contact, terms and privacy pages were corrected to a WhatsApp group as the only staffed channel. What remains is drift. Limits live in code, copy lives in page files, and nothing forces the two to agree except a careful read. This spec closes that gap with a truth pass across the full public set, with the honesty script as the lock.

## Options considered

### Option 1: Fix words in place

Edit copy inside the existing sections and cards. Keep every component, every section order, every price key and every screenshot. Point each claim at the code value it must equal, and extend the honesty script to cover the full set.

**Pros**:
1. Smallest change that removes the trust risk, with no visual review cost.
2. Keeps the approved mockup and the plan catalogue untouched, so no other feature moves.
3. Fits the repo rule that a new pattern must replace an old one, since no new pattern is added.

**Cons**:
1. Leaves any awkward section order or weak visual in place, since look is out of scope.
2. Copy still lives in page files, so a future limit change needs a careful copy pass plus the gate.

### Option 2: Build new sections beside the old

Build fresh sections next to the live ones, move traffic a page at a time, then retire the old copy. This is the strangler path (old and new run together until the new proves itself).

**Pros**:
1. Allows a new voice or new section shape without risking the live pages during the rewrite.
2. Gives a clean place to add shared copy bits so repeated claims cannot drift.

**Cons**:
1. Two copies of each page must be maintained during the move, which doubles review and test work for a words only change.
2. Risks scope growth into layout and assets, which the engineer explicitly placed out of scope.

### Option 3: Full rewrite with new voice and layout

Rewrite all seven pages from scratch with a new tone, new section order and new visuals.

**Pros**:
1. Produces the most polished read if the current pages feel tired.
2. Allows a new information shape for the semester product instead of patching the old monthly shape.

**Cons**:
1. Reopens decisions that specs 0014, 0015, 0016 and 0019 already settled, including the mockup order and the minimal money stance.
2. Costs the most time and review, with the highest risk of inventing claims the product cannot back.

## Rationale

The engineer chose truth and copy across the full public set, with look and prices held still and the design taken from the current UI. The strongest force is trust. The market punishes a page that promises a limit or a price the app does not honor, and the cheapest repair is to make the words equal the code. The second force is scope control. The layout, the catalogue and the screenshots already passed review, so reopening them would spend goodwill without adding trust. The runner up, the side by side rebuild, fits a risky visual change but this change carries no visual risk, so the extra maintenance buys nothing.

A same model cross check during the update pass confirmed the price fix and named wording gaps (exact strings, render rules, redirect routes, legal sources, gate scope). The engineer chose to apply the recommended fixes, so the spec now pins each one.
