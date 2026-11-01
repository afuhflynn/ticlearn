# 0038. Affiliate invites for partners

**Date**: 2026-11-01
**Status**: In Progress

## Summary

Only an admin can invite a partner by email. The invited person claims the link, verifies email, refers students, and earns a fixed percent of each settled order. All other students see no page and no entry. The old self serve creation path is removed.

## Requirements

**User stories**:

1. As an admin, I want to invite a chosen person by email so only trusted partners join.
2. As an invited partner, I want to claim my link and see my own stats so I can share with confidence.
3. As a referred student, I want my purchase to credit the partner who invited me after I verify email.
4. As an admin, I want to approve partners and pay earnings so money moves with a clear trail.

**Acceptance criteria**:

1. **AC-1**: Only an admin can create an affiliate. No signed in student flow and no open route creates an affiliate row.
2. **AC-2**: An invite starts as pending with a single use token and a 7 day expiry. Resend expires the old token and issues a fresh one.
3. **AC-3**: The invited person claims the link through sign up or sign in. The affiliate row is created as pending at claim time and becomes active only after admin approval.
4. **AC-4**: A student without active partner status who guesses the partner URL receives a not found response with no stats and no link. No nav entry points to the partner surface.
5. **AC-5**: Attribution binds at sign up for password plus Google sign up alike through a signed cookie with a ref field fallback for blocked cookies. First referrer wins and later clicks never overwrite.
6. **AC-6**: A referral counts as converted only after the referred account has verified email plus a settled paid order for a pass or credits. Self referral by same user or same email never counts.
7. **AC-7**: Commission is a fixed percent of each settled order, stored per earning at pay time. Retry with the same order reference never creates a second earning.
8. **AC-8**: Earnings move from pending to requested on partner request and from requested to paid on admin payout. Payout clears pending only while lifetime total stays intact.
9. **AC-9**: Partner stats show code plus link plus clicks plus conversions plus pending plus lifetime. Referee emails never appear to partners. Admin sees full rows for support.
10. **AC-10**: Admin list shows invites plus partners with search by email or code plus status filter, paged at 20 per page, with approve plus revoke plus payout actions.
11. **AC-11**: Expired invites never activate. Revoked partner links stop tracking at once. Webhook retry plus parallel accept plus double payout click never double pay.
12. **AC-12**: Invite emails reuse the existing email path with Inngest templates and no new provider.

## Decision

**Chosen option**: Option 2: Strangler with invite table plus approval

Build the invite only loop beside the live tables, cut creation over to invite claim, then retire the open route.

## Feature design

**Data model sketch**:

1. PartnerInvite holds id plus email lowercased plus token unique plus invitedBy plus status plus expiresAt plus acceptedUserId nullable plus createdAt. Email is lowercased on write. One live invite per email. Status is pending to accepted to expired to revoked.
2. Affiliate keeps userId unique plus code unique plus status plus momoNumber plus momoName plus totalClicks plus totalConversions plus totalEarnings plus pendingEarnings. Created only from an accepted invite as pending then approved to active.
3. AffiliateClick keeps affiliateCode plus converted flag plus referredUserEmail nullable. Many rows point to one Affiliate code.
4. AffiliateEarning keeps affiliateCode plus referredUserId nullable plus referredUserEmail plus plan plus amount plus commission plus status plus requestedAt nullable plus paidAt nullable plus order reference unique plus fapshiTransId nullable unique. Many rows point to one Affiliate code. Status is pending to requested to paid.
5. Relations. One user has at most one Affiliate. One invite binds to at most one user at accept. One Affiliate has many clicks and many earnings. Ambassador tables stay separate with no shared rows.

**State transitions**:

