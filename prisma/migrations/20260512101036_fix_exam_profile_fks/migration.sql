/*
  Warnings:

  - You are about to drop the column `exam_level_id` on the `exam_profiles` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "exam_profiles" DROP CONSTRAINT "exam_profiles_exam_level_id_fkey";

-- AlterTable
ALTER TABLE "exam_profiles" DROP COLUMN "exam_level_id";

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_active_profile_id_fkey" FOREIGN KEY ("active_profile_id") REFERENCES "exam_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_exam_profile_id_fkey" FOREIGN KEY ("exam_profile_id") REFERENCES "exam_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper3_user_stats" ADD CONSTRAINT "paper3_user_stats_exam_profile_id_fkey" FOREIGN KEY ("exam_profile_id") REFERENCES "exam_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
