-- Migration: Add templates table and enhance existing functionality
-- Date: 2025-01-15

-- Create templates table
CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "category" "text" NOT NULL,
    "content" "text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "is_public" boolean DEFAULT false,
    "is_favorite" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'templates_user_id_fkey'
    ) THEN
        ALTER TABLE ONLY "public"."templates"
            ADD CONSTRAINT "templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX "idx_templates_user_id" ON "public"."templates" USING "btree" ("user_id");
CREATE INDEX "idx_templates_category" ON "public"."templates" USING "btree" ("category");
CREATE INDEX "idx_templates_is_public" ON "public"."templates" USING "btree" ("is_public") WHERE ("is_public" = true);
CREATE INDEX "idx_templates_is_favorite" ON "public"."templates" USING "btree" ("user_id", "is_favorite") WHERE ("is_favorite" = true);
CREATE INDEX "idx_templates_created_at" ON "public"."templates" USING "btree" ("created_at");

-- Enable RLS
ALTER TABLE "public"."templates" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for templates
CREATE POLICY "Users manage their own templates" ON "public"."templates" 
    FOR ALL USING (("auth"."uid"() = "user_id")) 
    WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Anyone can view public templates" ON "public"."templates" 
    FOR SELECT USING (("is_public" = true));

-- Add missing columns to tasks table for enhanced functionality
ALTER TABLE "public"."tasks" 
ADD COLUMN IF NOT EXISTS "priority" "text" DEFAULT 'medium'::"text",
ADD COLUMN IF NOT EXISTS "due_date" timestamp with time zone;

-- Add constraint for priority
ALTER TABLE "public"."tasks" 
ADD CONSTRAINT "tasks_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"])));

-- Add index for priority
CREATE INDEX "idx_tasks_priority" ON "public"."tasks" USING "btree" ("priority");

-- Add index for due_date
CREATE INDEX "idx_tasks_due_date" ON "public"."tasks" USING "btree" ("due_date");

-- Add index for text search on title and content
CREATE INDEX "idx_tasks_title_content_search" ON "public"."tasks" USING "gin" (to_tsvector('english', "title" || ' ' || "content"));

-- Insert default plans if they don't exist
INSERT INTO "public"."plans" ("name", "price", "description", "features", "task_limit", "export_limit")
VALUES 
    ('BASE', 0.00, 'Free plan with basic features', ARRAY['Basic task generation', 'Limited exports'], 10, 2),
    ('PRO', 29.99, 'Pro plan with unlimited features', ARRAY['Unlimited task generation', 'Unlimited exports', 'Priority support'], NULL, NULL)
ON CONFLICT ("name") DO NOTHING;

-- Create function to update template updated_at
CREATE OR REPLACE FUNCTION "public"."update_template_updated_at"()
RETURNS "trigger" AS $$
BEGIN
    NEW."updated_at" = now();
    RETURN NEW;
END;
$$ LANGUAGE "plpgsql";

-- Create trigger for template updated_at
CREATE OR REPLACE TRIGGER "update_templates_updated_at" 
    BEFORE UPDATE ON "public"."templates" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_template_updated_at"();

-- Grant permissions
GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";

-- Add comment
COMMENT ON TABLE "public"."templates" IS 'Reusable task templates created by users';
COMMENT ON COLUMN "public"."templates"."user_id" IS 'Reference to the user who owns this template';
COMMENT ON COLUMN "public"."templates"."title" IS 'Template title';
COMMENT ON COLUMN "public"."templates"."category" IS 'Template category';
COMMENT ON COLUMN "public"."templates"."content" IS 'Template content/description';
COMMENT ON COLUMN "public"."templates"."tags" IS 'Array of custom tags for filtering';
COMMENT ON COLUMN "public"."templates"."is_public" IS 'Whether the template is publicly visible';
COMMENT ON COLUMN "public"."templates"."is_favorite" IS 'Whether the template is marked as favorite';
