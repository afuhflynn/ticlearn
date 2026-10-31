# Verify: tutor voice and citation habit · spec 0032 · updated 31 Oct 2026
_Steps derived from spec 0032 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Open a revision chat on one note topic, exchange at least six turns, confirm the note is named at most once and later turns carry no from your notes preamble and no greeting → AC-1, AC-7
- [ ] In the same thread, confirm proof appears only where it matters as (p N) or one short quote with tag, and no passage repeats across turns → AC-2, AC-7
- [ ] Send a vague ask, confirm one short scoping question; send a clear ask, confirm teaching first with any check at the close → AC-3
- [ ] Ask about a topic the note does not cover, confirm Tip states the gap in plain words with no tag and no quote and offers practice → AC-5
- [ ] Miss one quiz question in chat, confirm the correction uses short tags and no note opener, matching chat voice → AC-6
- [ ] Shift topic mid thread to a different chapter or note section, confirm Tip reads again for the new topic → AC-4
## Commands
- [ ] `pnpm vitest run tests/prompts/tutor-voice.test.ts` → 12 passed → AC-1, AC-2, AC-4, AC-5, AC-6, AC-7
- [ ] `pnpm vitest run tests/prompts/chat-system.test.ts tests/lib/prompts/loader.test.ts` → passed → AC-2
- [ ] `pnpm exec biome lint tests/prompts/tutor-voice.test.ts` → clean → all ACs
## Acceptance-criteria coverage
- AC-1 … covered by six turn manual check plus `pnpm vitest run tests/prompts/tutor-voice.test.ts`
- AC-2 … covered by proof spot check plus voice test tag and quote assertions
- AC-3 … covered by vague versus clear manual check plus prompt wording test
- AC-4 … covered by topic shift manual check plus read once wording test
- AC-5 … covered by thin note manual check plus pivot tests in voice and correction prompts
- AC-6 … covered by quiz correction manual check plus parity tests
- AC-7 … covered by six turn clean sample assertions in the voice test
## Value sourcing
- Note title at most once → source is the conversation note record resolved by owner → vary the note across two chats and confirm each names its own note once → AC-1
- Page tag (p N) → source is the getNotePages tool result, never memory → ask for a page on a covered topic and confirm the tag matches the tool pages → AC-2, AC-4
- Short quote → source is note or attachment text in context, quoted once → confirm a quoted sentence matches the note text and never repeats → AC-2
- Checking question → source is ask vagueness judged in the prompt → vague ask gets one scoping question, clear ask gets teaching first → AC-3
- Practice offer on thin evidence → source is the empty or pending tool result plus the quiz tool → thin note yields no tag and a practice offer → AC-5
