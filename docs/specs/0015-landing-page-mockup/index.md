# 0015 · Landing page rebuilt from the preferred mockup

Status: accepted, 2026-10-23
Supersedes the page sections of [0014](../0014-landing-page-rebuild/index.md). The cut surfaces, the dashboard, the guard and the honesty script stay; only the landing page's layout and copy are replaced.

## Goal

Rebuild `/` to follow `public/TiCLearn E-Learning Platform Landing Page.png`, section for section, while keeping the TiCLearn logo, the product's real material, and the free limits paid over Mobile Money.

## Decisions

- The mockup is the layout and copy reference.
- The brand is ours. The tutor is **Tip**, never the theme's “TIC tutor”.
- The theme's placeholder panels are not used. The frames hold real screenshots of the running app.
- The hero has two buttons and no question box. The `/chat?q=` route stays reachable from elsewhere.
- “What is free” and the MTN/Orange Mobile Money line are kept, adapted into the dark CTA band.
- The page may keep the mockup's section names (“progress”, “feedback”) because Tip already reports study progress and quizzes already show what was missed. It still prints no fee, no percentage and no phone number.

## Sections

| # | Section | Anchor | Content |
|---|---|---|---|
| 0 | Announcement strip | — | “Built for the way university students actually study.” Landing page only. |
| 1 | Header | — | Logo; How it works, Study tools, For students, FAQ; Log in, Start studying. |
| 2 | Hero | — | Badge, “Make your course notes make sense.”, the mockup's subline, Start studying (`/sign-up`), Explore how it works (`/#how`), the micro line, and the note view screenshot in the browser frame. |
| 3 | Benefits | — | Your course materials first · Understand, don't just memorize · Feedback you can act on. |
| 4 | How it works | `#how` | “One place to move from confusion to practice.” Three cards: Ask Tip, focused practice, review next. Each holds a real screenshot. |
| 5 | Study loop | `#tools` | “A simple cycle for better learning.” Four steps. |
| 6 | Subjects | `#students` | “Made for real coursework.” Four authored subject cards. |
| 7 | Get started | `#start` | “Your lecturer's notes are the starting point.” Upload panel linking to `/sign-up`, then the four-item checklist. |
| 8 | FAQ | `#faq` | The mockup's four questions, answered honestly. |
| 9 | CTA band | `#free` | “Study with more direction.”, free limits from `FREE_LIMITS`, MTN/Orange Mobile Money, link to `/pricing`. |
| 10 | Footer | — | Logo, tagline, Product / Support / Legal, the Cameroon line. |

## Imagery

- Hero frame: `/marketing/note-view-1280.webp` (phone: `note-view-375.webp`).
- Card 1: `/marketing/tip-answer-1280.webp`.
- Card 2: `/marketing/quiz-question-1280.webp`.
- Card 3: `/marketing/attempt-result-1280.webp` (new capture from the seeded demo).

## Honesty rule

`scripts/check-landing-honesty.mjs` stops banning **progress** and **feedback**, because both describe shipped behaviour (Tip's study-progress tool, quiz review). It keeps banning community, leaderboard, affiliate, readiness, exam, mock, GCE, A level, Paper 1/2/3, streak and score, and it keeps failing on a currency amount, a bare percentage and a phone number.

## Acceptance criteria

- AC-1 `/` renders every section above, in that order, at 375 px, 768 px and 1280 px, with no horizontal scroll.
- AC-2 The hero has two links and no text input.
- AC-3 The four frames show real screenshots, each with descriptive alt text.
- AC-4 The free limits are read from `FREE_LIMITS`; the page names MTN Mobile Money and Orange Money and links to `/pricing`.
- AC-5 Every in-page anchor resolves; every header, card and footer link targets a shipped route or an anchor on the page.
- AC-6 `pnpm ui:check`, `pnpm honesty:check`, `pnpm lint`, `tsc --noEmit` and `pnpm test --run` pass.
- AC-7 The page still renders without JavaScript (sections are server components; only the FAQ accordion and the nav are client islands).

## Out of scope

- Building the progress, weak-area or subjects screens the mockup depicts.
- Reintroducing the hero question box.
- Any change to the dashboard, the guard or the cut surfaces.
