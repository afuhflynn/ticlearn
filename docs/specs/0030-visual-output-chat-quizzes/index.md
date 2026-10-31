# 0030. Visual output in chat and quizzes

**Date**: 2026-10-30
**Status**: In Progress

## Summary

Students see diagrams where they study instead of reading about them. Saved page art from their notes appears inline in chat, quiz review, and the note reader, and the model draws fresh diagrams when words alone fall short (Mermaid, diagrams from text, for simple charts and flows; SVG, crisp vector art, for freeform physics drawings). Reads stay owner only, bad drawings degrade to text so an answer never blocks, and drawn diagrams stay free with a per key daily cap in this phase.

## Requirements

**User stories**:
1. As a student, I want the diagram from my note shown beside the answer so I can revise the right page without opening the PDF.
2. As a student, I want quiz review and my notes to show the same art, so proof follows me across surfaces.
3. As a student, I want the model to draw a fresh labeled diagram for the idea at hand when my note has no matching figure.

**Acceptance criteria**:
1. **AC-1**: In chat, an answer that cites pages carrying visuals shows the saved page image inline in an art card beside the answer with its page tag; tapping enlarges it in the existing lightbox.
2. **AC-2**: Quiz review shows page art beside the related question, and drawn retry art beside the retry that produced it.
3. **AC-3**: The note reader shows drawn art inline under its page block in reading order, with scan thumbnails that scroll to the page; scans stay served from the framed PDF path with no duplicate storage.
4. **AC-4**: A fresh diagram arrives as Mermaid source for constrained charts and flows, or sanitized SVG for freeform art; invalid model output degrades to the text description and the answer still lands.
5. **AC-5**: Every read and draw filters by owner; a foreign id receives not found; rendered SVG carries no scripts (sanitized before render).
6. **AC-6**: Drawn diagrams cost no debit in this phase, capped at 3 draws per canonical key per day (the answer for quiz draws; note plus concept for chat and note draws); each draw writes a usage log row with model plus latency.
7. **AC-7**: An art region with no data shows a fixed ratio art skeleton with letterboxed art; a failed read or draw shows a plain notice with retry, or a plain limit line when the cap is reached; art carries alt text a screen reader can read.

## Decision

**Chosen option**: Option 1: artifact table plus unified read plus hybrid render

One `VisualArtifact` row per shown or drawn visual, shared by chat plus quiz plus notes; a single read serves scans plus drawn art; the model draws Mermaid for constrained shapes and SVG for freeform art, sanitized before render.

## Rationale

Reasoning and options: see rationale.md.

## Feature design

**Data model sketch**:
- `VisualArtifact` (new): id String primary key; userId String owner (FK User, cascade); noteId String optional (FK Note, cascade; null when drawn with no note in play); kind String scan or drawn; format String scan, mermaid, or svg; sourcePage Int optional (scan page); originAnswerId String optional with no FK (links a drawn retry artifact to its answer; checked in app code); imageUrl String optional (file store URL for scans); payload Text optional (Mermaid source or SVG markup for drawn art); altText String required; createdAt timestamp. Indexes on userId, noteId, and originAnswerId plus createdAt. Rows immutable after create.
- Page, VisualAnalysis, QuizRetry, ChatMessage: read only, no changes. Chat message parts carry the artifact id in part data (JSON, no migration). Quiz resolves art at read time through question sourcePages (no migration).

**State transitions**: none persisted. Draws run inline to complete; failures leave no row and the surface shows the text fallback plus a retry control.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/artifacts/generate | POST | answerId for quiz or retry draws, or noteId plus concept for chat or note draws; format hint optional | artifact id, format, payload or imageUrl, altText | bearer owner | 401 no session, 400 bad input, 404 foreign note or answer, 429 cap reached |
| /api/artifacts | GET | noteId or answerId query | scans derived from Page rows (capped at 50 per note, page order, with total count) plus drawn rows | bearer owner | 401 no session, 400 bad query, 404 foreign id |

**Value sourcing**:
| Action | Value produced or displayed | Source |
|---|---|---|
| Unified read | shown page image | Page.pageImageUrl stored by the spec 0027 scan job; scans never stored as artifact rows |
| Unified read | page tag beside art | Page.pageNumber joined to completed VisualAnalysis |
| Generate draw | drawn payload plus format | model output stored in VisualArtifact.payload; model declares mermaid or svg per diagram, server accepts mermaid for flow, chart, and sequence shapes and svg for freeform, rejects the rest |
| Generate draw | alt text | model output stored in VisualArtifact.altText; read by assistive tech and shown on load failure |
| Generate draw | sanitized markup | DOMPurify svg profile output derived from the payload before store; Mermaid output sanitized after render |
| Generate draw | cap count | count of VisualArtifact drawn rows for the canonical key within the UTC day; cap counts drawn rows only |
| Generate draw | owner check | session user id equals artifact userId, or Page through Note userId for scans |
| Generate draw | model plus latency proof | one usage log row per generate through lib/ai/usage.ts; no debit row in this phase |
| Quiz review | art per question | question sourcePages mapped to note artifacts at read time (sourcePages decided in spec 0028) |
| Quiz review | retry art | VisualArtifact.originAnswerId equals the answer id |
| Chat render | attached art | artifact id kept in the message part data |
| Chat render | enlarged art | same imageUrl opened in the existing lightbox |
| Note reader | art placement | drawn art under its page block in reading order by sourcePage then createdAt; scan thumbnails scroll to the page |
| Quiz review | multi page art | first 3 cards in sourcePages order plus an overflow count |
| Generate draw | caller plus concept | drawVisual chat tool (model supplied, server validated) or the retry panel or the note control; concept from the question or answer context |

