-- AlterEnum
ALTER TYPE "Plan" ADD VALUE 'WEEKLY';

-- CreateTable
CREATE TABLE "plan_overrides" (
    "id" TEXT NOT NULL,
    "plan_key" TEXT NOT NULL,
    "price_xaf" INTEGER,
    "limits" JSONB,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_audits" (
    "id" TEXT NOT NULL,
    "plan_key" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_overrides_plan_key_key" ON "plan_overrides"("plan_key");

-- CreateIndex
CREATE INDEX "plan_audits_plan_key_created_at_idx" ON "plan_audits"("plan_key", "created_at");
