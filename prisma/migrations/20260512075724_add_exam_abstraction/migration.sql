-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('PAPER', 'COURSE');

-- AlterTable
ALTER TABLE "exam_sessions" ADD COLUMN     "component_id" TEXT,
ADD COLUMN     "exam_profile_id" TEXT;

-- AlterTable
ALTER TABLE "paper3_attempts" ADD COLUMN     "exam_profile_id" TEXT;

-- AlterTable
ALTER TABLE "paper3_mock_attempts" ADD COLUMN     "exam_profile_id" TEXT;

-- AlterTable
ALTER TABLE "paper3_question_attempts" ADD COLUMN     "exam_profile_id" TEXT;

-- AlterTable
ALTER TABLE "paper3_questions" ADD COLUMN     "component_id" TEXT;

-- AlterTable
ALTER TABLE "paper3_sources" ADD COLUMN     "component_id" TEXT;

-- AlterTable
ALTER TABLE "paper3_user_stats" ADD COLUMN     "exam_profile_id" TEXT;

-- AlterTable
ALTER TABLE "quiz_attempts" ADD COLUMN     "exam_profile_id" TEXT;

-- AlterTable
ALTER TABLE "user_stats" ADD COLUMN     "exam_profile_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "active_profile_id" TEXT;

-- CreateTable
CREATE TABLE "exam_levels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "exam_level_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "components" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "ComponentType" NOT NULL,
    "timeLimit" INTEGER,

    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exam_level_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_step" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_levels_code_key" ON "exam_levels"("code");

-- CreateIndex
CREATE UNIQUE INDEX "programs_code_key" ON "programs"("code");

-- CreateIndex
CREATE INDEX "programs_exam_level_id_idx" ON "programs"("exam_level_id");

-- CreateIndex
CREATE INDEX "components_program_id_idx" ON "components"("program_id");

-- CreateIndex
CREATE INDEX "exam_profiles_user_id_idx" ON "exam_profiles"("user_id");

-- CreateIndex
CREATE INDEX "exam_sessions_exam_profile_id_idx" ON "exam_sessions"("exam_profile_id");

-- CreateIndex
CREATE INDEX "paper3_attempts_exam_profile_id_idx" ON "paper3_attempts"("exam_profile_id");

-- CreateIndex
CREATE INDEX "paper3_mock_attempts_exam_profile_id_idx" ON "paper3_mock_attempts"("exam_profile_id");

-- CreateIndex
CREATE INDEX "paper3_question_attempts_exam_profile_id_idx" ON "paper3_question_attempts"("exam_profile_id");

-- CreateIndex
CREATE INDEX "paper3_sources_component_id_idx" ON "paper3_sources"("component_id");

-- CreateIndex
CREATE INDEX "paper3_user_stats_exam_profile_id_idx" ON "paper3_user_stats"("exam_profile_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_exam_profile_id_idx" ON "quiz_attempts"("exam_profile_id");

-- CreateIndex
CREATE INDEX "user_stats_exam_profile_id_idx" ON "user_stats"("exam_profile_id");

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_exam_level_id_fkey" FOREIGN KEY ("exam_level_id") REFERENCES "exam_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components" ADD CONSTRAINT "components_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_profiles" ADD CONSTRAINT "exam_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_profiles" ADD CONSTRAINT "exam_profiles_exam_level_id_fkey" FOREIGN KEY ("exam_level_id") REFERENCES "exam_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_profiles" ADD CONSTRAINT "exam_profiles_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_exam_profile_id_fkey" FOREIGN KEY ("exam_profile_id") REFERENCES "exam_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_exam_profile_id_fkey" FOREIGN KEY ("exam_profile_id") REFERENCES "exam_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper3_mock_attempts" ADD CONSTRAINT "paper3_mock_attempts_exam_profile_id_fkey" FOREIGN KEY ("exam_profile_id") REFERENCES "exam_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper3_question_attempts" ADD CONSTRAINT "paper3_question_attempts_exam_profile_id_fkey" FOREIGN KEY ("exam_profile_id") REFERENCES "exam_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper3_attempts" ADD CONSTRAINT "paper3_attempts_exam_profile_id_fkey" FOREIGN KEY ("exam_profile_id") REFERENCES "exam_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
