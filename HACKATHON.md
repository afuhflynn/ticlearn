# TiCLearn — Meta Global AI Developer Hackathon

## What this document records

This file separates pre-existing TiCLearn work from what was built during the Meta Global AI Developer Hackathon (October 26 to November 4, 2026). Judges can use it to identify the new functionality, the model usage, and the demo paths.

## Starting point

- **Starting commit:** `038bb7c781970ae3a9e9bc077f1679185f76d02f` on `main`
- **Hackathon branch:** `hackathon/muse-study-loop`
- **Repository visibility:** made public for the submission
- **Secret scan:** git history scanned before going public; no API keys or production data committed

## What pre-existed (not hackathon work)

TiCLearn was already a study platform for Cameroonian university students with:

- Note upload, PDF/Word/image text extraction (pdf.js, Tesseract OCR)
- Quiz generation from uploaded notes
- Tip AI tutor chat (web search, note context, file attachments)
- Readiness and weakest-topic tracking from quiz attempts
- Subscription plans and Mobile Money payments (Fapshi)
- AI model chain through OpenRouter with circuit breaker, usage logging, and caching

These are documented in `docs/scope/` and `AGENTS.md`. They are not part of the hackathon submission.

## What was built during the hackathon (new work)

Six features, built in order:

| # | Feature | Purpose | Meta model used |
|---|---------|---------|-----------------|
| 48 | Hackathon baseline and public repository safety | Branch, secret scan, HACKATHON.md | None |
| 49 | Provider aware model routing for Meta and Baseten | Direct calls to Meta Model API and Baseten, OpenRouter chain untouched | None (infrastructure) |
| 50 | Visual course page analysis | Render a single PDF page to image, analyse diagrams/charts/tables | Muse Spark Open via Baseten (`meta-models/muse-spark-open-1026`) |
| 51 | Grounded question generation from course material | Generate questions with answer keys, rubrics, concept tags, source page references | Muse Spark 1.3 via Meta Model API |
| 52 | Targeted retry and progress update | Explain misconceptions with source-backed evidence, offer a different follow-up exercise, update progress | Muse Spark 1.3 via Meta Model API |
| 53 | Hackathon demo and submission | Three minute demo, feature freeze, submission by November 4 at 9 PM Eastern | None |

## How Meta resources are used

### Muse Spark 1.3 — Meta Model API (direct, not via OpenRouter)

- **Role:** Main reasoning and structured generation engine for the study loop
- **Tasks:** Course material analysis, concept extraction, question generation, answer evaluation, misconception explanation, targeted follow-up exercise generation
- **Provider:** Meta Model API, accessed directly with the Meta API key (not routed through OpenRouter)
- **Why separate:** Keeps Meta credit usage visible in logs. The existing OpenRouter chain is unchanged and serves as fallback for existing features (Tip chat, quiz generation, summarisation).
- **Cache:** Grading and evaluation tasks are never cached (`cacheTtlMs: 0`) so every student answer is marked fresh. Question generation from the same document is cached per document, not per user.

### Muse Spark Open — Baseten (`meta-models/muse-spark-open-1026`)

- **Role:** Visual course page analysis experiment
- **Tasks:** Interpreting diagrams, charts, tables, and technical illustrations on individual course pages
- **Provider:** Baseten inference at `https://inference.baseten.co/v1`, OpenAI-compatible client
- **Why Baseten:** $100 credits and up to 2M tokens per minute granted for the hackathon. Used only for the visual experiment, not for every page.
- **Usage control:** Pages are sent to the visual model only when visual understanding is useful, not automatically for every document. This protects credits and keeps latency low.

### Credit separation

Hackathon inference through Meta Model API and Baseten is paid by the promotional credits granted to TiCLearn. Student credit deductions (the in-app credit system for quiz generation and tutor messages) are unaffected. The two billing domains are kept separate in code: `lib/ai/usage.ts` logs model ID, provider, tokens, latency, and cost per call, so Meta usage is auditable separately from student credit spend.

## Study loop (the hackathon demo)

The demo shows one continuous session:

1. A student uploads a real university course page
2. TiCLearn identifies a concept and interprets a diagram on the page (visual analysis via Baseten)
3. TiCLearn generates a question grounded in that material (Muse Spark 1.3 via Meta)
4. The student submits an incorrect but plausible answer
5. TiCLearn shows source-backed feedback identifying the misconception, and offers a targeted retry (Muse Spark 1.3 via Meta)
6. The student completes the retry and sees their progress update

The key moment: the student's mistake changes what TiCLearn does next. This is a learning workflow, not a chatbot wrapper.

## Files changed or added for the hackathon

- `lib/ai/instances.ts` — added `muse()` provider alongside `openrouter()`
- `lib/ai/chain.ts` — added `chainMuse()` for Meta and Baseten clients
- `lib/ai/registry.ts` — registered `course_analysis`, `question_gen`, `answer_evaluation`, `next_step` tasks
- `lib/ai/pricing.ts` — added `muse-spark-1.3` pricing
- `lib/ai/study-loop.ts` — new study loop functions (course analysis, question generation, answer evaluation, next step)
- `.env.example` — added `MUSE_API_KEY` and `BAASETEN_API_KEY`
- `docs/scope/hackathon.md` — new scope epic for the six hackathon features
- `docs/scope/index.md` — added hackathon rows to the at a glance table and phasing
- `HACKATHON.md` — this file

## How to reproduce

```bash
# Clone the public repository
git clone https://github.com/ticlearn/ticlearn.git
cd ticlearn

# Install
pnpm install

# Set up environment (copy from .env.example and add your keys)
cp .env.example .env
# Add MUSE_API_KEY and BAASETEN_API_KEY

# Database
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Run
pnpm dev
```

The OpenRouter chain continues to work without the Meta keys; Muse features require `MUSE_API_KEY` and `BAASETEN_API_KEY`.

## Demo paths

- Upload page: `app/(dashboard)/upload/page.tsx`
- Study loop functions: `lib/ai/study-loop.ts`
- Muse provider: `lib/ai/instances.ts`, `lib/ai/chain.ts`
- Task registry: `lib/ai/registry.ts`

---

*TiCLearn is built for Cameroonian university and HND students. The hackathon build shows how Muse Spark 1.3 and Muse Spark Open can power a complete learning loop — from course material to demonstrated understanding — without becoming a basic "chat with your PDF" wrapper.*
