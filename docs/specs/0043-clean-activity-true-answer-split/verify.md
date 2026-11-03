# Verify: clean activity plus true answer split · spec 0043 · updated 2026-11-02
_Steps derived from spec 0043 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Send a web question in chat → one activity line shows above streaming text with a human label such as Searching the web and a ticking clock, tap expands to ordered steps plus sources → AC-1
- [ ] Long answer with tool work → no tool name, reasoning note, plan sentence, or searched count appears in answer text, all inside the activity line → AC-2
- [ ] Watch a long run → final answer streams below the activity and settles to one clean block with no repeated setup or progress sentences → AC-3
- [ ] Collapsed line → reuses human labels, shows source count plus searched plus read counts where useful, unknown tool reads Working only → AC-4
- [ ] Send a question that triggers suggestions → suggestReplies never appears as a step, chips show only under the newest answer of the live turn, reload shows no chips → AC-5
- [ ] Stop mid stream → partial text kept plus a plain stopped note with Try again, no finished content dropped, retry regenerates → AC-6
- [ ] Fail one read mid run → expanded list shows a plain sentence with Technical details collapsed, final answer still lands clean → AC-7
- [ ] Open a quiz in chat plus a diagram → cards sit below clean text in text then quiz then visual order, reload shows collapsed activity plus saved answer once with no duplication → AC-8
## Commands
- [ ] `pnpm test --run tests/components/chat-activity-block.test.tsx` → 24 passed → AC-1, AC-2, AC-4
- [ ] `pnpm test --run tests/lib/chat/answer-filter.test.ts tests/lib/chat/activity-labels.test.ts tests/components/chat-message-list.test.tsx` → 38 passed → AC-2, AC-3, AC-4, AC-5, AC-6, AC-8
## Acceptance-criteria coverage
- AC-1 … covered by step 1 · AC-2 … covered by step 2 · AC-3 … covered by step 3 · AC-4 … covered by step 4 · AC-5 … covered by step 5 · AC-6 … covered by step 6 · AC-7 … covered by step 7 · AC-8 … covered by step 8
## Value sourcing
- [ ] Collapsed label such as Searching the web → derived from tool parts through lib/chat/activity-labels.ts → vary the query and confirm the label names it
- [ ] Elapsed time such as Worked for 55s → derived from stream start time on the client → confirm it ticks each second and settles to Thought for Ns
- [ ] Ordered steps plus source list plus failed note → derived from tool plus source parts in stream order → confirm order matches the run and the failed note stays inside the expanded list
- [ ] Clean teaching text → derived from text parts only, filtered for echoed build sentences → send a run that echoes I will search and confirm the teaching lands without it
- [ ] Quiz runner or visual below text → derived from card parts, placed after text → confirm order text then quiz then visual
- [ ] Collapsed activity plus saved answer on reload → derived from saved parts through normalize helpers → reload and confirm one collapsed line plus one answer, or the fallback line when the filter empties the answer
