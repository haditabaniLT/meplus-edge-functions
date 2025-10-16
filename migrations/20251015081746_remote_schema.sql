


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_current_session"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "device_name" "text", "ip_address" "text", "location" "text", "last_active" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return query
  select s.id, s.device_name, s.ip_address, s.location, s.last_active
  from public.sessions s
  where s.user_id = p_user_id and s.is_current = true;
end;
$$;


ALTER FUNCTION "public"."get_current_session"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_email_verification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Update email verification status when auth.users.email_confirmed_at changes
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.update_email_verification_status(new.id, true);
  elsif old.email_confirmed_at is not null and new.email_confirmed_at is null then
    perform public.update_email_verification_status(new.id, false);
  end if;
  
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_email_verification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.users (id, email, full_name, onboarding)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), false);
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  updated_count integer;
begin
  update public.notifications 
  set is_read = true
  where user_id = auth.uid() and is_read = false;
  
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;


ALTER FUNCTION "public"."mark_all_notifications_read"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_read"("notification_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update public.notifications 
  set is_read = true
  where id = notification_id and user_id = auth.uid();
  
  return found;
end;
$$;


ALTER FUNCTION "public"."mark_notification_read"("notification_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_user"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Check if user exists and is not already deleted
  if not exists (
    select 1 from public.users 
    where id = user_id and is_deleted = false
  ) then
    return false;
  end if;
  
  -- Soft delete the user
  update public.users 
  set is_deleted = true, updated_at = now()
  where id = user_id;
  
  -- Mark all sessions as inactive
  update public.sessions 
  set is_current = false, last_active = now()
  where user_id = user_id;
  
  return true;
end;
$$;


ALTER FUNCTION "public"."soft_delete_user"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_email_verification_status"("user_id" "uuid", "verified" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Check if user exists
  if not exists (
    select 1 from public.users 
    where id = user_id
  ) then
    return false;
  end if;
  
  -- Update email verification status
  update public.users 
  set email_verified = verified, updated_at = now()
  where id = user_id;
  
  return true;
end;
$$;


ALTER FUNCTION "public"."update_email_verification_status"("user_id" "uuid", "verified" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_usage"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if (tg_op = 'INSERT') then
    -- Increment tasks_generated counter
    update public.users set usage = jsonb_set(
      coalesce(usage, '{}'::jsonb),
      '{tasks_generated}',
      to_jsonb(coalesce((usage->>'tasks_generated')::int, 0) + 1)
    )
    where id = new.user_id;
  elsif (tg_op = 'DELETE') then
    -- Decrement tasks_generated counter (minimum 0)
    update public.users set usage = jsonb_set(
      coalesce(usage, '{}'::jsonb),
      '{tasks_generated}',
      to_jsonb(greatest(coalesce((usage->>'tasks_generated')::int, 1) - 1, 0))
    )
    where id = old.user_id;
  end if;
  return null;
end;
$$;


ALTER FUNCTION "public"."update_task_usage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_user_session"("p_user_id" "uuid", "p_device_name" "text" DEFAULT NULL::"text", "p_ip_address" "text" DEFAULT NULL::"text", "p_location" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  session_id uuid;
begin
  -- Mark all existing sessions as inactive
  update public.sessions 
  set is_current = false, last_active = now()
  where user_id = p_user_id;
  
  -- Create new session
  insert into public.sessions (user_id, device_name, ip_address, location, is_current, last_active)
  values (p_user_id, p_device_name, p_ip_address, p_location, true, now())
  returning id into session_id;
  
  return session_id;
end;
$$;


ALTER FUNCTION "public"."upsert_user_session"("p_user_id" "uuid", "p_device_name" "text", "p_ip_address" "text", "p_location" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "body" "text",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'In-app notifications for users';



CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "description" "text",
    "features" "text"[],
    "task_limit" integer,
    "export_limit" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


COMMENT ON TABLE "public"."plans" IS 'Subscription plans available to users';



CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "device_name" "text",
    "ip_address" "text",
    "location" "text",
    "last_active" timestamp with time zone DEFAULT "now"(),
    "is_current" boolean DEFAULT false
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."sessions" IS 'User session tracking for security and analytics';



CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "status" "text" DEFAULT 'active'::"text",
    "type" "text" DEFAULT 'generated'::"text",
    "is_favorite" boolean DEFAULT false,
    "is_shared" boolean DEFAULT false,
    "shared_link" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text", 'deleted'::"text"]))),
    CONSTRAINT "tasks_type_check" CHECK (("type" = ANY (ARRAY['generated'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasks" IS 'Stores all tasks generated or created by users';



COMMENT ON COLUMN "public"."tasks"."user_id" IS 'Reference to the user who owns this task';



COMMENT ON COLUMN "public"."tasks"."category" IS 'Task category (e.g., "Decision Mastery", "Business Driver")';



COMMENT ON COLUMN "public"."tasks"."title" IS 'Task title';



COMMENT ON COLUMN "public"."tasks"."content" IS 'Task content/description';



COMMENT ON COLUMN "public"."tasks"."tags" IS 'Array of custom tags for filtering';



COMMENT ON COLUMN "public"."tasks"."status" IS 'Task status: active, archived, or deleted';



COMMENT ON COLUMN "public"."tasks"."type" IS 'Task type: generated by AI or custom user input';



COMMENT ON COLUMN "public"."tasks"."is_favorite" IS 'Whether the task is marked as favorite';



COMMENT ON COLUMN "public"."tasks"."is_shared" IS 'Whether the task is shared publicly';



COMMENT ON COLUMN "public"."tasks"."shared_link" IS 'Optional public sharing link';



COMMENT ON COLUMN "public"."tasks"."metadata" IS 'Additional metadata (source, sentiment, etc.)';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "avatar_url" "text",
    "bio" "text",
    "role" "text" DEFAULT 'User'::"text",
    "plan" "text" DEFAULT 'BASE'::"text",
    "onboarding" boolean DEFAULT false,
    "goals" "jsonb" DEFAULT '[]'::"jsonb",
    "industry" "text",
    "seniority" "text",
    "brand_logo_url" "text",
    "brand_primary_color" "text",
    "brand_secondary_color" "text",
    "brand_font" "text",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "integrations" "jsonb" DEFAULT '{}'::"jsonb",
    "usage" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false,
    "email_verified" boolean DEFAULT false,
    CONSTRAINT "users_plan_check" CHECK (("plan" = ANY (ARRAY['BASE'::"text", 'PRO'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'User profiles linked to auth.users with preferences, branding, and account management';



COMMENT ON COLUMN "public"."users"."brand_logo_url" IS 'URL to user uploaded brand logo';



COMMENT ON COLUMN "public"."users"."brand_primary_color" IS 'Primary brand color hex code';



COMMENT ON COLUMN "public"."users"."brand_secondary_color" IS 'Secondary brand color hex code';



COMMENT ON COLUMN "public"."users"."brand_font" IS 'Brand font family name';



COMMENT ON COLUMN "public"."users"."preferences" IS 'User preferences including theme, language, timezone, and notifications: {"theme": "dark", "language": "en", "timezone": "Asia/Karachi", "notifications": {"inApp": true, "email": true}}';



COMMENT ON COLUMN "public"."users"."integrations" IS 'Third-party service integrations: {"canva": true, "gamma": false}';



COMMENT ON COLUMN "public"."users"."usage" IS 'Usage tracking: {"tasks_generated": 10, "export_count": 2}';



COMMENT ON COLUMN "public"."users"."is_deleted" IS 'Soft delete flag for account deletion tracking';



COMMENT ON COLUMN "public"."users"."email_verified" IS 'Email verification status from Supabase Auth';



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_read" ON "public"."notifications" USING "btree" ("user_id", "is_read");



CREATE INDEX "idx_sessions_last_active" ON "public"."sessions" USING "btree" ("last_active");



CREATE INDEX "idx_sessions_user_id" ON "public"."sessions" USING "btree" ("user_id");



CREATE INDEX "idx_sessions_user_id_active" ON "public"."sessions" USING "btree" ("user_id", "is_current");



CREATE INDEX "idx_tasks_category" ON "public"."tasks" USING "btree" ("category");



CREATE INDEX "idx_tasks_created_at" ON "public"."tasks" USING "btree" ("created_at");



CREATE INDEX "idx_tasks_is_favorite" ON "public"."tasks" USING "btree" ("user_id", "is_favorite") WHERE ("is_favorite" = true);



CREATE INDEX "idx_tasks_is_shared" ON "public"."tasks" USING "btree" ("is_shared") WHERE ("is_shared" = true);



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");



CREATE INDEX "idx_tasks_user_category_status" ON "public"."tasks" USING "btree" ("user_id", "category", "status");



CREATE INDEX "idx_tasks_user_created_at" ON "public"."tasks" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_tasks_user_id" ON "public"."tasks" USING "btree" ("user_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_email_verified" ON "public"."users" USING "btree" ("email_verified");



CREATE INDEX "idx_users_is_deleted" ON "public"."users" USING "btree" ("is_deleted");



CREATE INDEX "idx_users_plan" ON "public"."users" USING "btree" ("plan");



CREATE INDEX "idx_users_plan_name" ON "public"."users" USING "btree" ("plan");



CREATE OR REPLACE TRIGGER "on_task_change" AFTER INSERT OR DELETE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_task_usage"();



CREATE OR REPLACE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."moddatetime"('updated_at');



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "fk_user_plan" FOREIGN KEY ("plan") REFERENCES "public"."plans"("name");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow self insert on users" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Anyone can view plans" ON "public"."plans" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Service role can modify plans" ON "public"."plans" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can delete their own tasks" ON "public"."tasks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own tasks" ON "public"."tasks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can modify their own sessions" ON "public"."sessions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."users" FOR UPDATE USING ((("auth"."uid"() = "id") AND ("is_deleted" = false))) WITH CHECK ((("auth"."uid"() = "id") AND ("is_deleted" = false)));



CREATE POLICY "Users can update their own tasks" ON "public"."tasks" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."users" FOR SELECT USING ((("auth"."uid"() = "id") AND ("is_deleted" = false)));



CREATE POLICY "Users can view their own sessions" ON "public"."sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own tasks" ON "public"."tasks" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."get_current_session"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_session"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_session"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_email_verification"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_email_verification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_email_verification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notification_read"("notification_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("notification_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("notification_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."moddatetime"() TO "postgres";
GRANT ALL ON FUNCTION "public"."moddatetime"() TO "anon";
GRANT ALL ON FUNCTION "public"."moddatetime"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."moddatetime"() TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_user"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_user"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_user"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_email_verification_status"("user_id" "uuid", "verified" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_email_verification_status"("user_id" "uuid", "verified" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_email_verification_status"("user_id" "uuid", "verified" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_usage"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_usage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_usage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_user_session"("p_user_id" "uuid", "p_device_name" "text", "p_ip_address" "text", "p_location" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_user_session"("p_user_id" "uuid", "p_device_name" "text", "p_ip_address" "text", "p_location" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_user_session"("p_user_id" "uuid", "p_device_name" "text", "p_ip_address" "text", "p_location" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_email_verification_change AFTER UPDATE ON auth.users FOR EACH ROW WHEN ((old.email_confirmed_at IS DISTINCT FROM new.email_confirmed_at)) EXECUTE FUNCTION handle_email_verification();


