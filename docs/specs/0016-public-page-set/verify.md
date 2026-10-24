# Verify: Public page set · spec 0016 · updated 2026-10-24
_Steps derived from spec 0016 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._

## UI / manual
- [ ] Visit `/faq` in a browser: all 18 questions render, every answer is in the served HTML (view source), tapping one opens exactly one answer and a second tap closes it → AC-3, AC-5
- [ ] Visit `/`: the FAQ section is a single column between `#free`-adjacent sections and the dark CTA band, shows exactly the six curated questions, ends with a "More questions?" row whose link opens the WhatsApp group, and the `#faq` anchor still scrolls → AC-4
- [ ] Visit `/contact`: no form, no email anywhere; the card heading reads "Reach us on WhatsApp" with the authored body copy, and the button opens the WhatsApp group link → AC-2, AC-6
- [ ] Visit `/terms`: advance billing at checkout prices, MTN MoMo and Orange Money named, no billing period, no refund policy, no affiliate section, no price figure; "Last updated: 24 October 2026" printed → AC-7, AC-12
- [ ] Visit `/privacy`: the collection list, the AI processing disclosure, the six-provider list, WhatsApp deletion, no encryption at rest claim, no notify promise; same authored date → AC-8, AC-12
- [ ] Visit `/about`: no student counts, no community or ranking surfaces, no territory claims; closing actions are sign up and WhatsApp → AC-9
- [ ] Visit `/sign-up` in a real browser (the line streams in after hydration, do not judge from raw HTML): the agreement note appears under the form with working links to `/terms` and `/privacy` → AC-11
- [ ] Check each page's `<title>` and description against the spec's metadata table (About, FAQ, contact, Terms, Privacy) → AC-1

## Commands
- [ ] `pnpm build && pnpm start` then `node scripts/check-landing-honesty.mjs` → passes all six pages, no email or `mailto:` anywhere; a violation must fail the check → AC-10
- [ ] `pnpm ui:check` → OK, no new violations → AC-10
- [ ] `pnpm lint && pnpm typecheck` → clean at the existing 61 warning baseline → AC-1..AC-12
- [ ] `pnpm test --run` → all pass, including `tests/constants/faq-items.test.ts` (18 questions, truth claims) → AC-3, AC-12

## Value sourcing checks (exercise each source)
- [ ] Vary one: edit `WHATSAPP_GROUP_LABEL` in `constants/contact.ts` and confirm the landing FAQ row, `/faq` closing row, footer, `/contact` and `/about` all show the new label, no page drifts → AC-2, AC-12
- [ ] Confirm both legal pages print the one `LEGAL_LAST_UPDATED` string (edit it in `constants/index.ts`, both pages change together) → AC-12
- [ ] Confirm the landing FAQ answers come from `FAQ_ITEMS` (edit an answer in `constants/index.ts`, the landing and `/faq` change together) → AC-4, AC-3
- [ ] Add an email address to any public page copy → the honesty gate must name it and fail → AC-10

## Acceptance-criteria coverage
- AC-1 metadata: step 8 · AC-2 contact details: steps 1, 3, 8, 9 · AC-3 FAQ truth: step 1, 3, 4 · AC-4 landing FAQ: step 2 · AC-5 accordion: step 1 · AC-6 removal: step 3, 4 · AC-7 terms: step 4 · AC-8 privacy: step 5 · AC-9 about: step 6 · AC-10 gate: steps 7 to 10 · AC-11 sign-up: step 7 · AC-12 single sources: steps 4, 5, 9, 10
