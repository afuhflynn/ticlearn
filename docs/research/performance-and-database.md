# Performance and Database Audit — TiCLearn

**Prepared:** 2026-10-12
**Scope:** database index/query audit, background-job extraction, caching architecture, performance budget, client payload discipline, and a prioritised change list.
**Audience constraint that drives every recommendation:** Cameroonian university students on low-end Android over expensive, congested mobile data (~1.63 USD/GB, 2–5 USD/month). Speed is a product requirement, not a nice-to-have.
**Method:** every claim about current behaviour was read out of the repository at the cited `file:line`. Framework/provider claims are cited to primary docs (Next.js, Prisma, Neon, web.dev, Inngest, Lighthouse). Anything I could not verify from the repo is labelled **[unverified]**. No application code was modified.

---

## 0. Findings that change the engineering plan

1. **Two routes leak the Paper 3 answer key to the browser before the exam starts.** `app/api/paper3/mocks/[mockId]/route.ts:58-63` includes `question: true` (full row) and `:85` returns the whole mock, so `expectedAnswer`, `markingBreakdown`, `explanation` and `sourceContentMarkdown` are serialised to the client on every exam load. This is simultaneously a payload problem (tens–hundreds of KB on a metered connection) and an anti-cheat hole.
2. **The chat pre-stream critical path is ~10 serialised round trips before `streamText` is called** (`app/api/ai/chat/route.ts:110-273`), plus a *blocking* `generateText` title call on the first message of a conversation (`:32-51`, called at `:240`). This is the single largest contributor to time-to-first-token.
3. **`app/api/paper3/stats/route.ts:54-79` contains a true N+1**: an `await prisma.paper3Attempt.findFirst(...)` inside a nested `for` loop over questions × concepts, on a `GET`, followed by a write (`:96`). A student with 200 practice attempts can issue hundreds of queries on a page render.
4. **`app/api/quizzes/attempts/route.ts:41-84` calls the AI once per wrong/open question inside the submit request** (`gradeOpenAnswer` `:49`, `explainMCQAnswer` `:63`), each with a 10 s timeout (`lib/ai/orchestrator.ts:8`). A 10-question quiz can hold the request open for minutes on a Vercel function.
5. **shiki is bundled into the chat page.** `components/ai-elements/code-block.tsx:16` imports from the `shiki` root entry; `code-block` is imported by `tool.tsx:21`, which is imported by `components/chat/chat-message-list.tsx:43`. The shiki root entry carries the full language/theme registry. This is the biggest single client-side payload on the most-used route.
6. **There is effectively no caching.** `next.config.ts` does not set `cacheComponents`; the only cached surfaces are two public routes (`app/api/public/gce-blueprints/route.ts:5,58` and `app/api/public/p1p2-mock-modules/route.ts:5,57`). Every authenticated route is dynamic per request.
7. **`lib/ai/cache.ts:10` is a bare `Map`** with no eviction bound — per-instance, per-deploy, and it grows without limit on long-lived instances.
8. **The admin metrics screen recomputes everything from raw event tables on every request**, including `groupBy: ["userId"]` over 30 days of `kpi_events` (`app/api/admin/metrics/route.ts:56-65, 102-105`) and cohort retention which can issue up to 60 `groupBy` queries per request (`lib/kpi.ts:227-233`, up to 12 cohorts × 5 week-offsets).
9. **Connection config is unsafe for serverless.** `lib/prisma.ts:5-7` constructs `PrismaPg` with no pool options, so it inherits the Prisma 7 / `pg` defaults: `max = 10`, `connectionTimeoutMillis = 0`, `idleTimeoutMillis = 10s` (Prisma docs, cited in §3.4). A handful of concurrent warm lambdas can exhaust a small Postgres.
10. **Leaderboard rank is computed with a `COUNT(*)` per request** in all four leaderboard routes, on top of a `COUNT(*)` for pagination. That is 2–4 aggregate scans per page view.

---

## 1. Index and query audit

### 1.1 Database host — what is actually configured

| Fact | Evidence | Status |
| --- | --- | --- |
| Datasource is Postgres, and **no URL lives in the schema** — Prisma 7 config file supplies it | `prisma/schema.prisma:9-11` (only `provider = "postgresql"`), `prisma.config.ts:11-13` (`url: process.env["DATABASE_URL"]`) | verified |
| The runtime client uses the **`pg` driver adapter** | `lib/prisma.ts:1,5-7` (`new PrismaPg({ connectionString: process.env.DATABASE_URL })`) | verified |
| Local `DATABASE_URL` points at Docker Postgres on `localhost:5435` | `.env` (redacted) | verified |
| Neon is only a *commented example* | `.env.example:7` (`# DATABASE_URL="postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require"`) | verified |
| `pgbouncer` / `-pooler` / `DIRECT_URL` appear nowhere in the repo | grep across `lib app prisma scripts providers` | verified |
| Production DB host, whether Neon, and whether a pooled string is used | — | **[unverified]** — only confirmable from the Vercel project env. Must be checked before applying §3.4. |

Note that Prisma's `db push` is the documented workflow (`package.json` `"db:push": "prisma db push"`, and `AGENTS.md` records that migrations were skipped), so **the production schema may have drifted from `schema.prisma`**. Every DDL block below must be diffed against the live database (`psql \d+ <table>`, or `prisma migrate diff`) before applying. Column names in the DDL follow the `@@map` rules in the schema; fields without `@@map` keep Prisma's camelCase column names (e.g. `totalPoints`, `createdAt`, `isRead`, `timeTaken`), and I have written the DDL to match that.

### 1.2 Every model and its indexes (from `prisma/schema.prisma`)

61 models. Indexes as declared, plus the FK columns that Postgres does **not** auto-index.

| Model (`@@map`) | Declared indexes | Notable gaps |
| --- | --- | --- |
| `users` | PK, `email @unique`, `active_profile_id @unique` | No index on `role`, `createdAt`, `referredBy` |
| `session` | PK, `token @unique`, `(userId)` | ok |
| `account` | PK, `(userId)` | no index on `(accountId, providerId)` (better-auth lookups) |
| `verification` | PK, `(identifier)` | ok |
| `exam_levels` | PK, `code @unique` | ok (tiny table) |
| `programs` | PK, `code @unique`, `(examLevelId)` | ok |
| `components` | PK, `(programId, code) @unique`, `(programId)` | ok |
| `topics` | PK, `(componentId, name) @unique`, `(componentId)` | ok |
| `user_topic_baselines` | PK, `(examProfileId, topicId) @unique`, `(examProfileId)` | **`topic_id` unindexed** (FK) |
| `topic_performances` | PK, `(examProfileId, topicId) @unique`, `(examProfileId)` | No `(exam_profile_id, mastery_score)` — readiness sorts by mastery |
| `knowledge_chunks` | PK, `(topicId)`, `(sourceType)` | No GIN on `content`; `topic.name contains` scans |
| `exam_sources` | PK, `(componentId, year) @unique`, `(componentId)` | ok |
| `questions` | PK, `(componentId)`, `(examSourceId)`, `(topicId)` | Mock generation filters `(componentId, type)` — no composite |
| `exam_blueprints` | PK, `(componentId, name) @unique`, `(componentId)`, `(visibleForStudents)`, `(visibleInCommunity)` | No `(visibleForStudents, updatedAt desc)` for the cached catalog route |
| `blueprint_sections` | PK, `(blueprintId)` | ok |
| `mock_attempts` | PK, `(examProfileId)`, `(componentId)`, `(blueprintId)`, `(creationContext)` | No `(exam_profile_id, started_at desc)` |
| `paper12_mock_modules` | PK, `(visibleToStudents)` | ok |
| `paper12_mock_module_items` | PK, `(moduleId, blueprintId) @unique`, `(moduleId)`, `(blueprintId)` | ok |
| `exam_profile_programs` | PK, `(examProfileId, programId) @unique`, `(examProfileId)` | **`program_id` unindexed** |
| `exam_profiles` | PK, `(userId)` | ok |
| `notes` | PK, `(userId)`, `(status)` | No `(user_id, createdAt desc)`; no text search index |
| `quizzes` | PK, `(userId)`, `(isPublic)`, `(status)` | **`note_id` unindexed**; no `(user_id, createdAt desc)` |
| `quiz_questions` | PK, `(quizId)` | ok |
| `quiz_attempts` | PK, `(userId)`, `(examProfileId)`, `(quizId)`, `(completedAt)` | No `(exam_profile_id, completedAt desc)` |
| `quiz_attempt_answers` | PK, `(attemptId)`, `(questionId)` | ok |
| `exam_sessions` | PK, `(userId)`, `(examProfileId)`, `(status)` | ok |
| `user_stats` | PK, `userId @unique`, `(examProfileId)`, `(totalPoints)` | Leaderboard is `(exam_profile_id not null) + totalPoints desc` → needs composite |
| `subscriptions` | PK, `userId @unique`, `(status)`, `fapshiTransId @unique` | No `(status, createdAt desc)`; MRR query is unfiltered aggregation |
| `ratings` | PK, `(userId)` | ok |
| `feedbacks` | PK, `(userId)`, `(status)`, `(type)`, `(attemptId)`, `(conversationId)` | ok |
| `affiliates` | PK, `userId @unique`, `code @unique`, `(code)`, `(status)` | `code` indexed twice (unique + plain) |
| `affiliate_clicks` | PK, `(affiliateCode)` | no `(affiliateCode, converted)` |
| `affiliate_earnings` | PK, `(affiliateCode)`, `(status)` | ok |
| `posts` | PK, `(userId)`, `(createdAt)` | **No `(isPinned, createdAt desc)`**; no `(subject, createdAt desc)`; no text search |
| `comments` | PK, `(postId)`, `(userId)` | **No `(post_id, parent_id, created_at)`**; `parent_id` unindexed |
| `post_likes` | PK, `(postId, userId) @unique` | ok |
| `notifications` | PK, `(userId)`, `(isRead)` | **No `(user_id, createdAt desc)`** and no partial unread index |
| `user_settings` | PK, `userId @unique` | ok |
| `admin_invites` | PK, `email @unique`, `token @unique`, `(email)`, `(token)` | duplicates of uniques |
| `kpi_events` | PK, `(userId)`, `(event)`, `(createdAt)` | **No `(event, createdAt)`**, no `(user_id, createdAt)` |
| `daily_metrics` | PK, `(date, metric) @unique`, `(date)` | **No `(metric, date)`** |
| `revision_guides` | PK, `(published)`, `(createdById)` | ok |
| `paper3_sources` | PK, `(year, subject)`, `(componentId)`, `(status)` | ok |
| `paper3_questions` | PK, `(sourceId)`, `(componentId)`, `(section, taskType)`, `(status)` | **No GIN on `concepts`**; no `(status, taskType)` composite; `component_id` covered |
| `paper3_mocks` | PK, `(subject, status)`, `(moduleId)` | No catalog partial index |
| `paper3_mock_modules` | PK, `(status)` | ok |
| `paper3_mock_questions` | PK, `(mockId, questionId) @unique` | **`mock_id` prefix covered**, but `order` fetch has no `(mock_id, order)` |
| `paper3_mock_attempts` | PK, `(userId)`, `(examProfileId)`, `(mockId)`, `shareId @unique` | **No `(mock_id, status, score desc, time_taken asc)`** (leaderboard), no `(user_id, started_at desc)` |
| `paper3_user_stats` | PK, `userId @unique`, `(examProfileId)` | **No `(exam_profile_id, totalPoints desc, avgScore desc)`** |
| `paper3_question_attempts` | PK, `(questionId, score)`, `(questionId, userId)`, `(examProfileId)` | `attempt_id` unindexed; leaderboard tiebreakers missing |
| `paper3_detailed_results` | PK, `(attemptId)`, `(questionId)` | ok |
| `paper3_attempts` | PK, `(userId)`, `(examProfileId)`, `(questionId)` | no `(exam_profile_id, createdAt)` |
| `credit_transactions` | PK, `(userId)`, `(createdAt)` | ok (balance is denormalised on `users.credits`) |
| `credit_purchase_orders` | PK, `(userId)`, `fapshiTransId @unique` | ok |
| `referral_bonuses` | PK, `(referrerId, refereeId) @unique`, `(referrerId)`, `(refereeId)` | ok |
| `engagement_log` | PK, `(userId, campaign) @unique`, `(campaign)` | **No `(campaign, sent_at)`** |

