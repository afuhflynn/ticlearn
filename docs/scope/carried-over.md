# Carried over

What already exists in the codebase. Enrolled for context only. `existing` is not `done`: it predates this workflow, so `/feature-build` and `/state-sync` leave these alone.

Much of this code was built for Cameroonian secondary school students and is being repointed by [Pivot](pivot.md) and rebuilt by the slices. Treat every row here as "the machinery exists", not "the experience is right".

### A. Accounts and sessions · existing
Email and password with verification, Google sign in, sessions, roles, route guards, and Arcjet wired at the edge. Code in `lib/auth.ts`, `app/(auth)/`, `proxy.ts`. Rebuilds inside [Platform](platform.md) for phone free sign up and in [Onboarding](../market.md#16-onboarding) for the university profile.

### B. AI tutor engine · existing
Streaming chat with tools, a model orchestrator, an AI message UI layer, and a chat interface. Code in `lib/ai/`, `app/api/ai/chat/`, `components/chat/`, `components/ai-elements/`. Rebuilds in [Tutor](../tutor.md).

### C. Note upload and text extraction · existing
Upload of PDF, Word and images, text extraction, and an async ingest job. Code in `app/api/notes/`, `lib/uploadthing*.ts`, `lib/inngest/question-ingest.ts`. Rebuilds in [Content](../content.md).

### D. Quiz engine · existing
Quiz generation from notes, a quiz taker, attempts, and answer grading. Code in `lib/ai/index.ts`, `app/api/quizzes/`, `app/(dashboard)/quizzes/`. Rebuilds in [Quiz generation flow](../content.md#23-quiz-generation-flow).

### E. Admin console · existing
A large admin surface: users, roles, subscriptions, metrics, platform and payment settings, affiliates, feedback, and a question and mock authoring pipeline. Code in `app/(admin)/admin/`, `app/api/admin/`. The GCE half is removed by [Delete GCE content](../platform.md#5-delete-gce-content-repoint-the-data-model).

### F. Leaderboard and community · existing
Three leaderboard tabs, a community of posts and comments, streaks, and shareable result cards. Code in `app/api/leaderboard/`, `app/api/paper3/leaderboard/`, `app/(dashboard)/community/`. Rethinks in [Deferred](../index.md#deferred).

### G. Mobile money payments · existing
Fapshi integration for subscriptions and credit top ups, plus a credits economy. Code in `lib/fapshi.ts`, `app/api/payment/`, `app/api/credits/`, `app/(dashboard)/subscription/`. Rebuilds in [Commerce](../commerce.md).
