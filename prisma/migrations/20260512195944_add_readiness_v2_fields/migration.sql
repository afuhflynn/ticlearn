-- Update TopicPerformance: rename attempts, add correctAttempts, lastPracticedAt
ALTER TABLE "topic_performances" ADD COLUMN "total_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "topic_performances" ADD COLUMN "correct_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "topic_performances" ADD COLUMN "last_practiced_at" TIMESTAMP(3);
ALTER TABLE "topic_performances" RENAME COLUMN "attempts" TO "attempts_old";
ALTER TABLE "topic_performances" DROP COLUMN "attempts_old";

-- Add topicBreakdown to mock_attempts
ALTER TABLE "mock_attempts" ADD COLUMN "topic_breakdown" JSONB;