### 1.3 Route-by-route query audit

Legend: **[10k/100k/1M]** = how the query behaves as the table grows. `EXPLAIN (ANALYZE, BUFFERS)` before/after is the verification step for every one of these.

#### Leaderboards (the most-read student surface)

**`app/api/leaderboard/route.ts:24-60`** — three aggregate queries per request:
- `:25-38` `userStats.findMany({ orderBy: totalPoints desc, skip, take, where: examProfileId not null AND user.role != ADMIN })`.
- `:39-44` `userStats.count(same predicate)` for pagination.
- `:47-60` a nested `await` inside the `count` argument (`findFirst` for the user's points, then `count` where `totalPoints > n`).

Scaling: `orderBy totalPoints DESC` with a `skip` uses the existing `(totalPoints)` index for a backward index scan and stops after `limit` rows — fine at 10k, acceptable at 100k, and at 1M it is a 1M-entry index scan per page plus a 1M-row aggregate for the count. The `skip` also degrades linearly: page 200 reads 4,000 index tuples before returning 20. The `role != ADMIN` predicate forces a join to `users` for every candidate row because it is on the related table, so the planner cannot use a pure index scan of `user_stats`.

Missing: a partial composite index that encodes the filter and the sort, and a cheaper rank.

```sql
-- Leaderboard (quiz) : encodes "has a profile", "is a student", and the sort
CREATE INDEX CONCURRENTLY user_stats_leaderboard_idx
  ON user_stats (exam_profile_id, "totalPoints" DESC);
CREATE INDEX CONCURRENTLY users_role_idx ON users (role, "createdAt" DESC);

-- Rank query (totalPoints > mine) uses the same index for a range count
```

If you want the rank to be O(1), denormalise it instead of counting on read: add `rank_cache_id` (a monotonically increasing integer assigned by the nightly job) plus a cached `rank` column, refreshed by a cron (see §2.4). The rank then becomes `index scan` by primary key.

**`app/api/paper3/leaderboard/[mockId]/route.ts:103-150`** — `paper3MockAttempt.findMany` filtered by `(mockId, status=COMPLETED)` ordered by `(score desc, timeTaken asc)`, plus `count` for pagination, plus `findFirst` for the user's best attempt, plus a second `count` for rank. The declared indexes on that table are `(userId)`, `(examProfileId)`, `(mockId)`, `shareId` — none of which contain `status` or the sort keys. At 100k attempts on one mock this is a filter over the whole `mock_id` slice on every page view; at 1M it is worse.

```sql
CREATE INDEX CONCURRENTLY paper3_mock_attempts_lb_idx
  ON paper3_mock_attempts (mock_id, score DESC, "timeTaken" ASC)
  WHERE status = 'COMPLETED';
```

**`app/api/paper3/leaderboard/global/route.ts:23-56, 59-67, 92-105`** — hand-written `DISTINCT ON (user_id)` subqueries over `paper3_user_stats`, plus a full dedupe `COUNT(*)` for pagination, plus a third dedupe count for rank. Every one of them scans `paper3_user_stats` for every page view. Two problems: (a) no index supports `ORDER BY total_points DESC` on the deduped set; (b) pagination uses `OFFSET`.

Also note: this route duplicates the global-leaderboard logic that also exists inline in `[mockId]/route.ts:39-101`. Pick one.

```sql
CREATE INDEX CONCURRENTLY paper3_user_stats_lb_idx
  ON paper3_user_stats (exam_profile_id, "totalPoints" DESC, "avgScore" DESC)
  WHERE exam_profile_id IS NOT NULL;
```

Better still: **materialise the global board into a `leaderboard_snapshot` table** written by a cron (§2.4) and read with a 20-row index scan. A leaderboard is read far more often than it changes.

**`app/api/paper3/leaderboard/question/[questionId]/route.ts:39-95`** — orders by `(score desc, marksEarned desc, createdAt asc)`; the table has `(questionId, score)` and `(questionId, userId)`, so the tiebreaker columns force a sort of the entire per-question slice.

```sql
CREATE INDEX CONCURRENTLY paper3_question_attempts_lb_idx
  ON paper3_question_attempts (question_id, score DESC, "marksEarned" DESC, "createdAt" ASC);
CREATE INDEX CONCURRENTLY paper3_question_attempts_attempt_idx
  ON paper3_question_attempts (attempt_id);
```

#### Admin metrics / KPI (the heaviest reads in the app)

**`app/api/admin/metrics/route.ts:41-67`** — five queries in parallel, of which:
- `:56-65` `kpiEvent.groupBy({ by: ["userId"], where: today })` — this **materialises one row per distinct active user into the function's heap** just to read `.length`.
- `:102-105` the same over 30 days for MAU. With 100k users this is 100k rows × 30 days of event history, transferred and deserialised per request.
- `:44` `subscription.count({ status: ACTIVE, user.role: USER })` and `:43` `user.count({ role: USER })` — no index on `users.role`.

Rewrite as `COUNT(DISTINCT ...)` in Postgres, never in JS:

```sql
-- DAU / MAU: one index-only-ish aggregate instead of a full groupBy materialisation
CREATE INDEX CONCURRENTLY kpi_events_user_created_idx
  ON kpi_events (user_id, "createdAt" DESC);
CREATE INDEX CONCURRENTLY kpi_events_event_created_idx
  ON kpi_events (event, "createdAt" DESC);
```
```ts
const dau = await prisma.$queryRaw<[{ n: bigint }]>`
  SELECT count(DISTINCT user_id)::bigint AS n
  FROM kpi_events
  WHERE "createdAt" >= ${since} AND "createdAt" <= ${now}
`;
```

**`lib/kpi.ts:330-344` `computeMRR()`** — `subscription.findMany` of *every* active subscription, then `reduce` in JS, called on **every** `/api/admin/metrics` request (`:66`). Replace with a `groupBy`/`aggregate` and, better, a stored rollup:

```sql
CREATE INDEX CONCURRENTLY subscriptions_active_idx
  ON subscriptions ("createdAt" DESC) WHERE status = 'ACTIVE';
```

```ts
const byPlan = await prisma.subscription.groupBy({
  by: ["plan"],
  where: { status: "ACTIVE" },
  _sum: { amount: true },
  _count: true,
});
```

**`lib/kpi.ts:171-250` `computeCohortRetention()`** — fetches the 5,000 most recent users (`:173-178`), a `groupBy` over *all* their events (`:180-186`), then loops cohorts × 5 week-offsets issuing one `groupBy` each (`:227-233`). Worst case ≈ 1 + 1 + 12×5 = **62 aggregate queries per HTTP request**, each grouping by `userId` over `kpi_events`. At 100k users this is the slowest route in the app by a wide margin. It is served both from `app/api/admin/metrics/route.ts:256` and `app/api/admin/metrics/retention/route.ts:17`.

Fix: one SQL statement (`date_trunc('week', users.created_at)` bucket × `date_trunc('week', kpi_events.created_at)` bucket), or — much better — precompute nightly into `daily_metrics` rows keyed by cohort week and offset week, and serve the chart from those rows. The existing `daily_metrics` table already exists for exactly this purpose (`lib/kpi.ts:150-156`).

**`lib/kpi.ts:112-131`** — silent-churn counts use two correlated subqueries per row over `users` × `kpi_events`. Same answer: compute once, nightly, into `daily_metrics`.

**`lib/kpi.ts:63-66` and `:305-308`** — `groupBy: ["userId"]` again, used to count active users; same `COUNT(DISTINCT user_id)` rewrite applies.

**`lib/kpi.ts:150-156`** — 14 sequential `upsert`s (one per metric) inside `computeDailyMetrics`. Replace with a single transaction + `createMany({ skipDuplicates: true })`, or one `INSERT … ON CONFLICT (date, metric) DO UPDATE` statement. This runs twice a day (`lib/inngest/metrics-functions.ts:8`) and is also reachable synchronously from `app/api/admin/metrics/route.ts:284` (the `PUT` handler) — an admin button that runs a 60-query job in-request.

**`lib/kpi.ts:314-317` `computeSubjectDistribution()`** — pulls every active user's program rows into memory and counts in JS. Replace with a join + `groupBy`.

#### Usage / limits (called on nearly every page)

**`app/api/usage/route.ts:34-106`** — **eight sequential awaits** before the response: subscription lookup ×2 (`:34`, `:39`), `note.count` (`:44`), `quiz.count` (`:48`), `chatMessage.count` over today's window (`:60`), `paper3MockAttempt.count` ×2 (`:76`, `:83`), a `user.findUnique` only to read `activeProfileId` (`:88-91`), `mockAttempt.count` (`:93`), `question.count` (`:101`). Several of them are not parallelised, so the request pays 8× round-trip latency. Two of them are semantically wrong at scale: `prisma.question.count({ where: { sourceType: "USER_UPLOADED", createdAt: gte today } })` (`:101-106`) counts **all users'** questions for today and is attributed to the current user's AI-solve quota; and `note.count`/`quiz.count` are unbounded counters recomputed on every request rather than stored.

Fixes:
1. `Promise.all` the independent reads, and fetch `activeProfileId` in the same query as the subscription.
2. Replace the three per-user counts with denormalised counters on `users` (`notes_count`, `quizzes_count`, updated on write). `users.credits` already works this way (`lib/credits.ts:40`).
3. Fix or delete the `question.count` at `:101`.
4. **Cache the whole response** per user for 60 s — the payload only changes when the user acts. It is already client-cached for 2 minutes (`hooks/useUsage.ts:79`).

```sql
CREATE INDEX CONCURRENTLY paper3_mock_attempts_user_started_idx
  ON paper3_mock_attempts (user_id, "startedAt" DESC);
CREATE INDEX CONCURRENTLY notes_user_created_idx ON notes (user_id, "createdAt" DESC);
CREATE INDEX CONCURRENTLY quizzes_user_created_idx ON quizzes (user_id, "createdAt" DESC);
```

#### Chat messages

**`app/api/chat/conversations/[id]/route.ts:124-131`** — `chatMessage.findMany({ where: { conversationId: id }, select: { parts } })` with **no `take`** inside the `DELETE` handler, used to collect UploadThing keys. A 500-message conversation drags 500 JSON `parts` blobs (each possibly containing base64 attachment metadata) into memory. Fix: store file keys in a `chat_attachments` table (or a `fileKeys String[]` column on the conversation) and delete from that.

Every other message read is unpaginated or only loosely indexed:

```sql
CREATE INDEX CONCURRENTLY chat_messages_conv_created_idx
  ON chat_messages (conversation_id, "createdAt" DESC);
CREATE INDEX CONCURRENTLY chat_messages_usage_idx
  ON chat_messages (user_id, role, "createdAt" DESC);
```

The second index serves the daily-quota count in `app/api/ai/chat/route.ts:158-167` and in `app/api/usage/route.ts:60-69`. Without it those counts scan every message the user has ever sent.

#### Notes search and the chat `searchNotes` tool

**`app/api/search/route.ts:35-97`** — three `contains` queries (Prisma emits `ILIKE '%q%'`), so no B-tree index can ever be used. Two problems beyond the missing index:
- The post search (`:78-87`) searches **all posts on the platform** with `ILIKE` on `content`, unscoped and unpaginated beyond `take: 10`.
- `note.title`/`subject` search is scoped by `userId` (`:37`), so it is "small", but the index is still needed for the ILIKE path.

**`lib/ai/tools.ts:144-156`** — the `searchNotes` chat tool runs `contains, mode: "insensitive"` against **`extractedText`**, an unbounded `@db.Text` column holding the full text of the student's uploaded PDF (`:144-151`). This is a sequential scan of every note belonging to that user, executed *inside a tool call during a chat turn*. At 1M notes this is the worst query in the codebase. It also breaks time-to-first-token, because tool execution happens before the next model chunk.

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Title/subject search (small, cheap to maintain)
CREATE INDEX CONCURRENTLY notes_title_trgm_idx  ON notes USING GIN (title gin_trgm_ops);
CREATE INDEX CONCURRENTLY notes_subject_trgm_idx ON notes USING GIN (subject gin_trgm_ops);
CREATE INDEX CONCURRENTLY quizzes_title_trgm_idx ON quizzes USING GIN (title gin_trgm_ops);

-- Body search. Prefer tsvector over trigram on a @db.Text column: the trigram
-- index on extracted_text is large and expensive to maintain on every write.
ALTER TABLE notes ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title,'') || ' ' || coalesce(subject,'') || ' ' ||
      coalesce(summary,'') || ' ' || coalesce(extracted_text,''))
  ) STORED;
