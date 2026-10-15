# 0008. Database indexes and query rewrites

**Date**: 2026-10-15
**Status**: In Progress

## Summary

This spec adds the missing database indexes and rewrites the slowest queries across every query surface in the app. It covers leaderboards, usage, quizzes, admin screens, community, search, chat, and analytics. Paper and exam tables are fully out of scope since the data wipe deleted them. Each slice ships an index plus its query rewrite plus a plan check, so speed and safety land together.

## Context

> Premise note: This topic spans about eight surfaces that could each ship alone. That breadth is real, but every surface shares one pattern (a composite index plus a bounded rewrite plus a plan check), so one spec with thin slices fits better than eight specs. The first slice proves the pattern end to end on the leaderboard, and later slices repeat it.

Students read on low cost Android phones over costly mobile data, so a slow screen costs real money and patience. Today several hot paths recompute totals on every view. The leaderboard counts rows per page view. Admin metrics groups thousands of event rows in memory per request. Usage runs sequential reads per page load. Community loads counts per row. Search scans text with pattern matches no plain index can serve. A quiz submit reads then writes a total, which loses points when two submits race.

The repo also holds a research file with exact index definitions, but it describes 61 models while the live schema holds 39. The data wipe removed the mock, exam, and Paper 3 families, so every recommendation tied to those tables is stale. The build must diff the live database before applying anything, and must build indexes without locking live tables. Background jobs and caching stay out of this spec; two later plan items own them.

## Requirements

**User stories**:
* As a student, I want the leaderboard and my usage to load fast so that I can check progress without waiting.
* As an admin, I want metrics and user lists to answer quickly so that I can run the platform without timeouts.
* As a student, I want my quiz points to survive concurrent submits so that my total is always right.

**Acceptance criteria**:
* **AC-1**: Leaderboard pages read through a sort supporting index ordered by total points desc plus user id asc as tiebreak, rank counts rows strictly greater than mine on the same index, the admin exclusion runs as a join through the users role index, with no full table count per view.
* **AC-2**: Usage answers from five parallel reads (active subscription, latest subscription, note total, quiz total, today chat total), profile id loads through the user relation on the subscription read, and no count ever spans all users for one user quota.
* **AC-3**: Admin metrics uses COUNT DISTINCT over user id in the database for daily (24 hours) and monthly (30 days) active users on server local boundaries over all events, MRR comes from a grouped sum of amount over active subscriptions by plan documented as the current active base with no renewal math, and cohort data reads stored Daily Metric rows keyed by a metric naming convention of cohort plus week plus offset.
* **AC-4**: Admin users loads affiliates in one left join of User referred by to Affiliate code with null when none, and sort accepts only creation date, name, credits, or email in fixed directions (default creation date desc when absent, 422 when invalid).
* **AC-5**: Community post lists read stored like and comment totals, with no per row count query.
* **AC-6**: Note, quiz, and post search uses trigram indexes plus a stored search column on notes, with no unbounded full text scan inside a request.
* **AC-7**: Quiz submit updates totals with one atomic increment, so concurrent submits never lose points.
* **AC-8**: Chat lookups by conversation plus date and by user plus role plus date, notification lookups by user plus date, credit lookups by user plus date, Kpi Event lookups by user plus date and by event plus date, engagement lookups by campaign plus sent date, each have a composite index matching that filter and sort. Ai Usage Events stay as they are since all three composites exist, and Revision Guide stays unindexed as a tiny admin table.
* **AC-9**: No request runs an unbounded read without a limit, and no request runs a query inside a loop. Lists default to 20 rows with a max of 100, search takes 10, readiness takes 200, conversation delete batches 200.
* **AC-10**: Every index builds concurrently outside a transaction against the live schema through a standalone script (never the normal migrate path), and every slice stores its before and after plan beside the build log with no sequential scan on any hot path before the next slice starts.
* **AC-11**: No new index and no new rewrite touches a paper or exam table or column. Pre existing leftover names in the schema (Feedback attempt and mock columns, the EXAM feedback type, settings comments) are ignored by this rule and removed in a later deletion pass.

