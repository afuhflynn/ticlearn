-- Create TopicPerformance table
CREATE TABLE "topic_performances" (
    "id" TEXT NOT NULL,
    "exam_profile_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "mastery_score" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "topic_performances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "topic_performances_exam_profile_id_topic_id_key"
  ON "topic_performances"("exam_profile_id", "topic_id");
CREATE INDEX "topic_performances_exam_profile_id_idx"
  ON "topic_performances"("exam_profile_id");

ALTER TABLE "topic_performances" ADD CONSTRAINT "topic_performances_exam_profile_id_fkey"
  FOREIGN KEY ("exam_profile_id") REFERENCES "exam_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "topic_performances" ADD CONSTRAINT "topic_performances_topic_id_fkey"
  FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
