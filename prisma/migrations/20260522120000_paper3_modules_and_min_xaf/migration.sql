-- Default minimum pay-as-you-go top-up: 100 XAF (Fapshi floor)
ALTER TABLE "platform_settings" ALTER COLUMN "min_credit_purchase_xaf" SET DEFAULT 100;
UPDATE "platform_settings" SET "min_credit_purchase_xaf" = 100 WHERE "key" = 'global';

-- Paper 3 mock modules & catalog visibility
CREATE TABLE "paper3_mock_modules" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "MockStatus" NOT NULL DEFAULT 'DRAFT',
    "visible_to_all_students" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper3_mock_modules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "paper3_mock_modules_status_idx" ON "paper3_mock_modules"("status");

ALTER TABLE "paper3_mock_modules" ADD CONSTRAINT "paper3_mock_modules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "paper3_mocks" ADD COLUMN     "visible_to_all_students" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "paper3_mocks" ADD COLUMN     "module_id" TEXT;

CREATE INDEX "paper3_mocks_module_id_idx" ON "paper3_mocks"("module_id");

ALTER TABLE "paper3_mocks" ADD CONSTRAINT "paper3_mocks_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "paper3_mock_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
