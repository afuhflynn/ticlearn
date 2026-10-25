-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "date_of_birth" TIMESTAMP(3),
ADD COLUMN     "faculty" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "institution" TEXT,
ADD COLUMN     "program" TEXT,
ADD COLUMN     "target_goal" TEXT;
