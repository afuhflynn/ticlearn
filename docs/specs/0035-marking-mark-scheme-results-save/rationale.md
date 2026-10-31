# Rationale: 0035 Marking plus mark scheme plus results plus save

Decision record sections moved from the build spec at design time, kept so the choice stays readable.

## Context

The chat runner you ship today asks setup through a three step wizard and renders one question at a time low near the composer. Choice taps mark at once with a short why and short typed answers go through one model call. What is missing is the exam feel from the reference you shared. Students see right or wrong but they do not see the split of marks, the common lost mark, or the examiner note that tells them how to earn each mark.

The reference also ends with a full review. Percent plus correct count plus a list of what you answered against what was correct, plus Start over, plus a teacher style follow up that offers a harder set on weak areas and an open typed set for marking. Your present complete phase writes attempt rows once, but the stored rows keep only right or wrong plus a short explanation, so reload plus review plus stats cannot show the scheme the student saw.

Without this slice the chat quiz stays a drill with a score. With it the chat quiz reads like a marked paper and the saved history proves learning in the same place page runs count.

## Options considered

### Option 1: Fix in place

Extend the runner plus the grade route plus the question and answer rows you already own. Add marks plus scheme columns, return the scheme from grading, render it in the runner, add the results screen, keep one submit at finish.

**Pros**:
1. Least new code with no new table and no new endpoint family.
1. History stays single because chat writes the same rows as the page.

**Cons**:
1. Touches the live runner, so a bad render change shows to every chat user at once.
1. Old rows lack scheme text, so past attempts show review without the new scheme detail.

### Option 2: Strangler card beside the runner

Build a new marked runner card beside the present runner behind a flag, cut over when proven, then retire the old card.

**Pros**:
1. Safe rollout with instant rollback by routing intent back to the old card.
1. Lets you compare mark quality side by side in real runs.

**Cons**:
1. Two runners to own through the cutover, double maintenance for setup plus nav plus snapshot.
1. Snapshot version churn across two cards risks reload mismatch.

### Option 3: Replace directly with a fresh marked flow

Throw away the present runner card and write a new marked quiz flow from setup to results in one pass.

**Pros**:
1. Clean slate with no legacy snapshot or grade shape to respect.

**Cons**:
1. Big rewrite risk on a live surface with no incremental proof.
1. Rebuilds nav plus reload plus handoff you already tested, with new bugs likely.

## Rationale

Context forces a small team, a live runner already tested for wizard plus nav plus reload, and a scope row that asks for marking depth plus results plus save rather than a new surface. Fix in place keeps one history, one snapshot family, and one grade path, and it ships as thin Tracer Bullet slices through every layer. Strangler doubles the surface for a change that is additive, and a fresh rewrite replays risk you already paid down in specs 0031 plus 0033 plus 0034.
