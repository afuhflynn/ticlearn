# Carried over

What already exists in the codebase. Enrolled for context only. `existing` is not `done`: it predates this workflow, so `/feature-build` and `/state-sync` leave these alone.

Much of this code was built for Cameroonian secondary school students and is being repointed by [Pivot](pivot.md) and rebuilt by the slices. Treat every row here as "the machinery exists", not "the experience is right".

### A. Accounts and sessions · existing
Email and password with verification, Google sign in, sessions, roles, route guards, and Arcjet wired at the edge. Code in `lib/auth.ts`, `app/(auth)/`, `proxy.ts`. Rebuilds inside [Platform](platform.md) for phone free sign up and in [Onboarding](market.md#16-onboarding--needs-a-decision--ga) for the university profile.

### B. AI tutor engine · existing
Streaming chat with tools, a model orchestrator, an AI message UI layer, and a chat interface. The tutor is named Tip, grounded on the student's own note text and their level of study, and every AI task walks an open weight model chain pinned in `lib/ai/registry.ts`. Code in `lib/ai/`, `prompts/chat/`, `app/api/ai/chat/`, `components/chat/`, `components/ai-elements/`. Rebuilds in [Tutor](tutor.md).

### C. Note upload and text extraction · existing
Upload of PDF, Word and images, text extraction, and an async ingest job. Ingest also creates the note's topics, which is what mastery and the weak areas card are now measured against. Code in `app/api/notes/`, `lib/topics.ts`, `lib/uploadthing*.ts`, `lib/inngest/question-ingest.ts`. Rebuilds in [Content](content.md).

### D. Quiz engine · existing
Quiz generation from notes, a quiz taker, attempts, and answer grading. Every quiz now hangs off one of the student's own notes, so there is no path that makes a quiz without a note. Code in `lib/ai/index.ts`, `app/api/quizzes/`, `app/(dashboard)/quizzes/`. Rebuilds in [Quiz generation flow](content.md#23-quiz-generation-flow--needs-a-decision--ga).

### E. Admin console · existing
A large admin surface: users, roles, subscriptions, metrics, platform and payment settings, affiliates and feedback. The question, blueprint, mock, Paper 3, revision guide and upload authoring pipeline is gone from panel, routes and sidebar. Code in `app/(admin)/admin/`, `app/api/admin/`. Removed by [Delete GCE content](pivot.md#5-delete-gce-content-repoint-the-data-model--ga).

### F. Leaderboard and community · existing
One quiz leaderboard, a community of posts and public quizzes, and streaks. The Paper 3 tabs, the mock exam cards and the shareable result cards are gone with the exam engine. Code in `app/api/leaderboard/`, `app/(dashboard)/community/`. Rethinks in [Deferred](index.md#deferred).

### G. Mobile money payments · existing
Fapshi integration for subscriptions and credit top ups, plus a credits economy. Code in `lib/fapshi.ts`, `app/api/payment/`, `app/api/credits/`, `app/(dashboard)/subscription/`. Rebuilds in [Commerce](commerce.md).
