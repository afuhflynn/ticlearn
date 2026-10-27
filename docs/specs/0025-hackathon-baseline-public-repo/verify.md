# Verify: Hackathon baseline and public repository safety · spec 0025 · updated 2026-10-27
_Steps derived from spec 0025 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._

## UI / manual
- [ ] Confirm `git branch --show-current` is on `main`, then `git rev-parse hackathon/muse-study-loop` returns `038bb7c781970ae3a9e9bc077f1679185f76d02f` and `git merge-base --is-ancestor 038bb7c781970ae3a9e9bc077f1679185f76d02f main` succeeds → the hackathon branch exists from main at the recorded starting SHA → AC-1
- [ ] Confirm `grep "038bb7c781970ae3a9e9bc077f1679185f76d02f" HACKATHON.md` finds the starting SHA recorded → AC-1
- [ ] Run `gitleaks detect --source . --log-opts="main" --report-format json` → no real keys, credentials, or production data (any matches are test fixtures or documentation placeholders only) → AC-2
- [ ] Run `gitleaks detect --source . --log-opts="hackathon/muse-study-loop" --report-format json` → same clean result → AC-2
- [ ] Confirm HACKATHON.md contains the pre-existing vs new work table, Meta model usage, Baseten visual analysis, and demo paths → AC-3
- [ ] Confirm HACKATHON.md, docs/scope/hackathon.md, and docs/specs/0025-hackathon-baseline-public-repo/ are committed → AC-3
- [ ] Confirm the GitHub repository visibility is set to public (manual step outside this codebase) → AC-4

## Acceptance-criteria coverage
- AC-1 covered by steps 1-2
- AC-2 covered by steps 3-4
- AC-3 covered by steps 5-6
- AC-4 covered by step 7
