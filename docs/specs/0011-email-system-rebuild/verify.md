# Verify: email system rebuild · spec 0011 · updated 2026-10-16

_Steps derived from spec 0011 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._

## UI / manual
- [ ] Send a test email to a dedicated Gmail mailbox, open **Show original**, confirm SPF/DKIM/DMARC all read PASS with `mail.ticlearn.ticsummit.org` alignment → AC-1
- [ ] Sign up with a name containing HTML (`<img src=x onerror=...>`), confirm the verification email renders it as escaped text, not executable markup → AC-2
- [ ] Open a received email's raw source, confirm a `text/plain` part exists and matches the HTML body, and the inbox preview shows the preheader → AC-3
- [ ] Confirm `UserSettings.emailNotifications` defaults to `false`, the digest goes only to opted-in users, and `EngagementLog` allows recurrence via the `period` key → AC-4
- [ ] Measure sign-up HTTP response returns within ~300 ms without waiting for SMTP; confirm Inngest enqueues the send → AC-5
- [ ] Inspect email HTML, confirm the logo uses `src="cid:..."` and there are no `http(s)://` image URLs → AC-6
- [ ] Add an address to `EmailSuppression`, confirm no further email is sent to it → AC-7

## Commands
- [x] `pnpm exec tsc --noEmit` passes (typecheck) → AC-2 AC-5
- [x] `pnpm prisma migrate deploy` applies the `EmailSuppression` table and `period` column; confirm schema live via DB introspection → AC-4
- [x] Confirm `lib/email/send.ts` is the only SMTP caller and every template escapes user controlled inputs → AC-2

## Acceptance-criteria coverage
- AC-1 covered by Show original SPF/DKIM/DMARC step
- AC-2 covered by HTML escaping signup step, tsc, and single-SMTP-caller step
- AC-3 covered by raw source text/plain + preheader step
- AC-4 covered by opt-in default + EngagementLog period step
- AC-5 covered by ~300 ms sign-up response step
- AC-6 covered by CID logo + no hosted image URLs step
- AC-7 covered by EmailSuppression step