## Options considered

### Option 1: Targeted indexes plus bounded rewrites in place

Add the missing composite indexes and rewrite each slow query where it lives, surface by surface, with stored counters only where a per view count exists today.

**Pros**:
* Smallest change that fixes the measured pain, with each slice independently shippable.
* No new infrastructure to run at 2am.

**Cons**:
* Leaves live aggregates in place where a nightly rollup would be cheaper at very large scale.
* Needs discipline on later slices so new queries follow the same rules.

### Option 2: Materialise everything now

Build snapshot tables for leaderboards, cohorts, and all counts up front, served by a scheduler, before fixing the live queries.

**Pros**:
* Reads become trivial lookups even at huge scale.

**Cons**:
* Adds write paths, schedulers, and staleness questions before the proven pain needs them.
* More code to operate for a team that has not yet outgrown live aggregates with right indexes.

### Option 3: New search and counting services

Move text search to a dedicated search service and counts to a counting layer outside Postgres.

**Pros**:
* Best ceiling for community scale search.

**Cons**:
* New vendors, new bills, new failure modes, for tables far below the size that needs them.
* Postgres trigram and text search vectors already answer the current need.

## Decision

**Chosen option**: Option 1: Targeted indexes plus bounded rewrites in place

This fits the measured problem. The pain is missing indexes plus a handful of rewrite patterns, not a database at its limit. Boring Postgres features plus small query edits carry this scale with ease.

## Rationale

The scan of the live code shows the same few shapes repeating: a filter plus sort with no composite index, a count recomputed per view, a loop holding a query, a sequential read that parallel reads would fix. One pattern applied per surface clears all of them without asking the team to run anything new. Snapshots and services stay as later options if growth ever demands them, and the stored counters in this spec are the natural seed for those rollups.

## Feature design

**Data model sketch**:

Stored tables stay as they are, with these additions. Prisma B tree indexes use model field names. Partial and trigram indexes live in the raw SQL script only, since the schema language cannot express them.

* User: add `@@index([role, createdAt])` and `@@index([referredBy])`; add `notesCount Int @default(0)` and `quizzesCount Int @default(0)`.
* UserStats: keep `@@index([totalPoints])` for the sort and the rank range count.
* Quiz: add `@@index([userId, createdAt])` and `@@index([noteId])`.
* QuizAttempt: add `@@index([userId, completedAt])`; keep `@@index([quizId])`. Quiz totals change only through one atomic increment of total points plus quizzes taken in the same transaction as the attempt insert; average score and streaks recompute on read.
* ChatMessage: add `@@index([conversationId, createdAt])` and `@@index([userId, role, createdAt])`.
* Notification: add `@@index([userId, createdAt])`; partial unread index in SQL only.
* CreditTransaction: add `@@index([userId, createdAt])`.
* KpiEvent: add `@@index([userId, createdAt])` and `@@index([event, createdAt])`.
* DailyMetric: add `@@index([metric, date])` only after a plan check proves the existing unique of date plus metric cannot serve the read; the unique may already suffice.
* EngagementLog: add `@@index([campaign, sentAt])`.
* Subscription: add `@@index([status, createdAt])` for admin status reads plus the MRR grouped aggregate.
* AffiliateClick: add `@@index([affiliateCode, converted])`.
* Post: add `@@index([isPinned, createdAt])` and `@@index([subject, createdAt])`; add `likeCount Int @default(0)` and `commentCount Int @default(0)`. Counter writes run at app level in the like and comment paths with decrements on unlike and delete, back filled in batches of 500 with pauses plus a verify count query, and a drift check query ships with the slice.
* Comment: add `@@index([postId, createdAt])` and `@@index([parentId, createdAt])`.
* Note: add stored `search_tsv` column plus trigram GIN in SQL only; B tree coverage already exists. The vector expression is title plus summary plus extracted text with the simple config, refreshed on note write; if the trigram privilege is missing on the host, ship B tree only and defer GIN.
* Readiness: rewrite against the live tables only (Topic, TopicPerformance, TopicNote, Note) as one flat capped query per user; the program and baseline tables named in older research no longer exist.
* Cleanup in the same script after verify: drop redundant `Affiliate @@index([code])` (unique already covers it), drop duplicated `AdminInvite @@index([email])` and `@@index([token])` (uniques cover them).

