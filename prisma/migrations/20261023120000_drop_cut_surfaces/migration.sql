-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_post_id_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "feedbacks" DROP CONSTRAINT "feedbacks_user_id_fkey";

-- DropForeignKey
ALTER TABLE "knowledge_chunks" DROP CONSTRAINT "knowledge_chunks_topic_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "post_likes" DROP CONSTRAINT "post_likes_post_id_fkey";

-- DropForeignKey
ALTER TABLE "post_likes" DROP CONSTRAINT "post_likes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "posts" DROP CONSTRAINT "posts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "revision_guides" DROP CONSTRAINT "revision_guides_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "topic_performances" DROP CONSTRAINT "topic_performances_note_id_fkey";

-- DropForeignKey
ALTER TABLE "topic_performances" DROP CONSTRAINT "topic_performances_topic_id_fkey";

-- AlterTable
ALTER TABLE "platform_settings" DROP COLUMN "credit_cost_revision_guide_gen",
DROP COLUMN "credit_cost_revision_guide_view",
DROP COLUMN "enforce_credits_for_revision_guides";

-- DropTable
DROP TABLE "comments";

-- DropTable
DROP TABLE "feedbacks";

-- DropTable
DROP TABLE "knowledge_chunks";

-- DropTable
DROP TABLE "notifications";

-- DropTable
DROP TABLE "post_likes";

-- DropTable
DROP TABLE "posts";

-- DropTable
DROP TABLE "revision_guides";

-- DropTable
DROP TABLE "topic_performances";

-- DropEnum
DROP TYPE "FeedbackStatus";

-- DropEnum
DROP TYPE "FeedbackType";

-- DropEnum
DROP TYPE "NotificationType";

