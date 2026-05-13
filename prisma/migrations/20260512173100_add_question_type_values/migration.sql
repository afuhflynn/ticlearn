-- Add new values to the QuestionType enum (separate transaction from the ALTER TABLE that uses them)
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'STRUCTURED';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'PRACTICAL';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'ESSAY';
