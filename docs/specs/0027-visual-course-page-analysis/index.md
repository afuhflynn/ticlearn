# 0027. Visual course page analysis

**Date**: 2026-10-29
**Status**: In Progress

## Summary

When a student uploads a course PDF, the system scans each page to find pages that contain a diagram chart table or illustration, renders those pages to images, sends them to Baseten Muse Spark Open for visual interpretation, and stores each result with its page number and page reference. Only pages the scan flags as visual are sent to Baseten, so not every page is analysed automatically. Baseten costs are covered by promotional credits, never debited from the student's balance. On any failure the affected page is marked failed and analysis continues with the remaining pages.

## Requirements

**User stories**:
- As a student, I upload a course PDF and the system finds which pages have diagrams charts tables or illustrations so those pages can be understood visually.
- As a student, the visual analysis results are tied to specific page numbers so later question generation and Q&A can cite the right page.
- As a student, Baseten visual analysis never reduces my credit balance; promotional credits cover it.

**Acceptance criteria**:
- **AC-1**: When a note is uploaded, the system scans each page to detect whether it contains visual content (diagram chart table or illustration).
- **AC-2**: Pages flagged as containing visual content are rendered to images and sent to Baseten Muse Spark Open for visual analysis.
- **AC-3**: Each visual analysis result is stored with its page number and page reference so question generation can cite the page.
- **AC-4**: Only pages the scan flagged as visual are sent to Baseten; pages with no visual content are not sent.
- **AC-5**: Baseten inference costs are covered by promotional credits and are never debited from the student's credit balance.
- **AC-6**: When a page fails to render or Baseten returns an unusable result, that page is marked failed and analysis continues with the remaining pages; no error is shown to the student for that page.
- **AC-7**: The note's owner can fetch all pages of the note together with each page's visual analysis result (visual type, description, confidence, status).
- **AC-8**: A page is not sent to Baseten unless the scan has flagged it as visual.

## Decision

**Chosen option**: Option 1, pdf.js page rendering plus low resolution page scan, with page images in Vercel Blob and the pipeline as an Inngest background job triggered by note upload. See `rationale.md` for the options and reasoning.

**Implementation skills**: vercel-react-best-practices (`.agents/skills/vercel-react-best-practices/`) · React rendering conventions that shape whether the API route and job are server side.

## Feature design

**Data model sketch**:

- `Note` (existing): holds the uploaded course PDF. Fields relevant here: id (PK), userId (FK to owner), fileUrl.
- `Page` (new): one row per PDF page. Fields: id (PK), noteId (FK required, 1:N to Note), pageNumber (int required), pageImageUrl (nullable, URL to rendered image in Vercel Blob), hasVisual (boolean), analysedAt (nullable timestamp). Unique constraint: (noteId, pageNumber).
- `VisualAnalysis` (new): one row per analysed page. Fields: id (PK), pageId (FK required, 1:N to Page), visualType (enum: diagram chart table illustration other), description (text), confidence (nullable float, scale 0 to 1), basetenCostXaf (nullable int), status (enum: pending completed failed), createdAt (timestamp). Page reference = pageNumber; pageImageUrl is the link to the rendered page.

Relationships: Note has many Pages (1:N). Page has many VisualAnalyses (1:N in practice one active analysis per page).

**State transitions**:
- VisualAnalysis status: pending → completed or failed. Once completed or failed it does not transition again (one active analysis per page).
- Page: analysedAt is null until a scan or analysis runs; set when the page has been processed.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| Inngest function visual-analysis/process | event | noteId (from note.uploaded event) | pages scanned, analyses created | internal job | job retry on failure |
| /api/visual-analysis/[noteId] | GET | noteId (path param) | pages + visual analyses | bearer (owner only) | 404 not found, 403 forbidden |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Trigger job | noteId | note.uploaded event emitted by the note upload route after the Note row and file are persisted |
| Scan pages | hasVisual per page | computed by pdf.js low resolution render; page is visual if non-white/non-text pixel ratio is at least 0.15 (constant documented in the scan helper) |
| Render page image | pageImageUrl | page rendered by pdf.js at about 1024 to 1536 px long edge (~150 DPI), stored in Vercel Blob; the same render feeds both the scan and the Baseten input |
| Send to Baseten | visualType description confidence | Baseten response to pageImageUrl using meta-models/muse-spark-open-1026 via baseten(); fixed prompt returns visualType, description, confidence 0 to 1 |
| Store cost | basetenCostXaf | computed from Baseten usage in lib/ai/usage.ts using a flat XAF rate per call (reuse the MUSE_COST_PER_CALL_XAF pattern in lib/ai/pricing.ts) |
| Mark status | VisualAnalysis.status | set to pending/completed/failed by the job; one shot per page, no retry; missing/empty description or unparseable Baseten response counts as unusable → failed |
| Read pages + analyses | list of pages with analyses | noteId from URL param; owner = session.user.id matching Note.userId, else 403; returns all pages (no pagination) |
| Gate Baseten call | whether to send page | hasVisual boolean on Page |
| Promotional credit | Baseten cost budget | promotional credit grant/bucket debited per basetenCostXaf in lib/ai/usage.ts; never touches lib/credits.ts student balance; when credits run out remaining pages mark failed with a note-level banner |
| Re-scan on crash | pages with analysedAt null | job is idempotent: re-scan pages whose analysedAt is still null |

