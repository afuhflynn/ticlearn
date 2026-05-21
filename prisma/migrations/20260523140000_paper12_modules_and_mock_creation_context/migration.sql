-- Distinguish student practice vs admin preview for Paper 1 & 2 mock attempts
CREATE TYPE "MockCreationContext" AS ENUM ('STUDENT', 'ADMIN_PREVIEW');

ALTER TABLE "mock_attempts" ADD COLUMN "creation_context" "MockCreationContext" NOT NULL DEFAULT 'STUDENT';

CREATE INDEX "mock_attempts_creation_context_idx" ON "mock_attempts"("creation_context");

-- Paper 1 & 2 grouped mock bundles (named sets of ExamBlueprint entries)
CREATE TABLE "paper12_mock_modules" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "visible_to_students" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper12_mock_modules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "paper12_mock_modules_visible_to_students_idx" ON "paper12_mock_modules"("visible_to_students");

ALTER TABLE "paper12_mock_modules" ADD CONSTRAINT "paper12_mock_modules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "paper12_mock_module_items" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "blueprint_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "paper12_mock_module_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "paper12_mock_module_items_module_id_blueprint_id_key" ON "paper12_mock_module_items"("module_id", "blueprint_id");

CREATE INDEX "paper12_mock_module_items_module_id_idx" ON "paper12_mock_module_items"("module_id");

CREATE INDEX "paper12_mock_module_items_blueprint_id_idx" ON "paper12_mock_module_items"("blueprint_id");

ALTER TABLE "paper12_mock_module_items" ADD CONSTRAINT "paper12_mock_module_items_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "paper12_mock_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "paper12_mock_module_items" ADD CONSTRAINT "paper12_mock_module_items_blueprint_id_fkey" FOREIGN KEY ("blueprint_id") REFERENCES "exam_blueprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
