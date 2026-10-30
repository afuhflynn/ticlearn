# Hackathon

Meta Global AI Developer Hackathon build, October 26 to November 4 2026. Six features across one phase, using Muse Spark 1.3 through Meta Model API for reasoning and Baseten Muse Spark Open for visual course page analysis. The OpenRouter chain stays untouched as fallback.

(basis: research from model selection decisions and the Meta hackathon build plan)

## Hackathon phase

### 48. Hackathon baseline and public repository safety · Hackathon · in-progress · Prototype

Record the starting commit SHA, create the hackathon branch, scan git history for secrets before making the repo public, and add HACKATHON.md documenting pre-existing versus new work. Repository set to public on GitHub by you (manual step, outside this codebase).

**Done when:** hackathon branch created from main, commit SHA recorded, secret scan complete with no keys found on both main and the hackathon branch, HACKATHON.md written and committed with all four AC-3 elements verified, repository set to public on GitHub.

- [x] Design it (spec): /solution-architect hackathon baseline and public repository safety

spec ../specs/0025-hackathon-baseline-public-repo/index.md

- [ ] Build it: /feature-build hackathon baseline and public repository safety
   - [x] Set up branch from main and record starting SHA in HACKATHON.md — satisfies AC-1
   - [x] Run gitleaks secret scan on main and hackathon branch — satisfies AC-2
   - [x] Verify HACKATHON.md completeness and commit — satisfies AC-3
   - [x] Make repository public on GitHub — satisfies AC-4

### 49. Provider aware model routing for Meta and Baseten · Hackathon · in-progress · Prototype

Add a Muse provider alongside the existing OpenRouter chain in lib/ai/instances.ts and lib/ai/chain.ts. Route muse-spark-1.3 calls directly to Meta Model API using your key. Route muse-spark-open-1026 calls to Baseten at inference.baseten.co/v1. Keep OpenRouter chain untouched as fallback.

**Done when:** muse() provider exists and lazily initialises, chainMuse() constructs Meta and Baseten clients, no existing OpenRouter call is affected, MUSE_API_KEY and BAASETEN_API_KEY documented in .env.example.

spec ../specs/0026-provider-aware-routing-meta-baseten.md

- [x] Design it (spec): /solution-architect provider aware model routing for Meta and Baseten

- [x] Build it: /feature-build provider aware model routing for Meta and Baseten
  - [x] Configure env vars and add the Muse provider and chainMuse routing (covers AC-1, AC-3, AC-6)
  - [x] Add usage writing and per-leg timeout fallback to OpenRouter (covers AC-2, AC-4, AC-5, AC-7, AC-8, AC-9)
  - [x] Verify streaming, tool calls, and the OpenRouter chain alternative; add tests (covers AC-3, AC-4, AC-5)

### 50. Visual course page analysis · Hackathon · in-progress · Prototype

Render a single PDF page to an image and send it to Baseten Muse Spark Open (meta-models/muse-spark-open-1026) for visual interpretation of diagrams, charts, and tables. Only send pages when visual understanding is useful, not every page automatically.

**Done when:** one diagram page can be uploaded and analysed reliably, visual analysis feeds into question generation, Baseten credits cover the cost not student credits.

spec ../specs/0027-visual-course-page-analysis/index.md

- [x] Design it (spec): /solution-architect visual course page analysis

- [x] Build it: /feature-build visual course page analysis
  - [x] Add Page and VisualAnalysis models to the Prisma schema plus migration (AC-3)
  - [x] Add pdf.js page render and low-resolution non-text-ratio scan helpers (AC-1 AC-2 AC-8)
  - [x] Create Inngest job visual-analysis/process with idempotent re-scan, Baseten call, and failed-page isolation (AC-1 AC-2 AC-6 AC-8)
  - [x] Route Baseten cost through lib/ai/usage.ts as promotional credit and build owner-only GET /api/visual-analysis/[noteId] (AC-5 AC-7)
  - [x] Add tests for happy path, failure skip, and owner-only authorization (all ACs)

### 51. Grounded question generation from course material · Hackathon · in-progress · Prototype

Use Muse Spark 1.3 through Meta Model API to generate structured questions with answer keys, rubrics, concept tags, and source page references from uploaded course material. Preserve source traceability.

**Done when:** a student uploads a course page, TiCLearn extracts concepts with page references, generates answerable questions grounded in that material, and stores source links with each question.

spec ../specs/0028-page-referenced-answers/index.md

- [x] Design it (spec): /solution-architect grounded question generation from course material

- [x] Build it: /feature-build grounded question generation from course material
  - [x] Migration, grounded prompt, generation with stored page refs (AC-1 AC-2 AC-4 AC-6)
  - [x] Grounded flag on the quiz route with per question cost and text only degrade (AC-4 AC-5)
  - [x] Page tag on the question card, admin prices, tests (AC-2 AC-4)

  code in lib/grounded-pages.ts, lib/ai/index.ts, app/api/quizzes/generate/route.ts, lib/inngest/functions.ts, app/(dashboard)/quizzes/[id]/page.tsx

### 52. Targeted retry and progress update · Hackathon · in-progress · Prototype

When a student answers wrong, use Muse Spark 1.3 to explain the misconception with source-backed evidence and generate a different follow-up exercise testing the same concept. Save attempts and update the existing progress record.

**Done when:** a wrong answer leads to grounded feedback, a targeted retry exercise is offered, completing the retry updates the student's progress or weakest topic record.

- [x] Design it (spec): /solution-architect targeted retry and progress update

spec ../specs/0029-targeted-retry-progress-update/index.md

- [ ] Build it: /feature-build targeted retry and progress update
  - [x] Storage plus prompt plus generation helper with fallback and timeouts (covers AC-1, AC-2, AC-5)
  - [x] Two routes plus owner only read with cap and usage log (covers AC-1, AC-4, AC-6)
  - [x] Review panel plus submit with metadata update plus tests (covers AC-1, AC-2, AC-3)

  code in app/api/retries, components/retries/retry-panel.tsx, lib/retries, prompts/retry/explain_and_retry.md

### 53. Hackathon demo and submission · Hackathon · planned · Prototype

Record a three minute demo showing upload → concept mapping → question → wrong answer → source backed feedback → targeted retry → progress update. Freeze features and submit by November 4 at 9 PM Eastern.

**Done when:** demo recorded, repository public, submission complete, HACKATHON.md updated with evaluation results and demo paths.

- [ ] Design it (spec): /solution-architect hackathon demo and submission

### 54. Chat page lookup · Hackathon · in-progress · Prototype · from spec 0028

The chat tutor answers show me the page number from the conversation note stored pages, citing page numbers from real data instead of guessing.

**Done when:** a student asks which page covers a topic and Tip names the page number from their note, debiting one lookup price only when pages come back.

spec ../specs/0028-page-referenced-answers/index.md

- [x] Design it (spec): covered in spec 0028 alongside feature 51

- [ ] Build it: /feature-build chat page lookup
  - [ ] getNotePages tool with owner scoped reads, pending shape, per useful call debit (AC-3 AC-4 AC-5 AC-7)
  - [ ] Page citation line in the chat system prompt (AC-3)