CREATE INDEX CONCURRENTLY notes_search_tsv_idx ON notes USING GIN (search_tsv);

-- Community
CREATE INDEX CONCURRENTLY posts_feed_idx ON posts ("isPinned" DESC, "createdAt" DESC);
CREATE INDEX CONCURRENTLY posts_subject_idx ON posts (subject, "createdAt" DESC);
CREATE INDEX CONCURRENTLY posts_content_trgm_idx ON posts USING GIN (content gin_trgm_ops);
CREATE INDEX CONCURRENTLY comments_post_parent_idx
  ON comments (post_id, "createdAt" ASC) WHERE parent_id IS NULL;
CREATE INDEX CONCURRENTLY comments_parent_idx ON comments (parent_id, "createdAt" ASC);
```

If `posts` grows past a few hundred thousand rows, stop substring-matching community content in Postgres and put it in a dedicated search surface; a `LIKE '%x%'` scan over a community table is the classic way to take Postgres down.

#### Community posts

**`app/api/community/posts/route.ts:24-44`** — `findMany` with `include: { user, _count: { comments, likes }, likes: { where: { userId } } }`. That is 3 correlated subqueries per row × 20 rows = 60 extra round trips inside one statement, plus a separate `count`. The `_count` shape is the expensive part: it cannot use the unique `(postId, userId)` index on `post_likes` for a count per group efficiently. Denormalise `like_count`/`comment_count` onto `posts` and update on write (there is already a like toggle route at `app/api/community/posts/[id]/like/route.ts` and a comment create route, so both are single write points).

#### Progress / readiness

**`lib/readiness.ts:15-123`** — three parallel queries (`:18-35`), then a **loop over programs issuing one `userTopicBaseline.findMany` per program** (`:64-70`), each filtering through a join on `topic.component.programId`. With a 4-program profile that is 3 + 4 = 7 queries, and it runs on `/api/readiness` (`:17`), on `/api/onboarding/readiness`, and **on every single chat message** (`app/api/ai/chat/route.ts:278`).

Rewrite as one query: join `exam_profile_programs → user_topic_baselines → topics` and left-join `topic_performances`, returning a single flat set of `(program, topic, baseline, performance)` rows; do the three-pillar arithmetic in JS over ~50–200 rows. Add:

```sql
CREATE INDEX CONCURRENTLY topic_performances_profile_mastery_idx
  ON topic_performances (exam_profile_id, mastery_score ASC);
CREATE INDEX CONCURRENTLY user_topic_baselines_topic_idx
  ON user_topic_baselines (topic_id);
```

Then **cache the readiness result per profile for 5 minutes** and invalidate on `POST /api/performance` (`app/api/performance/route.ts:30`).

**`app/api/performance/route.ts:87-95`** — `topicPerformance.findMany` for a profile with **no `take`**, ordered by `masteryScore asc`. Bounded by topic count today, but it will grow with HND course catalogues; cap it (`take: 200`) and keep the composite index above.

**`app/api/performance/route.ts:55-61`** — the clamp does a second `update` round trip when out of range. Fold the clamp into the `upsert` by clamping in the application expression, or accept the drift and clamp on read.

#### Quiz attempts (the submit path)

**`app/api/quizzes/attempts/route.ts:41-84`** — the loop. Beyond the AI calls (see §2), `quiz.questions.find(...)` at `:42` is a linear scan inside the loop (fine at 10 questions, wrong at 100), and `userStats` is read-then-written non-atomically (`:111-160`), which loses points under concurrent submits. Use an atomic increment:

```sql
UPDATE user_stats
   SET "totalPoints" = "totalPoints" + $1,
       "quizzesTaken" = "quizzesTaken" + 1
 WHERE user_id = $2;
```

```sql
CREATE INDEX CONCURRENTLY quiz_attempts_profile_completed_idx
  ON quiz_attempts (exam_profile_id, "completedAt" DESC);
CREATE INDEX CONCURRENTLY quiz_attempts_user_completed_idx
  ON quiz_attempts (user_id, "completedAt" DESC);
```

#### Paper 3 stats (the N+1)

**`app/api/paper3/stats/route.ts:34-103`**:
- `:34` `paper3Attempt.count`.
- `:39-44` `groupBy questionId`.
- `:47-49` fetches every touched question **with full rows** (`findMany` with no `select`) — `content`, `expectedAnswer`, `markingBreakdown`, `sourceContentMarkdown`, `visualElements`, `taskItems`.
- `:54-79` nested loops, and inside them `await prisma.paper3Attempt.findFirst(...)` per (question, concept).
- `:96-103` a write on a `GET`.

Rewrite as a single statement:

```sql
-- concept accuracy in one pass
SELECT c.concept,
       count(*)                       AS attempts,
       count(*) FILTER (WHERE a.is_correct) AS correct
FROM paper3_attempts a
JOIN LATERAL unnest(q.concepts) AS c(concept) ON true
JOIN paper3_questions q ON q.id = a.question_id
WHERE a.exam_profile_id = $1
GROUP BY c.concept;
```

Add the supporting index and move the recomputation off the read path:

```sql
CREATE INDEX CONCURRENTLY paper3_attempts_profile_question_idx
  ON paper3_attempts (exam_profile_id, question_id);
