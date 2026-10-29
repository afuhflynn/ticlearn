-- CreateEnum
CREATE TYPE "VisualType" AS ENUM ('DIAGRAM', 'CHART', 'TABLE', 'ILLUSTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "VisualAnalysisStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "pages" (
    "page_id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "page_number" INTEGER NOT NULL,
    "page_image_url" TEXT,
    "has_visual" BOOLEAN NOT NULL DEFAULT false,
    "analysed_at" TIMESTAMP(3),

    CONSTRAINT "pages_pkey" PRIMARY KEY ("page_id")
);

-- CreateTable
CREATE TABLE "visual_analyses" (
    "visual_analysis_id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "visual_type" "VisualType" NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "baseten_cost_xaf" INTEGER,
    "status" "VisualAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visual_analyses_pkey" PRIMARY KEY ("visual_analysis_id")
);

-- CreateIndex
CREATE INDEX "pages_note_id_idx" ON "pages"("note_id");

-- CreateIndex
CREATE UNIQUE INDEX "pages_note_id_page_number_key" ON "pages"("note_id", "page_number");

-- CreateIndex
CREATE INDEX "visual_analyses_page_id_idx" ON "visual_analyses"("page_id");

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visual_analyses" ADD CONSTRAINT "visual_analyses_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("page_id") ON DELETE CASCADE ON UPDATE CASCADE;
