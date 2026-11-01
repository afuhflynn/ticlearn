# 0034. Low docked runner card: rationale

## Context

The chat quiz runner from spec 0031 works but it lives up in the message thread. On a phone the student scrolls past a tall thread to reach options, and the thread keeps growing while practice runs. The approved reference shows a better shape: a low card pinned just above the reply box with one question at a time plus dots plus Back plus Next plus hint plus a mode toggle. The forces are thumb reach on small screens, calm layout with no jump, instant taps on shaky network, and zero new server state in this slice.

## Options considered

### Option 1: Fix in place and move the current runner low

Extend the current thread runner into a docked card pinned above the composer. Reuse the same quiz rows plus generate plus attempts plus grade endpoints. Extend the browser snapshot with mode plus hint open plus minimized state and bump the snapshot version.

**Pros**:
- Least new code and no server migration.
- Keeps the proven mark plus save plus handoff rules from spec 0031 exactly as built.

**Cons**:
- The thread component grows new layout duties and needs careful cleanup so old snapshot shapes still load.

### Option 2: Strangler with old and new runners side by side

Build a new docked runner next to the old thread runner behind a flag, migrate traffic slowly, then retire the old card.

**Pros**:
- Safe rollback because the old card stays live during the cutover.

**Cons**:
- Two runner paths to maintain plus flag cleanup plus double the tests for one placement move.

### Option 3: Rebuild as a new dock component with server held run state

New docked component plus new server columns for spot plus answers plus mode so reload pulls from the server and works across devices.

**Pros**:
- True cross device resume with the server as the single source of truth.

**Cons**:
- Needs a migration plus backfill plus conflict rules for concurrent tabs plus more cost before the placement win is proven.

## Rationale

The runner logic already works and the scope row asks for placement plus dots plus Back plus Next plus hint plus toggle only. A move in place delivers that win in one Tracer Bullet slice with the smallest blast radius. Server held state can wait until the browser snapshot proves lossy in real use.

Hints ride in the quiz metadata map keyed by question order so no schema change ships. The cross check during design caught eight gaps (hint shape, flashcards layout, minimized bar content, composer behavior, dot labels, switch versus close, retry cost, height cap) and all eight were resolved into the spec before build.