1. Invite pending to accepted when a valid token is claimed before expiry by a signed in user whose email matches the invite lowercased after plus addressing and dot normalization. Claim at the exact expiry boundary fails closed. Claim creates the Affiliate row as pending. The accepted user id locks at claim and stays when email changes later.
2. Invite pending to expired when now passes expiresAt with no claim. Expiry is written by a daily job plus checked on read plus on claim. Resend expires the old token at once and issues a fresh token with a fresh 7 day window, throttled per invite.
3. Affiliate pending to active on admin approve only. Approve flips status and never creates the row. Active to revoked on admin partner revoke with a required reason. Revoked links stop tracking at once and keep history rows for audit. Reapprove after revoke needs a fresh invite in v1.
4. Earning pending to requested on partner request for the full pending total only. No partial and no minimum in v1. One open request at a time per partner. Requested to paid on admin payout with a Mobile Money reference validated as non empty plus unique. Paid is terminal. Status moves use row locks so request plus pay race cannot double pay. No transition lowers totalEarnings.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/admin/affiliates/invites | POST | email string req | invite id plus status pending | admin | 400 bad email, 403 non admin, 409 live invite exists |
| /api/admin/affiliates/invites | GET | search string opt plus status opt plus page opt | invites paged at 20 | admin | 403 non admin |
| /api/admin/affiliates/invites/[id]/approve | POST | invite id path | affiliate id plus status pending | admin | 404 unknown, 409 already claimed, 403 non admin |
| /api/admin/affiliates/invites/[id]/resend | POST | invite id path | new token plus fresh expiry | admin | 404 unknown, 429 too many resends, 403 non admin |
| /api/admin/affiliates/invites/[id]/revoke | POST | invite id path plus reason | status revoked | admin | 404 unknown, 403 non admin |
| /api/affiliates/claim | POST | token string req | affiliate id plus status pending | session plus email match | 401 no session, 404 bad token, 410 expired, 409 already partner |
| /api/affiliates/me | GET | none | code plus link plus clicks plus conversions plus pending plus lifetime | active partner only | 401 no session, 404 not partner |
| /api/affiliates/payout-requests | POST | amount int req | earning batch plus status requested | active partner only | 400 bad amount, 409 already requested, 429 rate limited |
| /api/admin/affiliates/[id]/payout | POST | payout reference plus Mobile Money id | status paid plus paidAt | admin | 404 unknown, 409 already paid, 403 non admin |
| /api/admin/affiliates/[id]/revoke | POST | affiliate id path plus reason req | status revoked plus tracking stopped | admin | 404 unknown, 403 non admin |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Admin invite send | invite token plus expiry date | PartnerInvite token plus expiresAt set as claim time plus 7 days |
| Claim page | partner code plus share link | Affiliate code plus public site origin from app config |
| Partner stats | clicks plus conversions plus pending plus lifetime | clicks count distinct valid hits with rate limit plus bot filter, conversions count settled earnings, pending sum of pending plus requested, lifetime sum of paid plus pending with no subtract on payout |
| Admin list | invite plus partner rows paged | one combined view with tabs for invites and partners, newest first, standard page envelope with page plus pageSize plus total, lowercased search on email or code |
| Token safety | unguessable invite link | random 32 byte token, single use, rate limited claim, no sequential codes |
| Attribution bind | referrer code for new user | signed cookie tic_aff plus 180 day life plus ref field fallback named ref, winner stored on User referred code lowercased at sign up completion |
| Claim UX | claim link plus result notice | link route /affiliates/claim with token in query, mismatched email shows plain notice with support hint, already partner returns 409 with notice |
| Conversion mark | converted flag plus earning row | settled payment success event for pass or credit orders only, amount must match stored order, verified email flag read from auth emailVerified at pay time |
| Commission math | commission per order | fixed percent from AFFILIATE_COMMISSION_PERCENT times settled amount, rounded down to whole XAF, rate copied per row and shown on earning |
| Payout request | requested total | sum of pending earnings for caller partner |
| Payout complete | paid total plus Mobile Money reference | admin input reference plus AffiliateEarning paidAt server time |
| Admin list | invite plus partner rows paged | PartnerInvite plus Affiliate with search on lowercased email or code |
| Hidden page | not found for non partners | session partner status check before any stats read |

**Key invariants**:

1. Money is XAF in whole units, never minor units.
2. No open route creates an Affiliate row. Only invite claim creates as pending.
3. All emails stored lowercased. Compare lowercased everywhere.
4. One Affiliate per user. One live invite per email. Code unique. Order reference unique.
5. Attribution needs verified email plus settled paid order. Self referral never pays.
6. One credit or cash award per order reference. Retry never double pays.
7. Payout clears pending only. Lifetime total never drops on payout.
8. Partners never read referee emails. Progress shows counts only.
9. Ambassador and affiliate rows never mix. At conversion time affiliate wins when a valid affiliate code is bound, else ambassador counts. One friend never pays in both loops.
10. Claim uses the /affiliates/claim link with token in query. Invite email shows expiry date plus resend hint. Resend throttled to 3 per day per invite.

