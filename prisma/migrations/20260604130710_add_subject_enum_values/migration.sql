-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExamSubject" ADD VALUE 'BIO';
ALTER TYPE "ExamSubject" ADD VALUE 'CHEM';
ALTER TYPE "ExamSubject" ADD VALUE 'PHY';
ALTER TYPE "ExamSubject" ADD VALUE 'PMM';
ALTER TYPE "ExamSubject" ADD VALUE 'PMS';
ALTER TYPE "ExamSubject" ADD VALUE 'FM';
ALTER TYPE "ExamSubject" ADD VALUE 'FSN';
ALTER TYPE "ExamSubject" ADD VALUE 'GEOL';
ALTER TYPE "ExamSubject" ADD VALUE 'ENG';
ALTER TYPE "ExamSubject" ADD VALUE 'LIT';
ALTER TYPE "ExamSubject" ADD VALUE 'FRENCH';
ALTER TYPE "ExamSubject" ADD VALUE 'SBE_FR';
ALTER TYPE "ExamSubject" ADD VALUE 'HIST';
ALTER TYPE "ExamSubject" ADD VALUE 'GEOG';
ALTER TYPE "ExamSubject" ADD VALUE 'RS';
ALTER TYPE "ExamSubject" ADD VALUE 'PHIL';
ALTER TYPE "ExamSubject" ADD VALUE 'ECONS';
ALTER TYPE "ExamSubject" ADD VALUE 'ACCT';