```

The recompute belongs in an Inngest step triggered by the practice check route (§2.2).

#### Admin users

**`app/api/admin/users/route.ts:82-143`** — `findMany` with `_count: { notes, quizzes, quizAttempts }` (3 correlated aggregates per row × 20 rows), then an `await prisma.affiliate.findUnique(...)` **inside a `.map()`** at `:119-143` for each user who has a `referredBy`. That is a textbook N+1 (up to 20 extra queries). Replace with a relation include or a single join on `affiliate.code`.

Also: `orderBy: { [sortBy]: sortOrder }` at `:87` takes the column name from the query string with no allow-list. If an admin sorts by `name`, `createdAt`, `credits`, etc., only `createdAt` has an index; a `LIKE`/sort on unindexed columns on 1M users is a sequential scan plus sort. Add an allow-list plus:

```sql
CREATE INDEX CONCURRENTLY users_role_created_idx ON users (role, "createdAt" DESC);
CREATE INDEX CONCURRENTLY users_referred_by_idx  ON users (referred_by);
```

#### Admin subscriptions / dashboard stats

**`app/api/admin/subscriptions/route.ts:29-42`** — properly paginated, but `where: { status }` + `orderBy createdAt desc` has no matching index.

**`app/api/admin/stats/route.ts:37-53`** — **15 counts in parallel on every dashboard render**, including `subscription.aggregate({ _sum: { amount: true } })` with **no filter at all** (`:44`) summing every subscription ever created and calling it `totalRevenue` (`:65`) and `revenueThisMonth` (`:76`). Both are wrong and both get slower forever. Replace with the `daily_metrics` rollups that already exist, and restrict the aggregate to `status = 'ACTIVE'`.

#### Mock generation reads

**`lib/mock-generator.ts:250-261`** — `question.findMany({ where: { componentId, type, topicId? }, orderBy: createdAt desc })` with **no `take`**, loading every question for a component (including full `text` `@db.Text`) just to pick `questionCount`. Fix with a two-step: count first, then a `take`-limited sample ordered by difficulty using a targeted index.

```sql
CREATE INDEX CONCURRENTLY questions_component_type_difficulty_idx
  ON questions (component_id, type, difficulty ASC, "createdAt" DESC);
```

**`lib/mock-generator.ts:305-329` `selectWithDifficultyBalance`** — `[...questions].sort(() => Math.random() - 0.5)` is a biased, non-deterministic shuffle (and O(n log n) on a full component load). Do the sampling in SQL with `TABLESAMPLE` or an ordered `take`, or at minimum a Fisher–Yates pass.

### 1.4 The missing index DDL, as one migration

Apply with `CREATE INDEX CONCURRENTLY` (outside a transaction) and verify each statement against the live schema first.

```sql
-- extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Leaderboards -----------------------------------------------------------
CREATE INDEX CONCURRENTLY user_stats_leaderboard_idx
  ON user_stats (exam_profile_id, "totalPoints" DESC)
  WHERE exam_profile_id IS NOT NULL;

CREATE INDEX CONCURRENTLY paper3_user_stats_lb_idx
  ON paper3_user_stats (exam_profile_id, "totalPoints" DESC, "avgScore" DESC)
  WHERE exam_profile_id IS NOT NULL;

CREATE INDEX CONCURRENTLY paper3_mock_attempts_lb_idx
  ON paper3_mock_attempts (mock_id, score DESC, "timeTaken" ASC)
  WHERE status = 'COMPLETED';

CREATE INDEX CONCURRENTLY paper3_question_attempts_lb_idx
  ON paper3_question_attempts (question_id, score DESC, "marksEarned" DESC, "createdAt" ASC);

CREATE INDEX CONCURRENTLY paper3_question_attempts_attempt_idx
  ON paper3_question_attempts (attempt_id);

-- 2. Per-user hot paths -----------------------------------------------------
CREATE INDEX CONCURRENTLY chat_messages_conv_created_idx
  ON chat_messages (conversation_id, "createdAt" DESC);
CREATE INDEX CONCURRENTLY chat_messages_usage_idx
  ON chat_messages (user_id, role, "createdAt" DESC);
CREATE INDEX CONCURRENTLY notifications_user_created_idx
  ON notifications (user_id, "createdAt" DESC);
CREATE INDEX CONCURRENTLY notifications_user_unread_idx
  ON notifications (user_id) WHERE "isRead" = false;
CREATE INDEX CONCURRENTLY notes_user_created_idx      ON notes   (user_id, "createdAt" DESC);
CREATE INDEX CONCURRENTLY quizzes_user_created_idx    ON quizzes (user_id, "createdAt" DESC);
CREATE INDEX CONCURRENTLY quizzes_note_id_idx         ON quizzes (note_id);
CREATE INDEX CONCURRENTLY quiz_attempts_profile_completed_idx
  ON quiz_attempts (exam_profile_id, "completedAt" DESC);
CREATE INDEX CONCURRENTLY quiz_attempts_user_completed_idx
  ON quiz_attempts (user_id, "completedAt" DESC);
CREATE INDEX CONCURRENTLY mock_attempts_profile_started_idx
  ON mock_attempts (exam_profile_id, "startedAt" DESC);
CREATE INDEX CONCURRENTLY paper3_mock_attempts_user_started_idx
  ON paper3_mock_attempts (user_id, "startedAt" DESC);
CREATE INDEX CONCURRENTLY paper3_attempts_profile_question_idx
  ON paper3_attempts (exam_profile_id, question_id);
CREATE INDEX CONCURRENTLY paper3_detailed_results_attempt_idx
  ON paper3_detailed_results (attempt_id);
CREATE INDEX CONCURRENTLY topic_performances_profile_mastery_idx
  ON topic_performances (exam_profile_id, mastery_score ASC);
CREATE INDEX CONCURRENTLY user_topic_baselines_topic_idx ON user_topic_baselines (topic_id);

-- 3. Analytics / KPI --------------------------------------------------------
CREATE INDEX CONCURRENTLY kpi_events_event_created_idx ON kpi_events (event, "createdAt" DESC);
CREATE INDEX CONCURRENTLY kpi_events_user_created_idx  ON kpi_events (user_id, "createdAt" DESC);
CREATE INDEX CONCURRENTLY daily_metrics_metric_date_idx ON daily_metrics (metric, date);
CREATE INDEX CONCURRENTLY engagement_log_campaign_sent_idx ON engagement_log (campaign, sent_at);

-- 4. Admin ------------------------------------------------------------------
CREATE INDEX CONCURRENTLY users_role_created_idx ON users (role, "createdAt" DESC);
CREATE INDEX CONCURRENTLY users_referred_by_idx  ON users (referred_by);
CREATE INDEX CONCURRENTLY subscriptions_status_created_idx ON subscriptions (status, "createdAt" DESC);

-- 5. Community --------------------------------------------------------------
CREATE INDEX CONCURRENTLY posts_feed_idx        ON posts ("isPinned" DESC, "createdAt" DESC);
CREATE INDEX CONCURRENTLY posts_subject_idx     ON posts (subject, "createdAt" DESC);
CREATE INDEX CONCURRENTLY comments_post_parent_idx
  ON comments (post_id, "createdAt" ASC) WHERE parent_id IS NULL;
CREATE INDEX CONCURRENTLY comments_parent_idx   ON comments (parent_id, "createdAt" ASC);

-- 6. Catalog / practice -----------------------------------------------------
CREATE INDEX CONCURRENTLY paper3_questions_approved_tasktype_idx
  ON paper3_questions (task_type, "createdAt" DESC) WHERE status = 'APPROVED';
CREATE INDEX CONCURRENTLY paper3_questions_concepts_gin ON paper3_questions USING GIN (concepts);
CREATE INDEX CONCURRENTLY paper3_mocks_catalog_idx
  ON paper3_mocks (subject, "createdAt" DESC)
  WHERE status = 'PUBLISHED' AND visible_to_all_students = true;
CREATE INDEX CONCURRENTLY questions_component_type_difficulty_idx
  ON questions (component_id, type, difficulty ASC, "createdAt" DESC);
CREATE INDEX CONCURRENTLY exam_blueprints_visible_updated_idx
  ON exam_blueprints ("visibleForStudents", "updatedAt" DESC);

-- 7. Search -----------------------------------------------------------------
CREATE INDEX CONCURRENTLY notes_title_trgm_idx    ON notes   USING GIN (title gin_trgm_ops);
CREATE INDEX CONCURRENTLY notes_subject_trgm_idx  ON notes   USING GIN (subject gin_trgm_ops);
CREATE INDEX CONCURRENTLY quizzes_title_trgm_idx  ON quizzes USING GIN (title gin_trgm_ops);
CREATE INDEX CONCURRENTLY posts_content_trgm_idx  ON posts   USING GIN (content gin_trgm_ops);