**Security model**:

1. Admin only may create plus approve plus revoke plus pay. All admin routes require admin session and audit actor plus reason plus timestamp.
2. Active partner only may read own stats plus request own payout. Signed out reads get 401. Non partner reads get 404 with no data leak.
3. Public click plus public claim with token are the only public writes. Click is rate limited and writes counts only. Claim validates token plus expiry plus email match plus self referral block.
4. Attribution truth is server side at sign up completion with lowercased email compare. Client cookie is a hint only.
5. Webhook style payment success is the only conversion trigger. Amount must match the stored order amount or the earning stays pending with a support note.

**Configuration required**:

1. AFFILIATE_COMMISSION_PERCENT: fixed percent applied at earning time, admin adjustable without code change.
2. AFFILIATE_INVITE_DAYS: default 7, admin adjustable without code change.
3. Existing email plus Inngest keys reused. No new provider keys.

**Critical test scenarios**:

1. Happy path: admin invites by email to claim to approve to share to paid order to requested to paid, verifies **AC-1**, **AC-2**, **AC-3**, **AC-6**, **AC-7**, **AC-8**.
2. Failure case: self referral plus duplicate email race plus expired token plus webhook retry storm plus parallel accept plus double payout click, all stay correct with no double pay, verifies **AC-6**, **AC-7**, **AC-11**.
3. Auth and permission: signed out cannot read stats, student A cannot read student B stats, non admin cannot invite or approve or pay, uninvited URL shows not found, verifies **AC-1**, **AC-4**, **AC-9**, **AC-10**.

## Build plan

Ordered as thin end to end thread first per Tracer Bullet, then thicken. Each task names the AC it satisfies.

1. Add migration for PartnerInvite plus indexes plus AffiliateEarning order reference unique where missing, satisfies **AC-2**, **AC-7**, **AC-11**.
2. Add admin invite create plus list plus approve plus resend plus revoke with email send through existing templates plus audit, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-10**.
3. Add claim from token with expiry plus email match plus self referral block plus Affiliate pending create, with signed cookie plus ref fallback wired into password plus Google sign up, satisfies **AC-3**, **AC-5**, **AC-6**, **AC-11**.
4. Close the open self create route and hide the partner surface for non partners as not found with no nav entry, satisfies **AC-1**, **AC-4**.
5. Add conversion on settled paid order with verified email check plus fixed percent math plus idempotent earning keyed by order reference, satisfies **AC-6**, **AC-7**, **AC-11**.
6. Add partner stats read with counts only plus payout request plus admin payout that clears pending only and preserves lifetime total plus admin partner revoke, satisfies **AC-8**, **AC-9**.
7. Add expiry job plus revoke that stops tracking at once plus rate limits plus copy honesty for partner screens, satisfies **AC-11**, **AC-12**.

## Consequences

**Positive**:

1. Partners are chosen people only so spend follows trust.
2. Verified plus paid attribution removes the early pay leak.
3. Idempotent earnings plus payout that preserves lifetime total make support calm.

**Negative or tradeoffs**:

1. More steps to operate than self serve, including invite plus approve plus payout review.
2. Fixed percent stored at pay time means later rate changes never rewrite history, so reports must note the rate per row.
3. Separate ambassador and affiliate loops need clear naming so students never confuse pass reward with cash pay.

**Neutral**:

1. Old self created partners need triage after cutover.
2. Click rows stay counts only and never decide attribution truth.

## Follow-up

1. Triage existing affiliate rows created by the old open route into invited or revoked with a dated note.
2. Decide the fixed percent value after first term cost data, with admin override already in place.
3. Link payout plus conversion events to conversion analytics once that surface needs partner take rate.

## Migration plan

**Strategy**: strangler
**Phases**:

1. Add PartnerInvite table beside live affiliate tables with no surface cutover.
2. Cut creation to invite claim only and hide the surface for non partners. Keep old links and earnings valid.
3. Retire the open self create route and triage old rows. Keep audit rows for all actions.
**Rollback**: revert creation and visibility to prior commit while keeping the new table inert. No money rows are rewritten.
**Risks**: active partners seeing a changed entry point, double award on retry, missed payment leaving pending. Mitigated by row reuse, idempotent order keys, and invite plus approval checks.
