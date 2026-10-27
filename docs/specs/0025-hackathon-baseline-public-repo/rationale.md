# 0025 · Hackathon baseline and public repository safety — rationale

## Context

The hackathon rules require public repositories so judges can see the new work. Before going public, git history must be scanned for API keys, credentials, and production data so nothing sensitive is published. The starting commit SHA and the branch name must be recorded so judges can tell what existed before the hackathon and what was built during it. A HACKATHON.md file makes that distinction explicit.

**Secret scanner**: `gitleaks detect --source . --report-format json --report-path secret-scan-report.json` run against `main` and `hackathon/muse-study-loop`, using its default ruleset plus patterns for `sk-`, `pk_live`, `sec_`, `AWS_ACCESS_KEY_ID`, and `DATABASE_URL`.

**Definition of a secret**: any bearer or access key, API key, database connection string, or production credential matching the scanner ruleset. Placeholder or example values in `.env.example` are excluded and `.env.example` must contain no real key values.

## Options considered

### Option 1: Close out remaining baseline items only

The branch `hackathon/muse-study-loop` already exists from `main`, and HACKATHON.md is already written with the starting SHA, pre-existing vs new work table, Meta model usage, Baseten visual analysis, and demo paths. The remaining work is the secret scan of main, confirming the SHA is recorded, and you making the repo public on GitHub.

**Pros**:
- Fastest path to a public repo; most baseline work is already done.
- No duplicate effort re-creating the branch or rewriting HACKATHON.md.

**Cons**:
- Relies on the existing branch and HACKATHON.md being correct; no fresh verification of those artifacts.

### Option 2: Full end-to-end baseline re-run

Re-create the branch, re-document HACKATHON.md, run the secret scan, record the SHA, and prepare for public visibility as one complete documented pass.

**Pros**:
- Every baseline item is verified fresh, not assumed.
- A clean, repeatable process if the branch needs to be re-created.

**Cons**:
- Duplicates work already done (branch exists, HACKATHON.md exists).
- Slower for no added safety since the branch and doc are already in place.

## Rationale

The branch `hackathon/muse-study-loop` is already created from `main` and HACKATHON.md already records the starting commit SHA, the pre-existing versus new work split, how Muse Spark 1.3 and Baseten are used, and the demo paths. The only uncompleted baseline items are the secret scan and your public visibility step. Option 1 avoids re-doing work that is already done while still achieving the goal: a public repo with no secrets in history and a clear record of what is new.

## References

**Project sources**:
- `docs/scope/hackathon.md`: hackathon feature scope, row 48
- `HACKATHON.md`: hackathon build record, starting SHA, pre-existing vs new work
- `docs/scope/index.md`: at a glance table with hackathon rows

**Practices & standards**:
- Scan git history for secrets before making a repository public
- Document pre-existing versus new work for hackathon submissions

**Links**: none verified
