# Prisma migration repair (Neon) — **no `migrate reset`**

## Automated repair (repo scripts)

If you hit the orphan migration error again, from `ticlearn/`:

```bash
npx prisma db execute --file scripts/repair-orphan-migration.sql
npx prisma migrate resolve --applied 20260521121500_exam_blueprint_visibility
npx prisma migrate resolve --applied 20260521140000_mock_attempt_session_payload
npx prisma migrate deploy
```

Skip the `resolve` lines if Prisma reports those migrations are already applied.

---

## Manual explanation

You have two separate issues:

1. **Orphan migration on the database** — `_prisma_migrations` contains  
   `20260521120000_add_platform_settings_and_revision_guides`, but that folder **does not exist** in this repo (often a rename/branch mismatch). Prisma refuses to continue until history matches.

2. **“Drift” on `exam_blueprints` / `mock_attempts`** — Those columns already exist in Neon and match the SQL in your local folders:

   - `20260521121500_exam_blueprint_visibility`
   - `20260521140000_mock_attempt_session_payload`

So the schema is largely correct; the **migration history table** is what’s out of sync.

---

## Step 1 — Inspect (Neon SQL editor)

```sql
SELECT migration_name, finished_at
FROM "_prisma_migrations"
ORDER BY started_at;
```

Note whether these names appear:

- `20260521120000_add_platform_settings_and_revision_guides` (the orphan)
- `20260521121500_exam_blueprint_visibility`
- `20260521140000_mock_attempt_session_payload`

---

## Step 2 — Remove only the orphan row

Run **only if** the orphan name from step 1 is present:

```sql
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260521120000_add_platform_settings_and_revision_guides';
```

This does **not** drop tables or data; it only fixes the bookkeeping row.

---

## Step 3 — Mark the real migrations as applied (no SQL rerun)

From the **`ticlearn`** directory, with the same `DATABASE_URL` as Neon:

```bash
# Only needed if those migrations are NOT already listed in _prisma_migrations
npx prisma migrate resolve --applied 20260521121500_exam_blueprint_visibility
npx prisma migrate resolve --applied 20260521140000_mock_attempt_session_payload
```

If Prisma says they’re already recorded, skip the corresponding line.

---

## Step 4 — Apply remaining migrations

```bash
npx prisma migrate deploy
```

(Use `migrate dev` locally if that’s your workflow; `deploy` is fine for CI-style apply.)

This should apply anything not yet on Neon (e.g. credit purchase / Paper3 modules migrations), **without** re-adding columns that already exist.

---

## If `migrate resolve` or `deploy` still errors

- **Duplicate column**: The migration was partially applied. Prefer **`migrate resolve --applied <folder_name>`** for that folder so Prisma does not re-run the `ALTER TABLE`.
- **Checksum mismatch**: A migration file was edited after it was applied. Do not edit applied migrations; fix forward with a new migration or restore the original file from git.

---

## Prevention

- Avoid `prisma db push` on environments that use `migrate`; it causes drift.
- Don’t rename or delete migration folders after they’ve been applied on a shared database.
