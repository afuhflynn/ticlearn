# 0036. Campus ambassadors earn a semester pass for referrals

**Date**: 2026-11-01
**Status**: In Progress

## Summary

Any student may share a personal link over WhatsApp and earn a free semester pass after three friends verify email and pay for a pass or credits. Attribution is captured at click time and attached at account creation so password sign up and Google sign up behave the same. The build reuses the existing plan grant path so a retry never grants twice and the copy promises a pass only with no income claim.

Decision record lives in [rationale.md](rationale.md).

## Requirements

**User stories**:
1. As a student, I want a personal link I can share on WhatsApp so friends join through me.
2. As a referred friend, I want my link to count no matter whether I sign up with password or with Google.
3. As an ambassador, I want to see how many friends qualified and what remains to the pass.
4. As an admin, I want to see ambassadors and granted passes and flag or revoke fraud.

**Acceptance criteria**:
1. **AC-1**: A signed in student can open an ambassador view, see a personal link and code, and share over WhatsApp with preset text.
2. **AC-2**: A referred friend who signs up through the link is attributed to the first referrer only and later clicks do not overwrite.
3. **AC-3**: A referral counts as qualified only after the referred account has verified email plus a paid upgrade for a pass or credits.
4. **AC-4**: Self referral never qualifies even when email, device, or account tricks are used.
5. **AC-5**: When qualified count reaches 3, the referrer receives one full semester pass automatically with notice and no admin step.
6. **AC-6**: The same capture and attach flow works for password sign up and for Google sign up with identical results.
7. **AC-7**: Pending referrals expire after 180 days and never qualify after expiry.
8. **AC-8**: One pass per student in v1. Further qualified referrals after the grant change nothing.
9. **AC-9**: Progress shows qualified count, referred list by name or initial, and remaining to reward. Pending and expired read clearly.
10. **AC-10**: Admin sees referrers, counts, granted passes, plus fraud flag and revoke that removes the granted pass access.
11. **AC-11**: All student and share copy promises a semester pass for referrals only and never promises money or income.
12. **AC-12**: Webhook retry or double click never grants twice and never double counts one friend.

## Decision

**Chosen option**: Option 2: One row per invite with stable code and auto grant

Ambassadors stay open to all students, separate from invite only partner affiliates, with pass only reward and auth agnostic attribution.

## Feature design

**Data model sketch**:
1. `User.referralCode` String unique nullable. New stable code per student, readable alphabet without confusing chars.
2. `User.referredBy` String nullable already exists. Now stores the ambassador code that won attribution. Email values stored lowercased everywhere.
3. `AmbassadorReferral` new model. Fields: id, referrerId required, referredUserId nullable, invitedEmail nullable lowercased, codeUsed required, status required, qualifiedAt nullable, rewardedAt nullable, expiresAt required, createdAt. Unique on lowercased invitedEmail where status is not Flagged so first touch wins. Index on referrerId plus status. Index on codeUsed.
4. `AmbassadorReferralStatus` new enum with Pending, Qualified, Rewarded, Expired, Flagged.
5. Reuse `Subscription` plus `CreditPurchaseOrder` as qualification signals. Reuse `grantPlanCredits` with `referenceId` shaped like `plan:ambassador:userId:1` for idempotent grant. Ambassador referrals skip `ReferralBonus` so one friend never pays twice in two systems.
6. Reuse `Affiliate` family untouched for partners. No shared rows between ambassador and affiliate.

**State transitions**:
1. Pending then Qualified when verified email plus settled paid order are both true at payment time and expiry is in future and self referral checks pass. Email change before verify keeps referral bound to userId and fails closed unless lowercased email still matches.
2. Qualified then Rewarded when counted toward a grant in one locked transaction that counts Qualified, grants once, and moves exactly 3 rows. Only 3 rows move per grant so concurrent fourth qualify cannot over grant.
3. Pending then Expired when now passes expiresAt with no qualification. Expiry counts from attach at signup, not from click. Lazy expire on read and on payment plus one daily job. Server clock decides with inclusive boundary.
4. Any state then Flagged on fraud signal. Flagged never counts and needs admin clear or revoke.

