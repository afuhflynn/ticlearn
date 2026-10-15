# Review, chore-platform-env-template, 2026-10-15

**Reviewed by**: step-5-preview-free (author on step-5-preview-free)
**Scope**: 17 changed tracked files plus 33 untracked files, uncommitted working tree
**Verdict**: Blocked

## Summary

The change adds the promised composite index scripts and moves several hot routes toward bounded reads, parallel reads, and stored counters. The usage route, admin metrics limits, chat delete batching, and the atomic point increment are all in the right direction. The blocker is in the community post detail route, where the like flag is computed from a field the query never selects. There are also real acceptance criteria gaps around leaderboard counts and the leaderboard index, plus counter drift paths.

## Blocker

### Post detail like flag never matches the signed in user, `app/api/community/posts/[id]/route.ts:55`
**Problem**: The query selects `likes: { select: { id: true } }` at line 45, but the route then checks `like.userId` at line 55. Because `userId` is not selected, `like.userId` is always `undefined`, so `isLiked` is always `false`.
**Why it matters**: A student who already liked a post sees the post as unliked. Pressing the like button again can race against the unique `PostLike` constraint and fail with a 500 instead of unliking the post.
**Suggested fix**: Select the fields the route needs, such as `userId`, or filter the likes relation by `userId` and use the row count. Add a test that respects the Prisma `select` shape instead of mocking fields outside it.

## Major

### Admin users sort allowlist can be bypassed by prototype names, `app/api/admin/users/route.ts:43`
**Problem**: `allowedSort[sortBy]` returns truthy for keys such as `__proto__`, `constructor`, or `toString`, so the guard at line 44 does not reject them. The route then builds a Prisma `orderBy` with an invalid key.
**Why it matters**: The acceptance criteria require 422 for an invalid sort column or direction. This path can return 500 instead and weakens the scan vector protection the allowlist was meant to close.
**Suggested fix**: Check own property presence first, for example `Object.hasOwn`, then read the allowed column from a null prototype map.

### Leaderboard still counts every eligible row on each request, `app/api/leaderboard/route.ts:48`
**Problem**: The route calls `prisma.userStats.count` for `total` on every leaderboard read, alongside the rank count.
**Why it matters**: AC-1 asks for no full table count per view. The rank count is allowed, but the pagination total is a full count and still runs per view.
**Suggested fix**: Remove `total` and `totalPages` from the response, serve them from a stored total or cache, or document why this count is an allowed pagination exception.

### The leaderboard composite index is missing from the Prisma schema, `prisma/schema.prisma:318`
**Problem**: The new route orders by `totalPoints` desc and `userId` asc, but the schema only declares `@@index([totalPoints])`. The composite index exists only in the raw SQL apply script.
**Why it matters**: A fresh environment built from schema and migrations does not get the index the new route depends on. This breaks the spec claim that fresh environments converge through the schema while live stays safe through the script.
**Suggested fix**: Declare the composite in the schema with the correct sort direction, and keep the raw script for the live apply path.

### Quiz average score and streak still race under concurrent submits, `app/api/quizzes/attempts/route.ts:163`
**Problem**: Total points and quizzes taken use atomic increments, but `avgScore`, `currentStreak`, and `longestStreak` are read from `existing` and written as computed values in the same transaction.
**Why it matters**: Two simultaneous submits can read the same prior stats and both write one streak or average update. The spec expects these derived values to be recomputed on read, not maintained by a read then write.
**Suggested fix**: Keep only the atomic counters on write and compute average score and streak from attempt history on read, or express those updates in one atomic statement.

### Stored community counters drift when comments and likes are deleted in bulk, `app/api/admin/users/[id]/route.ts:183`
**Problem**: The admin user delete transaction deletes comments and post likes, but it does not decrement `Post.likeCount` or `Post.commentCount` on the posts those rows belong to.
**Why it matters**: A deleted student can leave wrong totals on other students' posts. The counter model needs a decrement or a rebuild on every delete path, not only on the normal unlike route.
**Suggested fix**: Gather affected post ids before deleting, then decrement or recompute their counters in the same transaction. Add a regression test for the admin delete path.

### The post detail test proves a mock, not the route, `tests/app/api/community-post-id.test.ts:67`
**Problem**: The test mocks `likes: [{ id: "l1", userId: "student-1" }]`, but the route selects only `id`. The test therefore passes even though the real Prisma result has no `userId`.
**Why it matters**: It gives false confidence and allowed the blocker above to stay green. Mocks should respect the query contract.
**Suggested fix**: Mock the exact select shape, or better, test against a lightweight query layer that returns selected fields only. Add a case for a post the current user has not liked.

## Minor

### Metrics export reads up to 10000 rows, `app/api/admin/metrics/export/route.ts:36`
The export is bounded, but the general list cap in AC-9 is 100. Either document this as a deliberate export allowance or stream the CSV so large ranges do not build one big string in memory.

### Usage route loads a user relation it never uses, `app/api/usage/route.ts:35`
The active subscription read includes `user: { select: { id: true } }`, but the route never returns a profile id. Either remove the extra include or use the profile id as AC-2 describes.

### Search silently falls back when the indexed path fails, `app/api/search/route.ts:89`
The catch returns `null` for any failure, including a database outage or a coding error, then runs plain matching. Log the first failure so a broken index does not hide behind a silent fallback.

### Post counter backfill runs three queries per post, `scripts/db-indexes/backfill-post-counters.ts:19`
The batching and pause are good, but per row counts plus updates can be slow on a large posts table. Prefer grouped counts per batch and one update command per batch.

### Daily metrics sort accepts unknown sort values and sends an empty order object, `app/api/admin/metrics/route.ts:173`
The sort parameter is trusted. Validate it against date, metric, and value, and reject unknown values with 422 so Prisma never receives an empty object in the order array.

### Several single column indexes now sit beside wider composites, `prisma/schema.prisma:280`
Wider composites cover the leftmost prefix for most reads, so the older single column indexes add write cost without serving new queries. A later cleanup can drop the ones that are truly redundant.

## Nits

- `app/api/admin/metrics/export/route.ts:52`, the CSV response could declare a charset with the content type.
- `scripts/db-indexes/verify-plans.sh:15`, only the leaderboard plan is re recorded here, so the other plan files stay manual by design and should say so.

## Strengths

- Usage and admin metrics now read in parallel and keep bounded reads.
- Search returns 422 for an empty query before touching the database.
- Quiz total points and quizzes taken are incremented atomically inside the attempt transaction.
- The index scripts are explicit about concurrent builds and avoid paper or exam tables.

## Test coverage

Covered: leaderboard page caps and rank filtering, usage scoping, admin sort errors and affiliate batching, search empty query and indexed path, chat delete batching, quiz answer cap and atomic point increment, stored community like counter, and the index script rules.

Not covered: prototype sort names, the post detail like flag with a real Prisma select, counter drift on bulk deletion, concurrent quiz submits, and presence of the leaderboard composite in the Prisma schema.
