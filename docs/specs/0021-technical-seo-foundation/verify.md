# Verify: technical SEO foundation · spec 0021 · updated 2026-10-26
_Steps derived from spec 0021 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._

_Steps derived from the acceptance criteria and the value sourcing table. `/verify-release` runs these; `/test-engineer` locks the durable ones._

**Run 2026-10-26**: nine of the fifteen steps ticked, against a fresh `pnpm build` and `pnpm start` on port 3007. The two WhatsApp steps stay open because they need a real chat and a deploy. The last command step stays open: `ui:check` and the suite pass, but `pnpm lint` fails with 14 errors and `pnpm typecheck` with 9, all in files this feature did not touch. Value steps 1 and 2 were covered at the helper level by `tests/lib/seo.test.ts` rather than by editing the constants. Value step 4 cannot pass as written: the honesty gate holds a fixed list of ten paths, so a new marketing page is never fetched (the missing canonical rule itself was exercised and does fail the run).

**UI / manual**

- [x] Open `/` and view source: a title, a description written for this audience, a self referencing canonical, an `en-CM` alternate, `og:image` = `/og/home.png` with width 1200 and height 630, a `summary_large_image` Twitter card, exactly one Organization block and exactly one WebSite block → AC-1, AC-2, AC-3, AC-6
- [x] Repeat on `/about` and `/faq`: each carries its own image (`/og/about.png`, `/og/faq.png`) at the same declared size, and no WebSite block → AC-3, AC-6
- [x] Repeat on `/pricing`, `/contact`, `/terms`, `/privacy`: the default image, one Organization block, no WebSite block → AC-3, AC-6
- [x] Repeat on `/sign-in`, `/sign-up`, `/verify-email`: the title, description, canonical, alternate, image and card are in the raw HTML before any script runs (the pages are client forms behind a server wrapper), and each is `index, follow` → AC-1, AC-2, AC-6
- [ ] Paste `/` and `/faq` into a WhatsApp chat and wait for the preview: the picture shows, no blank tile, and the description names the product rather than a secondary school → AC-1, AC-3
- [ ] Share `/pricing` and confirm the preview names the price, then share `/about` and confirm it states no amount → AC-8

**Commands**

- [x] `pnpm build && pnpm start`, then `node scripts/check-landing-honesty.mjs http://localhost:3000`: ten pages pass, every page is asked for a canonical, an amount, a phone number, a bare percentage or a cut surface fails the run → AC-8, AC-2
- [x] `curl -s http://localhost:3000/robots.txt`: every authed prefix is disallowed and the sitemap line is present → AC-5
- [x] `curl -s http://localhost:3000/sitemap.xml | grep -c '<loc>'`: ten, and none of them starts with an authed prefix → AC-4
- [ ] `pnpm ui:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test --run`: all pass, with only the two test file type errors that already exist at `HEAD` → AC-1 to AC-8

**Value sourcing checks (exercise each source)**

- [ ] Change `SITE_URL` in `lib/seo.ts`: every canonical, `og:url`, alternate, sitemap entry and the robots sitemap line move together, and no file outside `lib/seo.ts` needs editing → AC-5, AC-7
- [ ] Add a path to `AUTHED_PREFIXES` in `lib/seo.ts`: `/robots.txt` disallows it, and the sitemap filter drops it if it was listed → AC-4, AC-5
- [x] Put an amount of money in the `/about` copy: the honesty gate fails on `/about` only, and `/pricing` still passes → AC-8
- [ ] Add a page under `app/(marketing)` without `publicPageMetadata`: the gate fails it for the missing canonical → AC-1, AC-2
- [x] Sign in and open `/dashboard`: the served HTML carries `noindex, nofollow`, and `/robots.txt` disallows the prefix → AC-5

**Acceptance-criteria coverage**

- AC-1 titles and descriptions: UI steps 1 to 4, value step 4 · AC-2 canonical and en-CM: UI steps 1 to 4, value steps 4 and 5 · AC-3 OG image and Twitter card: UI steps 1 to 3, 5 · AC-4 sitemap: command 3, value step 2 · AC-5 robots and noindex: commands 2, value steps 1, 2, 5 · AC-6 structured data: UI steps 1 to 4 · AC-7 shared helper: value step 1 · AC-8 honesty: UI step 6, command 1, value steps 3 and 4

## Re-check after the suite, 2026-10-26

`/test-engineer` found three defects the first pass missed. They are fixed, and these steps prove the fix.

- [ ] Open `/og/home.png`, `/og/about.png`, `/og/faq.png` and `/og/default.png`: four pictures that differ from each other, each 1200 by 630, each holding a real capture of the app → AC-3
- [ ] Change a capture under `public/marketing/`, run `pnpm og:build`, and confirm the four cards rebuild without touching `public/og/` by hand → AC-3
- [ ] On `/sign-in` and `/sign-up`, tab to the eye control beside the password field: a screen reader announces "Show password", and it flips to "Hide password" once the field is readable → AC-1 (accessibility)
- [ ] `pnpm test --run` → 880 passing, 0 failing, so AC-1 to AC-7 hold in the suite; the honesty gate still needs a running server (see command step 1) → AC-1 to AC-8
