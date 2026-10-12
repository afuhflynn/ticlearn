# Design reference: AI study assistant for Buea and Bamenda

Research note, October 2026. Every claim below is traceable to a scraped page in `.firecrawl/`.

## Constraints we design against

| Constraint | Design consequence |
| --- | --- |
| 89% under 24, 98% undergraduate, 97.8% live off campus | Assume phone-only, dorm/room context, no desk, no stable power |
| Over 90% have no laptop; target device ~2 GB RAM / 32 GB storage | Web-first PWA, no install required, hard page weight budget |
| Data ≈ 1.63 USD/GB; students spend 1,000–3,000 XAF/month | Every KB is a visible cost. Show size before download |
| Irregular electricity; no video-first | Text-first. Nothing that needs sustained power or long processing |
| Everyone is already on WhatsApp; shared phones common | Account must be recoverable from a second device. WhatsApp is a channel, not a competitor |
| Academic year Oct–Jul; exams Dec and May–Jun | Seasonal rhythm must shape the landing page and the onboarding question |
| MTN MoMo first, Orange Money second | Payment UI is MTN-first, not "cards and PayPal" |
| 93% have cheated at university | The AI must read as grader/tutor. Anti-cheat is a design surface, not a terms-of-service page |

**Method and limits.** We scraped the live landing pages, pricing pages and Play Store listings of the products below, plus design-system and UX-guidance articles. We could **not** capture true mobile-viewport screenshots: `firecrawl scrape` has no viewport flag (only `--screenshot`, `--full-page-screenshot`, `--actions`, `--profile`, `--wait-for`), so mobile claims are inferred from markup, assets and Play Store screenshot dimensions rather than measured. Findings that depend on that are marked.

---

## 1. Onboarding flows

### What the real flows look like

