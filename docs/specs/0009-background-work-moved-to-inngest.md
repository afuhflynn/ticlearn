# 0009. Move background work to Inngest

**Date**: 2026-10-15
**Status**: Accepted

## Summary

This decision moves heavy background work out of synchronous HTTP request handlers and into asynchronous Inngest background jobs. Heavy AI generation, document extraction, transactional email sends, and report rendering will no longer block requests or cause gateway timeouts. Users receive immediate API responses while client hooks poll status endpoints until jobs complete. This change improves platform reliability and prevents partial network failures from failing user actions.

## Context

Slow work currently runs directly inside Next.js API route handlers. When a student generates a quiz from a note, the request calls Google Gemini and waits ten seconds or more before returning. If the connection drops or the AI call takes too long, the HTTP request times out and the student sees a failure even if the server continues processing.

Similar issues exist across other routes. Uploading notes triggers synchronous text extraction and summarization. Contact submissions and authentication routes send emails directly through provider APIs, swallowing errors or blocking signups when email APIs experience latency. Admin report generation renders heavy PDF documents directly inside request handlers, risking memory spikes and request timeouts.

We need a consistent background job architecture. Inngest is already configured in the repository with an active serve endpoint at `app/api/inngest/route.ts`. We need to standardize all background operations on Inngest using an incremental migration strategy.

## Requirements

**User stories**:
* As a student uploading notes or creating quizzes, I want fast feedback without timeouts so that I can keep studying without disruption.
* As a student signing up or submitting forms, I want immediate confirmation so that email delays do not block my progress.
* As an administrator generating PDF reports, I want reliable asynchronous job processing so that heavy downloads do not crash API requests.

**Acceptance criteria**:
* **AC-1**: Submitting a note upload dispatches an Inngest event to process the note, extract text, generate key points, and summarize without blocking the upload request.
* **AC-2**: Generating a quiz from a note or from weak areas dispatches an Inngest event and returns immediately with a status endpoint that clients poll until completion.
* **AC-3**: AI chat title generation runs asynchronously without blocking the initial streaming response to the student.
* **AC-4**: Outbound transactional emails (contact form submissions, verification emails, welcome emails, password resets, magic links, admin invites) are queued as Inngest background functions with automatic retry policies and idempotency keys.
* **AC-5**: Admin report PDF generation runs asynchronously via Inngest with a dedicated download URL to prevent request timeouts on heavy renders.
* **AC-6**: Transient job failures trigger automatic retries and do not cause the originating user request to fail.

## Options considered

### Option 1: Fix in place with unhandled promises

Run long running tasks in detached promises inside route handlers without awaiting their return.

**Pros**:
* Requires minimal code changes.
* No external queue coordination needed.

**Cons**:
* Serverless environments terminate runtime processes as soon as the HTTP response finishes, killing unfinished promises.
* No retry mechanism, persistence, or observability if an unhandled promise fails.

### Option 2: Replace with strangler pattern using Inngest background jobs

Migrate each heavy route incrementally to dispatch Inngest events, keeping existing database models and adding polling endpoints.

**Pros**:
* Inngest is already installed, configured, and running in development with `pnpm inngest:start`.
* Provides durable execution, step level retries, idempotency keys, and full observability out of the box.
* Safe gradual rollout route by route without breaking existing features.

**Cons**:
* Requires client side status polling with TanStack Query.
* Adds slight event dispatch latency.

### Option 3: Separate worker process with Redis and BullMQ

Deploy a dedicated Node worker process using Redis and BullMQ.

**Pros**:
* Standard enterprise pattern with fine grained concurrency control.

**Cons**:
* Introduces additional infrastructure complexity and Redis hosting costs.
* Requires separate process management and deployment pipelines.

## Decision

**Chosen option**: Option 2: Replace with strangler pattern using Inngest background jobs

We will move heavy work out of request handlers into Inngest background functions using the strangler pattern.

**Implementation skills**: `Inngest` (`inngest/inngest-js`, `lib/inngest/`)

## Rationale

Inngest is already present in `AGENTS.md` and runs cleanly in our Next.js App Router environment. Because our hosting environment is serverless, detached promises are unreliable and will be terminated prematurely. A dedicated Redis and BullMQ worker would introduce unnecessary operational burden for a team of our size. Inngest provides reliable event queues, automatic retries with exponential backoff, and full local development tooling through the Inngest Dev Server.

## Feature design