**State transitions**: Omit. No state machine changes.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/leaderboard | GET | page, limit | rows, rank | session | 401 |
| /api/usage | GET | none (session user) | counts, limits | session | 401 |
| /api/quizzes/attempts | POST | answers | score, totals | session | 401, 422 |
| /api/admin/stats | GET | none | dashboard totals | admin | 401, 403 |
| /api/admin/metrics | GET | tab, range | metric rows | admin | 401, 403 |
| /api/admin/users | GET | page, limit, sortBy, sortOrder | rows, total | admin | 401, 403, 422 on bad sort |
| /api/community/posts | GET | page, subject | rows with stored totals | session | 401 |
| /api/search | GET | q | notes, quizzes, posts | session | 401, 422 on empty q |
| /api/stats | GET | none | personal totals | session | 401 |
| /api/performance | GET | capped take | weakest areas | session | 401 |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Leaderboard page | ordered rows | UserStats ordered by totalPoints desc through its index, admin rows excluded by a users role check |
| Leaderboard page | my rank | range count of totals above mine on the same index |
| Usage read | note and quiz totals | stored User counters, updated on write |
| Usage read | profile id | subscription read that already loads the user row |
| Quiz submit | new total | atomic increment of UserStats in one statement |
| Admin metrics | daily and monthly active users | COUNT DISTINCT over user id in KpiEvent for the window |
| Admin metrics | MRR | grouped sum of amount over subscriptions with status ACTIVE by plan |
| Admin metrics | cohort chart | stored DailyMetric rows keyed by cohort plus week plus offset naming |
| Admin users | affiliate per row | single left join of User referred by to Affiliate code |
| Admin users | sorted rows | allow listed column (creation date, name, credits, email), default creation date desc |
| Community list | like and comment totals | stored Post totals, updated on like and comment writes |
| Search | matching notes | stored search column (title plus summary plus extracted text) with GIN index |
| Search | matching titles | trigram GIN indexes on note title, quiz title, post content |
| Readiness | weakest areas | one flat join over live topic tables for the user, capped take |

**Key invariants**:
* Every list read carries a limit, and every list with pages caps page size.
* No query runs inside a loop on any request path.
* Totals shown per view come from stored counters or grouped aggregates, never from a full scan count in application memory.
* Quiz totals change only through the atomic increment in the same transaction as the attempt insert.
* Admin sort columns come only from the allow list (creation date, name, credits, email); absent means creation date desc, invalid means 422.
* New paper and exam names appear nowhere in the index script or the rewrites; old leftover names are out of scope here.

**Security model**:
* Session checks stay as they are on every route. Admin routes keep the admin role check.
* The sort allow list closes a scan vector on the admin users table.
* No new personal data is collected. Counters store totals only.

**Configuration required**:
* No new env vars. The SQL script needs the `pg_trgm` extension privilege and the right to run concurrent index builds outside a transaction.

**Critical test scenarios**:
* Happy path: leaderboard page returns 20 rows plus my rank with two indexed reads, verifies **AC-1**.
* Happy path: usage loads with parallel reads and stored counters, verifies **AC-2**.
* Happy path: admin metrics answers from database aggregates plus stored cohort rows, verifies **AC-3**.
* Failure case: two quiz submits at once both add points with none lost, verifies **AC-7**.
* Auth and permission: non admin sorted users request with a bad sort column gets 422, verifies **AC-4**.
* Failure case: search with an empty query gets 422 without touching the database, verifies **AC-6** and **AC-9**.
* Failure case: any slice without a before and after plan check does not start the next slice, verifies **AC-10**.

## Build plan

Ordered by Tracer Bullet (a thin end to end thread first, then thickening). The first slice proves the full pattern on one surface. Later slices repeat it.

