# Verify: simple true visuals with fallback · spec 0046 · updated Nov 4 2026
_Steps derived from spec 0046 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Ask Tip to draw a light ray through glass in chat with a note in play → clean thin line art shows with plain labels plus one caption plus three short steps beside it on desktop → AC-1, AC-2, AC-5
- [ ] Resize to a narrow phone width → steps stack below art with no squeeze and no overlap → AC-2
- [ ] Force a failed draw by sending a vague concept then watch the card → calm notice shows plus manual retry plus numbered steps stay on screen → AC-3
- [ ] Send a draw that returns broken markup or too large art → same calm notice plus retry shows and no raw markup reaches the thread → AC-4
- [ ] Inspect a fresh draw with a screen reader → one plain alt sentence reads plus one short caption shows under art → AC-5
- [ ] Watch the thread while the draw builds → activity line reads Drawing your diagram, on failure it reads the plain failure sentence → AC-6
- [ ] Watch the art slot while the model works → shape matched skeleton shows with streamed answer text beside it and no spinner anywhere → AC-7
- [ ] Draw the same idea a fourth time in one day → daily limit notice shows with steps and no retry control → caps row
- [ ] Open the same thread on a wide screen then a phone → art plus steps read well in both with reduced motion honored → AC-2, AC-7
## Commands
- [ ] `pnpm exec vitest run tests/components/chat-art.test.tsx tests/components/art-card.test.tsx tests/lib/visual-artifacts.test.ts tests/app/api/artifacts-generate.test.ts` → all pass → AC-1, AC-3, AC-4
## Acceptance-criteria coverage
- AC-1 covered by step light ray art plus command suite · AC-2 covered by step beside and stacked plus wide and phone check · AC-3 covered by step failed draw · AC-4 covered by step broken markup · AC-5 covered by step reader plus caption · AC-6 covered by step activity line · AC-7 covered by step skeleton wait
