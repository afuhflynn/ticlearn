-- AlterTable
ALTER TABLE "exam_blueprints" ADD COLUMN "visible_for_students" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "exam_blueprints" ADD COLUMN "visible_in_community" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "exam_blueprints_visible_for_students_idx" ON "exam_blueprints"("visible_for_students");

-- CreateIndex
CREATE INDEX "exam_blueprints_visible_in_community_idx" ON "exam_blueprints"("visible_in_community");
