# 0023. Public course and faculty catalogue

**Date**: 2026-10-26
**Status**: Accepted

## Summary

This decision adds a public course and faculty catalogue for Cameroonian universities so students and search engines can easily browse available subjects, faculties, and study resources. The catalogue provides structured database driven pages organized by university and faculty. It helps students find relevant academic material before signing up while improving search engine visibility.

## Context

TiCLearn serves students across major Cameroonian universities such as the University of Yaounde I, University of Buea, University of Douala, University of Dschang, University of Bamenda, and University of Maroua. Currently, the platform collects student level and institution details during onboarding, but lacks a public browsing catalogue to showcase available courses and faculties. Without a public catalogue, prospective students arriving from search engines cannot explore institutional content without creating an account first, limiting organic growth and discovery. This feature establishes the data structures and public routes for universities, faculties, departments, and courses.

## Requirements

**User stories**:
- As a prospective student, I want to browse courses by university and faculty so that I can verify TiCLearn supports my academic curriculum before signing up.
- As a search engine bot, I want structured public pages with metadata and clean URLs so that course and faculty pages rank correctly in search results.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: The database schema includes tables for universities, faculties, departments, and courses with correct foreign key relations.
- **AC-2**: A public catalogue index page at `/catalogue` lists universities and faculties with responsive navigation.
- **AC-3**: Public detail pages at `/catalogue/[university]/[faculty]` display courses and study materials associated with that faculty.
- **AC-4**: Public pages include server side rendering and dynamic metadata (titles, descriptions, JSON-LD structured data) for SEO.
- **AC-5**: The sitemap generator includes public catalogue routes.

## Options considered

### Option 1: Static markdown pages for faculties and courses

Create static markdown files for each university and faculty in the repository.

**Pros**:
- Extremely fast loading with zero database queries.
- Simple deployment.

**Cons**:
- Hard to maintain and update as new courses are added.
- Cannot link dynamically with student profiles and uploaded notes.

### Option 2: Database driven public catalogue (chosen)

Implement normalized relational tables for universities, faculties, and courses, rendered via server components with Incremental Static Regeneration or dynamic server rendering.

**Pros**:
- Fully dynamic and updatable through admin tools or database seeds.
- Integrates cleanly with student profiles and onboarding selections.
- Scales to hundreds of courses and faculties.

**Cons**:
- Requires database migrations and query optimization.

## Decision

**Chosen option**: Option 2: Database driven public catalogue.

We implement database driven models for institutions, faculties, and courses with public server rendered pages under `/catalogue`.

**Implementation skills**: `seo-geo` (`.agents/skills/seo-geo/`), `vercel-storage` (`.agents/skills/vercel-storage/`)

## Rationale

A static approach cannot scale or connect with student onboarding selections. Storing institutions, faculties, and courses in relational tables allows direct foreign key association with student profiles and study notes while enabling dynamic sitemap generation and search engine optimization.

## Feature design

**Data model sketch**:
- `University`: id, name, slug (unique), description, createdAt, updatedAt
- `Faculty`: id, universityId (FK), name, slug (unique per university), createdAt, updatedAt
- `Course`: id, facultyId (FK), title, code, description, credits, createdAt, updatedAt

**State transitions**:
- Not applicable for catalog entities.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/catalogue/universities | GET | search (opt) | list of universities | public | 500 error |
| /api/catalogue/faculties | GET | universityId (opt) | list of faculties | public | 400 bad request |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Catalogue index | List of universities | Database table `universities` |
| Faculty page | Courses in faculty | Database table `courses` filtered by facultyId |
| Meta tags | Page title and description | University and faculty record fields |

**Key invariants**:
- University slugs and faculty slugs within a university must be unique.
- Every course belongs to exactly one faculty.

**Security model**:
- Public read access for all catalogue routes.
- Write access restricted to admin users via admin console.

**Configuration required**:
- None. Uses existing database connection.

**Critical test scenarios**:
- Happy path: browsing university and faculty catalogue pages, verifies **AC-2**, **AC-3**
- SEO metadata: checking generated meta tags and structured data, verifies **AC-4**
- Missing entity: navigating to non-existent university returns 404, verifies **AC-3**

## Build plan

1. Create Prisma migration for `University`, `Faculty`, and `Course` models, satisfies **AC-1**
2. Seed initial Cameroonian universities and faculties in `prisma/seed.ts`, satisfies **AC-1**
3. Build public catalogue index and detail pages under `app/(marketing)/catalogue/`, satisfies **AC-2**, **AC-3**
4. Add dynamic metadata and JSON-LD structured data for SEO, satisfies **AC-4**
5. Update sitemap generation to include catalogue routes, satisfies **AC-5**

## Consequences

**Positive**:
- Prospective students can discover platform content before signing up.
- Improved search engine indexing and organic traffic.

**Negative / tradeoffs**:
- Additional database queries on public routes requiring caching or ISR.

**Neutral**:
- Requires periodic maintenance of course and faculty lists.

## Follow-up

- [ ] Add admin interface for managing university and faculty records.
- [ ] Connect student onboarding faculty selection to the catalogue database models.

## References

**Project sources**:
- `prisma/schema.prisma`, `docs/scope/index.md`

**Practices & standards**:
- Database driven routing and SEO best practices for educational platforms.