| Product | Steps before first value | Asks for phone? | How it gets to value |
| --- | --- | --- | --- |
| [HEQA Solutions](https://www.heqasolutions.com) — Cameroon | 3, spelled out on the page: (1) sign up with name + **WhatsApp number**, (2) choose specialty, (3) start practising | Yes, WhatsApp number | Download → pick department → practise past papers |
| [GCE Study App](https://www.gcestudyapp.com) — Cameroon | Effectively 0: "Start Free GCE Practice", then browse subject → year → paper | No phone on landing page | Subject/year/paper grid is the product |
| [eStudyUniverse](https://estudyuniverse.com) — Cameroon | Free account after Play/App Store install; level and course chosen later | Optional; payment accepts email **or** mobile | Past papers + AI tutor immediately after install |
| [Gauth](https://www.gauthmath.com) | 0 before the photo | No | "Drag Image or Click Here to upload" is the hero; solving happens on the first image |
| [Photomath](https://play.google.com/store/apps/details?id=com.microblink.photomath) | 0 before the scan | No | Camera → step-by-step solution, free tier |
| [Studocu](https://www.studocu.com/en-us/) | 0 before the upload; no signup on the landing page | No | Drop a file → get mock exam / summary / quiz |
| [NotebookLM](https://notebooklm.google.com) | Google sign-in → Create notebook → upload a source → Notebook Guide | Google account | First value is the "Notebook Guide" dashboard generated from *your* source ([DataCamp walkthrough](https://www.datacamp.com/tutorial/notebooklm)) |
| [ChatPDF](https://www.chatpdf.com) | 0; upload happens on the landing page | No | Drop file → ask |
| [ChatGPT](https://chatgpt.com) / [Claude](https://claude.ai) | Email or social → immediate chat. No profile, no course, no level | No | Type or paste; AI answers ([AI UX Playground composer teardown](https://aiuxplayground.com/teardowns/chatgpt/composer)) |
| [Anki](https://apps.ankiweb.net/) | Deck creation, note type, scheduling config before anything useful | No | Deliberately hostile to newcomers; r/Anki is full of "overwhelmed" threads |

### Findings that actually change our design

1. **The two Cameroonian apps ask for a WhatsApp number, not email.** HEQA's flow is literally "Sign up with your name and WhatsApp number". eStudyUniverse's payment form accepts either. This is the single most local signal in the whole scrape: the account identifier students already have is a WhatsApp number, and a WhatsApp number survives a shared phone. Our account model should accept a phone number as a first-class login identifier, with email as optional. NN/g's [passwordless accounts guidance](https://www.nngroup.com/articles/passwordless-accounts/) supports removing password friction, and this is the local form of it.

2. **Course/specialty selection is a single screen, asked after the app is already useful.** HEQA asks it as step 2 of 3. It is a one-tap picker (Engineering, Accountancy, Computer Science, Business) that makes the paper list feel relevant. This is content customisation, which NN/g's [mobile-app onboarding analysis](https://www.nngroup.com/articles/mobile-app-onboarding/) explicitly endorses, as opposed to visual-design customisation which it tells you to delete from onboarding.

3. **The catastrophic onboarding drop-off is measured.** Adesua, a WhatsApp-based AI tutor for Ghanaian JWS/SHS students, reports **107 signups → 56 completed the role question (parent/student/teacher) → 46 gave an education level** ([arXiv 2605.15376](https://arxiv.org/html/2605.15376v1)). That is a ~48% loss at a single question, and a further ~18% at the level question. The lesson: ask for role and level as *two optional chips on one screen*, or not at all. Do not gate the product behind a profile wizard.

4. **The fastest first value in this category is a camera, not a form.** Gauth, Photomath and Studocu all resolve the whole product in one action — photo, scan, drop. Gauth's web hero is literally the uploader: "Drag Image or Click Here to upload / Ctrl+V to paste". For our market, where a phone camera is the only computer the student owns, **"photograph the question" should be the first screen of the app, not a feature inside it.**

5. **NotebookLM's trick is refusing to answer before you give it context.** There is no chat until there is a source; the first output is a generated dashboard about *your* material. For a student with a past paper, this is the correct anti-hallucination posture: ground first, then talk.

6. **Anki is the counter-example we must not copy.** Its r/Anki presence is dominated by overwhelm. Complex configuration before first value is disqualifying here.

7. **NN/g's baseline advice is to build as little onboarding as possible.** Their [mobile-app onboarding analysis](https://www.nngroup.com/articles/mobile-app-onboarding/) recommends skipping onboarding whenever possible, avoiding feature-promotion carousels at first launch, and only asking for data you can justify: *"If you can't explain why gathering that data is beneficial at launch, this information should be gathered later."* CXL's [sign-up flow analysis](https://cxl.com/blog/saas-signup-flows/) makes the same case quantitatively — friction measured by fields, time and **effort investment (number of decisions)** — and its Chargebee example shows access-then-ask outperforming ask-everything-then-access.

### Documented complaints about these flows

- **eStudyUniverse** ([Play Store, 4.3★ / 110 reviews / 1K+ downloads](https://play.google.com/store/apps/details?id=com.estudy.universe)): the top review is a pricing complaint — *"40,000 frs for 6 months is too much. this is a digital product with minimal attention needed after setup. 2500 frs per year is fine and extra purchase credit for ai."* That is a real user telling us the annual price anchor is ~2,500 XAF/year plus metered AI credits.
- **Gauth** ([Play Store](https://play.google.com/store/apps/details?id=com.education.android.h.intelligence&hl=en_US)): users complain the free tier runs out and complex questions are gated behind Gauth Plus. A teacher on Trustpilot says the honest use is *"I first do the work myself and use the app to show my mistakes and help me understand the concept"* — that is the positioning we should encode, not copy-paste Gauth's answer-first framing.
- **Photomath** ([Play Store](https://play.google.com/store/apps/details?id=com.microblink.photomath&hl=en_US)): a parent explicitly requests **an option to hide the answer** for teaching purposes. Photomath's whole copy argues the same thing — *"Math is about the process"* — and the product's tutor framing is its defence against the cheating critique.
- **Anki**: recurring "how do I not get overwhelmed" threads. Config-before-value fails.
- **HEQA's landing page contradicts itself**: it opens with "Now Live on Android — Download Free!" and an APK button, then three sections later says "Join the Waiting List… be the first to get access when we launch May 20, 2026". Its stat counters also render as literal `0+ Past Questions / 0+ Past Papers / 0+ Active Students` before their count-up animation runs — on a metered connection, a first-time visitor can see an empty product.

---

## 2. Chat with image and document upload

The richest source here is [AI UX Playground](https://aiuxplayground.com/), which publishes instrumented teardowns of the ChatGPT, Claude, Perplexity and Gemini composers. Secondary sources: [Eleken's file upload UI guide](https://www.eleken.co/blog-posts/file-upload-ui), [Uber Base file upload](https://base.uber.com/6d2425e9f/p/5555b5-file-upload/b/978665), [Material 3 progress indicators](https://m3.material.io/components/progress-indicators/guidelines), [Apple HIG file management](https://developer.apple.com/design/human-interface-guidelines/file-management).

### What each product does with attachments

| Product | Attachment UI | Multi-file | Notable |
| --- | --- | --- | --- |
| **ChatGPT** | Inline thumbnail with a dismiss × inside the composer bar | Chips stack without clearing mode chips | Attach lives inside the `+` menu, *not* on the bar |
| **Claude** | Inline image preview rendered *inside the composer card*, above the prompt | Preview-only — "harder to scan when you attach multiple files" | Send button only appears once there is something to ship |
| **Perplexity** | File card inside the ask bar with **thumbnail + filename + size** | Stable chips below | Mode chips and placeholder do **not** reset on upload |
| **Gauth** (web) | Full-width dropzone as the hero: "Drag Image or **Click Here** to upload / **Ctrl+V to paste**" | n/a | Three input paths named on screen at once |
| **ChatPDF** | "Drop a file or upload / Ask to start a chat / **CTRL+V** to paste text or links" | Yes | Same three-path naming |
| **Studocu** | Drag & drop + upload + "or choose files from your device", with an explicit ceiling: "Documents, images, text supported. **Max file size allowed: 100 MB**" | Yes | States the limit before you commit |
| **Gauth** (Android) | Camera with auto-crop of the detected question region and a flashlight toggle | — | Explicitly praised for **not saving the photo to the device gallery** |

### The mechanics we need, with the source for each

**Attachment preview strip with thumbnails + per-item remove.** The strongest reference is **Perplexity's file card**: thumbnail, filename and size, inside the bar, removable, with mode chips and placeholder unchanged ([teardown](https://aiuxplayground.com/teardowns/perplexity/composer)). **ChatGPT's inline thumbnail with dismiss** is the second reference. For more than ~3 items, switch from preview-only to a chip list — Claude's teardown names preview-only as its own weakness at multiple files.

**Running attachment count.** No surveyed product shows a numeric counter in the bar; they use spatial affordance instead (a horizontal strip whose length *is* the count). Our current wrong counter is worse than having no counter: either show the strip and let length communicate, or show a count that is derived from the same array that renders the strip so it cannot drift. If a count is shown, put it in the strip's trailing "+N" slot, not in a separate element.

**Image lightbox / preview instead of navigation.** Tapping a thumbnail must open an in-place overlay, not a route change. [Smashing Magazine's modal-vs-page decision tree](https://www.smashingmagazine.com/2026/03/modal-separate-page-ux-decision-tree/) and [UX Patterns' modal pattern](https://uxpatterns.dev/patterns/content-management/modal) both classify "preview media in a lightbox" as the modal's canonical correct use. On mobile the overlay must be swipeable and dismissible by tap-outside, and **back must not leave the composer** — losing a half-written prompt to a preview tap is the exact failure users describe.

**Three named input paths.** Steal Gauth's and ChatPDF's phrasing. On desktop: "Drag image here · click to upload · Ctrl+V to paste". On mobile the third path is the camera, and it must say so: "Take a photo" and "Choose from gallery" as two explicit buttons, because on Android those are different intents and low-end users do not know they are different.

**Drag and drop.** Desktop only. [Eleken](https://www.eleken.co/blog-posts/file-upload-ui): offer drag-and-drop *and* a click fallback, and give visual state change on hover, because many users are not confident a zone accepts drops.

**Paste from clipboard.** Cheap to implement, explicitly advertised by ChatPDF and Gauth, and it's the fastest path for a student pasting a screenshot from WhatsApp — which is where our source material actually lives.

**Upload progress.** [Material 3 guidance](https://m3.material.io/components/progress-indicators/guidelines) gives three rules we should adopt verbatim:
- *Determinate* when progress and wait are known; *indeterminate* when they are not; **change from indeterminate to determinate as soon as the byte count is known**.
- **When multiple items are loading, use a single progress indicator for the group** — not one spinner per file.
- **Circular indicators only for short indeterminate work under 5 seconds.**
[Eleken](https://www.eleken.co/blog-posts/file-upload-ui) adds: show per-file and overall progress together, and **state the file-count and size caps before the user picks files**, not as an error afterwards.

**Camera capture.** Gauth's auto-crop of the question region and flashlight toggle are the two features its users name in reviews. On a 2 GB device, **downscale to ~1600 px long edge and JPEG q≈0.8 before upload** and show the resulting KB next to the preview — with data at 1.63 USD/GB the upload size is information the student is entitled to.

**Show download size before downloading.** Directly required by our constraints and nobody surveyed does it well. Studocu is the only one stating a limit (100 MB) and it states it as a ceiling, not a cost. We should print the exact size and a rough XAF cost before any download or offline-pack action.

**Stop the resize control.** None of ChatGPT, Claude or Perplexity ship a drag-to-resize composer handle; it is a desktop-era affordance that fights the thumb, invites accidental geometry changes, and pushes the send button around on a small screen. Remove it and let the composer grow within a clamped max height with internal scroll.

**Stabilise the bar while streaming.** AI UX Playground's rule, and it applies directly to our "composer has a resize control" problem: *"Do not let key controls move around as streaming content grows."* ChatGPT's calm default — empty bar, no chips, starter pills only — is the reference for first load.

---

## 3. Landing page and public pages

### The Cameroonian and African set

| Site | First screen says | Proof points | Pricing | MoMo | Trust moves |
| --- | --- | --- | --- | --- | --- |
| [gcestudyapp.com](https://www.gcestudyapp.com) | "**Ace Your GCE with Confidence**" + "Practice smarter, not harder. Interactive quizzes, real papers, and progress tracking." CTAs: *Start Free GCE Practice* / *Sign In* | 25+ subjects, 1000+ questions, **85% success rate**, 7+ years | Free 0 FCFA / **Silver 1,100 FCFA/mo** / **Gold 3,100 FCFA/mo**; Gold is the only tier with an "AI study coach" | Not shown on the landing page | Subject grid as the primary nav; three named testimonials from Buea, Bamenda, Douala |
| [heqasolutions.com](https://www.heqasolutions.com) | "**Ace Your Exams with 50,000+ Past Questions**" + "Now Live on Android — Download Free!" | 4.8/5 from 500+ reviews, 1,000+ students, **"Works offline"**, 100% verified | Premium from **399 FCFA/week or 1,099 FCFA/month** | Testimonial: "The Mobile Money payment is so easy" | **12 named Cameroon institution logos** (University of Buea, Bamenda, Polytech Douala, CUIB Buea, HTTC Kumba, LMUI Buea…); live WhatsApp link in the CTA; EN/FR switch |
| [estudyuniverse.com](https://estudyuniverse.com) | "Download the eStudyUniverse App for Free — Cameroon GCE past questions, concours preparation, and 24/7 AI tutoring" | 7,000+ **WhatsApp community**, named schools (GBHS Mbouda, USS), "study offline" | Credits model, **1 credit = 1 XAF** | **MoMo form embedded in the hero** — email or mobile, MTN/Orange toggle, amount in XAF, min 100 CFA, "approve on your phone" | WhatsApp channel as the primary social proof; **free GCE PDF downloads** as top-of-funnel |
| [valide-startup.vercel.app](https://valide-startup.vercel.app) | "**L'éducation de qualité, accessible à tous**" | Cameroon Bac pass-rate context stats (‑94% normal session, 435+ schools with no maths teacher), CRTV TV coverage, founder story | — | — | **French-first**; a WhatsApp screenshot of a real quiz result as the hero; press and campus-photo evidence |

**Global set.**

| Site | First screen says | Proof points | Pricing posture |
| --- | --- | --- | --- |
| [Perplexity](https://www.perplexity.ai/) | "Ask anything" — the working search bar **is** the hero, no marketing headline above it | "Get fast and accurate answers from the most trusted sources" | Free-first |
| [NotebookLM](https://notebooklm.google.com/) | "**Understand anything** — your research and thinking partner, grounded in the information you trust" | Four named transformations: files→slides, files→mind maps, assignments→**audio overviews**, textbooks→video overviews | Get-the-app + Google sign-in |
| [Studocu](https://www.studocu.com/en-us/) | "**Other AIs guess. Studocu knows.**" | "Powered by real notes from students in your course", **65 million resources**, six named course families, and a live sample question ("Which artistic movement is the painter Caravaggio most closely associated with…") rendered in the hero | Not on the landing page |
| [Quizlet](https://quizlet.com/features/learn) | "Test and practice questions" | "**94% of students who use Learn or Test say Quizlet helps them get better grades**", "synced across devices" | Not on the landing page |
| [Gauth](https://www.gauthmath.com) | "**Your AI Homework Helper. Gauth it, Ace it!**" over a live dropzone | Subject chips, AI Live Tutor, Atlas | Free 1,500 credits/mo; Plus $11.99/mo, $31.99/3mo, **$99.99/yr (~$0.28/day)** |
| [ChatPDF](https://www.chatpdf.com) | "Chat with any file, video or website" over a dropzone | **Harvard, Cambridge, Oxford, Stanford logos**, "Loved by 10M+ Researchers", a16z "Gen AI apps of 2024 — Top 50" | — |

### What this means for us

- **Put the working thing above the headline.** Perplexity and Gauth both lead with an input surface. For our market that means the camera, not a slogan.
- **Name the institutions.** HEQA's logo wall and eStudyUniversa's named schools are the single strongest local trust device found. A Buea student seeing "University of Buea" on the page gets permission to believe. This is cheap and nobody global does it.
- **Show mobile money in the hero, not in a footer.** eStudyUniversa's inline MTN/Orange XAF form is the best local precedent. Per [Startbutton's mobile money checkout guidance](https://www.startbutton.africa/blog/how-mobile-money-works-in-francophone-west-africa-mtn-momo-wave-orange-money): MTN MoMo is the default wallet in Cameroon, the customer approves a prompt on their own phone via app or USSD, and the single most effective copy is *"Check your phone to approve this payment"*. Critically: **give them time** — do not show an error if approval is slow, because PIN timeouts are the main source of failed payments. Never let a card form be the primary or only path.
- **Price anchors from the market, not from Silicon Valley.** GCE Study App runs 1,100–3,100 FCFA/month. HEQA runs 399 FCFA/week / 1,099 FCFA/month. eStudyUniversa's users rejected 40,000 FCFA/6 months and named ~2,500 FCFA/year as fair. The competitive set is priced in the low thousands of XAF per month, and the AI feature is the paid tier — exactly what GCE Study App does by gating "AI study coach" behind its top plan.
- **Offline is a headline claim, not a footnote.** HEQA and eStudyUniverse both put "Works offline" in the stat row. With irregular electricity and patchy data, this is a top-three differentiator and should be a stat, not a FAQ line.
- **WhatsApp is a distribution channel every one of them uses.** HEQA links a WhatsApp support number in the CTA; eStudyUniverse leads with a 7,000-member WhatsApp community; VALIDE's hero is a WhatsApp screenshot. Given shared phones and a WhatsApp-native population, a "send me this result on WhatsApp" path is table stakes.
- **Bilingual EN/FR is a differentiator, not a nice-to-have.** HEQA ships full EN/FR. VALIDE is French-first. Cameroon is officially bilingual. Pick a language at the top of onboarding and let the AI answer in it.
- **Download size and offline-pack size are unclaimed ground.** No surveyed site states a download size or a data cost. For a market paying 1.63 USD/GB on 32 GB devices, printing "12 MB · about 8 XAF" next to every download is a real, ownable differentiator.

---

## 4. Loading and empty states for AI

### The timing rules (decisive, and mostly free)

[NN/g, Skeleton Screens 101](https://www.nngroup.com/articles/skeleton-screens/):

- **Spinners / wait animations: 2–10 seconds.** They say "working" but give no sense of remaining time.
- **Skeleton screens: under 10 seconds**, and only when the **full screen** is loading, because the wireframe minimises cognitive load and builds a mental model of what's coming.
- **Progress bars: anything over 10 seconds**, because at that point you owe the user an explicit duration estimate.
- **Nothing below ~1 second.** Show no indicator at all; a flash of spinner reads as a glitch.
- **Do not use frame-display skeletons** (header/footer/background only, no content wireframe) — NN/g compares them to a spinner with extra steps, and notes users conclude the page is broken.

### AI-specific anatomy

[UX Patterns, AI Loading States](https://uxpatterns.dev/patterns/ai-intelligence/ai-loading-states) gives a five-part anatomy: **request state** (prompt accepted, work started) → **streaming placeholder** (reserves space so nothing jumps) → **status label** (thinking / retrieving / generating, in plain language) → optional **stop control** → **fallback state** (what happens if streaming is unavailable). It also gives the lifecycle to model explicitly: `idle → validating → sending → streaming → complete → interrupted → failed`.

Its most valuable line for a low-literacy market: *"Separate system status from generated content visually"* and *"Do not hide model uncertainty behind polished visuals alone."*

### Empty states

- NN/g is blunt: don't ship instruction carousels; use contextual tips instead. But an AI chat with no prompts is a dead screen.
- LogRocket's [empty-state examples](https://blog.logrocket.com/ux-design/empty-states-ux-examples/) gives the rule that survives: **never leave a user at a dead end; an empty state should always suggest the next action.**
- ChatGPT's empty state is the best reference and it is a *job list*, not a feature list: starter pills that teach three common things you can do here. The AI UX Playground critique of it is worth heeding — starter pills and the `+` menu are two front doors with no bridge, so some users only ever discover one.
- For us the empty state should be **the camera plus three worked examples**, in the student's language, drawn from their own course. Three taps to a graded answer.

### Our specific "poor loading state" problem

Our build's loading is bad mainly because it is a *generic* loading state for an AI-specific lifecycle. Concretely:

1. Grade an AI response should **stream**, not spin. Time-to-first-token matters more than total time.
2. Reserve the space. Reserve ~3 lines of placeholder before the first token so the page does not reflow.
3. Say what is happening in the learner's words: "Reading your question…" → "Checking your course notes…" → "Marking…". Not "Generating…".
4. **Never block the app during electricity loss.** A failed request must preserve the prompt and the uploaded image so a retry is one tap on a phone that just came back from 40 minutes of no power.
5. For our long async paper-3 marking, the >10 s rule means a **determinate progress bar with an honest stage label**, not a shimmer. A shimmer that runs for 45 seconds tells a student on metered data that the app is broken.

---

## 5. Tutor posture: how to look like a grader, not an answer machine

With 93% of the market having cheated at university, this is a design problem with published evidence, not a policy page.

[Tutor, Not Solver (PeteChat, Purdue, arXiv 2606.09845)](https://arxiv.org/html/2606.09845v1) deployed a guardrailed course tutor and reported its own baseline corpus: **direct answer-seeking and boundary testing appeared across every context**, generic non-instructional output was 29.6% of system responses, and **hint utilisation and self-evaluation were essentially absent**. TAs independently confirmed that heavy GPT reliance was inflating homework scores above 95% while exam performance dropped. Its fixes, which map onto our constraint set one-to-one:

- **Assessment-aware routing.** When a query matches an active assignment item: refuse the complete solution, give step-by-step hints aligned to the *instructor's* method, and show an academic-integrity banner. If the student persists, pivot to explaining the underlying concept — never to the answer.
- **A five-stage pipeline: boundary detection → goal-setting → scaffolded hint → reflection → SRL-aligned response.**
- **Hint-first answering with source citation and explicit uncertainty** for everything that isn't an active assessment.
- **Freshness badges on sources** (updated within 7 days / 30 days / older) and a "verify on the noticeboard" disclaimer — positioning the AI as a first pass, not an oracle.
- **Judgment-of-learning (JOL) micro-checks** and **reverse prompting** so the student has to produce something.
- **Study planning and mock exams** were named by experts as high-value support that does *not* undermine integrity — a legitimate paid surface.

And the opposite pole, for calibration: [Adesua](https://arxiv.org/html/2605.15376v1) shows the engineering constraints of the WhatsApp/2 GB world — no LaTeX, Unicode superscripts instead, **responses capped at 4,096 characters / 1,024 output tokens**, timed quizzes that auto-conclude on expiry with unanswered items left blank, results delivered as a PDF, and a global `exit` command available from every state except onboarding and an active quiz.

---

## What to steal, what to avoid

### Onboarding

- **Steal: HEQA's three-step shape — name + WhatsApp number, pick specialty, practise.** It is short, local, and puts the one decision that makes content feel relevant into one tap. Adopt the phone number as a primary login identifier with email optional; it survives a shared phone, which our brief demands.
- **Steal: Gauth's "the camera *is* the front door."** Zero onboarding screens before the first useful thing. Our app should be answering a photographed question before it has asked a single profile question.
- **Steal: NotebookLM's "no source, no answer."** Ground in the student's own material first; it is the strongest defence against hallucination and the strongest tutor framing at once.
- **Steal: the Adescu lesson, inverted** — fold role and level into a single skippable chip row rather than a wizard. Their 107 → 56 → 46 funnel is the argument.
- **Steal: ChatGPT's empty bar + three starter pills** — but fix the known flaw by making the pills and the `+` menu lead to the same three jobs, not two parallel doors.
- **Avoid: feature-promotion carousels and "tips about our features".** NN/g's field research is explicit that they get skipped; move that copy to the store page.
- **Avoid: asking for course/level/semester as blocking wizard steps.** ~48% of real users abandoned a single role question in the closest published deployment.
- **Avoid: anything resembling Anki's configuration-before-value**, and avoid email-confirmation interstitials (CXL) — on a shared phone and a 1.63 USD/GB connection those are where signups die.
- **Avoid: HEQA's contradictions.** Do not show "download now" and "join the waiting list" on the same page, and never ship a count-up stat that renders as `0+` before its animation — on a slow connection it reads as an empty product.

### Chat with image and document upload

- **Steal: Perplexity's file card** — thumbnail + filename + size, removable, inside the composer, with mode chips and placeholder **unchanged** by the upload. It is the most scannable, most complete reference found.
- **Steal: Claude's inline preview inside the composer card** for the single-image case, with the send button appearing only once there is something to send.
- **Steal: the three named input paths, printed on screen.** Gauth's "Drag image here · Click here to upload · Ctrl+V to paste" is exactly right; on mobile substitute "Take a photo" and "Choose from gallery" as two distinct, explicit buttons.
- **Steal: Material 3's progress rules.** Determinate when known, indeterminate when not, switch to determinate as soon as bytes are known; **one grouped indicator for multiple files**, never one spinner per file; circular only under 5 s.
- **Steal: Studocu's pre-declared limits** — state the file count and size ceiling *before* the user picks, and in our case print the exact KB and rough XAF cost.
- **Steal: Gauth Android's camera affordances** — auto-crop to the detected question region and a flashlight toggle — plus its most-praised property: **the captured photo is not written to the device gallery.** On a shared phone, and in a 93%-cheating context, a camera roll full of exam photos is a liability and a reputational one.
- **Steal: Photomath's tutor framing and the parent's request for a hide-the-answer option.** Make "show me the steps" vs "check my answer" a first-class, visible choice, not a settings toggle.
- **Avoid: a resize/drag handle on the composer.** Nobody surveyed has one; it breaks thumb use and moves the send button. Clamp the height and scroll internally.
- **Avoid: navigating away on thumbnail tap.** Use an in-place lightbox that is swipeable and tap-dismissible, and where back returns to the composer with the draft intact. Losing a typed prompt to a preview tap is the failure users report.
- **Avoid: a numeric attachment counter as a separate element.** It will drift from the array that renders the strip — which is our current bug. Derive both from one source, or express the count spatially as strip length and a trailing "+N".
- **Avoid: preview-only treatment for more than ~3 attachments.** Claude's teardown names this as its own weakness; switch to filename chips at that point.
- **Avoid: a per-file spinner per attachment, and any upload that starts before the student can see the resulting size.**

### Landing and public pages

- **Steal: HEQA's institution logo wall and "Works offline" stat row.** Name University of Buea, University of Bamenda, Polytech Douala, CUIB, HTTC Kumba and LMUI explicitly. In Buea and Bamenda this is the trust device; no global competitor does it.
- **Steal: eStudyUniversa's inline MoMo form and "1 credit = 1 XAF" framing**, plus MTN-first ordering. Copy *"Check your phone to approve this payment"* and give generous time before any error, because PIN timeouts are the main failure mode. Cards must never be the primary path.
- **Steal: GCE Study App's price ladder** — Free / mid tier in the low thousands of XAF / top tier that unlocks the AI tutor — which is exactly the right shape for our monetisation and matches what Cameroonian students already accept (1,100–3,100 FCFA/month).
- **Steal: the WhatsApp distribution surface** — a WhatsApp CTA, a community number, and "send me this result on WhatsApp". Every local competitor does it; it is where the users already are.
- **Steal: bilingual EN/FR as a first-class product feature**, chosen at the top of onboarding, with the AI answering in the chosen language.
- **Steal: Studocu's honesty device** — "Other AIs guess. X knows." — and Quizlet's specific proof point ("94% say it helps them get better grades"). A single, checkable, local claim beats three vague ones.
- **Steal: Perplexity's discipline of putting the working input above the marketing headline.** No hero paragraph above the camera.
- **Avoid: imported Western price anchoring.** Gauth's $99.99/year and a16z/TechCrunch logo walls are the wrong register for a student spending 2–5 USD/month on all internet.
- **Avoid: global institution logos** (Harvard/Oxford/Stanford, as ChatPDF does) as proof of *student* outcomes. Irrelevant to a Buea undergraduate and reads as a foreign reseller.
- **Avoid: unstated download and offline-pack sizes.** Nobody claims this space; claiming it loudly is our cheapest differentiator given 1.63 USD/GB and 32 GB devices.
- **Avoid: video-first anything, and any hero heavier than a few hundred KB.** Irregular power and 32 GB storage rule it out.

### Loading and empty states

- **Steal: NN/g's timing ladder verbatim** — nothing under ~1 s, spinner 2–10 s, skeleton under 10 s and only for full-screen loads, determinate progress bar with an honest estimate beyond 10 s. Never ship a frame-only skeleton.
- **Steal: UX Patterns' five-part AI anatomy** — request state, streaming placeholder, plain-language status label, optional stop, explicit non-streaming fallback — and its explicit lifecycle: `idle → validating → sending → streaming → complete → interrupted → failed`.
- **Steal: "separate system status from generated content visually."** On a small screen the status line must be visually distinct from the answer, or students will read the status as the answer.
- **Steal: ChatGPT's calm empty bar with three starter pills**, bridged to the attach menu, and make ours **the camera plus three worked examples from the student's own course** — three taps to a graded answer.
- **Avoid: a generic shimmer for our long paper-3 marking.** At 30–60 s the rule demands a determinate progress bar with a stage label ("Reading the paper… Marking question 7 of 20"). A shimmer at that duration reads as a broken app.
- **Avoid: destructive failures.** Any failed request must preserve the prompt, the attached image and the partial answer so a retry is one tap — the student is very likely retrying after power returned.
- **Avoid: pure model uncertainty.** Every AI output needs a visible source (course notes, past paper, year) and a freshness signal. Trust drops the moment the UI is prettier than the evidence.

### Tutor posture

- **Steal: PeteChat's assessment-aware routing.** Detect that a question belongs to a live assignment, refuse the full solution, give instructor-aligned stepwise hints, show the integrity banner, and pivot to concept explanation if the student persists. Never cave to a second ask.
- **Steal: the goal → hint → reflect loop plus JOL micro-checks.** At least one student-produced artefact per tutoring turn is what makes it read as a tutor.
- **Steal: Adesua's output budget as a hard engineering constraint** — no LaTeX (use Unicode superscripts/subscripts), responses capped so a WhatsApp/low-end client renders them in one go.
- **Steal: study planning and mock exams as paid surfaces.** Tutors and instructors both named them as high-value and integrity-safe.
- **Avoid: an answer-first marketing frame.** "Gauth it, Ace it!" is the exact positioning that 93% cheating makes unusable for us, and Gauth's own users describe the honest alternative as doing the work first and using the app to understand mistakes. Our copy should never imply the app finishes the assignment.
- **Avoid: hiding the answer behind a paywall with no pedagogical alternative.** Free-tier frustration is Gauth's most common complaint; our free tier should grant the full hint-and-explain loop, not a degraded version of it.
- **Avoid: unlimited-looking AI.** If a student's monthly data budget is 2–5 USD, so is their AI budget. A visible, honest meter teaches the constraint; a silent wall feels like theft on a shared phone.