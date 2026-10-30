# Verify: targeted retry and progress update · spec 0029 · updated 2026-10-30
_Steps derived from spec 0029 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Open a quiz with a wrong answer as the owner, start a retry, see concept plus page tags plus excerpt plus one fresh question with four options → AC-1, AC-2
- [ ] Submit the retry with the right option text with extra spaces and mixed case, see proved state and weak area entry updated → AC-3
- [ ] Reload the review page mid pending, see the same retry resume through GET without a second create → AC-1
- [ ] Force model failure (bad key or invalid JSON), create a retry, see failed state with plain Try again control and review still readable → AC-5
- [ ] Open a retry with a foreign answer id as another user, see not found and no data → AC-4
- [ ] Create a fourth retry for the same answer in one day, see 429 → AC-6
## Commands
- [ ] `pnpm test --run tests/lib/retries/retry.test.ts` → all pass → AC-1, AC-2, AC-3
- [ ] `node scripts/check-prompts.mjs` → 23 files ok including retry prompt → AC-1, AC-2, AC-5
- [ ] `pnpm ui:check` → OK with no new raw aria → AC-1, AC-2
- [ ] `pnpm exec tsc --noEmit` → no errors in retries scope (four old errors in quiz gen and summarize remain) → all ACs
## Acceptance-criteria coverage
- AC-1 covered by step explanation plus pages plus excerpt · AC-2 covered by step fresh question with four options · AC-3 covered by step submit updates weakAreas · AC-4 covered by step foreign id 404 · AC-5 covered by step failure shows retry control · AC-6 covered by step cap 429 and no debit
