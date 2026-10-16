# 0011. Email system rebuild

**Date**: 2026-10-16
**Status**: In Progress

## Summary

This spec replaces TiCLearn's email system, which today sends all fifteen templates as inline string literals in one thousand line module, with a real template system built on plain HTML tables and Nodemailer. Every send is pushed through Inngest so no email blocks a user request. The change fixes HTML injection, missing plain text alternatives, silent send failures, and a one shot weekly digest, and it adds SPF DKIM DMARC authentication on a dedicated sending subdomain.

Reasoning and options: see rationale.md

## Requirements

**User stories**:
- As a student, I want to receive my verification code by email so that I can finish signing up.
- As a student, I want every email to have a readable plain text version so that I can read it on a cheap phone with a metered connection.
- As a student, I want the weekly progress digest to repeat every week and only if I opted in, so that it does not become spam.
- As an admin, I want payment receipts and alerts to render correctly in Outlook and Gmail so that I can trust them.
- As the platform, I want no email send to block a user request so that sign ups and payments stay fast.

**Acceptance criteria**:
- **AC-1**: SPF DKIM and DMARC pass with alignment for mail.ticlearn.ticsummit.org, verified by sending a test to a dedicated Gmail test mailbox and reading Show original; all three read PASS with domain alignment. The concrete SPF include, DKIM selector, and DMARC rua are sourced from Resend's DNS setup for mail.ticlearn.ticsummit.org at implementation.
- **AC-2**: Every template escapes all user controlled inputs so that HTML injection is not possible. Audit lib/email/send.ts and tag every interpolation as user controlled or trusted; source user controlled fields from the trigger payloads (OTP code, payment reference, name, and so on).
- **AC-3**: Every email has a preheader and a hand written plain text alternative that matches its HTML body. Copy is written at template authoring time, sourced from each template's purpose and its plain text requirement.
- **AC-4**: The weekly digest repeats weekly and is sent only to users who opted in. The referral reward (credit badge or deep link) is defined in the scope or onboarding spec before the digest template is authored. Frequency caps are settled: at most two non digest emails per seven days and ten per user per month, enforced in the digest scheduler.
- **AC-5**: No send blocks a request; every send is enqueued through Inngest and the HTTP response returns within about 300 ms of enqueue, measured in the happy path test. The email.send Inngest event is guarded by the Inngest signing secret before enqueue. When Inngest is down at signup the send is not dropped: a persistent retry queue retries until success, and permanently failed sends route to a dead letter table for manual replay.
- **AC-6**: The logo is inlined as a content ID image and no hosted images appear in any template. Confirm an existing SVG or PNG logo asset exists; otherwise create one and treat it as a static CID asset.
- **AC-7**: Bounced and complained addresses are suppressed so they never receive another email. A suppression lookup runs at the top of every Inngest send handler; suppressed addresses are skipped and logged. Hard send failures, permanent SMTP errors included, are treated as suppression reasons even without a webhook.

## Decision

**Chosen option**: Resend.

The sending system moves to Resend on a dedicated sending subdomain mail.ticlearn.ticsummit.org, with templates authored as plain HTML tables rendered through Nodemailer. All sends go through Inngest so nothing blocks a request.

**Implementation skills**: `solution-architect` (`.config/opencode/skills/solution-architect/`)

## Feature design

**Data model sketch**:

- EmailSuppression: id uuid primary key, email text unique not null, reason enum BOUNCED COMPLAINED UNSUBSCRIBED not null, createdAt timestamp not null, updatedAt timestamp not null, userId uuid foreign key to User nullable, providerMessageId text nullable
- EngagementLog: add period date not null (week starting); change unique constraint from [userId, campaign] to [userId, campaign, period]

**State transitions**: none. Email has no lifecycle state machine; each send is a fire and forget event.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/webhooks/email-provider | POST | provider event payload (delivered bounced complained) | 200 OK | none, signature verified | 400 401 |
| /api/unsubscribe/[token] | GET | token url param | confirmation page | none | 404 410 |
| /dev/email/[template] | GET | template name | rendered preview HTML | dev only | 404 |
| inngest event email.send | internal | template to props | enqueued | internal | queue full |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Send verification email | code firstName verifyUrl expiresMinutes | better-auth OTP generated at sign up (input param) |
| Send payment receipt | planLabel amountFcfa reference paidAt | Fapshi webhook body (input param) |
| Send weekly digest | streak quizzes readinessPct weakestTopic | quiz progress tables and UserSettings (DB columns) |
| Suppress address | email reason | provider webhook payload (input param) |
| Unsubscribe | token | url param matched to UserSettings row |

**Key invariants**:
- Every template escapes user controlled inputs at render time
- Every email has both text and html parts
- No send runs inline in an HTTP request handler
- Transactional email verification reset receipt has no unsubscribe link
- Promotional email digest countdown referral respects UserSettings.emailNotifications default false
- At most two non digest emails per user per seven day window

