# Prisma schema

## Overview

The schema holds 59 models and 37 enums for a Postgres database, reached through a driver adapter rather than a connection string in the schema. The client is generated into source and is gitignored, so it must be regenerated after a fresh clone.

## Key files

| File | Owns |
|---|---|
| `prisma/schema.prisma` | Every model, enum and index |
| `prisma.config.ts` | Schema path, migrations path, and the `DATABASE_URL` datasource |
| `prisma/seed.ts` | Seeds GCE A Level, O Level, Commercial, and HND programs, components, topics and blueprints |
| `prisma/migrations/` | 68 migrations, dated folders |
| `lib/prisma.ts` | The client singleton, wrapped with the `@prisma/adapter-pg` adapter |
| `lib/generated/prisma/` | Generated client output, gitignored, do not commit |

## Conventions

- Import Prisma from `@/lib/generated/prisma/client`. Never from `@prisma/client`.
- Import enums from `@/lib/generated/prisma/enums`.
- Use the singleton `prisma` from `lib/prisma.ts` in every route. Do not construct a new `PrismaClient`.
- Use a migration for a schema change: `pnpm db:migrate`. Use `pnpm db:push` only for a throwaway local experiment.
- A model that mirrors an existing one, such as `Paper3Question`, uses `@map("snake_case")` on the columns and an explicit `@default(cuid())` on the id. Follow that when adding a model.
- DateTime columns are stored as `DateTime` with `@db.Timestamptz(3)` where time of day matters.
- Decimal is never used. Money is `Int` holding whole XAF.

## Gotchas

- **The mock system is two parallel families that were never merged.** Paper 1 and 2 use `ExamBlueprint`, `BlueprintSection`, `MockAttempt`, `Paper12MockModule`, and `Paper12MockItem`. Paper 3 uses `Paper3Mock`, `Paper3MockModule`, `Paper3MockAttempt`, `Paper3QuestionAttempt`, and `Paper3UserStats`. The names are confusingly close. `MockAttempt` and `Paper3MockAttempt` are different tables with different lifecycles. Do not merge them or assume a query on one covers the other.
- The API mirrors the split: `app/api/mocks/*` and `app/api/paper3/mocks/*` are separate, as are `app/(dashboard)/practice/mock/*` and `app/(dashboard)/practice/exam/*`.
- **The Prisma client is gitignored.** `.gitignore` has `/lib/generated/prisma`. A fresh clone has no client, so `@/lib/generated/prisma/client` fails to resolve until you run `pnpm db:generate`. `pnpm build` does this for you.
- The database URL comes from `prisma.config.ts`, not from a `url` in the schema. Changing the connection means editing that file.
- Local Postgres runs on port **5435**, not 5432. See `docker-compose.yml`.
- `pnpm db:seed` is excluded from TypeScript checking. `tsconfig.json` lists `prisma/seed.ts` in `exclude`, so a type error there will not fail the build.
- `ComponentType` has both `PAPER` and `COURSE`. GCE components are `PAPER` (Paper 1 and Paper 2), HND components are `COURSE` (year 1 and year 2). That distinction drives the seed and the onboarding flow.
- `ProcessingStatus` has four values: `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`. There is no `ERROR`. Use `FAILED`.
- Enums have been added to by hand before. When you add an enum value in Postgres directly, remember that the SQL migration and the schema have to agree.
- There are helper scripts in `scripts/`: `seed-blueprints.ts`, `seed-programs.ts`, `backfill-metrics.ts`, `migrate-google-oauth.ts`, and `repair-orphan-migration.sql`.