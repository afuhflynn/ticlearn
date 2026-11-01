-- Ambassador timestamps follow the schema convention (spec 0036).
-- The 090000 migration created these columns as TIMESTAMPTZ, but every
-- DateTime in prisma/schema.prisma maps to plain TIMESTAMP(3), so align
-- them. This runs after the table exists, which the deleted 022651
-- migration did not, and that ordering is what broke the shadow database.
ALTER TABLE "ambassador_referrals" ALTER COLUMN "qualified_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "rewarded_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);
