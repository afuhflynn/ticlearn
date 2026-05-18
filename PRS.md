# TiCLearn - All PRs

Total: **37 PRs** across 5 phases + features

---

## Phase 0 - Foundational Architecture Refactor

| # | Branch | Description |
|---|--------|-------------|
| 1 | `feature/phase0-schema` | ExamLevel, Program, Component, ExamProfile models + nullable examProfileId on attempts |
| 2 | `feature/phase0-migration` | Seed exam structure + migration script for existing users |
| 3 | `feature/phase0-refactor-api` | Refactor 15 API routes to use profile-scoped queries with userId fallback |

## Phase 1 - Structured Onboarding + Profile Context

| # | Branch | Description |
|---|--------|-------------|
| 4 | `feature/phase1-schema` | Topic, UserTopicBaseline, KnowledgeChunk models + ExamProfile onboarding fields |
| 5 | `feature/phase1-seed` | 39 topics across CS P1/P2/P3 and ICT P1/P2/P3 |
| 6 | `feature/phase1-onboarding` | 5-step onboarding wizard + API routes |
| 7 | `feature/phase1-harvest` | Inngest harvest functions for note + Paper3 knowledge chunks |
| 8 | `feature/phase1-readiness` | Readiness engine + contextual dashboard |
| 9 | `feature/phase1-ai-context` | Profile-aware AI system prompt + searchKnowledge tool |
| 10 | `feature/phase1-middleware` | Dashboard layout guard → redirects to onboarding |

## Phase 1 Rework - Multi-Program Support

| # | Branch | Description |
|---|--------|-------------|
| 11 | `feature/phase1-rework` | ExamProfileProgram join table, removed single programId, multi-program readiness |

## Phase 2 - Generalized Content Ingestion Engine

| # | Branch | Description |
|---|--------|-------------|
| 12 | `feature/phase2-schema` | ExamSource + Question models, enums, migrations |
| 13 | `feature/phase2-upload` | Exam sources API, questions/ingest API, GPT-5.4 parsing Inngest function |
| 14 | `feature/phase2-admin-upload` | Admin upload page: Level→Program→Component→Session → file → review |
| 15 | `feature/phase2-mock-engine` | componentId-based question selection for mock generation |

## Phase 3 - Blueprint-Driven Mock Engine

| # | Branch | Description |
|---|--------|-------------|
| 16 | `feature/phase3-schema` | ExamBlueprint, BlueprintSection, MockAttempt models |
| 17 | `feature/phase3-blueprint-seed` | CS Paper 1/2/3 blueprints seeded |
| 18 | `feature/phase3-blueprint-admin` | Admin blueprint CRUD with mark validation |
| 19 | `feature/phase3-mock-generator` | DATABASE/HYBRID/RESEARCH mock generation engine + scoring |
| 20 | `feature/phase3-student-ui` | Student mock UI: listing, timer, sections, submit, results |

## Phase 4 - Image Upload + Persistent Memory Engine

| # | Branch | Description |
|---|--------|-------------|
| 21 | `feature/phase4-schema` | TopicPerformance model (masteryScore, attempts) |
| 22 | `feature/phase4-chat-vision` | GPT-4o vision in chat, question extraction + topic detection + storage |
| 23 | `feature/phase4-mastery` | Performance API (+5/-5), readiness = 60% baseline + 40% mastery |
| 24 | `feature/phase4-dashboard` | Topic mastery progress bars on dashboard |
| 25 | `feature/phase4-mock-feed` | USER_UPLOADED source type, auto-included in mock gen + gpt-5.5 upgrade |

## Phase 5 - Readiness Engine V2

| # | Branch | Description |
|---|--------|-------------|
| 26 | `feature/phase5-schema` | TopicPerformance V2 (correctAttempts, totalAttempts, lastPracticedAt) + topicBreakdown on MockAttempt |
| 27 | `feature/phase5-readiness-v2` | 3-pillar formula: 35% baseline + 45% performance + 20% recency decay |
| 28 | `feature/phase5-performance-api` | Weighted increments (practice=1, mock=2), track correct/total |
| 29 | `feature/phase5-dashboard-v2` | Readiness circle, subject progress bars, risk warning, recommendations |
| 30 | `feature/phase5-ai-context` | Enriched AI system prompt with strongest/weakest topics, risk warning |

## Phase 6 - Monetization & Validation

| # | Branch | Description |
|---|--------|-------------|
| 31 | `feature/phase6-plans` | PRO tier at 3,500 FCFA/month, simplified Free/Pro, pricing page, Fapshi config |
| 32 | `feature/phase6-gating` | UpgradeModal, PlanBadge, usage tracking for mocks and AI solves |
| 33 | `feature/phase6-analytics` | Admin monetization analytics (paidUsers, conversionRate, revenue) |

## KPI + Math Features

| # | Branch | Description |
|---|--------|-------------|
| 34 | `feature/kpi-schema` | KpiEvent + DailyMetric models, trackEvent() + computeDailyMetrics() |
| 35 | `feature/kpi-tracking` | trackEvent wired into quiz, note upload, auth signup |
| 36 | `feature/kpi-dashboard` | /admin/metrics page with date picker, cards, table, manual override |
| 37 | `feature/math-rendering` | KaTeX integration: @streamdown/math in chat + remark-math/rehype-katex in 7 content pages, custom syntax normalization |
