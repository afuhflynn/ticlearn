-- CreateTable
CREATE TABLE "visual_artifacts" (
    "artifact_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "note_id" TEXT,
    "kind" VARCHAR(20) NOT NULL DEFAULT 'drawn',
    "format" VARCHAR(20) NOT NULL,
    "source_page" INTEGER,
    "origin_answer_id" TEXT,
    "concept" VARCHAR(160),
    "image_url" TEXT,
    "payload" TEXT,
    "alt_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visual_artifacts_pkey" PRIMARY KEY ("artifact_id")
);

-- CreateIndex
CREATE INDEX "visual_artifacts_user_id_idx" ON "visual_artifacts"("user_id");

-- CreateIndex
CREATE INDEX "visual_artifacts_note_id_idx" ON "visual_artifacts"("note_id");

-- CreateIndex
CREATE INDEX "visual_artifacts_origin_answer_id_created_at_idx" ON "visual_artifacts"("origin_answer_id", "created_at");

-- AddForeignKey
ALTER TABLE "visual_artifacts" ADD CONSTRAINT "visual_artifacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visual_artifacts" ADD CONSTRAINT "visual_artifacts_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