-- Generated tsvector for note body search (alternative to a trigram index on
-- extracted_text, which is large and costly to maintain):
--   ALTER TABLE notes ADD COLUMN search_tsv tsvector GENERATED ALWAYS AS (...) STORED;
--   CREATE INDEX CONCURRENTLY notes_search_tsv_idx ON notes USING GIN (search_tsv);
```

### 1.5 Denormalised counters worth adding

| Counter | Replaces | Write point |
| --- | --- | --- |
| `users.notes_count`, `users.quizzes_count` | `note.count`/`quiz.count` in `/api/usage` (`:44,48`) and `/api/quizzes/generate` (`:77`) | `app/api/notes/route.ts:114`, `app/api/quizzes/route.ts` |
| `posts.like_count`, `posts.comment_count` | `_count` includes in `/api/community/posts` (`:34-40`) | like and comment routes |
| `leaderboard_snapshot(period, user_id, points, rank)` | rank `COUNT(*)` in all four leaderboards | nightly cron (§2.4) |
| `daily_metrics` rows for cohorts | `computeCohortRetention` (60 queries/request) | nightly cron |
| `chat_conversations.file_keys String[]` | unbounded `parts` scan on conversation delete (`/api/chat/conversations/[id]/route.ts:124`) | message save |

---

## 2. What should move to Inngest

### 2.1 Already in Inngest (23 registered functions)

`app/api/inngest/route.ts:33-57` registers: `process-note`, `generate-quiz`, `generate-quiz-from-weak-areas`, `send-verification-email`, `send-welcome-email`, `send-password-reset-email`, `send-magic-link-email`, `send-unverified-warnings` (cron `0 8 * * 0`), `delete-unverified-accounts` (cron `0 9 * * 0`), `send-admin-invite-email`, `send-role-update-email`, `generate-default-quiz`, `send-platform-update-email` (event + cron `0 5 * * 1`), `handle-subscription-action`, `monthly-credit-bonus` (cron `0 0 1 * *`), `process-paper3-source`, `generate-paper3-mock`, `evaluate-paper3-exam`, `harvest-note-knowledge`, `harvest-paper3-knowledge`, `ingest-questions`, `compute-daily-metrics` (cron `0 0,23 * * *`), `dispatch-engagement-campaigns` (cron `0 10 * * 1`).

PDF/image/Word extraction and question ingest are already off the request path (`lib/inngest/functions.ts:72-104`, `lib/inngest/question-ingest.ts:19-45`), and Paper 3 exam evaluation is already event-driven (`app/api/paper3/mocks/[mockId]/submit/route.ts:61-71`). That part of the architecture is right.

**Configuration gap:** none of the 23 functions declares `retries`, `concurrency`, `idempotency`, or `throttle` — they only set `name`, `id`, `triggers` (verified by grep across `lib/inngest/*.ts`). Defaults therefore apply (Inngest retries failed steps, but without a concurrency limit a burst of submissions fans out into unbounded parallel DB + AI work), and duplicate events will re-run AI work and re-debit credits. See the Inngest docs on concurrency limits and retries: https://www.inngest.com/docs/guides/concurrency and https://www.inngest.com/docs/reference/functions/retries.

### 2.2 Work still inside request handlers

| Work | Location | Blocks the response? | Recommendation |
| --- | --- | --- | --- |
| AI title generation for a new chat | `app/api/ai/chat/route.ts:32-51`, called `:240` | **Yes** — up to 10 s (`timeout: 10_000`, `maxRetries: 0`) before `streamText` even starts | Move to Inngest event `chat/title` (fire-and-forget after the user message is persisted), or generate the title from the first 6 words of the user message with no model call |
| Readiness computation for chat context | `app/api/ai/chat/route.ts:273-309` | **Yes** — 3 + N queries per message | Cache per profile (§3.3), then fire-and-forget refresh |
| Duplicate-message detection | `app/api/ai/chat/route.ts:202-223` | Yes (one extra query) | Keep, but run after the stream starts |
| UserStats find + create/update | `app/api/ai/chat/route.ts:250-271` | Yes | Single atomic `upsert` with increments |
| Non-streaming Paper 3 tutor chat | `app/api/paper3/chat/route.ts:173` `generateCritical` | **Yes** — full round trip, no streaming, and it loads the whole attempt first (`:44-57`) | Convert to `streamText` + `toUIMessageStreamResponse`, and select only the columns the prompt needs |
| Per-question AI grading on quiz submit | `app/api/quizzes/attempts/route.ts:49, 63` | **Yes** — up to N × 10 s | Move to Inngest `quiz/grade-attempt`; the handler stores answers and returns `202` with a `processingStatus`, exactly like the Paper 3 flow already does |
| Synchronous quiz generation | `app/api/quizzes/generate/route.ts:136` `generateQuizFromNote` | **Yes** — `generateObject` with a 10 s timeout, retries off | Already has an Inngest twin (`generate-quiz`, `functions.ts:166`). **Delete the synchronous path** and dispatch the event |
| Mock assembly (may call AI) | `app/api/mocks/generate/route.ts:94` → `lib/mock-generator.ts:283, 301` | **Yes** — a per-section `generateObject` when the bank is thin | Split: DB-only assembly stays synchronous; `mock/generate-ai-fill` becomes an Inngest step (`step.run` per section already gives memoisation) |
| Custom mock generation | `app/api/mocks/generate-custom/route.ts` | Yes | Same pattern |
| Admin revision guide generation | `app/api/admin/revision-guides/route.ts:91` `generateTextCritical` | Yes — long-form generation | Inngest `revision-guide/generate` (event), status column + poll, same UX as exam evaluation |
| Admin PDF report rendering | `app/api/admin/reports/route.ts:2, 80, 102, 125, 147` `renderToBuffer` | Yes — `@react-pdf/renderer` cold-start + render | Inngest `report/render` → UploadThing → return a signed URL; cache the PDF object |
| Payment webhook email fan-out | `app/api/webhooks/fapshi/route.ts:164-185` (`sendPaymentSuccessEmail`, `sendAdminPaymentAlert`, `sendPaymentFailedEmail`) | Yes — 2–3 SMTP round trips inside a webhook that must answer fast | Dispatch `payment/notifications` to Inngest; return 200 immediately |
| Paper 3 stats recompute | `app/api/paper3/stats/route.ts:96-103` | Writes on a GET | Recompute in Inngest after `paper3/practice-check` |
| Admin metrics recompute | `app/api/admin/metrics/route.ts:284` (`PUT` → `computeDailyMetrics`) | Yes — up to 60 aggregate queries | Inngest event `metrics/recompute`; the `PUT` returns `202` |
| Cohort retention | `lib/kpi.ts:171-250` | Yes, up to 62 queries | Nightly cron into `daily_metrics`; serve from rows |
| Notes → quiz default generation | `lib/inngest/trigger.ts:13-23` uses `fetch("/api/inngest/trigger")` — **a relative URL, which cannot resolve server-side**; it is called from `lib/auth.ts:87` inside a better-auth hook | Silently swallowed by `.catch(console.error)` at `lib/auth.ts:87` | Replace with `inngest.send({ name: "quiz/generate-default", data: { userId } })` directly. **[verified as a code-level defect]**; whether it currently errors in production is **[unverified]** but it cannot succeed as written |
| Welcome email trigger | `lib/inngest/trigger.ts:1-11`, same pattern, called at `lib/auth.ts:81` | Same | Same fix |

Also inside request handlers, by design and worth keeping: deterministic grading (`lib/paper3/evaluate.ts` — string normalisation, no model call for spreadsheet/SQL/code tasks) and credit debits (`lib/credits.ts:62` transactional).

### 2.3 Recommended Inngest function inventory

Durations are expected wall-clock for a typical payload. Retry/concurrency recommendations follow the Inngest docs cited above; `step.run` memoisation is described at https://www.inngest.com/docs/features/inngest-functions/steps-workflows.

| Function | Trigger | Duration | Retries | Concurrency | Notes |
| --- | --- | --- | --- | --- | --- |
| `chat/title` | event `chat/title` (on write) | 2–5 s | 2 | limit 20, key `userId` | Replaces the blocking `generateText` at `ai/chat/route.ts:240` |
| `quiz/grade-attempt` | event `quiz/grade-attempt` (on write) | 10–90 s | 3 | limit 5, key `userId`; idempotency `attemptId` | One `step.run` per question (batch, not serial); batch the AI calls |
| `quiz/generate` | event (already exists) | 15–60 s | 3 | limit 3, key `userId` | Idempotency `quizId` so a retry cannot double-generate |
| `mock/assemble` / `mock/ai-fill` | event `mock/generate` | 5–45 s | 3 | limit 3, key `examProfileId` | `step.run` per section; `mode` recorded on the attempt |
| `paper3/evaluate-exam` (exists) | event (already wired) | 60–600 s | 2 | limit 10, key `userId`; idempotency `attemptId` | **Restructure**: today all questions are graded in one serial loop inside a single `step.run` (`paper3-exam-functions.ts:83-187`) and all AI feedback in another (`:189-256`), and results are inserted one row at a time (`:258-277`, `:319-333`). Move to `step.run("grade-question-" + id)` per question (parallel + memoised), `Promise.all` with a concurrency of 4–6, and `createMany` for the inserts |
| `paper3/practice-check` | event on answer submit | 2–10 s | 3 | limit 10, key `userId` | Recomputes the user's concept stats that `/api/paper3/stats` currently does on read |
| `revision-guide/generate` | event | 60–180 s | 2 | limit 2 | Status column; client polls (result page already polls at 5 s) |
| `report/render` | event | 10–60 s | 2 | limit 2, key `type` | Upload result to UploadThing; cache by `type + date` |
| `payment/notifications` | event from the Fapshi webhook | 5–20 s | 4 | limit 20 | Retries matter here: an email lost is revenue/support lost |
| `kpi/rollup-daily` | cron `30 23 * * *` | 30–180 s | 3 | limit 1 | Replaces the 23:00 half of `compute-daily-metrics`; also writes the cohort-retention rows |
| `leaderboard/rebuild` | cron `0 * * * *` (hourly) + on exam submit | 5–30 s | 3 | limit 1 | Rebuilds `leaderboard_snapshot` for quiz + Paper 3 + global; makes every leaderboard read a 20-row index scan |
| `leaderboard/prune` | cron `0 4 * * *` | minutes | 2 | limit 1 | Deletes orphaned snapshot rows and old `kpi_events` beyond the retention window |
| `notes/prune-extractions` | cron `0 5 * * *` | minutes | 2 | limit 1 | Optional: null out `extracted_text` for notes untouched in 12 months — shrinks the `notes` table and the trigram/GIN maintenance cost |
| `engagement/dispatch` (exists) | cron `0 10 * * 1` | 2–10 min | 2 | limit 1 | Keep; consider daily instead of weekly given the audience churns fast |

### 2.4 Rollups: what should be a cron, not a query

Three read paths are aggregates over event tables and will never be fast enough to compute per request at 100k+ users:

1. **Daily metrics** — already a cron (`lib/inngest/metrics-functions.ts:8`, `0 0,23 * * *`), but computed from scratch with ~25 queries and 14 sequential upserts (`lib/kpi.ts:58-158`). Convert to a single `INSERT … ON CONFLICT DO UPDATE` over a `GROUP BY` result, and stop exposing the synchronous `PUT` at `app/api/admin/metrics/route.ts:284`.
2. **Cohort retention** — add a nightly job writing `(cohort_week, offset_week, active_users, cohort_size)` rows into `daily_metrics`-style rows. Serve the chart from those rows; delete the 62-query path.
3. **Leaderboards** — a `leaderboard_snapshot` table rebuilt hourly. Rank becomes a lookup, pagination becomes a plain indexed `LIMIT/OFFSET`, and no request ever runs `COUNT(*)` over the stats table.

Recommended cadence for a Buea/Bamenda student base: hourly snapshot rebuild (points change on every exam submit, and the leaderboard is read far more often), daily KPI rollup at 23:30 local, weekly engagement campaigns.

---

## 3. Caching and speed

### 3.1 Next.js 16 caching model — where this repo stands

Verified: `next.config.ts` contains only `reactCompiler`, `allowedDevOrigins` and `serverExternalPackages`. **`cacheComponents` is not enabled**, so the app is on the "previous model" documented at https://nextjs.org/docs/app/guides/caching-without-cache-components: `fetch` is uncached by default, `unstable_cache` is the tool for non-`fetch` data, and route handlers are **not cached by default** ("Route Handlers are not cached by default… To cache a `GET` method, use a route config option such as `export const dynamic = 'force-static'`", `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`).

Two surfaces use the segment config today: `app/api/public/gce-blueprints/route.ts:5` and `app/api/public/p1p2-mock-modules/route.ts:5` (`revalidate = 120`), both with `Cache-Control: public, s-maxage=120, stale-while-revalidate=300`. Everything else is dynamic, per-request.

**What is cacheable vs dynamic here:**

| Data | Freshness requirement | Recommendation |
| --- | --- | --- |
| Catalog: exam levels, programs, components, topics, published blueprints, public modules | Hours | `use cache` + `cacheLife('hours')` + `cacheTag('catalog')`; keep the existing `revalidate` + `Cache-Control` |
| Platform settings (`lib/platform-settings.ts:102`) | Until an admin saves | `cacheLife('minutes')` + `cacheTag('platform-settings')`, invalidated from `PUT /api/admin/platform-settings` |
| Leaderboards (top 20 per page) | ≤ 60 min | Cache per (page, filter) key; rebuild source hourly (§2.4) |
| Exam metadata, mock catalog, Paper 3 mock list | Minutes | `use cache` + `cacheLife('minutes')` |
| `user_stats`, `paper3_user_stats`, credit balance, plan | Must be fresh | Not cached. Reads by PK/`@unique` with the right indexes are already ~1 ms; caching them buys little and risks selling the wrong plan |
| Per-user readiness / performance | ≤ 5 min, invalidated on write | `use cache` + `cacheTag('profile:' + profileId)` |
| Chat, exam submit, payments, credit debits | Never | Never cache |
| Admin metrics | Until the nightly rollup | Serve from `daily_metrics` rows, then cache per tab for 60 s |

**Enabling Cache Components.** The v16 model is `'use cache'` + `cacheLife` + `cacheTag`, gated on `cacheComponents: true` (https://nextjs.org/docs/app/api-reference/directives/use-cache). The hard constraint that matters for this codebase: **cached functions cannot read `cookies()` or `headers()`** — the restriction follows the call stack, and reading them "outside cached scopes and pass values as arguments" is the required pattern (same doc). That is compatible with this app, because every authenticated cache candidate can take `userId` as an argument (read it via `auth.api.getSession` in the caller, then pass it in).

Recommendation: adopt Cache Components **scoped to data functions, not to route files**, and do it incrementally:
1. Move `getPlatformSettings`, catalog reads and readiness into `lib/data/*.ts` helpers marked `'use cache'`.
2. Add `cacheLife('minutes')` / `cacheLife('hours')` and `cacheTag(...)` in each.
3. Call `revalidateTag('platform-settings', 'max')` (or `updateTag`) from the admin settings mutation.
4. Leave authenticated interactive routes uncached and let the request-time APIs make them dynamic; wrap uncached data reads in `<Suspense>` so they stream in rather than block the shell (documented in `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`, "Streaming uncached data").

The single most important caveat from the docs for a serverless deployment: with the default in-memory cache handler, **cache entries typically do not persist across requests on serverless** ("Serverless → Cache entries typically don't persist across requests (each request can be a different instance)"). So `use cache` alone buys you prerender-time reuse and static shells, not runtime caching on Vercel. For runtime reuse you need either `'use cache: remote'` with a cache handler (network round trip per lookup, platform fees) or an external cache — see §3.5.

### 3.2 Revalidation, concretely

| Event | Invalidate |
| --- | --- |
| `POST/PUT /api/admin/platform-settings` | `platform-settings` |
| `POST /api/admin/blueprints/*`, `/api/admin/paper3/*` | `catalog`, `mocks` |
| `POST /api/quizzes/attempts`, Paper 3 submit | `leaderboard`, `stats:{userId}` |
| `POST /api/performance` | `profile:{profileId}` |
| Hourly cron | `leaderboard` |

Use `updateTag`/`revalidateTag` inside the mutation itself (the pattern documented at https://nextjs.org/docs/app/guides/caching-without-cache-components), not a time-based revalidation for user-visible state.

### 3.3 Per-request memoisation

Even with caching, a single request currently issues duplicate reads. Wrap with React `cache()` (documented in the same guide under "Deduplicating requests"): `getActiveProfileId` (`lib/exam-profile.ts:3-8`) is called independently in many handlers and re-queries `users` every time; `getPlatformSettings` (`lib/platform-settings.ts:102`) is re-queried per call. Both are natural `cache()` candidates and cost nothing.

### 3.4 Connection strategy for a Vercel serverless deployment

What is configured now: `lib/prisma.ts:5-7` constructs `PrismaPg` with only a connection string. Under Prisma 7, relational datasources use driver adapters by default and **pooling behaviour comes from the driver**, not from Prisma. The documented `pg` adapter defaults are:

| Behaviour | Prisma 7 `pg` default |
| --- | --- |
| Pool size (`max`) | **10** |
| Acquire timeout (`connectionTimeoutMillis`) | **0 — no timeout** |
| Idle timeout (`idleTimeoutMillis`) | **10 s** |

Source: Prisma, *Connection pool* (v7) — https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool (it redirects to `/docs/orm/v7/...`; the same page documents the "Matching Prisma ORM v6 defaults" example with `connectionTimeoutMillis: 5_000, idleTimeoutMillis: 300_000`).

On Vercel each warm lambda holds its own client and therefore its own pool of 10. Neon caps `max_connections` per compute (104 on 0.25 CU, 419 on 1 CU, with 7 reserved for superuser — https://neon.com/docs/connect/connection-pooling). Ten concurrent warm lambdas on a 0.25 CU instance exhausts the database. On top of that, `connectionTimeoutMillis: 0` means a saturated pool **queues forever** rather than failing fast, which turns a database problem into a hanging phone UI.

**Recommended configuration** (exact, not applied):

1. **Use the pooled connection string at runtime** — hostname with the `-pooler` suffix, per Neon: *"Use a pooled connection string (add `-pooler` to hostname)"*, PgBouncer in `transaction` mode, `max_client_conn = 10000`, `default_pool_size = 0.9 × max_connections`. Keep a separate direct string for migrations and `prisma.config.ts`. Prisma's own guidance matches: *"Consider introducing an external connection pooler like PgBouncer to prevent your application or functions from exhausting the database connection limit"* (same Prisma page, "External connection poolers").
2. **Explicitly size the client pool small**, because the pooler is already doing the multiplexing:

```ts
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL, // pooled: ...-pooler.<region>.aws.neon.tech/neondb
  max: 2,                       // per warm lambda; the pooler absorbs concurrency
  connectionTimeoutMillis: 8_000, // fail fast instead of hanging the phone
  idleTimeoutMillis: 30_000,
});
```
   `max: 2` × (concurrent warm lambdas) must stay under the PgBouncer pool size, which is 90 % of `max_connections`.
3. **Transaction-mode constraints are not a problem here** — Neon runs PgBouncer ≥ 1.22 with `max_prepared_statements=1000`, so protocol-level prepared statements (what `pg` sends) work; only SQL-level `PREPARE`, `SET`, `LISTEN/NOTIFY` and session advisory locks are unavailable (Neon doc, "Protocol-level prepared statements"). I found no `SET`, `LISTEN` or advisory-lock usage in the repo. `SET search_path` is avoided by always qualifying the schema or relying on Prisma's `schema=public` in the URL.
4. **Prisma Accelerate: not the first move.** It sits in front of the database over HTTP and adds a network hop and per-request cost on exactly the latency-critical paths this app cares about; it is best evaluated later as a *global query cache* for catalog reads once §3.5 gives us a real cache. Marked **[evaluated, recommended later, not now]**.
5. **Read replica: yes, but only for analytics.** Route `/api/admin/metrics*`, `/api/admin/stats`, the retention route and `/api/admin/reports` to a Neon read replica (or a Neon read-scaled branch). Student hot paths stay on the primary. Analytics are 100 % of read traffic and 0 % of write traffic, so this removes the heaviest scans from the primary entirely.

### 3.5 The AI cache

`lib/ai/cache.ts:10` is a module-level `Map`. Verified consequences:
- **Per instance.** On Vercel each lambda has its own map, so the hit rate on `summarize` (30-day TTL, `lib/ai/registry.ts:55-58`), `quiz_gen`/`exam_gen`/`paper3_gen` (14-day TTL) and `reasoning` (7-day TTL) is close to zero across instances.
- **Unbounded.** No eviction, no max size. On a long-lived instance the map grows until the function is recycled. Entries expire logically but are only deleted on read (`cache.ts:20-23`), so expired-but-unread entries leak.
- Not used for `grading` (TTL 0) — that part is correct, since grading must not be cached.

Replace it with one of:
- **Postgres-backed cache table** (`ai_cache(key PRIMARY KEY, value Json, expires_at)`) with a 5 %-sampled write-through. No new vendor, works everywhere, survives deploys. Good enough at this scale.
- **Redis / Vercel KV / Upstash** with a 30 s in-process LRU in front. Better latency, one more dependency and cost.
- **`'use cache: remote'` with `cacheHandlers`** — the Next.js-documented way to have the platform supply a dedicated handler; the docs are explicit that it *"allows platforms to provide a dedicated cache handler (like Redis or KV database)"* and note it *"requires a network roundtrip to check the cache and typically incurs platform fees"* (https://nextjs.org/docs/app/api-reference/directives/use-cache).

Recommended: Postgres table first (zero new infra), plus a 200-entry in-process LRU so hot keys never leave memory.

### 3.6 AI orchestration — a doc/code mismatch worth flagging

`AGENTS.md` describes a model chain (`gpt → gemini → nemotron → mistral → deepseek`), a working-model cache and a dead-model cache. **The code does not implement any of that.** `lib/ai/orchestrator.ts` is 150 lines: every path calls a single `gemini-2.5-flash` instance (`:7`), `generateCritical` (`:107-136`) is byte-for-byte the same logic as `generate` (`:50-79`), `generateTextCritical` (`:138-148`) bypasses the cache entirely, and `lib/ai/registry.ts` defines a `chain` array that is never read. If the intent was a fallback chain, that work has not landed — and for a product whose users pay per megabyte on a flaky network, a single-provider chat stream with `maxRetries: 1` and no fallback is a single point of failure. Either implement the chain or correct the doc; do not leave both.

---

## 4. Performance budget

Reference thresholds (Google, stable): **LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1**, at the 75th percentile, segmented mobile — https://web.dev/articles/vitals. Reference network: Lighthouse's mobile preset, **1.6 Mbps down / 750 Kbps up, 150 ms RTT**, described as *"roughly the bottom 25% of 4G connections and top 25% of 3G connections"* — https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md. That is the right test profile for this audience; a faster lab profile is not evidence.

### 4.1 Targets (75th percentile, mid-range Android, Slow 4G)

Set stricter than Google, because the audience is on the wrong side of the median:

| Metric | Google "good" | **TiCLearn target** | Why stricter |
| --- | --- | --- | --- |
| LCP | 2.5 s | **≤ 1.8 s** | Congested cells push effective throughput well under 1.6 Mbps; aim before the cliff |
| INP | 200 ms | **≤ 120 ms** | Mid-range Android + React reconciliation; Streamdown re-renders are the risk |
| CLS | 0.1 | **≤ 0.02** | Skeletons and late-arriving data are the main source; a chat that jumps is unusable |
| TTFB (document/cached) | — | **≤ 300 ms** | 150 ms RTT ×2 plus server compute |
| TTFB (authenticated, dynamic) | — | **≤ 700 ms** | Includes one DB round trip to a possibly-remote Neon region |
| **Chat: request → first byte (SSE)** | — | **≤ 900 ms p75, ≤ 1.5 s p95** | This is the product's headline number |
| Chat: first token → full answer | — | ≤ 12 s p75 | Streaming makes perceived speed acceptable |
| `GET /api/usage` | — | ≤ 120 ms | Cacheable, called on every page |
| `GET /api/readiness` | — | ≤ 250 ms | After the single-query rewrite + 5 min cache |
| `GET /api/leaderboard`, `/api/paper3/leaderboard/*` | — | ≤ 300 ms | After snapshot table + indexes |
| `POST /api/quizzes/attempts` | — | ≤ 400 ms (grading async) | Currently unbounded |
| `POST /api/paper3/mocks/[id]/submit` | — | ≤ 300 ms (evaluation async) | Already async; keep it that way |
| `POST /api/mocks/generate` | — | ≤ 600 ms (assembly only) | AI fill moves out |
| `GET /api/admin/metrics` | — | ≤ 1.0 s, served from rollups | Not a student path; do not optimise it ahead of the above |

### 4.2 Bytes, because that is the actual constraint

At 1.63 USD/GB, 1 MB ≈ 0.00163 USD ≈ 1.6 XAF; a 2 USD monthly allowance is ~1.2 GB ≈ 1,250 MB. **A 3 MB first load costs ~5 XAF and a 300 KB weekly re-download costs ~0.5 XAF per week, ~2 XAF per month — about 1 % of the user's entire internet budget.** Large bundles are not a UX nicety here, they are a direct consumption of the user's money.

| Budget | Target |
| --- | --- |
| First-load JS (gzipped), any student route | ≤ **180 KB** |
| Chat route first-load JS | ≤ **220 KB** |
| Route-specific chunk added by chat | ≤ **120 KB** |
| CSS (gzipped, all routes) | ≤ **40 KB** |
| Images above the fold | ≤ **60 KB** total, WebP/AVIF, `next/image` with explicit `sizes` |
| Fonts | **2 weights max**, woff2, `font-display: swap`, self-hosted |
| Chat API request payload | ≤ **4 KB** (last 10 messages, not the whole thread) |
| Exam-start payload | ≤ **60 KB** (see §5.1 — currently far larger) |

### 4.3 What each flow must do to hit these

**Chat (`/chat/[conversationId]`).** The page shell is already cheap — `app/chat/[conversationId]/page.tsx` renders a client component and fetches history over the API. To hit a 900 ms first byte the server must do exactly this before `streamText`: 1 session lookup (cookie-cached, `lib/auth.ts:37-42`), 1 combined plan+usage read (cache 60 s), 1 conversation read (cached), 1 cached readiness read (5 min), then **stream**. Everything else — title generation, duplicate detection, `userStats` increments, KPI event — moves after the stream starts or into Inngest. Today the route performs roughly 10 sequential round trips plus, on a new conversation, a blocking model call.

**Exam runner (`/practice/exam/[mockId]`).** Zero bytes of question content above the fold beyond question 1; the rest streamed behind a client-side prefetch of the *next* question only. No KaTeX until a `$` is actually seen in a rendered message. Timer must run off `Date.now()` deltas, not per-second re-renders.

**Dashboard / progress.** Server-render the readiness summary and the topic bars; the client hydrates the same markup so there is no CLS when data lands.

**Community / leaderboard.** Server-render page 1 (so LCP is text, not a spinner), then client pagination. Do not ship `recharts` to student routes — it is only used in `app/(admin)/admin/metrics/page.tsx:17-33`.

**Upload → note ready.** Poll at 5 s with a hard ceiling and a "we'll notify you" fallback; the phone is on a network that will drop. Never hold a request open while a PDF is parsed (already correct — see §2.1).

---

## 5. Payload and asset discipline

### 5.1 The single worst payload: the Paper 3 mock payload

`app/api/paper3/mocks/[mockId]/route.ts:47-85` loads the mock with `questions: { include: { question: true } }` and returns the entire object. `question: true` means every column of `Paper3Question`, including `content`, `contentMd`, `sourceContentMarkdown`, `expectedAnswer`, `markingBreakdown` (JSON), `taskItems` (JSON), `visualElements` (JSON) — for every question in the mock, before the student has answered anything. For a 40-question mock with embedded HTML/grid markup this is routinely several hundred KB of JSON on a metered connection, and it hands the answer key to the browser.

Fix: `select` only what the runner renders (`id, questionNumber, title, taskType, marks, content, contentMd, visualElements, taskItems, requiresAnswer`-equivalent, `partialCredit`), drop `expectedAnswer`/`markingBreakdown`/`explanation`/`sourceContentMarkdown` from the pre-exam payload entirely, and load detailed results separately on the result page. This is both the biggest byte win available and an anti-cheat fix. Note the exam-start route already does a narrower `select` (`app/api/paper3/mocks/[mockId]/start/route.ts:36,45`), so the pattern already exists in the codebase.

The same over-fetch appears in `app/api/paper3/chat/route.ts:44-57`, where each tutor message re-reads the whole attempt with full questions and detailed results.

### 5.2 shiki in the chat bundle (biggest JS win)

`components/ai-elements/code-block.tsx:16` imports `{ codeToHtml } from "shiki"` — the **root entry**, which carries the language and theme registry rather than a single grammar. It is reachable from chat via `components/ai-elements/tool.tsx:21` → `components/chat/chat-message-list.tsx:43`.

Fix (three options, in order of preference):
1. Import from `shiki/core` with a small `createHighlighter` over `javascript, typescript, python, c, sql, html, css, json`, loaded through `await import(...)` inside the component, and render a plain `<pre>` until it resolves. Only the languages students actually paste load.
2. Keep `shiki` but move `CodeBlock` behind `next/dynamic({ ssr: false })` in `tool.tsx` so it is not in the initial chunk.
3. Replace with a 3 KB highlighter for the common cases and keep shiki for the rest, lazily.

Measure with `@next/bundle-analyzer` before and after; do not guess the size.

### 5.3 What else ships to the phone

| Dependency | Where it enters the client bundle | Recommendation |
| --- | --- | --- |
| `streamdown` + `@streamdown/math` | `components/ai-elements/message.tsx:13,25` | Needed for markdown. Verify the plugin list is minimal and that mermaid/shiki are **not** enabled — `Streamdown` can pull optional heavy plugins. Dynamic-import the streaming variant only for the in-flight message; static render for history |
| `katex` | `message.tsx:23` plus **five page-level imports**: `app/(dashboard)/attempts/[id]/page.tsx:11`, `practice/exam/[mockId]/page.tsx:28`, `practice/exam/result/[attemptId]/page.tsx:36`, `quizzes/[id]/page.tsx:15`, `ai-elements/message.tsx:23` | Self-host only the woff2 subsets you use; do not ship the full `katex.min.css` font set. Load KaTeX CSS only on routes that render maths |
| `react-markdown` + `remark-math` + `rehype-katex` + `remark-gfm` | `practice/exam/[mockId]/page.tsx:27-29`, `quizzes/[id]/page.tsx:14-16`, `attempts/[id]/page.tsx:10-12`, `practice/exam/result/[attemptId]/page.tsx:35-37` | The exam runner needs markdown **only** when a question body contains it. Gate it behind `isHtmlQuestion`/a content sniff and `dynamic()` so the common MCQ runner never pays for it |
| `recharts` | `app/(admin)/admin/metrics/page.tsx:17-33` | Admin-only route group, so it never reaches students — **verify** it does not leak into the shared `(dashboard)/layout.tsx`. `next/dynamic` it inside the metrics page anyway |
| `@hello-pangea/dnd` | `app/(admin)/admin/mocks/p1-p2/page.tsx:10`, `admin/paper3/mocks/[mockId]/page.tsx:3` | Admin-only; keep out of any shared layout |
| `framer-motion` / `motion` | `sign-in`, `sign-up`, `verify-email`, `admin/accept-invite` | On a low-end Android this is main-thread work on the auth screen, the one screen every user must pass. Replace with CSS transitions |
| `@react-pdf/renderer` | `app/api/admin/reports/route.ts:2` and `components/pdf/*.tsx` | **Verified server-only** — none of `components/pdf/*` declares `"use client"`, so react-pdf does not ship to browsers. It does inflate the route handler's cold start on every report request. Move rendering to Inngest and cache the PDF in UploadThing |
| `@xyflow/react`, `tokenlens` | `components/ai-elements/canvas.tsx:1`, `context.tsx:13` | **Verified unreferenced** — no component imports them. Delete the files so they can never be pulled in by a future barrel import |
| `react-syntax-highlighter`, `html2canvas`, `@napi-rs/canvas`, `canvas-confetti`, `pdfkit`, `mammoth`, `pdf-parse`, `pdfjs-dist`, `tesseract.js` | `package.json` | `pdfjs-dist`/`mammoth`/`tesseract.js`/`uploadthing/server` are imported by `lib/ai/index.ts` (server-side, fine; `tesseract.js` is already in `serverExternalPackages`). **`react-syntax-highlighter`, `html2canvas`, `canvas-confetti`, `@napi-rs/canvas`, `pdfkit`, `pdf-parse` have zero imports in the repo** — remove them from `package.json` |
| `eng.traineddata` (5.2 MB) | repo root, referenced by tesseract | Confirm it is not in `public/` — it is not (`ls public` shows only `icons/` and one HTML file). Keep it out of the bundle |
| `@tanstack/react-query-devtools` | `package.json` | Must be dev-only; confirm it is not imported in any client component under a production build |

### 5.4 Code-splitting boundaries to adopt

```
app/chat/[conversationId]/page.tsx
  ├── ChatThread (eager)                       ← composer + empty state
  ├── ChatSidebar        → next/dynamic        ← collapsed by default on mobile
  ├── ChatMessageList    → next/dynamic        ← loaded after first paint
  │     └── MessageResponse → next/dynamic     ← Streamdown + KaTeX only when text arrives
  └── CodeBlock (inside tool.tsx) → next/dynamic ssr:false, shiki/core

app/(dashboard)/practice/exam/[mockId]/page.tsx   (already "use client")
  ├── QuestionRenderer (eager, MCQ-only path)
  └── MarkdownQuestion / HtmlPreview → next/dynamic
app/(admin)/admin/metrics/page.tsx
  └── MetricsCharts → next/dynamic ssr:false    ← recharts
app/(admin)/admin/mocks/p1-p2/page.tsx
  └── BlueprintBuilder → next/dynamic           ← dnd-kit
```

Add `@next/bundle-analyzer` and enforce the §4.2 byte budgets in CI — a budget that is not measured is not a budget.

---

## 6. Recommended changes, prioritised

### 6.1 Exact index DDL

The full migration-ready script is in **§1.4**. Apply order: extensions → leaderboards → per-user hot paths → analytics → admin → community → catalog → search. Use `CREATE INDEX CONCURRENTLY`, one statement at a time, outside a transaction; run them during low traffic; `ANALYZE` afterwards. Because `db push` may have drifted (`AGENTS.md`, `package.json`), diff against the live database first.

### 6.2 Exact query rewrites

| # | Rewrite | File:line |
| --- | --- | --- |
| Q1 | `COUNT(DISTINCT user_id)` in SQL instead of `groupBy: ["userId"]` for DAU/MAU | `app/api/admin/metrics/route.ts:56-65, 102-105`; `lib/kpi.ts:63-66, 305-308` |
| Q2 | `groupBy(["plan"])` aggregation instead of findMany + JS reduce for MRR | `lib/kpi.ts:330-344` |
| Q3 | Replace 62-query cohort retention with one `date_trunc` SQL statement, then move it to a nightly rollup | `lib/kpi.ts:171-250` |
| Q4 | Single-query readiness (join baselines + performances + topics), 5 min cache | `lib/readiness.ts:18-123` |
| Q5 | Single-query concept stats with `unnest(concepts)`; drop the N+1 and the write-on-GET | `app/api/paper3/stats/route.ts:47-103` |
| Q6 | `Promise.all` the eight independent reads; drop the bogus `question.count`; denormalise note/quiz counts | `app/api/usage/route.ts:34-106` |
| Q7 | Hoist the nested `await` out of the `count` argument; use keyset pagination instead of `skip` on leaderboards | `app/api/leaderboard/route.ts:47-60`; `app/api/paper3/leaderboard/[mockId]/route.ts:103-150` |
| Q8 | Pre-truncate the mock GET payload with an explicit `select`; exclude `expectedAnswer`/`markingBreakdown` | `app/api/paper3/mocks/[mockId]/route.ts:47-85` |
| Q9 | Include/join the affiliate instead of the `.map()` N+1; allow-list `sortBy` | `app/api/admin/users/route.ts:87, 119-143` |
| Q10 | Filter the revenue aggregate by status and date; stop counting the same 15 totals per render | `app/api/admin/stats/route.ts:38-52, 65, 76` |
| Q11 | `createMany`/`createManyAndReturn` for attempt answers and detailed results | `lib/inngest/paper3-exam-functions.ts:258-277, 319-333` |
| Q12 | Atomic increments for `user_stats` / `paper3_user_stats` instead of read-then-write | `app/api/quizzes/attempts/route.ts:111-160`; `app/api/paper3/practice/[questionId]/check/route.ts:128-158` |
| Q13 | `take`-limited, SQL-ordered mock question selection; unbiased shuffle | `lib/mock-generator.ts:250-261, 305-329` |
| Q14 | Cap unbounded `findMany`s and add cursors: chat conversation delete (`:124`), comments (`/api/community/posts/[id]/comments/route.ts:73`), performance list (`/api/performance/route.ts:87`), posts (`/api/search/route.ts:78`), attempts (`/api/quizzes/[id]/attempts/route.ts:21`) | as cited |
| Q15 | tsvector/GIN-backed note search; drop `ILIKE '%…%'` on `extractedText` from the chat tool | `lib/ai/tools.ts:144-156`; `app/api/search/route.ts:35-97` |

### 6.3 Exact work to move to Inngest

Per §2.2–§2.3. The five that matter most, with triggers:
1. `quiz/grade-attempt` — event on quiz submit; returns `202 { processingStatus }` and the UI polls like the Paper 3 result page already does.
2. `chat/title` — event on first message; removes a blocking 10 s model call from the first turn.
3. `revision-guide/generate` — event; status column + existing 5 s poll.
4. `report/render` — event; UploadThing output; cache by type+date.
5. `payment/notifications` — event from the Fapshi webhook; webhook returns 200 immediately.
Plus config on all 23 existing functions: explicit `retries`, `concurrency` limits keyed on `userId`, and `idempotency` keyed on the entity id (`attemptId`, `quizId`, `mockId`) so a retry cannot double-generate or double-debit.

And the three rollup crons: `kpi/rollup-daily` (23:30), `leaderboard/rebuild` (hourly), `leaderboard/prune` (04:00).

### 6.4 Exact caching changes

1. `cacheComponents: true` in `next.config.ts`, then move `getPlatformSettings` (`lib/platform-settings.ts:102`), catalog reads and `computeReadiness` into `lib/data/*` with `'use cache'` + `cacheLife` + `cacheTag`; read `session` outside and pass `userId` as an argument (cached scopes cannot read `cookies()`/`headers()`).
2. `revalidateTag('platform-settings', 'max')` in the admin settings mutation; `revalidateTag('catalog')` in admin blueprint/mock mutations; `revalidateTag('profile:<id>')` in `POST /api/performance`.
3. `cache()`-wrap `getActiveProfileId` and `getPlatformSettings` for per-request dedupe.
4. 60 s server cache for `/api/usage` keyed by `userId`, invalidated by credit/plan writes.
5. Cache the AI layer in Postgres (`ai_cache` table) with an in-process LRU in front; delete the unbounded `Map` in `lib/ai/cache.ts:10`.
6. On Vercel, do not rely on the default in-memory `use cache` handler for runtime reuse — use the Postgres/Redis cache for runtime caching, and treat `use cache` as the prerender/shell tool.

### 6.5 Top ten changes by impact

1. **Move AI grading out of `POST /api/quizzes/attempts`** (today: up to N × 10 s in-request, `quizzes/attempts/route.ts:49,63`). Unbounded response time on the most common study action.
2. **Delete the blocking title generation from the chat request** (`ai/chat/route.ts:32-51, 240`) and cut the ~10 pre-stream queries to 3 cached ones. This is the difference between a chat that feels instant and one that feels broken.
3. **Truncate the Paper 3 mock payload** (`paper3/mocks/[mockId]/route.ts:47-85`) — bytes on a metered connection *and* the answer key.
4. **Ship the index set in §1.4.** Leaderboards, chat quota counts and Paper 3 rankings are all index-supported queries today, and all three degrade linearly without them.
5. **Replace the Paper 3 stats N+1** (`paper3/stats/route.ts:54-79`) and stop writing on a GET.
6. **Fix the connection config** (`lib/prisma.ts:5-7`): pooled string + `max: 2` + `connectionTimeoutMillis: 8000`. Prevents the failure mode where a busy morning turns into a hung phone for everyone.
7. **Build the leaderboard snapshot table + hourly cron**, so no leaderboard view ever runs a `COUNT(*)`.
8. **Fix shiki in the chat bundle** (`code-block.tsx:16` → `shiki/core` + dynamic import). Biggest single JS byte reduction on the hottest route.
9. **Serve admin metrics from rollups, not from `groupBy` over `kpi_events`** (`admin/metrics/route.ts:56-105`, `lib/kpi.ts:171-250`). Removes the only 60-query request in the app.
10. **Add CI budgets and field measurement** — `@next/bundle-analyzer` against §4.2, plus `web-vitals` LCP/INP/CLS reported to an endpoint (the library and thresholds are at https://github.com/GoogleChrome/web-vitals and https://web.dev/articles/vitals). Without field data on real Cameroonian networks, every number in this document is a hypothesis.

### 6.6 Verification plan

1. `EXPLAIN (ANALYZE, BUFFERS)` before/after for each rewritten query, on a copy seeded to ≥100k rows in the relevant tables.
2. `pnpm build` then bundle-analyzer; compare every route against §4.2.
3. Lighthouse mobile (Slow 4G preset) on `/chat`, `/practice`, `/dashboard`, `/leaderboard` — record LCP/INP/CLS and the network waterfall.
4. Field RUM via `web-vitals` → your own endpoint (or PostHog, which `package.json` already carries), segmented by `navigator.connection.effectiveType` so you can see the `3g`/`2g` cohort separately. web.dev documents using the Network Information API to adapt to connection quality: https://web.dev/articles/adaptive-serving-based-on-network-quality.
5. Load-test the leaderboard and usage endpoints at 20 concurrent Vercel lambdas against a pooled Neon branch to confirm the pool sizing.

---

## 7. Unverified items

- **Production database host and pooling** — `.env` is local Docker; `.env.example:7` mentions Neon but only as a comment. Confirm from the Vercel project: is the runtime `DATABASE_URL` pooled? Does `DIRECT_URL` exist for `prisma.config.ts`? Everything in §3.4 depends on this.
- **Production schema drift** — `AGENTS.md` records that `db push` was used and migrations were skipped, so the live indexes may differ from `schema.prisma`. Diff before applying any DDL.
- **Current Neon compute size** — determines `max_connections` and therefore the safe `max` per lambda. Check `SHOW max_connections;` (Neon documents this: https://neon.com/docs/connect/connection-pooling).
- **Whether `lib/inngest/trigger.ts`'s relative `fetch` actually errors in production** — it cannot succeed as written from the server, but whether it currently throws or is silently caught is **[unverified]**; the `.catch(console.error)` at `lib/auth.ts:87` suggests it is being swallowed.
- **Actual bundle sizes** — every size claim here is structural (which modules are reachable from which route), not measured. Run bundle-analyzer before sizing the work.
- **Inngest plan limits** — concurrency ceilings and step-duration limits depend on the plan; confirm before designing the per-question parallel grading in `paper3/evaluate-exam`.
- **Real field performance** — no RUM is installed (`@vercel/analytics` is present but does not report INP/LCP/CLS). All budgets in §4 are targets, not measurements.