# Verify: smart setup that knows you · spec 0041 · updated 2026-11-02
_Steps derived from spec 0041 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Open `/onboarding/chat` as a new student, tap Year 2, tap a goal, type school plus program, tap confirm, expect landing on `/dashboard` with level plus goal saved → AC-1
- [ ] On `/onboarding/chat` confirm one query shows at a time in order level then goal then school plus program then confirm, with tappable picks plus progress plus skip → AC-2
- [ ] Tap Skip, expect dashboard opens and academic fields stay empty, then return to `/onboarding/chat` and expect saved step opens → AC-3, AC-4
- [ ] Leave mid flow on step 2, return later on another device, expect same step plus answers return → AC-4
- [ ] Type a bad level value direct to `POST /api/onboarding/progress`, expect 422 plus plain words and nothing saved → AC-5
- [ ] Finish setup then ask Tip a study query, expect answer pitched to saved level plus goal → AC-6
- [ ] Call setup routes with no session, expect 401; as another user id, expect denied → AC-7
- [ ] Double tap save twice with same step key, expect one progress row only → AC-8
## Commands
- [x] `SELECT * FROM onboarding_progress WHERE user_id='<id>'` shows one row per student → AC-8
- [x] `pnpm exec vitest run tests/proxy.test.ts` → all pass → AC-3, AC-7
## Acceptance-criteria coverage
- AC-1 covered by finish flow step · AC-2 covered by order step · AC-3 covered by skip step · AC-4 covered by resume step · AC-5 covered by bad value step · AC-6 covered by Tip step · AC-7 covered by auth step · AC-8 covered by double submit step