**Security model**:
- Transactional email is exempt from unsubscribe requirements under Cameroon Law 2010/021 article 7 paragraph 1 and CAN SPAM
- Promotional email requires prior express consent; default is opt out
- Webhook endpoints verify provider signatures before writing to EmailSuppression
- Admin payment alerts go to a single admin list, not all admins per feedback submission

**Configuration required**:
- RESEND_API_KEY: provider API key for the sending subdomain
- RESEND_FROM_EMAIL: verified from address on mail.ticlearn.ticsummit.org
- WEBHOOK_SECRET: secret for verifying provider webhook signatures
- NEXT_PUBLIC_APP_URL: absolute base URL for CTA links
- FROM_EMAIL: moves from SMTP credentials to provider from address

**Critical test scenarios**:
- Happy path: sign up triggers verification email through Inngest, request returns before SMTP completes, verifies AC-1 AC-5
- Failure case: SMTP provider is down, Inngest retries with backoff up to four times, verifies AC-5
- Auth permission: unauthenticated caller cannot trigger email.send, verifies AC-5

## Build plan

Ordered through Tracer Bullet: a thin end to end thread first, then thicken slice by slice. Each task names the acceptance criteria it satisfies.

1. Publish DNS for mail.ticlearn.ticsummit.org: SPF include, 2048 bit DKIM, DMARC p equals none with rua; verify SPF DKIM DMARC pass with alignment on Gmail, satisfies AC-1
2. Fix current bugs in place: apply escapeHtml to eight unescaped interpolations, stop swallowing errors in sendEmail, stop the unverified warning deletion threat, stop the Monday 50 newsletter, satisfies AC-2
3. Bump nodemailer to at least 8.0.9, satisfies AC-5
4. Extract transport and sendEmail into lib/email/transport.ts and lib/email/send.ts with pool true and verify at boot, satisfies AC-5
5. Build layout shell Button Card StatRow components and CID logo asset, satisfies AC-6
6. Move verification sign in and password reset onto the new system through Inngest events, proves the pipeline, satisfies AC-1 AC-3 AC-5
7. Move payments to two templates received failed with XAF formatting and receipt table, delete duplicates, satisfies AC-2 AC-3 AC-6
8. Rewrite welcome for university audience, trigger from emailVerified for all signups, classify welcome as transactional (no unsubscribe link), satisfies AC-2 AC-3
9. Turn every remaining send into an Inngest event including auth callbacks, wire provider webhook to EmailSuppression, satisfies AC-5 AC-7
10. Add a dead letter table for permanently failed sends and a persistent retry queue before enqueue, satisfies AC-5
11. Add a suppression lookup at the top of every send handler; treat hard SMTP failures as suppression reasons even without a webhook, satisfies AC-7
12. Fix and relaunch campaigns: add period to EngagementLog unique constraint, opt in default false, frequency cap two non digest per seven days, digest exam countdown referral reward, delete platform update newsletter, satisfies AC-4
13. Warm up: register Postmaster Tools, read DMARC reports weekly, monitor bounce and complaint rates against zero point one percent two percent five percent stop conditions, satisfies AC-1 AC-7

## Consequences

**Positive**:
- No email blocks a user request; sign ups and payments return promptly
- Every template escapes inputs, closing HTML injection in admin and user inboxes
- Every email has a real plain text alternative and preheader
- The weekly digest repeats and is opt in, compliant with Cameroon Law 2010/021
- Bounced and complained addresses are suppressed, protecting sender reputation

**Negative / tradeoffs**:
- Resend free tier caps at one hundred sends per day, which can bind during launch week
- A new sending subdomain needs DNS warm up before volume can grow
- The team must learn table based email authoring
- Migration from inline templates to components touches every template

**Neutral**:
- Existing better-auth emailOTP plugin stays; only its send path changes to an Inngest event
- Nodemailer stays as the transport under Resend SMTP, so the swap is config not code
- The EngagementLog migration adds a period column and changes a unique constraint, which requires a coordinated deploy

## Follow-up

- [ ] Add email conventions to a nested AGENTS.md under src/email/AGENTS.md or src/notifications/AGENTS.md, with a root pointer
- [ ] Consider whether Brevo should be contracted as the drop in alternative if the Resend daily cap binds

## Migration plan

**Strategy**: strangler

**Phases**:
1. Add EmailSuppression table and period field to EngagementLog; run old inline system and new component system side by side for verification and password reset only
2. Cut over payments and welcome to the new system; keep old templates for remaining types
3. Turn every remaining send into Inngest events; retire lib/email/send.ts
4. Delete old templates and the inline module once all sends route through the new system

**Rollback**: revert the most recent phase's migration and route sends back to lib/email/send.ts; EmailSuppression writes can be stopped by removing the webhook handler

**Risks**:
- The EngagementLog unique constraint change requires a coordinated deploy; a mid migration deploy could cause duplicate digest sends
- A provider webhook outage means bounces are not suppressed until it returns
- The Resend one hundred per day free cap can bind during launch week and stall verification emails
