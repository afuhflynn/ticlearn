# Verify: marketing pages refresh · spec 0048 · updated 2026-11-04
_Steps derived from spec 0048 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Open `/` as a signed out visitor, scroll to the dark band, and read the free line and the Mobile Money line → AC-1, AC-2
- [ ] Open `/pricing`, compare each card bullet and price against `constants/plans.ts`, and read the estimate line under the Semester price → AC-2, AC-3
- [ ] Open `/about`, `/faq`, `/contact`, `/terms`, and `/privacy`, and tap each contact link to confirm it opens the same WhatsApp group → AC-4
- [ ] Confirm the landing shows its eight sections in order with current screenshots and alt text, and that no page names a cut surface or a school exam → AC-1, AC-5, AC-7
- [ ] View source on each of the seven pages and confirm title, description, and canonical are present → AC-6
- [ ] Confirm all seven pages load with no session, signup redirects through sign in and back, and subscribe opens the Mobile Money link → AC-8
## Commands
- [ ] Run the honesty gate against a running build and confirm it passes on all seven pages → AC-9
- [ ] Search the built pages for email shapes, phone shapes, amounts outside `/pricing`, and headcounts, and confirm zero hits → AC-4, AC-9
## Acceptance-criteria coverage
- AC-1 … covered by UI steps 1, 4 · AC-2 … covered by UI steps 1, 2 · AC-3 … covered by UI step 2 · AC-4 … covered by UI step 3, command step 8 · AC-5 … covered by UI step 4 · AC-6 … covered by UI step 5 · AC-7 … covered by UI step 4 · AC-8 … covered by UI step 6 · AC-9 … covered by command steps 7, 8
