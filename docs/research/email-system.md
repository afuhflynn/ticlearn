# Email System Research and Recommendation

**Date:** 2026-10-12
**Scope:** Audit of the current transactional email code, Nodemailer and provider research, the email set this product actually needs, an email design system, a competitor check, and a build plan. Research only; **no application code was changed**.
**Method:** repo inspection (every file read, cited as `file:line`), live DNS lookups against the production sending domain, and scraping of Nodemailer docs, provider pricing pages, deliverability guides and Cameroonian competitor sites. Scratch artifacts in `.firecrawl/`.

---

## 0. TL;DR for the project owner

1. **The email system is one 1,077-line file of inline template literals with no design system, no logo, no preheader, and no dark-mode story.** All 15 templates live in `lib/email/send.ts`. There is not one template directory, one JSX component, or one shared layout function.
2. **Every template loads a Google Fonts `<link>` that no major client honours** (`lib/email/send.ts:92`, 11 occurrences). Gmail strips it; `@font-face` is listed as *not supported* in Gmail and *buggy* in Outlook on [Can I Email](https://www.caniemail.com/features/css-at-font-face/). **Plus Jakarta Sans never renders in Gmail or Outlook.** The design language does not survive the medium.
3. **The purple header is a CSS gradient with white text and no fallback colour.** `emailStyles` `.header` is `linear-gradient(...)` (`lib/email/send.ts:58`) with `h1 { color: white }`. Classic Outlook (Word engine) and Outlook.com do not render CSS gradients, so the header collapses to **white text on a white card** — the brand vanishes on the client that skews most professional/institutional inboxes. Same class of bug in the two payment-failure templates (`lib/email/send.ts:527`, `:815`).
4. **Your production DNS cannot legally send transactional mail.** Live lookup: `ticsummit.org` SPF is `v=spf1 include:_spf.google.com ~all` — **only Google Workspace is authorised**. Any new SMTP provider fails SPF. DMARC is `v=DMARC1; p=none;` with **no `rua`**, so you get zero reports. `default._domainkey` holds a **1024-bit** RSA key (2016-era; 2048 is the current floor). This is the single highest-priority blocker.
5. **Two correctness bugs that silently break the retention engine.** (a) `EngagementLog` has `@@unique([userId, campaign])` (`prisma/schema.prisma:1543`) and the dispatcher skips anyone already logged (`lib/inngest/engagement-functions.ts:22-25`), so **every campaign fires at most once per user, ever** — the "weekly digest" is a one-time email. (b) `lib/inngest/functions.ts:790-801` sends the platform-update email to `findMany({take: 50})` with no `orderBy`, so the same 50 users get it every Monday, forever.
6. **HTML injection is live in eight templates.** `escapeHtml` exists (`lib/email/send.ts:4-11`) but is only applied in 3 of 15. `sendVerificationEmail` interpolates a user-controlled `name` raw (`lib/email/send.ts:104`), as does the contact form (`app/api/contact/route.ts:54-66`) and the payment receipts' `transId`/`planLabel` (`lib/email/send.ts:486`, `:764`). Better-auth `user.name` is set by the person signing up.
7. **The verification OTP is sent inline in the sign-up request** (`lib/auth.ts:96-107` → `transporter.sendMail`), and `sendEmail` swallows every failure and returns `{success:false}` (`lib/email/send.ts:41-44`) which the auth callback ignores. On a flaky 3G sign-up the user is told "check your email" for an email that was never sent, and there is no retry and no record of the failure. This is the highest-traffic transactional email in the product.
8. **Recommendation:** replace with a small JSX template system rendered by `react-email`'s `render()` to plain tables, one `lib/email/layout.tsx` shell, one logo inlined as a **CID** attachment (~6 KB), real `text` alternatives, and every send pushed through **Inngest** (already in the repo) so nothing blocks a request. Provider: **Resend** on a dedicated sending subdomain for CID support and developer ergonomics, with **Brevo's free tier (300 sends/day)** as the zero-cost start. Node Mailer is already installed — no change needed.
9. **Email must stay a low-frequency, high-relevance channel.** WhatsApp is native here and competitors already use it as the support front door (HEQA Solutions' FAQ literally says "Chat with us on WhatsApp"). Ten emails a month is the ceiling; the set below is eight, of which five are transactional.
10. **Size is not the current problem, images are.** Rendered templates are 2–5 KB each (measured), far below Gmail's 102 KB clip. But a 300 KB hero on a 2G edge link is a 30–50 second wait. Target **under 60 KB total message weight** and **zero images except the CID logo**.

---

## 1. Audit of the current email code

### 1.1 The pipeline, verified

| Layer | File | What it does |
| --- | --- | --- |
| Transport | `lib/email/send.ts:1`, `:13-21` | Single module-level `nodemailer.createTransport({host, port, secure, auth})` from `SMTP_HOST/PORT/USER/PASS` |
| Primitive send | `lib/email/send.ts:30-45` | `sendEmail({to, subject, html, text?})`; `text` defaults to `html.replace(/<[^>]*>/g, "")` (`:38`) |
| Styles | `lib/email/send.ts:47-73` | One `BRAND_COLORS` object and one `emailStyles` string (1,644 bytes) |
| Auth-triggered | `lib/auth.ts:95-109` | better-auth `emailOTP` plugin; inline dispatch on `type` → sign-in / email-verification / forget-password |
| Async-triggered | `lib/inngest/functions.ts:356-542`, `:780-898` | One Inngest function per email type, each importing the template lazily |
| Campaign | `lib/inngest/engagement-functions.ts:33-240` | Weekly cron `0 10 * * 1`, six campaigns, sequential sends |
| Webhook | `app/api/webhooks/fapshi/route.ts:164-190` | Fapshi mobile-money callback → payment success/failed + admin alert |
| Ad-hoc | `app/api/contact/route.ts:24-79`, `app/api/feedback/route.ts:70-77`, `app/api/feedback/exam/route.ts:60-67` | Contact-form and feedback notifications to admins |
| Registration | `app/api/inngest/route.ts:36-54` | 8 email functions registered |

Installed: `nodemailer@8.0.5` (`package.json:82`), `@types/nodemailer@^8.0.0` (`package.json:121`), `inngest@^4.1.2`, `better-auth@1.6.2`.

### 1.2 Every email that exists today

Sizes are measured byte counts of the `const html = \`…\`` literals (template source), not estimates.

| # | Function (`lib/email/send.ts`) | Purpose | Trigger | Subject today | HTML bytes |
| --- | --- | --- | --- | --- | --- |
| 1 | `sendVerificationEmail:75` | Address/OTP verification | better-auth `email-verification` (`lib/auth.ts:103`) | `Verify your TiCLearn account` | 1,406 |
| 2 | `sendSignInEmail:125` | Passwordless sign-in OTP | better-auth `sign-in` (`lib/auth.ts:101`) | `Your TiCLearn sign-in code` | 1,289 |
| 3 | `sendPasswordResetEmail:174` | Password reset OTP | better-auth `forget-password` (`lib/auth.ts:105`) | `Reset your TiCLearn password` | 1,315 |
| 4 | `sendWelcomeEmail:223` | Post-signup welcome | Inngest `email.send.welcome`, only for **Google** signups (`lib/auth.ts:80-84`) | `Welcome to TiCLearn! 🎓` | 2,014 |
| 5 | `sendAdminInvitationEmail:277` | Admin invite | Inngest `email.send.admin-invite` (`app/api/admin/invites/route.ts:62`) | `Invitation to become an Admin on TiCLearn 🛡️` | 1,881 |
| 6 | `sendRoleUpdateEmail:334` | Role change notice | Inngest `email.send.role-update` (`app/api/admin/users/[id]/role/route.ts:34`) | `Your TiCLearn account role has been updated to {role} 🛡️` | 1,950 |
| 7 | `sendUnverifiedWarningEmail:392` | Verify-or-be-deleted | Cron `0 8 * * 0` (`lib/inngest/functions.ts:544`) | `Action Required: Verify your TiCLearn account` | 2,213 |
| 8 | `sendPaymentSuccessEmail:450` | Payment receipt | Fapshi webhook success (`app/api/webhooks/fapshi/route.ts:164`) | `✅ Payment Confirmed - {plan}` | 1,536 |
| 9 | `sendPaymentFailedEmail:505` | Payment failed/expired | Fapshi webhook fail/expire (`:185`) | `⚠️ Payment Failed` / `⚠️ Payment Expired` | 1,143 |
| 10 | `sendAdminPaymentAlert:553` | New-sale alert to admin | Fapshi webhook (`:172`) | `💰 New Sale: {plan} - {name}` | 474 |
| 11 | `sendAdminFeedbackAlert:580` | Feedback alert to admin | `app/api/feedback/route.ts:70`, `…/exam/route.ts:60` | `📬 New Feedback: {type} - {name}` | 884 |
| 12 | `sendPlatformUpdateEmail:647` | Product newsletter | Cron `0 5 * * 1` (`lib/inngest/functions.ts:780`) | `🎓 Big News: Your Study Just Got Easier! New Features Inside` | 3,478 |
| 13 | `sendSubscriptionActivatedEmail:722` | Manual approval receipt | Inngest `subscription/action` ACTIVATE (`lib/inngest/functions.ts:869`) | `✅ Payment Approve - {plan} Plan Activated` | 2,079 |
| 14 | `sendSubscriptionRejectedEmail:787` | Manual rejection | Inngest `subscription/action` REJECT (`:885`) | `⚠️ Payment Not Approved - {plan}` | 1,901 |
| 15 | `buildEngagementEmail:879` → 6 variants | Retention campaigns | Cron `0 10 * * 1` | see §3 | 1,300–3,000 est. |
| 16 | `sendMagicLinkEmail` (`lib/inngest/functions.ts:428-494`) | Magic link | Inngest `email.send.magic-link` — **no producer exists anywhere** | `Your TiCLearn magic link` | ~1,900 |
| 17 | contact form (`app/api/contact/route.ts:25-73`) | Message to admin | `POST /api/contact` | `[TiCLearn Contact] {subject}` | ~1,600 |

### 1.3 What the copy actually says (the lines that matter)

Verification (`lib/email/send.ts:103-110`):

> "Verify Your Email — Hi {name}, Welcome to TiCLearn! To complete your account setup, please use the verification code below: **[6-digit code]** ⏱️ This code will expire in 5 minutes. If you didn't create an account, please ignore this email."

The 5-minute claim is **correct**: better-auth's `emailOTP` defaults to `expiresIn: 300` seconds (`node_modules/better-auth/dist/plugins/email-otp/index.mjs:14`) and a 6-digit numeric OTP (`index.mjs:11`). Verified, keep it.

Welcome (`:249-263`) — the secondary-school copy that must go:

> "Welcome aboard, {name}! Your TiCLearn account is now active and ready to help you **ace your GCE A-Level exams**!"
> Feature list: "📝 Upload Notes", "🧠 AI Quizzes", "💬 TiC", "🏆 Leaderboard", "📚 **GCE Exams** - Practice with past papers"

Platform update (`:674-703`) — the other GCE holdout:

> "🚀 What's New — More File Types / Smart OCR Technology / Instant Start / Better Navigation"
> "🔔 Coming Soon — Excel Support / PowerPoint Support / Mobile App / Study Groups / Certificates"
> "Join 100+ students **acing their GCE exams**!"

Engagement variants (`:915-1002`): `re-engagement` ("It's been a while, {name}!"), `streak-risk` ("Your {n}-day streak is at risk!"), `onboarding-incomplete` ("Finish setting up your TiCLearn profile"), `weak-topic-drill` ("Time to level up"), `exam-countdown` ("{n} days to go"), `weekly-digest` (three stat tiles: Day Streak / Quizzes / Readiness).

### 1.4 What is wrong, systemic

**S1. No template architecture.** 15 inline literals in one 1,077-line module, one of which (`lib/email/send.ts`) is 41,676 bytes. Changing the footer or the button means 15 edits. There is no `layout()`, no `<Html>/<Text>/<Button>` abstraction, no preview route, no snapshot test.

**S2. The web font never renders.** Eleven copies of `<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans…">` (`:92`, `:142`, `:191`, `:238`, `:294`, `:351`, `:409`, `:663`, `:746`, `:809`, and `lib/inngest/functions.ts:450`). Gmail strips external stylesheets from `<head>`; Can I Email lists `@font-face` as unsupported in Gmail and buggy in Outlook (elements ignore the font stack and fall back to Times New Roman). Net effect: **Plus Jakarta Sans appears only on Apple Mail**, and the fallback `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto` is what 90% of users actually see.

**S3. Gradients with no fallback (silent white-on-white).** `.header { background: linear-gradient(135deg, #7c3aed, #a855f7) }` (`:58`) plus `h1 { color: white }` (`:59`). Classic Outlook and Outlook.com do not render CSS gradients → the header becomes a transparent box with white text. Same pattern at `:527` and `:815` (the payment-failure/rejection headers, where the gradient is red). **This is the highest-severity visual bug in the set.**

**S4. `border-radius` and `:hover` are decorative-only.** `.card` 16px (`:57`), `.button` 8px (`:66`), `.button:hover` (`:67`) — Outlook renders square. Never rely on radius for hierarchy; the app's 1.4rem web radius cannot translate.

**S5. Flexbox where tables are required.** `buildEngagementEmail:984-997` lays the three digest tiles out with `display:flex; gap:16px` and `flex:1;min-width:120px`. Word-engine Outlook ignores flex → three full-width stacked blocks. `.features li { display:flex; gap:12px }` (`:70`) degrades more gracefully but is still non-standard.

**S6. `width: fit-content` on an anchor.** `:261`, `:315`, `:369`, `:431` use `style="display:block; … width: fit-content; margin:32px auto"`. Word engine ignores both properties.

**S7. HTML injection.** `escapeHtml` (`:4-11`) is applied only in `sendAdminFeedbackAlert` (`:597-600`), `sendSubscriptionActivatedEmail` (`:735-737`) and `sendSubscriptionRejectedEmail` (`:798-800`). Raw interpolation elsewhere: `:104`, `:154`, `:203`, `:249`, `:307`, `:363`, `:421`, `:479-480`, `:533-534`, `:486` (`transId` from a webhook body), `:764`, `:883`, `:917`, `:959`, `:973`, `:998`, plus `app/api/contact/route.ts:54-66`. A user who signs up as `<img src=x onerror=...>` puts live markup in every subsequent email, including admin inboxes.

**S8. The `text` alternative is garbage.** `text: text || html.replace(/<[^>]*>/g, "")` (`:38`) ships the CSS block, the Google Fonts URL, HTML entities (`&rarr;`, `&copy;`, `&nbsp;`), and no line breaks, because the strip leaves the original whitespace but every tag removed joins words. **No template passes `text` explicitly.**

**S9. No preheader.** None of the 17 templates sets preheader text, so the inbox preview is whatever the client scrapes — usually "🎓 TiCLearn" or the CSS. The preview is wasted on every single send.

**S10. No headers.** Zero `replyTo`, zero `List-Unsubscribe`, zero `List-Unsubscribe-Post`, zero `Message-ID` control, no `X-Entity-Ref-ID` for bounce grouping (verified by grep: no matches in `lib/` or `app/`). Bulletproof-style VML is absent.

**S11. Failures are silent.** `sendEmail` catches everything and returns `{success:false}` (`:41-44`); no caller checks. `lib/auth.ts:103` awaits it and ignores the result. There is no retry, no dead-letter, no bounce or complaint record. Combined with §1.5 this means "email verification is broken" is invisible.

**S12. Sends block requests.** Verification, sign-in and password-reset OTP all run inline in the better-auth callback (`lib/auth.ts:96-107`), i.e. inside the sign-up HTTP request. Campaigns send sequentially with a 2 s sleep inside one Inngest function (`lib/inngest/functions.ts:818`, `engagement-functions.ts:241`) — a timeout mid-batch silently drops the remainder.

**S13. `notifyAllAdminsOfFeedback` (`lib/email/send.ts:634-645`) queries every admin and blasts them on every feedback submission** with no throttle — a feedback-spam loop can burn the domain's reputation in minutes.

**S14. Dead code.** `sendMagicLinkEmail` (`lib/inngest/functions.ts:428`) has no producer; `sendSubscriptionActivatedEmail`/`sendSubscriptionRejectedEmail` are only reachable from the admin console path, and their copy says "Approve"/"Not Approved" — manual-review language from a manual-review product that now has a live Fapshi webhook (`:164-190`). Three near-duplicate payment emails exist for one event (webhook success, webhook fail, admin action).

**S15. Broken trigger.** `lib/inngest/trigger.ts:2` calls `fetch("/api/inngest/trigger")` with a **relative URL from server code**. In a Node/Next server context that throws `Failed to parse URL`; the error is caught and logged, so welcome emails for Google signups silently never fire. Only `send.ts`'s `.catch` masks it.

**S16. Timezone/date inconsistency.** Receipts print `FCFA` in one template (`lib/email/send.ts:485`) and `XAF` in another (`:764`) for the same currency.

### 1.5 The two campaign bugs in full

**(a) Every campaign is one-shot, forever.** `prisma/schema.prisma:1543` declares `@@unique([userId, campaign])` on `EngagementLog`. `engagement-functions.ts:22-25` loads an existing row as "already sent" and `:214` skips, while `:219` upserts the same key. Consequence: a user who receives `weekly-digest` in week 1 **never receives another weekly digest**. `re-engagement`, `streak-risk` and `exam-countdown` are all structurally impossible to repeat. Any retention design built on these campaigns is dead on arrival.

**(b) The newsletter always goes to the same 50 people.** `lib/inngest/functions.ts:790-801` runs `prisma.user.findMany({where: {emailVerified: true, role: {not: "ADMIN"}}, take: 50})` with **no `orderBy` and no cursor**. Postgres will return a stable order for an unchanging table, so the same 50 accounts receive "🎓 Big News" every Monday indefinitely. This is the fastest way to earn a spam-complaint rate.

### 1.6 What the templates should keep

- The 5-minute OTP expiry claim — accurate (verified above).
- The one-action-per-email discipline. Every template already has exactly one CTA; that is right and should be preserved.
- The plain, non-hyped tone of the transactional templates. It already reads better than most of the market (see §5).
- The mobile-money framing in payment copy ("your account is safe", `:536`) — locally credible.

---

## 2. Nodemailer deep dive

### 2.1 Current version state

| Fact | Value | Source |
| --- | --- | --- |
| Latest npm `nodemailer` | **10.1.0** (published 2026-10-10) | `npm view nodemailer dist-tags` |
| This repo | **8.0.5** | `package.json:82`, `node_modules/nodemailer/package.json` |
| Node requirement for v10 | Node 20+ | https://nodemailer.com/ |
| v8 security fixes landed after 8.0.5 | 8.0.9 (2026-05-26) patched two advisories: `jsonTransport` access bypass and List-\* CRLF injection | https://github.com/nodemailer/nodemailer/releases |
| `@types/nodemailer` | Types are bundled from v10; the `@types` package is for v9 and earlier and conflicts with v10 | https://nodemailer.com/ |

**Action:** bump to ≥ 8.0.9 immediately (a two-character patch, closes two advisories). Migrating to 10 means Node 20+ and removing `@types/nodemailer` (`package.json:121`) — schedule that, do not bundle it with the template rewrite.

### 2.2 `nodemailer` vs `nodemailer.createTransport`

- **`nodemailer`** is the module namespace. It exposes helpers: `createTransport`, `createTestAccount`, `getTestMessageUrl`, `MailComposer`, and the legacy `nodemailer.sendMail()` convenience form.
- **`createTransport(transport[, defaults])`** is how you get a *reusable* sending object. Pass an options object, a connection URL (`"smtp://user:pass@host:587"`), or a transport plugin. The optional second `defaults` argument is merged into every message — ideal for pinning `from`, `replyTo`, and headers.
- The old top-level `nodemailer.sendMail()` creates a throwaway transporter per call: it opens a connection, sends, and tears down. **Never use it in a serverless function** — on Vercel you will pay a fresh TCP+TLS handshake per email and frequently hit connection limits.

Docs: https://nodemailer.com/usage/#createtransport

```js
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport(
  {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === "465",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    pool: true,          // reuse sockets — important on Vercel
    maxConnections: 3,
    maxMessages: 100,
  },
  { from: process.env.FROM_EMAIL },  // defaults merged into every message
);
```

`pool: true` is not in the current code and matters for a burst from a campaign cron.

### 2.3 The `html` + `text` requirement

Nodemailer builds the MIME tree from whatever body fields you pass. If you pass only `html`, you get a single `text/html` part. If you pass `text` **and** `html`, it emits `multipart/alternative` with `text/plain` **first** and `text/html` second — correct RFC 2046 ordering, so dumb clients read the plain part and rich clients prefer the HTML.

Docs: https://nodemailer.com/message/alternatives — "Nodemailer emits the body parts in a fixed order: `text`, `watchHtml`, `amp`, `html`, `icalEvent`, then everything in the `alternatives` array."

Why it matters here:

1. **Deliverability.** A message with no `text/plain` part is a strong spam heuristic. Google's guidance for bulk senders explicitly asks for a legitimate `text/plain` part.
2. **Reach.** Outlook.com's new Outlook and some corporate gateways strip HTML entirely; a text-only student in Buea on a 2 MB data plan still needs to read their OTP.
3. **Honesty about size.** The current `text` fallback (`lib/email/send.ts:38`) inflates every message with CSS and entities. Writing real text is smaller *and* better.

Rule for this product: **every template is authored twice.** In JSX that means writing the content once and rendering both `text` and `html` from the same data object, not hand-maintaining two strings.

### 2.4 Exact code: multipart mail with a CID logo

Docs: https://nodemailer.com/message/embedded-images and https://nodemailer.com/message/attachments

The attachment object fields that matter (verbatim from the attachments reference): `content` (string/Buffer/stream), `path`, `filename`, `contentType`, `contentDisposition` (defaults to `'attachment'`, **except** attachments with a `cid` default to `'inline'`), `cid`, `encoding`, `contentTransferEncoding`, `headers`.

```ts
import fs from "node:fs";
import nodemailer from "nodemailer";

const logo = fs.readFileSync("lib/email/assets/logo.png"); // 5–8 KB, 2x of a 120x40 display

const transporter = nodemailer.createTransport({ /* …SMTP… */ });

await transporter.sendMail({
  from: '"TiCLearn" <no-reply@mail.ticlearn.cm>',
  to: "student@example.com",
  replyTo: '"TiCLearn Support" <support@ticlearn.cm>',
  subject: "Your TiCLearn code",
  text: "Your TiCLearn sign-in code is 482913. It expires in 5 minutes.\n\nIf you did not try to sign in, ignore this email.",
  html: '<img src="cid:logo@ticlearn.cm" width="120" height="40" alt="TiCLearn">',
  headers: {
    "X-Entity-Ref-ID": "otp-482913",
    "List-Unsubscribe": "<https://ticlearn.cm/u/abc123>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  },
  attachments: [
    {
      filename: "logo.png",
      content: logo,
      contentType: "image/png",
      cid: "logo@ticlearn.cm",           // matches src="cid:logo@ticlearn.cm"
      contentDisposition: "inline",     // default when cid is set, but state it explicitly
      contentTransferEncoding: "base64",// default; make it explicit for predictability
    },
  ],
});
```

Four facts from the docs that decide the design:

- The `cid` value **must be unique per message**, and Nodemailer's own recommendation is an email-like string on a domain you control.
- **An HTML body is required.** "Embedding via `cid` only takes effect when the message has an `html` body — the cid attachments are grouped together with the HTML part into a `multipart/related` container. Without an HTML body, `cid` attachments are delivered as regular attachments." So CID never produces an `inline`-but-invisible part in a text-only client; worst case it shows as a file. That is the graceful failure we want.
- `contentDisposition` defaults to `inline` for any image attachment that has a `cid`, so the explicit `'inline'` above is belt-and-braces, not magic.
- Nodemailer nests it automatically as `multipart/alternative` (text, html) inside `multipart/related` with the image part. You do not hand-build MIME.

### 2.5 Why not base64 data URIs, and why not hosted URLs

**Base64 data URIs.** `<img src="data:image/png;base64,iVBOR…">` — blocked. Consensus across the field: data URIs are "not supported in most web email clients (including Gmail) and are completely blocked in Outlook" (https://stackoverflow.com/questions/46783599/base64-encoded-image-is-not-showing-in-gmail). Additional costs even where they render:

- **Size inflation.** Base64 adds 33% on top of the binary, and the bytes count against Gmail's 102 KB body limit because they are in the HTML, not referenced. The size guide is explicit: "inline SVGs, base64-encoded images, and large blocks of CSS all do" count (https://www.digitalapplied.com/blog/email-design-size-guide-2026-templates).
- **Spam heuristics.** A base64 blob in the body is a text pattern that no legitimate low-volume sender produces.
- **No caching.** Every send re-transmits the logo; CID parts are also per-message, but at 6 KB it is irrelevant either way.

Size guidance for the logo specifically: **keep the CID asset under 10 KB.** At 2× a 120×40 CSS display size, a well-compressed PNG is 5–8 KB; an SVG is not reliable as an inline part. One CID logo per message, loaded once, cached by the client.

**Hosted images (absolute `https://…` URLs).** They work, but:
- Gmail and Outlook both **block remote images by default** for privacy. Gmail: Settings → See all settings → Images → "Always display external images"; on Android it asks before loading. Outlook has its own Block External Images setting and admins can force it (https://support.microsoft.com/en-us/outlook/what-is-block-external-images-in-my-settings).
- The email must remain fully useful with zero images loaded. Never put the CTA, the OTP, or the price inside an image.
- **Image reputation.** Images are fetched by the client's proxy (Gmail's, Microsoft's), so what matters is the reputation of the **hosting domain** and its redirect chain, not the sender's. A newly registered domain, a CDN that 30 other senders share, or a URL shortener all degrade loading and, indirectly, engagement. Practical rules: serve from a **stable, first-party subdomain** (e.g. `img.ticlearn.cm`) over HTTPS with correct `Content-Type`, no redirects, no hotlink protection, no auth; keep the file small; **and never route through a link shortener** — filters penalise mismatched destination domains.
- If you must warm image reputation: there is no formal "image warm-up" protocol. The equivalent discipline is (a) send from a warmed, authenticated domain, (b) point images at a subdomain you control that has been live and serving real traffic for weeks, (c) keep the image count at 1–2 per message so a block is not catastrophic, and (d) never make images load-bearing. **For a product where email is secondary, the strongest answer is to have no images at all except the CID logo** — which is what §4 recommends.

**Verdict for this product: one CID logo, zero hosted images, all content in live HTML text.** That is the only design that is immune to Gmail's and Outlook's image blocking, immune to image reputation, and cheapest on a metered connection.

### 2.6 Dark mode

Source for the mechanics: https://www.courier.com/blog/dark-mode-email-design and https://www.litmus.com/blog/the-ultimate-guide-to-dark-mode-for-email-marketers

Three client behaviours:

| Behaviour | What happens | Where |
| --- | --- | --- |
| No change | colours render as authored | Apple Mail (without dark styles), Gmail desktop web, Yahoo, AOL |
| Partial inversion | light backgrounds → dark, dark text → light; already-dark elements (buttons, dark bars) untouched | Outlook.com, new Outlook, Outlook mobile, **Gmail app on Android** |
| Full inversion | everything rewritten, including CTA fills | Classic Outlook on Windows, Windows Mail, **Gmail app on iOS** |

The trap the Courier article names: a `#111111` header bar stays `#111111` under Gmail's *partial* inversion, so it vanishes into a near-black background. And an image keeps its own pixels while the text around it flips.

The opt-in almost nobody ships — Apple Mail requires an explicit declaration before `prefers-color-scheme` does anything:

```html
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
```
```css
:root { color-scheme: light dark; }
```

Referenced in the article to Rémi Parmentier's write-up in email-bugs #104 (https://github.com/hteumeuleu/email-bugs/issues/104): every Apple Mail version needs `supported-color-schemes` or `color-scheme` before dark styling applies.

**Strategy for us — resilience, not art direction.** iOS Mail and Android Gmail are both "dark mode on" for a meaningful share of the audience, and the audience skews to OLED cheap Androids. Three rules that survive full inversion:

1. **Never rely on a coloured background to carry meaning.** Put the label in text.
2. **Give buttons a solid `background-color` and white text, and repeat the action as a plain link below.** Under full inversion a purple button can become beige; the text link never breaks.
3. **Do not add a `@media (prefers-color-scheme: dark)` palette at all.** Two reasons: it only works where you get the opt-in right, and any partial-inversion client will apply *its* transformation on top of yours and produce a third result. Designing one palette that works everywhere beats designing three that work once. This is a deliberate, defensible choice — see §4 for the token values chosen for it.

### 2.7 Deliverability for a new sending domain

Google's requirements for bulk senders: https://support.google.com/a/answer/81126 — SPF, DKIM and DMARC required for anyone sending more than 5,000 messages/day to Google users (since February 2024), with one-click unsubscribe for marketing mail. Microsoft's equivalent: https://learn.microsoft.com/en-us/microsoft-365/security/office-365-security/email-authentication-about

#### Live DNS audit of the current production domain (`ticsummit.org`, verified today with `dig`)

| Record | Live value | Verdict |
| --- | --- | --- |
| SPF | `v=spf1 include:_spf.google.com ~all` | **Blocks every non-Google sender.** Adding Resend/Brevo/SES requires adding their `include:`. Never publish a second SPF record — multiple SPF TXT records are a permerror. |
| DKIM | `default._domainkey` → 1024-bit RSA public key | Present but **1024-bit**; 2048-bit is the current floor. Unknown which service it belongs to. `google._domainkey`, `resend._domainkey`, `k1._domainkey`, `selector1/2._domainkey` all absent. |
| DMARC | `v=DMARC1; p=none;` | No `rua`, no `ruf`, no `adkim`/`aspf`. Monitoring without reporting is useless — you cannot see who is spoofing or failing. |
| MX | `aspmx.l.google.com` + 4 alternates | Mail is on **Google Workspace**. |
| A | `ticlearn.ticsummit.org` → `*.vercel-dns-017.com` | App is on **Vercel**. |

#### The records to publish for a dedicated sending subdomain

Send transactional mail from `mail.ticlearn.cm` (a new domain you own outright) rather than `ticsummit.org`. Rationale: outbound reputation damage then cannot affect Google Workspace mail, and you can enforce DMARC hard on the subdomain without discovering what else sends as the org.

```
# SPF — one record only, under 10 DNS lookups
mail.ticlearn.cm.      TXT  "v=spf1 include:amazonses.com ~all"          # or your provider's include
# or:  "v=spf1 include:resend.com ~all"
# or:  "v=spf1 include:sendgrid.net ~all"

# DKIM — publish exactly what the provider gives you, usually two CNAMEs
resend._domainkey.mail.ticlearn.cm.   CNAME  resend._domainkey.amazonses.com.
selector1._domainkey.mail.ticlearn.cm. CNAME  s1.domainkey.mail.ticlearn.cm.

# DMARC — start monitoring, then enforce
_dmarc.mail.ticlearn.cm. TXT  "v=DMARC1; p=none; rua=mailto:dmarc@ticlearn.cm; fo=1; adkim=r; aspf=r"
# after 2 clean weeks:
_dmarc.mail.ticlearn.cm. TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@ticlearn.cm; pct=100"
# after 4 clean weeks:
_dmarc.mail.ticlearn.cm. TXT  "v=DMARC1; p=reject; rua=mailto:dmarc@ticlearn.cm; pct=100"

# Also on the ROOT, add reporting so you see spoofers:
_dmarc.ticlearn.cm.      TXT  "v=DMARC1; p=none; rua=mailto:dmarc@ticlearn.cm; fo=1"
```

Validate by sending a test to Gmail, opening it, choosing **Show original**, and confirming `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS` with **alignment** (the same organisational domain in From and in the DKIM `d=`). Also register [Google Postmaster Tools](https://postmaster.google.com/) so bounce and complaint data lands somewhere you watch.

#### Warm-up schedule

From the 2026 deliverability playbooks (https://overloop.com/blog/email-deliverability, https://truelist.io/blog/how-to-warm-up-an-email-domain, https://www.mailforge.ai/blog/domain-warming). Note these schedules are written for **cold outbound at scale**; a transactional app sending verification codes is a different shape — it sends to *people who just signed up*, which is the highest-engagement mail anyone sends. The transferable rules are the pacing and the stop conditions.

| Phase | Volume | Notes |
| --- | --- | --- |
| Days 1–3 | 10–20/day to known-friendly recipients | ask for a reply |
| Days 4–7 | 25–50/day | plain text or very light HTML |
| Week 2 | 60–120/day | add real signup traffic |
| Week 3 | 150–250/day | |
| Week 4 | 300–500/day if metrics stay clean | |

For us specifically: start with internal and founder accounts, then let real signups flow (they are self-warming), and **cap the first newsletter blast at 50**. Hold volume steady for 48–72 h after any change (new From name, new template engine, new link domain). **Stop conditions:** complaints > 0.1%, hard bounces > 2%, soft bounces > 5%, or a sudden per-provider open/click drop (Mailchimp's education benchmark to compare against is below).

#### Can Neon, Vercel, or the current setup be leveraged?

- **Neon** — Postgres. It has no relationship to email reputation. Nothing to leverage. (An `Email` column type in Postgres is not a mail-sending service.)
- **Vercel** — hosting. It cannot send mail on your behalf; `Resend`/`SendGrid`/`Postmark` are third parties. Vercel's own transactional mail is limited to Vercel system messages. The only relevant thing: Vercel's statelessness is *why* you need a pooled transporter and an async queue rather than a `nodemailer.sendMail()` in a request handler.
- **The current setup** — Google Workspace SMTP (`.env.example:62-66` tells you to use `smtp.gmail.com` with an app password). Google Workspace SMTP is capped at ~2,000 messages/day and is explicitly not intended for automated transactional sending; sending through it will get the Workspace domain throttled and can affect human mail at ticsummit.org. **Treat this as a stopgap for dev only.**

### 2.8 Provider comparison (2026)

| Provider | Cheapest entry | CID inline images | SMTP | Notes |
| --- | --- | --- | --- | --- |
| **Resend** | Free: 3,000/mo, **100/day**, 3 domains. Pro $20/mo = 50k/mo, extra $0.90/1k, no daily cap ([pricing](https://resend.com/pricing)) | **Yes** — [docs](https://resend.com/docs/dashboard/emails/embed-inline-images), shipped via [changelog](https://resend.com/changelog/embed-images-using-cid) | Yes | React-first DX, template previews, webhook delivery events (essential for bounce handling) |
| **Brevo** | Free plan **300 sends/day**, 100k contacts ([help centre](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan)); pricing page now advertises a free-forever tier from 5,000 emails/month with no daily cap — *verify in-account* ([pricing](https://www.brevo.com/pricing/)) | Yes (standard SMTP attachment support) | Yes | 300/day ≈ 9,000/month, comfortably above a Buea/Bamenda launch; adds "Sent by Brevo" unless paid |
| **Amazon SES** | $0.10 per 1,000 outbound; new AWS accounts get $200 credits ([pricing](https://aws.amazon.com/ses/pricing/)) | Yes | Yes | Cheapest at volume; requires a production-access request (can take 24 h+), sandbox limits first, plus ops burden. Best if/when you cross ~50k/month |
| **SendGrid** | Free plan retired ([MailerCloud comparison](https://www.mailercloud.com/blog/sendgrid-alternatives)); entry plan ~$20/mo | Yes | Yes | Widest SMTP compatibility, but API churn and pricing complaints |
| **Postmark** | ~$15–20/mo for 10k | Yes | Yes | Excellent transactional reputation, but **streams transactional vs marketing separation is enforced**, which is actually good for us |
| **Mailgun** | Entry ~$15/mo | Yes | Yes | Strong African SMTP routing historically; heavier setup |

**On deliverability to African mailboxes:** no provider publishes Cameroon-, Buea- or Bamenda-specific placement data, and I found none (**unverified**). What is documented generally: inbox placement across-industry averages just under 85% with roughly one in six legitimate emails missing the inbox (Validity 2025, cited at https://overloop.com/blog/email-deliverability); the practical levers are authentication, engagement, complaint rate and cadence, all of which are provider-independent. Cameroon mailboxes are overwhelmingly Gmail, Outlook/Hotmail, and Orange/MTN webmail; Gmail's and Microsoft's rules are the binding constraint, and both are met by any of the five above **provided SPF/DKIM/DMARC are published**.

**Recommendation:** start on **Resend** — it is the only one with first-class CID support *documented for the product's exact use case*, the smallest free tier that still fits a launch, webhook events for bounce/complaint suppression, and a 100/day free cap that is honest about volume (it forces the "email is a low-frequency channel" discipline from day one). Move `FROM_EMAIL`/SMTP env to point at it and keep the code provider-agnostic (raw SMTP → any provider is a config change, no code change). If the 100/day cap binds, Brevo's 300/day free tier is the drop-in alternative.

### 2.9 Preheader, unsubscribe, CAN SPAM, and what applies in Cameroon

**Preheader.** The text a client shows next to the subject line. With no preheader set, clients scrape the first visible text — which today is the CSS or the emoji. Two implementation options: put the preheader as the first content in the body inside a hidden div, or set it as a header. Gmail's own renderer picks the body content; the robust approach used in production is the hidden div plus filler characters:

```html
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;">
  Your sign-in code is ready. It expires in 5 minutes.
  &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
</div>
```

Then, at the very top of `<body>`, the real visible header. Sources: https://www.litmus.com/blog/the-ultimate-guide-to-preview-text-support, https://www.activecampaign.com/blog/email-preheader

**Unsubscribe / List-Unsubscribe.** Add the RFC 8058 pair on every non-transactional send:

```
List-Unsubscribe: <https://ticlearn.cm/u/{token}>, <mailto:unsub@ticlearn.cm>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

Required by Google for bulk senders (https://support.google.com/a/answer/81126). The repo already has the data model for it — `UserSettings.emailNotifications` defaults to `true` (`prisma/schema.prisma:789`) and is checked at `lib/inngest/engagement-functions.ts:28-32`, with an unsubscribe link already in the campaign footer (`lib/email/send.ts:900-903`). **What is missing is the header, the one-click POST endpoint, and the setting defaulting to `false` for anyone who was not opted in.** Transactional mail (verification, password reset, receipts) is exempt from unsubscribe requirements under every regime below — do not put an unsubscribe link on an OTP.

**CAN SPAM** (US) requires: no deceptive headers, accurate subject and `To`, identification as an ad (or `yuv`/no-ad disclosure), a valid physical postal address, and a clear opt-out honoured within 10 business days. Source: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business — including the key carve-out that CAN SPAM **does not apply to "transactional" messages**, i.e. messages that facilitate an agreed transaction between you and the recipient.

**What actually applies in Cameroon.** This is stricter than CAN SPAM and worth getting right:

- **Law No. 2010/021 of 21 December 2010 on electronic commerce in Cameroon, art. 7(1)**: "direct prospecting by means of an automated calling machine, a fax machine or an electronic mail using, in any form whatsoever, the contact details of a natural or legal person who has not expressed his prior consent to receive direct prospecting by this means is prohibited." Source: https://www.dlapiperdataprotection.com/index.html?t=electronic-marketing&c=CM
- **Law No. 2024/017 of 23 December 2024 on the protection of personal data** requires consent unless otherwise provided by law, plus purpose limitation, proportionality, retention limits and security (https://www.dlapiperdataprotection.com/index.html?t=law&c=CM).
- **Practical reading:** there is no US-style "you may email anyone" safe harbour. Consent must be **prior and express** for anything promotional. Verification, password reset, receipts and payment-failure notices are transactional (they relate to the recipient's own account and requested action) and sit outside the prospecting prohibition — but **the weekly digest, "big news" newsletter, streak nudges and re-engagement are direct prospecting and need a recorded opt-in**, not an opt-out default.

**Consequence for this product:** change `UserSettings.emailNotifications` default to `false`, add an explicit opt-in checkbox at signup/onboarding ("email me my weekly progress digest"), and keep every promotional send behind that flag. Add a physical address to the footer of promotional mail. This is also simply correct product behaviour: a Buea student on a data cap should *agree* to receive weekly mail.

### 2.10 Size limits and what they mean for a metered connection

- **Gmail clip: 102 KB** of HTML body. Above that, the message is truncated behind a "View entire message" link — which destroys the unsubscribe footer and the tracking pixel. Sources: https://help.klaviyo.com/hc/en-us/articles/115000591251, https://mailchimp.com/help/gmail-is-clipping-my-email/, and the size guide, which adds: "The link breaks tracking pixels and unsubscribe footers, which means clipped messages hurt deliverability and compliance."
- **Mobile clips earlier**: Klaviyo puts it at 20–75 KB on mobile clients. Design to that, not to 102 KB.
- **Total weight guidance**: under **1 MB** for marketing, under **300 KB** for transactional (size guide). We will target **under 60 KB**.
- **Base64/SVG and CSS count** against the 102 KB; hosted images do not (size guide) — but hosted images still cost the student data.

**The data-price reality, honestly stated.** Cameroon mobile data: MTN sells 100 MB/24 h for 100 FCFA and 2 GB/24 h for 1,000 FCFA (https://mtn.cm/offers/mobile-surf/); Orange's 3 GB/month is about 2,500–3,000 FCFA, i.e. $4–5 (https://tasonic.com/top-up/cameroon/orange-cameroon/). At 3 GB/month a student can absorb roughly 10,000 opens of a 300 KB email — so **email size is not primarily a money problem, it is a time problem.** A 300 KB hero on a 2G edge link at 50–100 kbps is a 25–60 second wait, on a phone that is also rendering the message on a low-end CPU. Small and image-free is about the student not waiting, and about never being let down by a blocked image.

---

## 3. What emails this product actually needs

### 3.1 Design rules for the set

1. **Transactional and promotional mail are different animals.** Five transactional (no unsubscribe, triggered by the user's own action), three lifecycle (opt-in, one job each). Never mix.
2. **One job, one CTA.** Every existing template already does this; keep it.
3. **Frequency ceiling: 10 emails/month/user, and 2 in any 7-day window outside the digest.** Benchmarks: Mailchimp's Education + Training average is **35.64% open, 3.02% click, 0.18% unsubscribe** (https://mailchimp.com/resources/email-marketing-benchmarks/). Cross-industry averages in 2026 sit at 21–27% open (https://qualtir.com/blog/email-open-rates-by-industry-2026). And open rate is now a weak signal at all — Apple Mail Privacy Protection pre-fetches images through a proxy, so opens register whether or not a human reads anything (size guide). **Judge these emails on clicks and quiz-starts, not opens.**
4. **WhatsApp owns "conversation", email owns "receipts and proofs".** Every competitor we found routes support to WhatsApp (§5). So: never design an email whose job is to start a conversation. Every email below ends in an action the student takes on the web or in the app.
5. **The tutor framing constrains the copy.** The product is a tutor, not an answer machine, because academic dishonesty is near-universal here. No email may say "get your answers". "See where you lost marks and what to revise next" is both compliant with the product's ethics *and* better copy.

### 3.2 The set

Sizes are **target total message weight** (HTML + text + inline logo), on the design system in §4.

| # | Email | Trigger | Single job | Subject | Preview (preheader) | CTA | Target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **Verify your account** | `user.created`, better-auth OTP | Let them finish signing up | `Your TiCLearn code: 482913` | `Takes 30 seconds. The code expires in 5 minutes.` | *Enter the code* (link to `/verify-email`) + code shown as text | ≤ 15 KB |
| 2 | **Welcome + first run** | `user.emailVerified` (all signups, not just Google — `lib/auth.ts:80-84`) | Get the first quiz started today | `Let's start with one quiz, {firstName}` | `Pick a programme. We will build your first practice set.` | *Pick my programme* → onboarding | ≤ 25 KB |
| 3 | **Password reset / sign-in code** | better-auth `forget-password` / `sign-in` | Let them back in | `Reset code: 482913` | `Expires in 5 minutes. If this was not you, ignore it.` | *Open TiCLearn* + code | ≤ 15 KB |
| 4 | **Payment received** | Fapshi webhook success (`app/api/webhooks/fapshi/route.ts:164`) | Prove the money landed, instantly | `Payment received — {plan}, {amount} FCFA` | `Reference {transId}. Your {plan} plan is active now.` | *Start practising* → `/practice` | ≤ 20 KB |
| 5 | **Payment failed, retry** | Fapshi webhook fail/expire (`:185`) | Get the retry done before they abandon | `Your {plan} payment did not go through` | `No money was taken. Tap to retry with MTN or Orange MoMo.` | *Retry payment* → `/subscription` | ≤ 20 KB |
| 6 | **Exam countdown** | Cron, 14 and 7 and 1 day before `examProfile.examDate` | Convert dread into one 10-minute session | `{n} days until your exam` | `Your weakest topic is {topic}. Here is the fastest way to move it.` | *Practise my weak topic* → deep link | ≤ 30 KB |
| 7 | **Weekly progress digest** | Cron Mondays 08:00 Africa/Douala, opt-in only | Show one number that moved, and one thing to do | `{name}, you moved {subject} by {+n}%` | `{streak} day streak · {quizzes} quizzes · readiness {r}` | *See this week's report* | ≤ 40 KB |
| 8 | **Referral reward** | `affiliateEarning` created (`app/api/webhooks/fapshi/route.ts:136-147`) | Get them to share the link | `Your friend upgraded — {n} days of {plan} added` | `Your referral credit is now on your account.` | *Invite another friend* | ≤ 20 KB |
| 9 | **Come back** | Inactivity ≥ 14 days, opt-in, max 1/month | One session, one click | `Your {exam} exam is getting close` | `Two minutes of practice is enough to restart.` | *Resume where you left off* | ≤ 20 KB |
| 10 | **Subscription ending / plan change** | `subscription.updatedAt` − 3 days | Prevent an accidental lapse | `Your {plan} plan ends on {date}` | `Nothing is charged unless you renew.` | *Renew or change plan* | ≤ 20 KB |

**Cut from today's set:** `sendPlatformUpdateEmail` (the Monday-50 bug, "Coming Soon" list, permanent GCE copy — a roadmap email is the definition of a marketing email and needs an opt-in it does not have), `sendUnverifiedWarningEmail`'s deletion threat (threatening to delete a student's account because they did not open a verification mail is both a compliance risk under Law 2010/021 and a bad first impression; replace with a re-send prompt), and the duplicate subscription activated/rejected pair (fold into #4 and #5).

**Justification against the research:** education open rates around 35% (Mailchimp) mean a 10-email/month programme yields ~3.5 opens — enough for the digest and countdown to work and nothing more. Click rate 3% on education benchmarks means each email is worth roughly 3 returns; that only justifies sending when the content is genuinely specific to that student's data (their weakest topic, their streak, their receipt). Everything above #5 is therefore either data-specific or opt-in. And because Gmail and Outlook block images by default (§2.5) while students pay per megabyte, an email that costs 300 KB to render is an email that arrives broken.

---

## 4. Design language: what survives email

### 4.1 Survival table for our design system

| In the product | In email | Verdict |
| --- | --- | --- |
| **Plus Jakarta Sans** (web font) | `@font-face` is unsupported in Gmail and buggy in Outlook — elements fall back to Times New Roman | **Does not survive.** Use a system stack. Optionally add `<link>` to Google Fonts as a progressive enhancement for Apple Mail (it already does no harm). |
| **Lora** (serif accent) | Same problem | **Does not survive.** Skip. |
| **IBM Plex Mono** (code/OTP) | `font-family: 'Courier New', monospace` is universal | **Survives as a fallback**, not as Plex. Use mono for OTPs and receipt references — it is legible on a cheap screen and signals "this is a code". |
| **1.4rem radius (22.4px)** | `border-radius` is ignored by classic Outlook | **Survives on ~everything except Word-engine Outlook**, where it degrades to a square. Acceptable **if nothing depends on it** — radius is decoration, never a grouping mechanism. |
| **oklch colour tokens** | Outlook (Word engine) does not support `oklch()` and will fall back to black | **Does not survive as-is.** **Convert every token to a 6-digit hex at build time** and keep hex as the authored value. |
| **Purple accent** | Survives; needs ≥ 4.5:1 text contrast on white | **Keep** `#6D28D9` (7.0:1 on white) for text/links; `#7C3AED` (4.8:1) is the fill minimum. |
| **Table-based layout** | Required | **Adopt.** |
| **Flex/grid stat blocks** | Ignored by Word-engine Outlook | **Adopt tables** with `role="presentation"`. |
| **Component library (shadcn)** | Cannot ship to a mailbox | **Rebuild as email primitives** in the same token language. |

### 4.2 Layout rules

- **Single 600px column.** Table-based, `role="presentation"`, cells stacked. The 600px cap is not a style choice: it is what classic Outlook's Word engine can render reliably, and the size guide is unambiguous that "a single 600-pixel table with stacked rows renders identically in every client … Use this shape for receipts, confirmations, password resets, and short newsletters" (https://www.digitalapplied.com/blog/email-design-size-guide-2026-templates).
- **Mobile-first at 320px.** iPhone SE-class viewport is 320px; design there and let it grow. Set `<meta name="viewport" content="width=device-width, initial-scale=1">` (present today at `lib/email/send.ts:90` — keep it).
- **Outlook conditional width** so the 600px canvas is pinned rather than stretched:
  ```html
  <!--[if mso]><table width="600" align="center"><tr><td><![endif]-->
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto">
  <!--[if mso]></td></tr></table><![endif]-->
  ```
- **No background images, no gradients without a `background-color` fallback.** If you use a gradient at all, put `background-color:#6D28D9` on the same element as the first declaration.
- **Every `border-radius` is decoration only.** Box structure must survive without it.
- **Font sizes ≥ 16px body, 14px minimum anywhere**, tap target ≥ 44px tall (WCAG/size guide).

### 4.3 The design system

**Colour tokens** (hex; oklch converted once at authoring time):

| Token | Hex | Use | Contrast on white |
| --- | --- | --- | --- |
| `--ink` | `#1A1523` | body text | 17.4:1 |
| `--ink-muted` | `#5B5468` | secondary text | 7.1:1 |
| `--ink-faint` | `#8A8396` | footer, legal | 3.6:1 — never for body copy |
| `--accent` | `#6D28D9` | links, button fill (min) | 7.0:1 |
| `--accent-strong` | `#5B21B6` | button hover / pressed, dark header fallback | 9.2:1 |
| `--accent-tint` | `#F3E8FF` | stat-block background, OTP box | — |
| `--surface` | `#FFFFFF` | card | — |
| `--canvas` | `#F5F3F7` | page background behind the card | — |
| `--line` | `#E5E1EC` | 1px borders (never rely on radius alone) | — |
| `--success` | `#047857` | payment received, "ACTIVE" | 5.1:1 |
| `--danger` | `#B91C1C` | payment failed text (never a background under light text) | 6.5:1 |
| `--warn-tint` / `--warn-ink` | `#FEF3C7` / `#92400E` | warning banner | 7.4:1 |

Every one of these is a light-background design that survives partial inversion (§2.6): light surfaces flip to dark, dark text flips to light, and the two saturated accents are dark enough that Gmail's partial inversion leaves them alone — which is exactly why they must **not** be used as backgrounds under white text without a fallback colour.

**Type scale** (system stack only):

```
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
--font-mono: 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace;

h1  24px/1.3 w700   section title only
h2  20px/1.35 w700  email headline
h3  16px/1.4 w600   subheading / stat number
p   16px/1.6 w400   body
small 14px/1.5     footer, captions
mono  20px/1.2 w700 letter-spacing 6px   OTP only
```

**Spacing scale:** `8 / 16 / 24 / 32 / 40` px only. Padding: 32px desktop, but 24px on ≤ 480px via a media query with a class on the content cell (the one responsive rule worth having).

**Three components, reused everywhere:**

**A. Button — VML-safe, works with images off.**

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
  <tr>
    <td align="center" bgcolor="#6D28D9" style="border-radius:12px;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                   href="{{url}}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="24%" stroke="f" fillcolor="#6D28D9">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">{{label}}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-- -->
      <a href="{{url}}" style="display:inline-block;background:#6D28D9;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;line-height:20px;padding:14px 32px;border-radius:12px;text-decoration:none;min-width:180px;text-align:center;">{{label}}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>
```
Rules that make this survive: `bgcolor` on the `<td>` (Outlook honours attributes over styles), a real `<a href>` fallback for non-mso, 48px min height, and **the URL repeated as plain text below the button** — so the action survives full colour inversion and any client that mangles the button. VML buttons are the industry-standard bulletproof pattern (https://www.litmus.com/blog/a-guide-to-bulletproof-buttons-in-email-design).

**B. Card — the only grouping device.**

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:#FFFFFF;border:1px solid #E5E1EC;border-radius:16px;">
  <tr><td style="padding:32px;font-family:...;color:#1A1523;font-size:16px;line-height:1.6;">
```
Note `border-radius:16px` mirrors the app's feel on the clients that support it, and the `1px solid #E5E1EC` border carries the structure in Outlook where the radius vanishes. Never rely on shadow — `box-shadow` is not supported in Word-engine Outlook.

**C. Stat block — table-based, degrades to a stack.**

```html
<table role="presentation" width="100%"><tr>
  <td width="33%" align="center" bgcolor="#F3E8FF" style="padding:16px;border-radius:12px;">
    <div style="font-size:24px;font-weight:700;color:#6D28D9;line-height:1.2;">{{value}}</div>
    <div style="font-size:13px;color:#5B5468;margin-top:4px;">{{label}}</div>
  </td>
  <td width="2%"></td>
  <!-- repeat -->
</tr></table>
```
`width="33%"` attributes plus spacer cells; in Outlook this collapses to three full-width stacked tiles, which is fine. The current `display:flex` version (`lib/email/send.ts:984-997`) is the thing to replace.

---

## 5. Competitor check

Scraped 2026-10-12. **Note:** none of these publish their actual transactional emails, so what follows is their public web surface, signup flow, app-store listings and stated support channels — a proxy, and labelled as such.

| Product | What they send / offer publicly | Look and tone | What works in this market |
| --- | --- | --- | --- |
| **eStudyUniverse** ([estudyuniverse.com](https://estudyuniverse.com/)) | Free GCE/concours past questions, mobile app, AI tutor, XP/streaks/leaderboards, **eStudy Credits where 1 credit = 1 XAF**, paid with **MTN MoMo / Orange Money** against the *same email as the app account*. Separate parent and teacher propositions. | WordPress, image-heavy, feature-list marketing tone. Heavy social-proof framing ("That is a secret app that students in Cameroon are using", Facebook). | The email-as-identity link in checkout is the single best idea I found: it ties the mobile-money payment to the account without asking for a phone number twice. Also: pricing in XAF, not dollars, and naming MTN and Orange by name. |
| **GCE Study App** ([gcestudyapp.com](https://gcestudyapp.com/)) | 25+ subjects, 1000+ questions, past papers 2010–2025; pricing in FCFA (Free / Silver 1,100 FCFA/mo / Gold 3,100 FCFA/mo); "85% success rate", "7+ years experience". | Modern Next.js landing page, gradient hero, testimonials, stats band. Confident, slightly inflated. | Transparent FCFA pricing with a clear free tier and an obvious upgrade delta. Their whole funnel is secondary-school GCE — the exact positioning this rebuild must vacate. |
| **HEQA Solutions** ([heqasolutions.com](https://www.heqasolutions.com/faq)) | HND-focused app, 50,000+ past questions with expert solutions, HND/GCE A/O, streaks, leaderboard, premium, "Can my school buy Premium for all students?". FAQ answers "How do I reset my password?" and "How do I contact support?" | Clean, restrained. **"Everything you need to know about HEQA Solutions. Can't find what you're looking for? Chat with us on WhatsApp."** with `wa.me/237690055252` and a pre-filled WhatsApp message, plus `mailto:info@heqasolutions.com`. | **The most useful finding in this section.** They put WhatsApp on the FAQ, not email, and email is the fallback. That is the correct channel hierarchy for Cameroon and it is exactly what §3.1 recommends. Their school/B2B bulk-purchase angle is also a monetisation idea worth stealing. |
| **CMR HND Platform** ([cameroonhnd.com](https://www.cameroonhnd.com/)) | HND notes, past questions, marking guides, lecturer chat, internship and job boards; stats band (3,000+ students, 15+ lecturers, 30+ universities, 95% success rate); direct `.apk` download. | Very dated web design, heavy on statistics and institutional reassurance. | The "95% success rate / N registered students / partner lecturers" proof band is the local idiom — Cameroonian students buy institutional credibility. Referral system in v3.0 (announced on the page). |
| **VALIDE** | **Not verified.** I could not identify a live, unambiguous VALIDE student product with an email surface from these searches. Treat any claim about VALIDE's emails as unverified. | — | — |
| **Cameroon Past Questions** | **Not verified** as a distinct, currently-live product with a public email surface. | — | — |

**Read-across.** Four of five market leaders are WhatsApp-first or WhatsApp-adjacent for conversation, and every one prices in FCFA with mobile money named explicitly. Nobody in this market is sending impressive marketing email, which means a genuinely good, fast, image-free, tutor-voiced email is cheap differentiation — and the bar is low enough that design quality alone will be noticed. The tone to match is HEQA's plainness, not GCE Study App's inflated stats.

---

## 6. The recommendation

### 6.1 File structure

```
lib/email/
  transport.ts          createTransport (pooled) + verify() + transporter.verify on boot
  send.ts               sendEmail({to, subject, html, text, headers, attachments}) — the ONLY SMTP caller
  render.ts             renderTemplate(name, props) -> { subject, preheader, html, text, attachments }
  preview.ts            dev-only preview HTML route handler
  layout.tsx            <Layout> shell: head, dark-mode meta, preheader, header w/ CID logo, footer
  components/
    Button.tsx  Card.tsx  StatRow.tsx  CodeBlock.tsx  Divider.tsx  Header.tsx  Footer.tsx
  templates/
    verify-address.tsx        password-reset.tsx      sign-in-code.tsx
    welcome-first-run.tsx     payment-received.tsx    payment-failed.tsx
    exam-countdown.tsx        weekly-digest.tsx      referral-reward.tsx
    come-back.tsx             subscription-ending.tsx
    internal/admin-alert.tsx  internal/feedback-alert.tsx
  content/
    subjects.ts               subject + preheader copy, one object per template, i18n-ready
  assets/logo.png             5–8 KB, 2x a 120x40 display, white and ink variants
  index.ts                    named exports only: sendVerifyAddress(args) etc. No raw sendEmail calls outside this file.
```

Rendering: **JSX + `react-email`** (`render()` → string), then Nodemailer. Not MJML, not Maizzle, not hand-written strings. Reasons: the team already writes React and TypeScript; `react-email` is actively maintained and is Resend's own library; `render()` produces a plain table-based string with inlined styles so it composes with the primitives above. Its preview server (`email dev`) is the answer to the preview story. Migration notes if the DX fights you: https://maizzle.com/docs/migrate/react-email

### 6.2 Parameterisation

One typed props interface per template, a discriminated union keyed by template name, no free-form `Record<string, unknown>`:

```ts
export type Template =
  | { name: "verify-address";    props: { firstName: string; code: string; expiresMinutes: number; verifyUrl: string } }
  | { name: "weekly-digest";     props: { firstName: string; weekOf: string; streak: number; quizzes: number; readinessPct: number; weakestTopic: string; deltaPct: number; reportUrl: string; unsubscribeUrl: string } }
  | { name: "payment-received";  props: { firstName: string; planLabel: string; amountFcfa: number; reference: string; paidAt: string; nextBillingDate: string; practiceUrl: string } };
```

Rules: every user-controlled string goes through one `escape()` at render (or is rendered as a JSX text node, which escapes by default — the JSX approach closes bug S7 structurally); money is formatted in **XAF with a thin space** and never with `toLocaleString()` on the server locale (`:485` vs `:764` today); dates are formatted in `Africa/Douala`; every CTA URL is an absolute `NEXT_PUBLIC_APP_URL` link, and a deep link where one exists (`/practice?topic=weakest`).

### 6.3 Preview and test

1. **`react-email` preview server** in dev: `email dev` watches `lib/email/templates`. Each template gets an `EmailPreview` dev route at `/dev/email/{name}` with a props fixture.
2. **Text alternative is not optional and not derived.** Each template module returns `{ subject, preheader, html, text }` from a single props object, so the two bodies cannot drift.
3. **`Ethereal`** for CI: `nodemailer.createTestAccount()` gives a real SMTP sink and a web URL for the raw message, so you can assert on the MIME tree (that `text/plain` exists, that `Content-ID` is present, that `List-Unsubscribe` is present) without sending to a human.
4. **Size assertion in CI**: fail the build if any rendered `html.length` exceeds the target in §3.2 or 40 KB absolute.
5. **Manual client matrix, quarterly**: Gmail app Android (the primary client for this audience), Gmail web, Apple Mail iOS, Outlook.com. Classic desktop Outlook gets one screenshot per release, not per email.

### 6.4 Queue: emails must not block a request

Inngest is already the async layer here (`app/api/inngest/route.ts`, 21 functions registered) and the repo already has the right shape — the problem is that `lib/auth.ts:96-107` bypasses it. Concretely:

1. **Every send becomes an Inngest event.** `await inngest.send({ name: "email.send", data: { template, to, props } })` — one function, one code path, with `retries: 4` and exponential backoff. Events are a few hundred bytes versus a 15 KB HTML string, so the payload stays small and the request returns in ~50 ms regardless of SMTP health.
2. **Sign-up, sign-in, password reset and the Fapshi webhook all call `inngest.send` and return immediately.** The better-auth `sendVerificationOTP` callback becomes a 5-line event emitter.
3. **One Inngest function per *class* of send**, not per template: `email.transactional` (no retries beyond 3, bypasses campaign suppression) and `email.lifecycle` (respects the opt-in flag and the frequency cap). Campaign selection moves *out* of `dispatchEngagementCampaigns`' sequential loop into per-user events so a timeout can't drop a batch.
4. **Suppression on bounce/complaint.** Subscribe to the provider's webhook (`delivered` / `bounced` / `complained`) and write to a `EmailSuppression` table; `render.ts` refuses to send to a suppressed address. This is what prevents the §1.5(b) newsletter bug from ever recurring.
5. **Idempotency.** Set `List-Unsubscribe` and an `X-Entity-Ref-ID` per logical send, and give every event an idempotency key (`userId:template:day`) so an Inngest retry cannot double-send a receipt.
6. **`pool: true`** on the transporter (§2.2) so a burst of Inngest steps reuses sockets.
7. **Fix the frequency and eligibility guards before enabling any campaign:** per-user `@@unique([userId, campaign])` → add a `period` key so the digest can recur; enforce a hard cap in code (max 2 non-digest emails per 7 days); honour `UserSettings.emailNotifications` **defaulting to `false`** with an explicit signup opt-in (§2.9).

### 6.5 Build order

1. **DNS, today, before anything else.** New sending subdomain; add the provider's `include:` to SPF on `ticsummit.org` (one record, never two); publish 2048-bit DKIM; add `rua=` to the existing root `_dmarc` record and to a new subdomain policy starting at `p=none`. Then send one test to a Gmail account and read **Show original** until all three show PASS with alignment. *(Half a day; unblocks everything.)*
2. **Security and correctness fixes to the current file, in place** — do these even if the rewrite slips: apply `escapeHtml` to the eight unescaped interpolations; stop swallowing errors in `sendEmail` (log with the address and throw a typed error); make the unverified-warning cron stop threatening deletion; stop the Monday-50 newsletter (`lib/inngest/functions.ts:790-801`) or delete the job.
3. **Bump `nodemailer` to ≥ 8.0.9** (two advisories fixed). Defer the v10 migration.
4. **Extract the transport and `sendEmail`** into `lib/email/transport.ts` + `send.ts`, add `pool: true` and a `verify()` at boot so a missing `SMTP_HOST` fails loudly at deploy instead of silently at sign-up.
5. **Build the layout + three components + the logo asset.** This is the design system; every later template is cheap once it exists. Add the dark-mode meta tags and a `background-color` fallback on the header — kill the white-on-white bug.
6. **Move verification, sign-in and password reset onto it.** Highest traffic, smallest templates, they prove the pipeline and the text-alternative discipline.
7. **Move payments.** Replace `sendPaymentSuccessEmail`, `sendPaymentFailedEmail`, `sendSubscriptionActivatedEmail`, `sendSubscriptionRejectedEmail` with **two** templates (received, failed) on one code path, XAF formatting, receipt table. Delete the duplicates.
8. **Rewrite welcome with the new audience.** Replaces all GCE copy (`lib/email/send.ts:250`, `:258`, `:701`). Trigger it from `emailVerified`, not from Google-account detection (`lib/auth.ts:80-84`), so every signup gets one.
9. **Turn every send into an Inngest event**, including the auth callbacks. Then wire the provider webhook to `EmailSuppression`.
10. **Fix and relaunch the campaigns**: recurrence, opt-in default `false`, signup opt-in checkbox, frequency cap, digest, exam countdown, referral reward, come-back. Delete the platform-update newsletter.
11. **Warm up and watch**: register Postmaster Tools, read `rua` DMARC reports weekly, review bounce and complaint rates against the 0.1% / 2% / 5% stop conditions, and measure **clicks and quiz-starts, not opens**.

---

## 7. Unverified and open questions

- **Provider deliverability to Cameroonian mailboxes.** No provider publishes Buea/Bamenda placement data and I found none. The Gmail/Outlook rule set is the binding constraint and is documented; the Orange/MTN webmail behaviour is not.
- **Brevo's free tier number.** The help centre says 300 sends/day; the pricing page advertises a free-forever tier "from 5,000 emails per month … no daily sending limit". Verify in an account before relying on either.
- **Gmail CSS-gradient support in `<style>` blocks.** Commonly reported as unreliable; not resolved in an authoritative source. The recommendation (solid `background-color` first) makes the question moot.
- **Exact base64 blocking matrix per client.** The claim "unsupported in Gmail, completely blocked in Outlook" is a long-standing community consensus (Stack Overflow, SendCheckit, community threads), not a vendor spec.
- **Whether `ticsummit.org`'s `default._domainkey` belongs to Google Workspace or another service.** Rotate rather than depend on it; publish a fresh 2048-bit key for the new sending subdomain.
- **VALIDE and "Cameroon Past Questions"** could not be verified as live products with public email surfaces (§5).
- **Mobile-money receipt conventions.** Fapshi webhook payloads were read in `app/api/webhooks/fapshi/route.ts` but not replayed; confirm which fields are authoritative for `amount` and `transId` before wiring the receipt.
- **Whether "warm up image reputation" is a real practice.** No authoritative protocol exists; §2.5 gives the substituted discipline instead.
- **2G throughput in Cameroon.** The 25–60 s figure for a 300 KB image is an estimate from a 50–100 kbps link, not a measurement. The conclusion (avoid images) holds regardless of the exact number.

---

## 8. Sources

Nodemailer: [usage](https://nodemailer.com/usage/) · [attachments](https://nodemailer.com/message/attachments) · [embedded images](https://nodemailer.com/message/embedded-images) · [alternatives](https://nodemailer.com/message/alternatives) · [SMTP transport](https://nodemailer.com/smtp) · [releases](https://github.com/nodemailer/nodemailer/releases) · npm `dist-tags`

Providers: [Resend pricing](https://resend.com/pricing) · [Resend inline images](https://resend.com/docs/dashboard/emails/embed-inline-images) · [Resend CID changelog](https://resend.com/changelog/embed-images-using-cid) · [Brevo pricing](https://www.brevo.com/pricing/) · [Brevo free-plan limits](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan) · [Amazon SES pricing](https://aws.amazon.com/ses/pricing/) · [SendGrid alternatives 2026](https://www.mailercloud.com/blog/sendgrid-alternatives)

Deliverability: [Google bulk sender guidelines](https://support.google.com/a/answer/81126) · [Microsoft email authentication](https://learn.microsoft.com/en-us/microsoft-365/security/office-365-security/email-authentication-about) · [Overloop deliverability guide 2026](https://overloop.com/blog/email-deliverability) · [Truelist domain warm-up playbook](https://truelist.io/blog/how-to-warm-up-an-email-domain) · [Mailforge domain warming](https://www.mailforge.ai/blog/domain-warming) · [Google Postmaster Tools](https://postmaster.google.com/)

Email design: [Digital Applied email design size guide 2026](https://www.digitalapplied.com/blog/email-design-size-guide-2026-templates) · [Courier dark mode primer](https://www.courier.com/blog/dark-mode-email-design) · [Litmus dark mode guide](https://www.litmus.com/blog/the-ultimate-guide-to-dark-mode-for-email-marketers) · [Litmus bulletproof buttons](https://www.litmus.com/blog/a-guide-to-bulletproof-buttons-in-email-design) · [Litmus preview text](https://www.litmus.com/blog/the-ultimate-guide-to-preview-text-support) · [Litmus image blocking](https://www.litmus.com/blog/the-ultimate-guide-to-email-image-blocking) · [Can I Email `@font-face`](https://www.caniemail.com/features/css-at-font-face/) · [email-bugs #104 dark-mode opt-in](https://github.com/hteumeuleu/email-bugs/issues/104) · [Apple WebKit dark mode](https://webkit.org/blog/8840/dark-mode-support-in-webkit/) · [Microsoft block external images](https://support.microsoft.com/en-us/outlook/what-is-block-external-images-in-my-settings) · [Gmail image settings](https://support.google.com/mail/thread/145768342)

Size & deliverability mechanics: [Gmail clipping, Klaviyo](https://help.klaviyo.com/hc/en-us/articles/115000591251) · [Mailchimp on Gmail clipping](https://mailchimp.com/help/gmail-is-clipping-my-email/) · [base64 blocked in Gmail, Stack Overflow](https://stackoverflow.com/questions/46783599/base64-encoded-image-is-not-showing-in-gmail)

Benchmarks: [Mailchimp email benchmarks](https://mailchimp.com/resources/email-marketing-benchmarks/) (Education + Training: 35.64% open / 3.02% click / 0.18% unsub) · [Qualtir open rates by industry 2026](https://qualtir.com/blog/email-open-rates-by-industry-2026)

Law: [FTC CAN-SPAM compliance guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) · [DLA Piper, electronic marketing in Cameroon (Law 2010/021 art. 7(1))](https://www.dlapiperdataprotection.com/index.html?t=electronic-marketing&c=CM) · [DLA Piper, data protection laws in Cameroon (Law 2024/017)](https://www.dlapiperdataprotection.com/index.html?t=law&c=CM)

Market: [MTN Cameroon Mobile Surf bundles](https://mtn.cm/offers/mobile-surf/) · [Orange Cameroon data pricing](https://tasonic.com/top-up/cameroon/orange-cameroon/)

Competitors: [eStudyUniverse](https://estudyuniverse.com/) · [GCE Study App](https://gcestudyapp.com/) · [HEQA Solutions FAQ](https://www.heqasolutions.com/faq) · [CMR HND Platform](https://www.cameroonhnd.com/) · [eStudyUniverse on Google Play](https://play.google.com/store/apps/details?id=com.estudy.universe)

Code cited in this document: `lib/email/send.ts` · `lib/auth.ts` · `lib/inngest/trigger.ts` · `lib/inngest/functions.ts` · `lib/inngest/engagement-functions.ts` · `app/api/inngest/route.ts` · `app/api/inngest/trigger/route.ts` · `app/api/webhooks/fapshi/route.ts` · `app/api/contact/route.ts` · `app/api/feedback/route.ts` · `app/api/feedback/exam/route.ts` · `app/api/admin/{invites,users,subscriptions,plan-upgrades}` routes · `prisma/schema.prisma` · `package.json` · `.env.example` · `node_modules/better-auth/dist/plugins/email-otp/index.mjs`