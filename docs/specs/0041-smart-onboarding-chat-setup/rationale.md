# Rationale: 0041 Smart onboarding chat setup

## Context

New students now face a four step form that asks for school plus faculty plus program plus goal plus demographics plus year of study in one sitting. The form has no skip and no save of half done work, so a student who leaves must start over. Settings cannot change these fields later, so a mistake sticks. Tip does not read these fields yet, so the effort brings no clear reward in the first chat. The result is lower finish rates and a flat first run that feels generic.

## Options considered

### Option 1: Fix in place

Keep the current four step page and add smart defaults plus save of each step plus skip. Small change, same look, less risk.

1. Pro: Smallest build, reuses current page and route.
2. Pro: Easy to test, no new chat logic.
3. Con: Still feels like a form, less personal, lower lift on finish rate.
4. Con: Model help stays thin, Tip context gain is small.

### Option 2: Strangler chat beside the form

Build a new chat led setup beside the old page, run both for a time, move traffic bit by bit, then retire the old page (basis: strangler pattern for live changes).

1. Pro: Safe rollout, old page stays as fallback.
2. Pro: Lets you test tone and picks with real students before full cutover.
3. Con: Two paths to keep for a time, more test surface.
4. Con: Needs a progress store and a cutover plan.

### Option 3: Direct replace

Throw away the old page and ship a chat only setup at once.

1. Pro: One path only, no old code to keep.
2. Pro: Fastest to a pure chat feel.
3. Con: Highest risk, any bug blocks all new students.
4. Con: No fallback if the model drifts or the net is slow.

## Rationale

The current page works but feels heavy and gives Tip nothing to use, so a fix in place keeps the core pain. A direct replace risks blocking signup for every new student if the chat drifts or the save fails. The side by side path lets you prove fast finish plus resume plus safe validation on live traffic while the old page guards the funnel. It also fits the way you already build, thin end to end first then thicken, and it reuses the Tip chat route you already run (basis: your AGENTS.md Tracer Bullet approach).

## References

**Project sources**:
1. `AGENTS.md`, Tracer Bullet build approach plus request guard in `proxy.ts`.
2. Spec `docs/specs/0017-onboarding.md`, level only fast wizard.
3. Spec `docs/specs/0018-enhanced-onboarding.md`, four step academic set.
4. `app/(onboarding)/onboarding/page.tsx`, current four steps with no skip.
5. `app/api/onboarding/level/route.ts`, current save with age 15 to 50 check.
6. `proxy.ts`, guard that reads `levelOfStudy`.

**Practices and standards**:
1. Strangler pattern for live changes (basis: strangler pattern for live changes).
2. Idempotency keys for save operations (basis: idempotency keys for money operations).
3. Owner only access with session check (basis: OWASP session guidance).
4. One ask per screen with progress and skip for short forms (basis: short form completion practice).

**Links**:
1. Route Handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
2. Redirect: https://nextjs.org/docs/app/api-reference/functions/redirect
3. How migrations work: https://www.prisma.io/docs/orm/migrations/how-migrations-work
4. Generating Text: https://ai-sdk.dev/docs/ai-sdk-core/generating-text
5. Tool Calling: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
6. Select: https://www.radix-ui.com/primitives/docs/components/select
7. Query Keys: https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
8. Query Invalidation: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation
