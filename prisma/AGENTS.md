# Prisma schema

## Overview

The schema holds 33 models and 13 enums for a Postgres database, reached through a driver adapter rather than a connection string in the schema. The client is generated into source and is gitignored, so it must be regenerated after a fresh clone.

## Key files

| File | Owns |
|---|---|
| `prisma/schema.prisma` | Every model, enum and index |
| `prisma.config.ts` | Schema path, migrations path, and the `DATABASE_URL` datasource |
| `prisma/seed.ts` | Ensures the platform settings row and creates the demo content rows for `demo@tic.local`: a note, its quiz, an attempt and a Tip conversation, plus the demo handout under `public/demo/`; level of study is a string on the user, not a table |
| `prisma/migrations/` | Dated folders, ending with the pivot wipe that deleted every account and all secondary school tables |
| `lib/prisma.ts` | The client singleton, wrapped with the `@prisma/adapter-pg` adapter |
| `lib/generated/prisma/` | Generated client output, gitignored, do not commit |

## Conventions

- Import Prisma from `@/lib/generated/prisma/client`. Never from `@prisma/client`.
- Import enums from `@/lib/generated/prisma/enums`.
- Use the singleton `prisma` from `lib/prisma.ts` in every route. Do not construct a new `PrismaClient`.
- Use a migration for a schema change: `pnpm db:migrate`. Use `pnpm db:push` only for a throwaway local experiment.
- A model that mirrors an existing one uses `@map("snake_case")` on the columns and an explicit `@default(cuid())` on the id. Follow that when adding a model.
- DateTime columns are stored as `DateTime` with `@db.Timestamptz(3)` where time of day matters.
- Decimal is never used. Money is `Int` holding whole XAF.

## Gotchas

- **The mock and exam families are gone.** The two parallel mock systems, the Paper 3 tables, the blueprints and the question bank were deleted with the pivot wipe. If a name like `MockAttempt` or `Paper3Mock` still appears anywhere outside the migration history, it is a leftover: delete it.
- **The Prisma client is gitignored.** `.gitignore` has `/lib/generated/prisma`. A fresh clone has no client, so `@/lib/generated/prisma/client` fails to resolve until you run `pnpm db:generate`. `pnpm build` does this for you.
- The database URL comes from `prisma.config.ts`, not from a `url` in the schema. Changing the connection means editing that file.
- Local Postgres runs on port **5435**, not 5432. See `docker-compose.yml`.
- `pnpm db:seed` is excluded from TypeScript checking. `tsconfig.json` lists `prisma/seed.ts` in `exclude`, so a type error there will not fail the build.
- Enums have been added to by hand before. When you add an enum value in Postgres directly, remember that the SQL migration and the schema have to agree.
- There are helper scripts in `scripts/`: `backfill-metrics.ts`, `migrate-google-oauth.ts`, and `repair-orphan-migration.sql`. The old catalogue seed scripts are deleted.