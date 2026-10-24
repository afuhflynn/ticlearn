# 0017. Student onboarding flow

**Date**: 2026-10-24
**Status**: Accepted

## Summary

You can guide new students through a fast onboarding wizard that collects their level of study in under a minute. This ensures that every student gets a personalized AI tutor experience and accurate readiness scoring without filling out burdensome academic forms. The wizard is skippable and students can update their choices anytime in their settings.

## Context

When students join the platform, they need a frictionless way to set up their profile so that AI tutoring and quiz generation match their academic level. Past designs attempted to collect extensive institutional details like faculty and course at sign up, which caused high drop off rates because students abandoned long forms. Research shows that collecting only the essential level of study keeps setup fast while still providing the core academic context required for intelligent study guidance.

## Requirements

**User stories**:
- As a new student, I want to quickly select my study level so that the AI tutor understands my academic context immediately.
- As a student in a rush, I want the option to skip onboarding and configure my profile later.
- As a student changing programs, I want to update my level of study from my settings page.

**Acceptance criteria**:
- **AC-1**: New users are automatically directed to the onboarding wizard upon first sign in when onboarding is neither completed nor skipped.
- **AC-2**: The onboarding wizard collects the level of study in a single fast step taking under sixty seconds.
- - **AC-3**: Completing or skipping the wizard updates the user database record with the correct completion and skip flags.
- **AC-4**: The saved level of study correctly integrates with the AI prompt system and the readiness engine.
- **AC-5**: Students can view and update their level of study from the settings page at any time.

## Options considered

### Option 1: Level only fast wizard

A single focused step capturing the student study level, with a clear skip action and direct transition to uploading notes.

**Pros**:
- Extremely fast completion time under one minute.
- Minimizes user drop off during initial signup.

**Cons**:
- Captures minimal institutional detail initially.

### Option 2: Multi step academic questionnaire

A detailed wizard asking for university, faculty, department, and course of study before allowing access.

**Pros**:
- Collects comprehensive institutional metadata upfront.

**Cons**:
- High abandonment rate before students ever try the core features.

## Decision

**Chosen option**: Option 1: Level only fast wizard

You will implement a streamlined level selection wizard that keeps setup fast and frictionless, allowing students to start studying immediately.

**Implementation skills**: `nextjs` (`vercel/next.js`, `node_modules/next/`), `prisma` (`prisma/prisma`, `prisma/`)

## Rationale

Keeping onboarding limited to the single essential study level removes friction and respects the student time. Because the database schema already supports the level of study field on the user model, this approach avoids unnecessary data complexity while fully satisfying the AI context and readiness requirements.

## Feature design

**Data model sketch**:
- Uses existing fields on the `User` model in `prisma/schema.prisma`:
  - `levelOfStudy` (String, nullable)
  - `onboardingCompleted` (Boolean, default false)
  - `onboardingSkipped` (Boolean, default false)

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/onboarding/level | POST | levelOfStudy: string | success: boolean | session | 400, 401 |
| /api/onboarding/step | POST | step data | success: boolean | session | 400, 401 |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Save study level | User level of study preference | Request body input |
| Complete onboarding | Onboarding status flag | Database update |

**Key invariants**:
- Every authenticated user must have their onboarding status tracked so the app guard can route them correctly.
- The selected level must be non empty when onboarding is completed.

**Security model**:
- Authenticated routes protected by session validation in `proxy.ts`. Users can only update their own onboarding profile.

**Critical test scenarios**:
- Happy path: User signs in, selects study level, completes wizard, and reaches dashboard, verifies **AC-1**, **AC-2**, **AC-3**.
- Skip flow: User clicks skip, onboarding skipped flag is set, and user reaches dashboard, verifies **AC-3**.
- Update settings: User navigates to settings and changes study level, verifies **AC-5**.

## Build plan

1. Verify and refine onboarding wizard UI in `app/(onboarding)/onboarding/page.tsx`, satisfies **AC-1**, **AC-2**.
2. Verify onboarding API routes in `app/api/onboarding/` update `onboardingCompleted`, `onboardingSkipped`, and `levelOfStudy`, satisfies **AC-3**.
3. Confirm AI tutor and readiness engine correctly consume `levelOfStudy`, satisfies **AC-4**.
4. Add or verify settings page support for updating level of study, satisfies **AC-5**.

## Consequences

**Positive**:
- Fast onboarding leads to higher activation and lower drop off.
- AI tutor and readiness features receive accurate student context.

**Negative / tradeoffs**:
- Detailed institutional hierarchy is deferred to future roadmap slices if needed.

**Neutral**:
- Relies on existing database schema fields.

## Follow-up

- [ ] Monitor onboarding completion and skip rates through analytics events.