**API surface**:
1. Share landing. Public GET at `app/r/code/route.ts`. Sets signed HttpOnly cookie named `tic_ref` with 180 day life and SameSite Lax then redirects to signup. Cookie is attribution truth. Click row is funnel counts only.
2. Get or create my code. Authenticated GET plus POST at `app/api/ambassadors/me/route.ts`. Output code, link, qualified count, remaining. Errors 401 when signed out.
3. Record click. Public POST at `app/api/ambassadors/click/route.ts`. Input code required. Output ok true. Rate limited. No auth needed. Used for funnel counts only, not for attribution truth.
4. Resolve my progress. Authenticated GET at `app/api/ambassadors/progress/route.ts`. Output rows with display name or initial, status, qualifiedAt, expiresAt. Paginated at 20 per page sorted newest first.
5. Attach at signup. Internal helper called from both password create and Google OAuth callback through Better Auth hooks. Input new user id plus pending code from cookie with fallback `ref` field on signup payload for blocked cookies. Binds referral to userId at attach. Output attached code or none with reason.
6. Webhook qualify. Internal call from settled payment success for pass and credit orders with no refund or chargeback. Input buyer id. Marks matching referral Qualified at payment time, then grants when count hits 3.
7. Admin list. Admin GET at `app/api/admin/ambassadors/route.ts`. Paginated at 20 per page with search by code or email or name plus filter by status sorted newest first. Output counts plus granted pass id.
8. Admin flag and revoke. Admin POST at `app/api/admin/ambassadors/flag/route.ts` plus `app/api/admin/ambassadors/revoke/route.ts`. Revoke ends the granted pass now, marks the 3 rows Flagged, sets grant blocked so re qualify cannot re grant in v1, and audits actor plus reason plus timestamp.

**Value sourcing**:
1. Share link value shown to ambassador. Source `User.referralCode` plus public site origin from app config plus `app/r/code/route.ts`.
2. WhatsApp text value. Source `constants/ambassador-copy.ts` template with link plus pass promise, no income words, with banned word test.
3. Qualified count value. Source count of `AmbassadorReferral` rows in Qualified or Rewarded for this referrer under row lock at grant time.
4. Remaining value. Source threshold 3 minus qualified count, floored at zero.
5. Referred display name value. Source referred user profile name or initial, never full email to other students. Deleted user keeps row and shows initial.
6. Grant pass value. Source plan catalogue semester pass key plus duration, same as paid pass.
7. Expiry value. Source `AmbassadorReferral.expiresAt` set as attach time plus 180 days.
8. Fraud signal value. Source same userId plus same lowercased email plus same verified phone when present plus admin flag action. IP only logged, never decisive. Device fingerprint out of scope for v1.
9. Pending to paid rate for analytics. Source friendship with conversion analytics feature when it lands, out of scope here except event emission.

**Key invariants**:
1. One invited lowercased email maps to at most one referrer while not Flagged.
2. Self referral never reaches Qualified. Checks are same userId, same lowercased email, same verified phone when present.
3. Qualification needs verified email plus settled paid order both true at payment time with no refund or chargeback.
4. Grant needs exactly 3 Qualified rows and moves them to Rewarded in one locked transaction with idempotent reference.
5. At most one ambassador grant per user in v1 plus grant blocked flag after revoke.
6. Retry with same order id or same reference never creates a second grant.
7. Expired rows never qualify. Expiry from attach plus 180 days.
8. Ambassador reward never pays money or credits, pass access only, and never creates `ReferralBonus`.

