# Verify: affiliate invites for partners · spec 0038 · updated 2026-11-01
_Steps derived from spec 0038 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Admin sends invite to a chosen email → invite row PENDING with 7 day expiry, invite email arrives with claim link and expiry date → AC-2, AC-12
- [ ] Invited person signs in with the invited address, opens the claim link, claims → affiliate row PENDING with their own code → AC-3
- [ ] Claim with a mismatched email → plain notice with support hint, no affiliate row → AC-3
- [ ] Claim with an expired token → expired notice with resend hint → AC-11
- [ ] Admin approves the claimed invite → partner ACTIVE → AC-3
- [ ] Active partner opens `/affiliates` → code plus link plus clicks plus conversions plus pending plus lifetime, no student emails anywhere → AC-9
- [ ] Uninvited student opens `/affiliates` → no page and no entry, no nav item points there → AC-4
- [ ] Partner copies link, shares over WhatsApp, referral signs up with `?ref=CODE` and verifies email → `referredBy` bound, first referrer wins on a second click → AC-5
- [ ] Referred student pays for a pass → earning appears PENDING with fixed percent math shown per row → AC-6, AC-7
- [ ] Partner requests payout → full pending total moves to REQUESTED, second request blocked while one is open → AC-8
- [ ] Admin pays with a Mobile Money reference → REQUESTED moves to PAID, pending clears only, lifetime total unchanged → AC-8
- [ ] Admin revokes a partner → link stops tracking at once, history rows stay → AC-11
- [ ] Admin invites list: search by email, filter by status, 20 per page, approve plus resend plus revoke → AC-10
## Commands
- [ ] `POST /api/affiliates/claim` signed out → 401 → AC-1
- [ ] `POST /api/admin/affiliates` direct create → 410 with invite flow message → AC-1
- [ ] `GET /api/affiliates/me` as non partner → 404 with no data leak → AC-4
- [ ] Replay the Fapshi webhook with the same `transId` → one earning only → AC-7, AC-11
- [ ] Double payout click on the same REQUESTED batch → single PAID move → AC-11
- [ ] Resend an invite → old token 404s, fresh 7 day token works → AC-2
- [ ] Claim at the exact expiry boundary → fails closed → AC-11
## Acceptance-criteria coverage
- AC-1 covered by signed out claim, retired direct create, approval gate steps
- AC-2 covered by invite email, resend rotation, expiry boundary steps
- AC-3 covered by claim, email match, approve steps
- AC-4 covered by non partner 404 and hidden surface steps
- AC-5 covered by ref binding and first wins steps
- AC-6 covered by verified plus paid conversion and self referral steps
- AC-7 covered by fixed percent math and webhook replay steps
- AC-8 covered by request plus payout with reference steps
- AC-9 covered by counts only partner stats step
- AC-10 covered by admin list step
- AC-11 covered by expiry, revoke, replay, parallel claim steps
- AC-12 covered by invite email template step
