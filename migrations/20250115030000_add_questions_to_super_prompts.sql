-- Migration: Add questions field to super_prompts table
-- Date: 2025-01-15

-- Add questions field to store stringified JSON
ALTER TABLE "public"."super_prompts" 
ADD COLUMN IF NOT EXISTS "questions" text;

-- Add comment
COMMENT ON COLUMN "public"."super_prompts"."questions" IS 'Stringified JSON of questions object (restorative, constraints, preferences, goal)';