**State transitions**:
* Note processing: `UPLOADING` -> `PROCESSING` -> `READY` (or `ERROR`)
* Quiz generation: `GENERATING` -> `READY` (or `ERROR`)
* Report generation: `PENDING` -> `PROCESSING` -> `COMPLETED` (or `FAILED`)

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/notes/process` | POST | noteId: string | jobId: string, status: string | Session | 401, 404 |
| `/api/quizzes/generate` | POST | noteId: string, count: number | quizId: string, status: string | Session | 400, 401, 402, 429 |
| `/api/quizzes/[id]/status` | GET | id: string | id: string, status: string | Session | 401, 404 |
| `/api/contact` | POST | name: string, email: string, message: string | success: boolean | Public | 400, 429 |
| `/api/admin/reports` | POST | type: string, dateRange: object | reportId: string, status: string | Admin | 401, 403 |
| `/api/admin/reports/[id]` | GET | id: string | id: string, status: string, downloadUrl: string | Admin | 401, 403, 404 |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Queue note processing | note status `PROCESSING` | Updated in Prisma note record |
| Queue quiz generation | quiz status `GENERATING` | Created in Prisma quiz record |
| Poll quiz status | quiz status `READY` or `ERROR` | Read from Prisma quiz status column |
| Send contact email | message delivery receipt | Inngest event completion log |
| Download admin report | signed download URL | Generated from storage or cached buffer |

**Key invariants**:
* An API route must return an HTTP response in under five hundred milliseconds.
* Background events must carry unique idempotency keys based on entity IDs to prevent duplicate AI generations or duplicate emails.
* Database status columns must update to `ERROR` or `FAILED` if background retries are exhausted.

**Security model**:
* All Inngest serve routes require valid signing keys in production (`INNGEST_SIGNING_KEY`).
* Only authenticated users can trigger or poll note and quiz jobs for their own resources.
* Only administrators with the `ADMIN` role can trigger or view admin report jobs.

**Configuration required**:
* `INNGEST_EVENT_KEY`: Inngest event dispatch key (production)
* `INNGEST_SIGNING_KEY`: Inngest webhook validation key (production)

**Critical test scenarios**:
* Happy path: Quiz generation endpoint returns status `GENERATING` within two hundred milliseconds, Inngest processes the questions, and polling returns status `READY`, verifies **AC-2**
* Failure case: AI provider times out during quiz generation, Inngest automatically retries with backoff, and sets status `ERROR` on final exhaustion without crashing the API, verifies **AC-6**
* Auth check: Non admin user attempting to trigger an admin report job receives HTTP 403 forbidden, verifies **AC-5**
* Email queue: Contact form dispatches email event immediately and returns HTTP 200 even if the outbound mail provider is temporarily unreachable, verifies **AC-4**

## Build plan

1. Create Inngest functions for outbound emails (contact submissions, auth emails, admin invites) and update route handlers to dispatch events via `inngest.send`, satisfies **AC-4**, **AC-6**
2. Refactor note text extraction and summarization to run as an Inngest background function updating `NoteStatus`, satisfies **AC-1**, **AC-6**
3. Refactor quiz generation route to create a placeholder record in `GENERATING` status, dispatch the Inngest task, and provide a status polling endpoint, satisfies **AC-2**, **AC-6**
4. Update client quiz generation hooks to poll status using TanStack Query until status is `READY`, satisfies **AC-2**
5. Refactor chat title generation to execute non blocking in the background without delaying token streaming, satisfies **AC-3**
6. Move admin PDF report rendering to an asynchronous Inngest job with download link retrieval, satisfies **AC-5**, **AC-6**

## Consequences

**Positive**:
* API routes respond in milliseconds instead of seconds.
* Gateway timeouts on serverless deployments are completely eliminated.
* Temporary network or provider glitches are handled gracefully through automatic retries.

**Negative / tradeoffs**:
* Client UI requires polling logic and intermediate progress indicators.
* Requires the Inngest dev server to run during local development.

**Neutral**:
* Developers must use `pnpm dev:all` or start Inngest with `pnpm inngest:start`.

## Follow-up

- [ ] Verify Inngest signing keys in the production deployment dashboard.
- [ ] Configure Inngest alert notifications for dead letter queues.

## Migration plan

**Strategy**: Strangler pattern

**Phases**:
1. Phase 1: Outbound email routes (contact form and auth triggers). Low risk, immediate benefit for user registration.
2. Phase 2: AI note processing and quiz generation. Update route handlers, add polling endpoints, and update TanStack Query hooks.
3. Phase 3: AI chat title generation and admin PDF report downloads.

**Rollback**:
Each route can be reverted individually to synchronous execution by rolling back its specific route handler commit without database schema changes.

**Risks**:
* Client polling frequency causing unnecessary database reads. Mitigate by using exponential backoff with a minimum interval of two seconds.