**Key invariants**:
- pageNumber is unique within a note.
- A page is sent to Baseten only when hasVisual is true.
- Baseten cost is never debited from the student's credit balance.
- One active VisualAnalysis per page (status pending completed or failed, no re-analysis without a new row).

**Security model**:
- Only the note's owner can trigger analysis of that note's pages and read its visual analysis results.
- No cross-tenant access: every query filters by the note's owner.
- Baseten usage is covered by promotional credits logged in lib/ai/usage.ts; no student credit debit.
- This feature does not touch regulated data (payments PII health); no compliance scope applies.

**Configuration required**:
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob token for storing page images (already documented in .env.example).
- `BAASETEN_API_KEY`: Baseten inference key (already present for feature 49).
- `MUSE_API_KEY`: Meta Model API key (already present; not used by this feature's Baseten path but part of the existing AI layer).

**Critical test scenarios**:
- Happy path: upload a PDF with one visual page and one text page; only the visual page is rendered and sent to Baseten, and its analysis is stored with page number, verifies AC-1 AC-2 AC-3 AC-4 AC-8.
- Failure case: Baseten returns an unusable result for one page; that page is marked failed and the other pages still complete, verifies AC-6.
- Auth/permission: a user who is not the note's owner calls GET /api/visual-analysis/[noteId] and receives 403, verifies AC-7 owner-only access.

## Build plan

Tracer Bullet approach: stand up a thin end to end thread first (scan one note, render one page, send to Baseten, store one result, expose one read endpoint), then thicken (all pages, all notes, cost accounting, tests).

1. Add Page and VisualAnalysis models to the Prisma schema and create the migration, satisfies AC-3.
2. Add the pdf.js page render and low resolution scan helpers in lib/ai/, satisfies AC-1 AC-2.
3. Create the Inngest function visual-analysis/process triggered by note upload, satisfies AC-1 AC-2 AC-6 AC-8.
4. Wire Baseten visual analysis call into the job using baseten() and store results with pageImageUrl in Vercel Blob, satisfies AC-2 AC-3.
5. Route Baseten cost through lib/ai/usage.ts as promotional credit, never student debit, satisfies AC-5.
6. Build GET /api/visual-analysis/[noteId] returning pages plus analyses, owner only, satisfies AC-7.
7. Add tests: happy path scan and Baseten call, failure skip behavior, owner-only authorization, satisfies all ACs.

## Consequences

**Positive**:
- Only pages with visuals are sent to Baseten, keeping inference cost and latency low.
- Baseten cost never touches the student's credit balance, matching the hackathon funding model.
- Results are stored per page with page references, ready for feature 51 question generation and the page referenced Q&A agent.
- The pipeline reuses the existing Inngest + Baseten stack, so no new infrastructure to operate.

**Negative / tradeoffs**:
- The low resolution scan may miss small diagrams or misclassify some pages, so a few visuals could be missed or a few text pages flagged.
- pdf.js rendering quality varies by PDF, which could produce poor page images for Baseten to read.
- Adding one more Inngest job increases background job operational surface to monitor.

**Neutral**:
- No new environment variables beyond BLOB_READ_WRITE_TOKEN and the already-present Baseten keys.
- The VisualAnalysis table is additive; no existing data is migrated.
- Feature 51 and the Q&A agent consume this data but are separate specs.

## Follow-up

- [ ] Confirm feature 51's question generation reads VisualAnalysis results with page references.
- [ ] Confirm the page referenced Q&A agent consumes per page visual descriptions.
- [ ] If the low resolution scan misses too many visuals in practice, revisit the scan approach (Option 2 embedded image extraction as a supplement).
