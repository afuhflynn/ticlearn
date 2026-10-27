# 0025. Hackathon baseline and public repository safety

**Date**: 2026-10-27
**Status**: Accepted

## Summary

Set up the TiCLearn repository for the Meta Global AI Developer Hackathon by recording the starting commit, creating the hackathon branch, scanning git history for secrets, and documenting pre-existing versus new work in HACKATHON.md. You will make the repo public yourself on GitHub. Nothing in this feature changes application code.

## Requirements

**User stories**:
- As a TiCLearn maintainer, I want a recorded starting commit and hackathon branch so judges can separate pre-existing work from hackathon work.
- As a TiCLearn maintainer, I want git history scanned for secrets before the repo goes public so no credentials are published.
- As a TiCLearn maintainer, I want HACKATHON.md documenting which Meta models are used and for what so the hackathon submission is self-explanatory.

**Acceptance criteria**:
- **AC-1**: Hackathon branch created from main and the starting commit SHA recorded in HACKATHON.md.
- **AC-2**: Secret scan of main branch complete with no keys or credentials found.
- **AC-3**: HACKATHON.md written and committed with pre-existing vs new work, Meta model usage, Baseten visual analysis, and demo paths.
- **AC-4**: Repository set to public on GitHub (done by you, outside this spec).

## Decision

**Chosen option**: Option 1: close out remaining baseline items only.

The branch `hackathon/muse-study-loop` already exists from `main` and HACKATHON.md already records the starting commit SHA, the pre-existing versus new work split, how Muse Spark 1.3 and Baseten are used, and the demo paths. The only uncompleted baseline items are the secret scan and your public visibility step on GitHub. Option 1 avoids re-doing work that is already done while still achieving the goal: a public repo with no secrets in history and a clear record of what is new.

**Implementation skills**: none

## Feature design

**Data model sketch**:
No database changes. This feature operates on git history, GitHub repository settings, and documentation files only.

**State transitions**:
Not applicable. No state machine.

**API surface**:
Not applicable. No application endpoints are added or changed.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Record starting commit | Commit SHA | `git rev-parse HEAD` on main |
| Record branch name | Branch name | `git branch --show-current` |
| Secret scan result | Keys found or none found | Git history scan of main branch |

**Key invariants**:
- No API keys, credentials, or production data committed to the repository.
- The starting commit SHA must be the SHA on `main` before hackathon work began.
- HACKATHON.md must clearly separate pre-existing work from hackathon work.

**Security model**:
- Repository visibility: public on GitHub (set by you).
- Secret scan scope: main branch only, all commits.
- No new environment variables or credentials are introduced by this feature.

**Configuration required**:
None. No new env vars or third party credentials.

## Critical test scenarios

- Happy path: branch exists from main, SHA recorded in HACKATHON.md, secret scan returns no keys, repo is public — verifies AC-1, AC-2, AC-3, AC-4.
- Failure case: secret scan finds a key or credential in history — scan must surface it before the repo goes public — verifies AC-2.
- Auth/permission: not applicable — no application auth or permission changes — verifies none (out of scope).

## Build plan

1. Record the starting commit SHA `038bb7c781970ae3a9e9bc077f1679185f76d02f` and branch `hackathon/muse-study-loop` in HACKATHON.md (already done) — satisfies AC-1.
2. Scan main branch git history for secrets, keys, and credentials — satisfies AC-2.
3. Commit HACKATHON.md if not already committed — satisfies AC-3.
4. Make the repository public on GitHub (you do this outside the codebase) — satisfies AC-4.

## Consequences

**Positive**:
- Judges can see what existed before the hackathon and what is new.
- No secrets are published when the repo goes public.
- HACKATHON.md makes the Meta model usage self-explanatory for the submission.

**Negative / tradeoffs**:
- The secret scan covers main branch only; secrets on other branches are not checked.
- Making the repo public is a manual step outside this codebase and cannot be enforced by a build task.

**Neutral**:
- No application code changes, so no build, test, or migration is required for this feature.

## Follow-up

- [ ] If the secret scan finds anything, rotate the exposed key and re-scan before making the repo public.