1. Build the migration harness and capture baselines, satisfies **AC-10**. Diff the live database against the schema, write the concurrent index script, record a query plan for each hot route before changing it. You may skip this only if the diff shows zero drift.
2. Slice one end to end on the leaderboard, satisfies **AC-1**, **AC-10**. Add the UserStats and users role indexes concurrently, order by total points desc plus user id asc, rewrite rank as a range count of strictly greater rows, store before and after plans beside the build log.
3. Rewrite usage reads, satisfies **AC-2**, **AC-8**, **AC-9**. Batch the reads in parallel with the profile id join, fix the all users count scope, add the per user indexes for notes, quizzes, chat messages, notifications, and credit transactions.
4. Fix the quiz submit race, satisfies **AC-7**, **AC-8**. Switch to the atomic increment, add the QuizAttempt composites, cap answer reads.
5. Rewrite admin metrics, satisfies **AC-3**, **AC-8**, **AC-9**. Replace in memory grouping with COUNT DISTINCT and grouped MRR, serve cohorts from stored rows, add the KpiEvent, DailyMetric, EngagementLog, and Subscription indexes.
6. Rewrite admin users, satisfies **AC-4**, **AC-9**. Replace the per row affiliate lookup with one join, add the allow list sort with the creation date default, add the referred by index.
7. Rewrite community lists, satisfies **AC-5**, **AC-8**. Add stored like and comment totals with app level writes plus unlike and delete decrements on the like and comment paths, back fill existing rows in batches of 500 with pauses plus a verify query, add the post and comment indexes.
8. Rewrite search, satisfies **AC-6**, **AC-9**. Enable the trigram extension (fall back to B tree only when the host denies it), add the GIN indexes and the stored notes search column with its index, cap and scope every search read.
9. Finish remaining reads, satisfies **AC-8**, **AC-9**, **AC-11**. Single flat readiness query over live topic tables with capped take, bounded conversation delete path, verify no new paper or exam name appears in the script or the edits.
10. Final proof pass, satisfies **AC-9**, **AC-10**. Run every before and after plan again, audit for unbounded reads and loop queries, drop the redundant duplicate indexes after verify.

## Consequences

**Positive**:
* Hot screens answer from indexes and stored totals instead of live scans.
* Concurrent quiz submits stop losing points.
* Each slice proves itself with a plan check, so regressions show early.

**Negative / tradeoffs**:
* Stored counters add write work on note, quiz, like, and comment paths, and need a back fill for existing rows.
* Concurrent index builds need care on a live database and cannot run inside the normal migration transaction.
* The cohort chart reads stored rows, so it lags the live events by up to a day.

**Neutral**:
* Prisma schema records the B tree target while the live apply uses the raw SQL script; fresh environments converge through the schema, live stays safe through the script.
* Full rollups and caches stay with their own later plan items; this spec seeds them but does not build them.

## Migration plan

**Strategy**: strangler
**Phases**:
1. Add all indexes concurrently and add counter columns as nullable with default zero, with old reads still live.
2. Dual write counters on create and delete paths, back fill existing rows in small batches, cut reads over to stored totals one surface at a time with plan checks.
3. Drop the redundant duplicate indexes after verify, and remove the old live count paths.
**Rollback**: drop any new index concurrently, flip reads back to the prior query in one revert per slice. Counter columns stay harmless at zero if unused.
**Risks**: drift between the schema and the live database changes column names; the diff in task one catches it. Concurrent builds still take a light lock at start and finish, so run them off peak. Back fills can bloat writes, so batch them small with pauses. Counter drift, like race double counts, vector staleness on note edits, and heavy distinct counts on huge event tables each get a named check in their slice; offset paging decay stays a known limit with keyset paging as a later option.

## Follow up

* [ ] Caching and background job moves stay with their own plan items; this spec only seeds them with counters and stored rows.
* [ ] Leftover paper and exam fields (Feedback attempt and mock columns, the EXAM feedback type, paper comments in settings) want a deletion pass, since the wipe deleted their tables but not these references.
* [ ] The stored notes search column wants a schema level model entry so fresh environments get it without the raw SQL script.
* [ ] Regenerate the Prisma client after the schema edits so imports keep resolving.
