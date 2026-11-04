# Interface

You asked for every page except dashboard and chat to feel modern plus calm plus easy to use. This epic holds that pass in one place so each page shares the same tokens plus the same list first reading shape plus the same honest states.

(basis: your picks in this plan plus research/design-reference.md plus research/audience-and-market.md plus research/seo-and-rendering.md)

## Slice 6: Interface polish

### 68. UI foundation tokens and primitives · done
You open any rebuilt page and you feel one calm premium home with air plus clear type plus soft cards. This sets the tokens plus the type scale plus the card plus list plus empty plus error shapes that every later page reuses.
**Done when:** every rebuilt page uses shared tokens plus shared primitives, long text becomes lists plus cards plus accordions, empty plus error plus loading shapes match, and focus plus thumb size plus contrast pass on a small phone.
- [x] Design it (spec): `/solution-architect UI foundation tokens and primitives`
Spec 0047 [0047](../specs/0047-ui-foundation-tokens-primitives/index.md)
code in `components/ui/page-header.tsx`, `components/ui/trio-picker.tsx`, `app/globals.css`, `scripts/check-ui-conventions.mjs`

(basis: your calm premium minimal pick plus vertical slices ship real value early)

### 69. Marketing pages refresh · planned · needs a decision
You land as a stranger and you grasp the three jobs plus the free limits plus Mobile Money in seconds. This covers landing plus pricing plus about plus contact plus faq plus privacy plus terms plus catalogue index plus catalogue detail.
**Done when:** each public page scans in seconds with lists plus cards, free limits read from one source, Mobile Money names stay clear, contact stays to staffed WhatsApp, and metadata plus share image stay correct.
- [ ] Design it (spec): `/solution-architect marketing pages refresh`

(basis: your lists first always pick plus research/seo-and-rendering.md)

### 70. Auth pages refresh · planned · needs a decision · GA
You sign in or create an account or verify email or accept an invite without friction. This covers sign in plus sign up plus verify email plus admin accept invite.
**Done when:** each auth page shows one clear action plus short helper text, errors read plainly beside the field, show plus hide password works, resend plus expiry states are clear, and rate limit plus abuse cover holds.
- [ ] Design it (spec): `/solution-architect auth pages refresh`

(basis: your calm premium minimal pick plus payments plus auth need GA care)

### 71. Onboarding refresh plus birth trio picker · planned · needs a decision
You finish onboarding in about a minute and birth entry feels light. This rebuilds the onboarding flow plus replaces the painful arrow stepper with day plus month plus year dropdowns that scroll plus allow type to jump.
**Done when:** onboarding stays short plus skippable plus correctable from settings, birth uses shadcn select trio with scroll plus type to jump plus native fallback on small phones, invalid dates block kindly, and level plus birth reach the tutor context.
- [ ] Design it (spec): `/solution-architect onboarding refresh plus birth trio picker`

(basis: your dropdown trio with scroll pick plus shadcn select docs)

### 72. Upload and notes pages refresh · planned · needs a decision
You upload a note and you read it without hunting through paragraphs. This covers upload plus notes list states plus notes detail.
**Done when:** upload shows one card plus stages plus real progress, note list uses cards with search plus status, note detail paginates kindly, rename plus quiz actions sit in the URL, and empty plus error states guide the next tap.
- [ ] Design it (spec): `/solution-architect upload and notes pages refresh`

(basis: your lists first always pick plus vertical slices ship real value early)

### 73. Quizzes and attempts pages refresh · planned · needs a decision
You find a quiz and you review a result in seconds. This covers quizzes list plus quiz detail plus attempt result.
**Done when:** quiz list uses search in the URL plus status cards, delete asks plainly, quiz detail shows questions as clean lists, result shows score plus missed items as lists, and empty states differ for nothing yet versus nothing matches.
- [ ] Design it (spec): `/solution-architect quizzes and attempts pages refresh`

(basis: your lists first always pick plus research/design-reference.md)

### 74. Subscription and payments page refresh · planned · needs a decision · GA
You see plan plus credits plus usage in one honest place. This covers subscription plus upgrade dialog plus Mobile Money fallback.
**Done when:** current plan cannot be pressed, credits plus usage plus costs read plainly, upgrade plus retry plus pending states are clear, amounts come from the real catalogue, and no screen promises endless supply.
- [ ] Design it (spec): `/solution-architect subscription and payments page refresh`

(basis: your calm premium minimal pick plus payments plus auth need GA care)

### 75. Settings page refresh · planned · needs a decision
You update profile plus password plus notifications plus account without guessing. This covers settings only.
**Done when:** each group writes to a real endpoint, password uses the auth change path, validation reads plainly, destructive actions ask plainly, and success confirms without reload confusion.
- [ ] Design it (spec): `/solution-architect settings page refresh`

(basis: your lists first always pick)

### 76. Ambassadors and affiliates pages refresh · planned · needs a decision
You see invite stats only when invited and the copy stays plain. This covers ambassadors plus affiliates plus affiliates claim.
**Done when:** invite only rules hold, stats read as simple lists plus totals, claim states are clear, empty states explain how invites work, and admin created links are the only entry.
- [ ] Design it (spec): `/solution-architect ambassadors and affiliates pages refresh`

(basis: your every page except those two pick)

### 77. Admin console refresh · planned · needs a decision · GA
You run the product from admin without dense walls of text. This covers admin home plus users plus subscriptions plus plans plus plan upgrades plus payment settings plus platform settings plus metrics plus ambassadors plus affiliates.
**Done when:** each admin page uses tables plus filters in the URL, metrics use cards plus plain numbers, forms validate plainly, role guard holds everywhere, and no control does nothing.
- [ ] Design it (spec): `/solution-architect admin console refresh`

(basis: your every page except those two pick plus payments plus auth need GA care)

## References

Project sources you can open in this repo: your picks in this plan, `AGENTS.md`, `docs/design-system.md`, `docs/research/design-reference.md`, `research/audience-and-market.md`, `research/seo-and-rendering.md`.

Practices and standards: vertical slices ship real value early, foundations before features, one complete path at a time beats many half pages, lists scan faster than walls of text on small phones.

Links (web verified 2026-11-04):

1. Brilliant homepage personal tutor patterns: https://brilliant.org/
2. Brilliant courses index card plus list patterns: https://brilliant.org/courses/
3. ChatGPT calm minimal chat plus clarity patterns: https://chatgpt.com/
4. OpenAI research plus deployment clarity patterns: https://openai.com/
5. Claude calm premium feel: https://claude.ai/
6. shadcn Select docs for dropdown trio pattern: https://ui.shadcn.com/docs/components/base/select
