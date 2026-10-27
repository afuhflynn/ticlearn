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
   - [ ] Verify HACKATHON.md completeness and commit — satisfies AC-3
   - [ ] Make repository public on GitHub — satisfies AC-4

### 49. Provider aware model routing for Meta and Baseten · Hackathon · planned · needs a decision · Prototype

Add a Muse provider alongside the existing OpenRouter chain in lib/ai/instances.ts and lib/ai/chain.ts. Route muse-spark-1.3 calls directly to Meta Model API using your key. Route muse-spark-open-1026 calls to Baseten at inference.baseten.co/v1. Keep OpenRouter chain untouched as fallback.

**Done when:** muse() provider exists and lazily initialises, chainMuse() constructs Meta and Baseten clients, no existing OpenRouter call is affected, MUSE_API_KEY and BAASETEN_API_KEY documented in .env.example.

- [ ] Design it (spec): /solution-architect provider aware model routing for Meta and Baseten

### 50. Visual course page analysis · Hackathon · planned · needs a decision · Prototype

Render a single PDF page to an image and send it to Baseten Muse Spark Open (meta-models/muse-spark-open-1026) for visual interpretation of diagrams, charts, and tables. Only send pages when visual understanding is useful, not every page automatically.

**Done when:** one diagram page can be uploaded and analysed reliably, visual analysis feeds into question generation, Baseten credits cover the cost not student credits.

- [ ] Design it (spec): /solution-architect visual course page analysis

### 51. Grounded question generation from course material · Hackathon · planned · Prototype

Use Muse Spark 1.3 through Meta Model API to generate structured questions with answer keys, rubrics, concept tags, and source page references from uploaded course material. Preserve source traceability.

**Done when:** a student uploads a course page, TiCLearn extracts concepts with page references, generates answerable questions grounded in that material, and stores source links with each question.

- [ ] Design it (spec): /solution-architect grounded question generation from course material

### 52. Targeted retry and progress update · Hackathon · planned · Prototype

When a student answers wrong, use Muse Spark 1.3 to explain the misconception with source-backed evidence and generate a different follow-up exercise testing the same concept. Save attempts and update the existing progress record.

**Done when:** a wrong answer leads to grounded feedback, a targeted retry exercise is offered, completing the retry updates the student's progress or weakest topic record.

- [ ] Design it (spec): /solution-architect targeted retry and progress update

### 53. Hackathon demo and submission · Hackathon · planned · Prototype

Record a three minute demo showing upload → concept mapping → question → wrong answer → source backed feedback → targeted retry → progress update. Freeze features and submit by November 4 at 9 PM Eastern.

**Done when:** demo recorded, repository public, submission complete, HACKATHON.md updated with evaluation results and demo paths.

- [ ] Design it (spec): /solution-architect hackathon demo and submission
