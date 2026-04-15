-- AlterEnum
ALTER TYPE "EarningStatus" ADD VALUE 'REQUESTED';

-- AlterTable
ALTER TABLE "affiliate_earnings" ADD COLUMN     "referred_user_id" TEXT,
ADD COLUMN     "requested_at" TIMESTAMP(3);
