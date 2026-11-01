# Rationale: 0036 campus ambassadors

Decision record for the ambassador direction. The build spec lives in [index.md](index.md).

## Context

TiCLearn needs low cost acquisition through trusted students on campus. Research frames this as the hardship route as a business asset. A student who cannot pay can still bring paying students and receive study access. A faculty or union buying seats in bulk is out of scope and stays deferred.

The current codebase already holds referral hints. `prisma/schema.prisma` holds `User.referredBy` plus `User.refApplied` plus `ReferralBonus` for credit awards plus `Affiliate` plus `AffiliateClick` plus `AffiliateEarning` for partner tracking. The partner affiliate direction in scope row 43 is invite only and pays money. The ambassador direction in scope row 31 is open to all students and pays a pass only. The two must coexist without sharing reward logic or copy.

Signup has two doors. Password sign up creates the user through credentials. Google sign up creates the user through OAuth. If attribution lives only in one door, links break for the other door and tracking looks random. Attribution must therefore live before account creation and resolve after, no matter the door used.

## Options considered

### Option 1: Counter only with short code

One counter on the user plus a stable code. No row per friend. Grant when counter hits 3. Minimal schema change and fastest to ship.

**Pros**:
1. Smallest change with one column and one counter.

**Cons**:
1. No audit trail so support cannot explain which friend counted.
2. Fraud review is guesswork because clicks and identities are lost.

### Option 2: One row per invite with stable code and auto grant

Stable readable code per student. One `AmbassadorReferral` row per invited friend with status lifecycle. First touch wins by unique invited email. Auto grant through the existing plan grant path with idempotent reference.

**Pros**:
1. Full audit from click to grant with clear support story.
2. Reuses the proven grant path so retry safety comes free.

**Cons**:
1. More tables and endpoints than a counter.
2. Needs click capture plus auth attach logic in two signup doors.

### Option 3: Manual review queue with repeatable rewards

Same rows as Option 2 but admin approves each grant and rewards repeat forever. Maximum control and ongoing incentive.

**Pros**:
1. Human check before every free pass.

**Cons**:
1. Slow operations load and delayed reward kills student motivation.
2. Repeatable passes raise cost without a proven return in v1.

## Rationale

The job is trust at scale. Students share on phones, friends join through either signup door, and support must answer why a friend did or did not count. A counter cannot answer that. Rows can. Auto grant matters because the reward must land at the moment of value, not after a back office queue. Manual review would trade motivation for control before fraud is measured. Stable code keeps sharing simple on WhatsApp and in person, while first touch wins keeps disputes simple to explain. One pass per student caps cost while the loop is proven.