**Security model**:
1. Any signed in student may read own code and progress and create own code once.
2. No student may read another student email list. Progress shows names or initials only.
3. Click endpoint is public but rate limited and writes counts only, never trust for attribution. Signup shows code input fallback when cookie is missing.
4. Attribution truth is server side at signup completion using code from signed cookie or validated `ref` payload, with lowercased email compare, checked against self referral rules.
5. Admin only may list all ambassadors, flag, and revoke. Revoke is audited with actor id and reason.
6. No open route may create an `Affiliate` row. Ambassador code never grants affiliate status.

**Configuration required**:
1. `AMBASSADOR_THRESHOLD`: count to grant, default 3, admin adjustable without code change when platform settings lands.
2. `AMBASSADOR_EXPIRY_DAYS`: default 180.
3. `AMBASSADOR_PASS_PLAN_KEY`: catalogue key for the semester pass granted.
4. `AMBASSADOR_MAX_GRANTS_PER_USER`: default 1 for v1.

**Critical test scenarios**:
1. Happy path: share link to WhatsApp to password signup to verified email to paid pass to auto grant, verifies **AC-1**, **AC-2**, **AC-3**, **AC-5**, **AC-6**.
2. Auth parity: same flow through Google signup yields same attribution and grant, verifies **AC-6**.
3. Failure case: self referral, duplicate email race, expired pending, webhook retry storm, all stay correct with no double grant, verifies **AC-4**, **AC-7**, **AC-12**.
4. Auth and permission: signed out cannot read progress, student A cannot read student B progress, non admin cannot list or revoke, verifies **AC-9**, **AC-10**.
5. Copy honesty: share text and progress and admin screens contain pass promise and no income words, verifies **AC-11**.

## Build plan

Ordered as thin end to end thread first per Tracer Bullet, then thicken. Each task names the AC it satisfies.

1. Add migration for `User.referralCode` plus `AmbassadorReferral` plus status enum plus uniq lowercased email where not Flagged plus indexes, satisfies **AC-2**, **AC-7**.
2. Add share landing at `app/r/code/route.ts` with signed cookie plus code mint plus click capture with rate limit plus signup attach helper wired into both password create and Google OAuth callback plus `ref` fallback input on signup, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-6**.
3. Add qualify on settled payment success for pass and credit orders plus threshold check plus auto grant through `grantPlanCredits` with idempotent reference in one locked transaction plus notice email plus skip of `ReferralBonus` for ambassador friends, satisfies **AC-3**, **AC-5**, **AC-12**, **AC-8**.
4. Add expiry from attach plus lazy expire plus daily job plus self referral guards plus first touch wins enforcement plus fraud flag, satisfies **AC-4**, **AC-7**.
5. Add student ambassador view with share card plus WhatsApp button plus progress list at 20 per page plus skeleton and empty states plus code input fallback plus copy from `constants/ambassador-copy.ts`, satisfies **AC-1**, **AC-9**, **AC-11**.
6. Add admin list at 20 per page with search and status filter plus flag plus revoke ending pass now with grant blocked plus audit trail, satisfies **AC-10**.
7. Add copy honesty test with banned words plus analytics events for click to signup to qualify to grant for future conversion work, satisfies **AC-11**, **AC-9**.

## Consequences

**Positive**:
1. Acquisition comes from trusted students with near zero cash cost.
2. Auth agnostic attribution removes a whole class of missing credit bugs.
3. Audit rows make support and fraud review straightforward.

**Negative / tradeoffs**:
1. More surface to maintain than a simple counter, including two signup doors and one background expiry.
2. Free passes dilute revenue if threshold or fraud controls prove loose.
3. Separate ambassador and affiliate systems need clear naming so students never confuse pass reward with partner pay.

**Neutral**:
1. Bulk seat sales for faculties stay deferred and need a later decision.
2. Repeatable rewards stay closed in v1 and need a later decision with real cost data.

## Follow-up

1. Decide repeatable ambassador rewards after first term cost data.
2. Decide faculty bulk seats as the larger scale version of this loop.
3. Link conversion analytics events once that feature lands so pending to paid rate is visible without manual query.
4. Capture `vercel` skill conventions in the right context file if the share link needs platform specific routing rules before build begins.
