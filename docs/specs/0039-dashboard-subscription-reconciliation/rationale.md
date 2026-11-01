# Rationale: 0039 Dashboard subscription reconciliation

_Decision record for spec 0039. The build spec lives in `index.md`; this file holds why._

## Context

Spec 0019 rebuilt the public pricing page around Free plus one Semester Pass, and spec 0033 set Free plus Weekly plus Semester as the only offer with bounded counts and no Unlimited wording. The subscription page still carries its own history. It keeps a local period label with a per month fallback, hardcoded credit notes, a Type an amount credit top up, and a Paid by Mobile Money already card with its own plan picker and transaction ID submit. Its upgrade dialog asks for phone plus provider before it calls initiate, while the public cards send plan only and follow the link.

The scope row for this feature asks for one offer everywhere. The engineer confirmed the bounds for this slice. The fix covers the subscription page only. There is no live data to honor, so retired plans can leave the code rather than hide behind flags. Direct Mobile Money is gone, only Fapshi remains. The separate credit top up leaves the page. Pending and receipt stay on the page but must use the same words as pricing. Admin editable overrides stay out of this slice. The result the student feels is simple: the page they saw before sign in is the page they see after sign in.

## Options considered

### Option 1: Catalogue parity with deletions

Trim the catalogue to three passes, render the subscription grid from the same resolved offer as pricing, switch the dialog to plan only initiate, and delete the credit top up plus manual card plus retired rows.

**Pros**:
1. One source of truth, so copy can never drift again.
2. Smallest surface to operate, with two cards and one payment path removed.

**Cons**:
1. Removes the credit top up from the page students already know, so a student looking to add credits must learn the new home for it in a later slice.
2. Deletes retired catalogue rows, so any future need to honor an old monthly pass would require re adding them.

### Option 2: Hide without deleting

Hide the extra cards and retired plans behind flags while keeping the code and catalogue rows in place.

**Pros**:
1. Lower risk, with an easy revert if a retired plan is needed.
2. Keeps the credit top up API wired for a later return.

**Cons**:
1. Keeps two offers in code, so drift can return through the hidden branch.
2. Adds flag logic the solo team must maintain for no live user.

### Option 3: Restyle only

Keep all cards and inputs but restyle the subscription page to look like pricing.

**Pros**:
1. No deletion risk, and every current path keeps working.
2. Fastest visual pass.

**Cons**:
1. Leaves two payment paths and two copy sources, so the reported problem stays.
2. Grows the page instead of shrinking it, against the strip to notes plus quizzes direction.

## Rationale

The problem is drift between two offers, not styling. Hiding keeps the second offer in code where it can return, and restyling keeps two payment paths alive. Deletion fits the confirmed facts: no live subscriptions exist, direct transfer is gone, and the credit top up has no home on this page. One catalogue plus one initiate shape removes the drift at the source, and the smaller page costs less to operate for a solo team.

## References

None. The bounds were confirmed with the engineer during `/solution-architect` (see the Context section above).
