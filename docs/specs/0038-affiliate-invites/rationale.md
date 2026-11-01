# 0038 Rationale: affiliate invites for partners

## Context

Today any signed in student can load the affiliate surface and become a payable partner on page load. The signup award pays at sign up before email verification. The apply update runs outside its transaction so a parallel double submit can pay twice. Admin payout lowers the lifetime total when it pays.

The owner wants the opposite. Partners are chosen people only. No student can create a link or see the page unless invited. An invite starts as pending and becomes active only after admin approval. Attribution needs verified email plus a settled paid order. The signup award must never double pay on retry. Payout must clear pending only while lifetime total stays intact. Partner screens must never show referee emails.

The campus ambassador loop stays open to all students for a pass reward. This partner loop stays separate for cash commission with no shared rows. Bulk seats for faculties stay out of this build.

## Options considered

### Option 1: Fix in place with guards only

Keep the existing tables and the self create route but add verified email checks plus idempotent award keys plus payout that preserves lifetime total.

**Pros**:

1. Smallest code change with no new table.
2. Keeps existing partner links working with no migration.

**Cons**:

1. Leaves self serve creation live which breaks the invite only goal.
2. Keeps the page load create side effect which caused payable rows by accident.

### Option 2: Strangler with invite table plus approval

Keep Affiliate plus AffiliateClick plus AffiliateEarning untouched. Add a PartnerInvite row for the email link flow. Delete the open self create route. Create the affiliate row only from an accepted invite as pending then approve to active.

**Pros**:

1. Meets the invite only goal while reusing proven earning logic.
2. Old earnings stay valid with no rewrite of history.
3. Each slice can ship and be rolled back without touching live payouts.

**Cons**:

1. Adds one new table plus claim plus approve steps to operate.
2. Old self created partners need triage into invited or revoked.

### Option 3: Fresh partner system and retire old tables

Build one new partner table with its own clicks and earnings and retire the old affiliate tables in one cutover.

**Pros**:

1. Cleanest final shape with no legacy fields.
2. Naming can match partner language from day one.

**Cons**:

1. Requires data migration of live clicks and earnings with payout risk.
2. Largest blast radius for a solo operator with no measured scale need.

## Rationale

The context forces invite only plus verified attribution plus payout safety. Option 1 fails the core job because self creation stays. Option 3 moves live money rows for no proven gain. Option 2 keeps the earning ledger that already works and adds the missing gate where the failure lives. It ships as thin slices with a clear rollback.
