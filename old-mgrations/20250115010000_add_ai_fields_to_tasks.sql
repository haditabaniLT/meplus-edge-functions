-- Migration: Add prompt and ai_model fields to tasks table
-- Date: 2025-01-15

-- Add prompt field to tasks table
ALTER TABLE "public"."tasks" 
ADD COLUMN IF NOT EXISTS "prompt" text;

-- Add ai_model field to tasks table
ALTER TABLE "public"."tasks" 
ADD COLUMN IF NOT EXISTS "ai_model" text;

-- Add comment for documentation
COMMENT ON COLUMN "public"."tasks"."prompt" IS 'The prompt used to generate this task (if AI-generated)';
COMMENT ON COLUMN "public"."tasks"."ai_model" IS 'The AI model used to generate this task (openai, claude, gemini, grok)';

-- Add index for ai_model to enable filtering
CREATE INDEX IF NOT EXISTS "idx_tasks_ai_model" ON "public"."tasks" USING "btree" ("ai_model");
