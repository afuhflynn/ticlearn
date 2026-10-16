# 0011. Email system rebuild — decision record

**Date**: 2026-10-16

## Context

TiCLearn sends transactional and lifecycle email to students in Buea and Bamenda. Transactional mail is sent from mail.ticlearn.ticsummit.org on the ticlearn.ticsummit.org domain, which TiCLearn owns and confirmed before any DNS publish. (Corrected: the original spec assumed ownership of ticlearn.cm, which TiCLearn does not own; the real owned domain is ticlearn.ticsummit.org.) The current system lives in lib/email/send.ts as fifteen inline HTML templates totaling about one thousand lines. There is no shared layout, no logo, no preheader, and no plain text alternative written by hand. Eight templates interpolate user controlled text without escaping, so a malicious signup can inject HTML into emails including admin inboxes. Every verification sign in and password reset email is sent inline inside the sign up HTTP request, so a flaky network tells the user to check their email for a message that was never sent. The production domain ticsummit.org has SPF that authorizes only Google Workspace, so any new sender fails authentication. The weekly engagement digest is structurally one shot because of a unique constraint on userId and campaign, so a student never receives a second digest. Cameroonian law requires prior consent for promotional email, but the digest defaults to opt out.

## Options considered

### Option 1: Resend (recommended)

React first developer experience. CID inline images are documented for exactly this use case. Webhook delivery events for bounce and complaint suppression. Free tier of one hundred per day enforces the low frequency discipline.

**Pros**:
- First class CID support documented for transactional mail
- Webhook events for bounce and complaint handling
- One hundred per day free cap fits a launch
- Team already knows React so react-email templates are natural

**Cons**:
- One hundred per day free cap can bind if volume grows
- Paid tier needed beyond the free allowance

### Option 2: Brevo (runner up)

Three hundred sends per day on the free tier, drop in SMTP alternative.

**Pros**:
- Three hundred per day free tier, three times Resend's free cap
- SMTP compatible, works with existing Nodemailer transport

**Cons**:
- Adds Sent by Brevo branding unless paid
- Less React first developer experience than Resend

### Option 3: Keep Nodemailer with Google Workspace SMTP

No new provider, use existing smtp.gmail.com transport.

**Pros**:
- No new vendor or contract
- No code change to transport

**Cons**:
- Capped at about two thousand messages per day
- Not intended for automated transactional sending
- Can throttle Google Workspace and affect human mail at ticsummit.org
- No webhook events for bounce suppression

## Rationale

Resend is the only provider the research identifies with first class CID support documented for this exact transactional mail use case, plus webhook delivery events that make bounce and complaint suppression possible. The one hundred per day free cap is honest about volume and forces the low frequency channel discipline from day one. Brevo is the runner up if the daily cap binds; it is SMTP compatible so the switch is a config change, not a code change. Google Workspace SMTP is explicitly a dev only stopgap and cannot serve production because it can throttle the domain and affect human mail.

## References

**Project sources**:
- AGENTS.md stack and rules Next.js 16.2.2 Prisma 7 Inngest better-auth
- docs/research/email-system.md: full audit of current email code, provider comparison, deliverability guidance, and the recommended template structure
- docs/scope/platform.md: feature 13 scope row with done when criteria and consent basis
- lib/email/send.ts: current inline template module being replaced
- lib/inngest/functions.ts: existing Inngest email functions being consolidated
- prisma/schema.prisma: EngagementLog unique constraint and UserSettings.emailNotifications field

**Practices & standards**:
- Idempotency keys for money and email operations
- Strangler pattern for live migrations run old and new side by side
- Bounce and complaint suppression for sender reputation
- Cameroon Law 2010/021 article 7 paragraph 1 prior consent for direct prospecting by email
- CAN SPAM transactional message carve out no unsubscribe on OTPs
- Google bulk sender guidelines SPF DKIM DMARC one click unsubscribe for marketing
