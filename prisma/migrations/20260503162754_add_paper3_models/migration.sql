-- CreateEnum
CREATE TYPE "Paper3Subject" AS ENUM ('ICT', 'COMPUTER_SCIENCE');

-- CreateEnum
CREATE TYPE "Paper3Section" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "Paper3Category" AS ENUM ('SPREADSHEET', 'DATABASE', 'PROGRAMMING');

-- CreateEnum
CREATE TYPE "Paper3PaperType" AS ENUM ('QUESTION_PAPER', 'MARKING_SCHEME');

-- CreateEnum
CREATE TYPE "Paper3SourceType" AS ENUM ('OFFICIAL', 'TEACHER', 'RECONSTRUCTED');

-- CreateEnum
CREATE TYPE "Paper3Status" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'ERROR');

-- CreateEnum
CREATE TYPE "Paper3SkillType" AS ENUM ('ALGORITHMIC_THINKING', 'DATA_MODELING', 'CALCULATION', 'PROGRAMMING');

-- CreateEnum
CREATE TYPE "Paper3TaskType" AS ENUM ('SPREADSHEET_FORMULA', 'SQL_QUERY', 'CODE_EDITOR', 'INPUT_FIELD');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MockStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MockAttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "paper3_sources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "subject" "Paper3Subject" NOT NULL,
    "section" "Paper3Section" NOT NULL,
    "category" "Paper3Category" NOT NULL,
    "paperType" "Paper3PaperType" NOT NULL,
    "sourceType" "Paper3SourceType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploadthing_key" TEXT,
    "status" "Paper3Status" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper3_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper3_questions" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "question_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "section" "Paper3Section" NOT NULL,
    "skillType" "Paper3SkillType" NOT NULL,
    "taskType" "Paper3TaskType" NOT NULL,
    "concepts" TEXT[],
    "content" TEXT NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "expected_answer" TEXT NOT NULL,
    "marking_breakdown" JSONB,
    "explanation" TEXT,
    "partial_credit" BOOLEAN NOT NULL DEFAULT false,
    "status" "QuestionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper3_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper3_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "user_answer" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "marks_earned" INTEGER NOT NULL,
    "total_marks" INTEGER NOT NULL,
    "feedback" TEXT,
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper3_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper3_mocks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" "Paper3Subject" NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "total_marks" INTEGER NOT NULL,
    "created_by" TEXT NOT NULL,
    "status" "MockStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper3_mocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper3_mock_questions" (
    "id" TEXT NOT NULL,
    "mock_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "paper3_mock_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper3_mock_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mock_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "total_marks" INTEGER NOT NULL,
    "time_taken" INTEGER,
    "answers" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "status" "MockAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "paper3_mock_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper3_user_stats" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "questions_attempted" INTEGER NOT NULL DEFAULT 0,
    "questions_correct" INTEGER NOT NULL DEFAULT 0,
    "mock_exams_taken" INTEGER NOT NULL DEFAULT 0,
    "avg_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weak_concepts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "strong_concepts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "readiness_score" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "paper3_user_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "paper3_sources_year_subject_idx" ON "paper3_sources"("year", "subject");

-- CreateIndex
CREATE INDEX "paper3_sources_status_idx" ON "paper3_sources"("status");

-- CreateIndex
CREATE INDEX "paper3_questions_source_id_idx" ON "paper3_questions"("source_id");

-- CreateIndex
CREATE INDEX "paper3_questions_section_taskType_idx" ON "paper3_questions"("section", "taskType");

-- CreateIndex
CREATE INDEX "paper3_questions_status_idx" ON "paper3_questions"("status");

-- CreateIndex
CREATE INDEX "paper3_attempts_user_id_idx" ON "paper3_attempts"("user_id");

-- CreateIndex
CREATE INDEX "paper3_attempts_question_id_idx" ON "paper3_attempts"("question_id");

-- CreateIndex
CREATE INDEX "paper3_mocks_subject_status_idx" ON "paper3_mocks"("subject", "status");

-- CreateIndex
CREATE UNIQUE INDEX "paper3_mock_questions_mock_id_question_id_key" ON "paper3_mock_questions"("mock_id", "question_id");

-- CreateIndex
CREATE INDEX "paper3_mock_attempts_user_id_idx" ON "paper3_mock_attempts"("user_id");

-- CreateIndex
CREATE INDEX "paper3_mock_attempts_mock_id_idx" ON "paper3_mock_attempts"("mock_id");

-- CreateIndex
CREATE UNIQUE INDEX "paper3_user_stats_user_id_key" ON "paper3_user_stats"("user_id");

-- AddForeignKey
ALTER TABLE "paper3_questions" ADD CONSTRAINT "paper3_questions_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "paper3_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper3_attempts" ADD CONSTRAINT "paper3_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper3_attempts" ADD CONSTRAINT "paper3_attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "paper3_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper3_mock_questions" ADD CONSTRAINT "paper3_mock_questions_mock_id_fkey" FOREIGN KEY ("mock_id") REFERENCES "paper3_mocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper3_mock_questions" ADD CONSTRAINT "paper3_mock_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "paper3_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper3_mock_attempts" ADD CONSTRAINT "paper3_mock_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper3_mock_attempts" ADD CONSTRAINT "paper3_mock_attempts_mock_id_fkey" FOREIGN KEY ("mock_id") REFERENCES "paper3_mocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper3_user_stats" ADD CONSTRAINT "paper3_user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
