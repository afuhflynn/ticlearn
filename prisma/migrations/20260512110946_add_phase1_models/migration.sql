-- AlterTable: Add onboarding fields to exam_profiles
ALTER TABLE "exam_profiles" ADD COLUMN "exam_year" INTEGER,
ADD COLUMN "exam_date" TIMESTAMP(3),
ADD COLUMN "is_retaking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "study_hours_per_week" INTEGER;

-- CreateTable: topics
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_topic_baselines
CREATE TABLE "user_topic_baselines" (
    "id" TEXT NOT NULL,
    "exam_profile_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_topic_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable: knowledge_chunks
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "topics_component_id_name_key" ON "topics"("component_id", "name");
CREATE INDEX "topics_component_id_idx" ON "topics"("component_id");
CREATE UNIQUE INDEX "user_topic_baselines_exam_profile_id_topic_id_key" ON "user_topic_baselines"("exam_profile_id", "topic_id");
CREATE INDEX "user_topic_baselines_exam_profile_id_idx" ON "user_topic_baselines"("exam_profile_id");
CREATE INDEX "knowledge_chunks_topic_id_idx" ON "knowledge_chunks"("topic_id");
CREATE INDEX "knowledge_chunks_source_type_idx" ON "knowledge_chunks"("source_type");

-- AddForeignKeys
ALTER TABLE "topics" ADD CONSTRAINT "topics_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_topic_baselines" ADD CONSTRAINT "user_topic_baselines_exam_profile_id_fkey" FOREIGN KEY ("exam_profile_id") REFERENCES "exam_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_topic_baselines" ADD CONSTRAINT "user_topic_baselines_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