**Key invariants**:
1. Reads filter by owner through the note, or by userId when no note is in play; foreign ids read as missing (404).
2. Draws capped at 3 per canonical key per UTC day (the answer for quiz draws; note plus normalized concept for chat and note draws); the cap checks before the model call.
3. Artifact rows immutable; delete cascades with the note and the user.
4. Stored markup is sanitized before store; SVG over 200 KB or unparsable Mermaid counts as invalid and never stores; renderers never execute scripts.
5. Invalid model output never blocks an answer: text fallback plus retry control.
6. No debit rows for draws in this phase; every draw still logs usage.
7. Draws originate from the drawVisual tool, the retry panel, or the note control; client supplied ids never decide auth or the cap key.
8. Captions stay visible under art as the correction path; regenerate consumes cap.

**Security model**:
Owner only throughout. Creation resolves the note or answer through the caller id, so a forged id reads as missing. SVG and Mermaid output pass DOMPurify before store, and Mermaid render output is sanitized again after render. File store image URLs return only to the owner, the same posture as note file serving today. No new personal data. Study art the student already owns.

**Configuration required**:
- New deps: `mermaid` (client renderer), `dompurify` (sanitizer). Installed at build; no new env vars (file store token, Meta key, and OpenRouter chain exist).
- New prompt file `prompts/draw/explain_and_draw.md` holding the draw contract (format declaration, alt text, no script tags, plain text labels).
- New registry task `visual_draw` routing to Meta with OpenRouter fallback and no cache.

**Critical test scenarios**:
- Happy path: chat answer citing a visual page shows the scan card plus a fresh inline diagram; quiz review shows art beside the question; note reader shows drawn art near its page, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**.
- Failure case: model returns invalid SVG, the text description lands with a retry control, verifies **AC-4**.
- Auth and permission: foreign note or answer id receives not found with no data; markup carrying a script renders with the script stripped, verifies **AC-5**.
- Money: fourth draw for the same canonical key on the same day receives 429 with the retry control disabled and a plain limit line, while the usage row is written and the balance is untouched, verifies **AC-6**.

## Build plan

Tracer Bullet: a thin thread through chat first, then the same art broadens to quiz and notes, then hardening.

1. Migration for `VisualArtifact` plus indexes (no FK on originAnswerId), satisfies **AC-5**.
2. Registry task `visual_draw` plus prompt `prompts/draw/explain_and_draw.md` plus generation helper (Muse first, OpenRouter fallback, 15 second total budget, invalid output raises), satisfies **AC-4**, **AC-6**.
3. `POST /api/artifacts/generate` (owner checks, cap before the call, usage log, no debit) plus `GET /api/artifacts` unified read (scans derived plus drawn rows, owner only), satisfies **AC-1**, **AC-4**, **AC-5**, **AC-6**.
4. Chat art card (inline plus zoom plus alt text plus skeleton plus retry) wired to the unified read and generate, satisfies **AC-1**, **AC-7**.
5. Quiz review placement (resolve through sourcePages plus originAnswerId) plus note reader inline placement, satisfies **AC-2**, **AC-3**, **AC-7**.
6. Tests for happy path plus invalid output fallback plus foreign 404 plus script strip plus cap 429 plus usage row with no debit, satisfies all ACs.

## Consequences

**Positive**:
- Misses and hard ideas become visible where study happens, on every surface from one row.
- Scans already paid for get reused instead of rescanned.
- Mermaid keeps constrained diagrams cheap; SVG covers physics freeform the motivating subject needs.

**Negative or tradeoffs**:
- Model drawn art is sometimes wrong; the text fallback and alt text carry the meaning, but a wrong diagram can mislead before the student reads the caption.
- Two render paths to maintain plus two new client deps to keep current.
- Draw calls add model latency to answers that trigger them; auto show spends that on every visual answer.

**Neutral**:
- No new providers and no new env vars.
- Share cards stay text only in v1; pricing draws later with a tunable.

## Follow-up

- [ ] Price drawn diagrams with a tunable when prototype ends (mirror the credit cost tunables in PlatformSettings).
- [ ] Share card art stays out of v1; revisit when public access rules exist.
- [ ] Record `mermaid` plus `dompurify` in the dependency inventory at build time.
