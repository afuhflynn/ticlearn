-- Removes orphan migration record that exists in Neon but not in prisma/migrations/.
-- See docs/prisma-migration-repair-without-reset.md
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260521120000_add_platform_settings_and_revision_guides';
