CREATE TYPE "public"."formation_category" AS ENUM('liturgia', 'espiritualidade', 'pratica');--> statement-breakpoint
CREATE TYPE "public"."formation_status" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('schedule', 'substitution', 'formation', 'announcement', 'reminder');--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('draft', 'published', 'completed');--> statement-breakpoint
CREATE TYPE "public"."schedule_type" AS ENUM('missa', 'celebracao', 'evento');--> statement-breakpoint
CREATE TYPE "public"."substitution_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('gestor', 'coordenador', 'ministro');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'pending');--> statement-breakpoint
CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "formation_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category" "formation_category" NOT NULL,
	"content" text,
	"video_url" varchar(255),
	"duration_minutes" integer,
	"order_index" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "formation_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"status" "formation_status" DEFAULT 'not_started' NOT NULL,
	"progress_percentage" integer DEFAULT 0,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mass_times_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_of_week" integer NOT NULL,
	"time" time NOT NULL,
	"min_ministers" integer DEFAULT 3 NOT NULL,
	"max_ministers" integer DEFAULT 6 NOT NULL,
	"is_active" boolean DEFAULT true,
	"special_event" boolean DEFAULT false,
	"event_name" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"read" boolean DEFAULT false,
	"read_at" timestamp,
	"action_url" varchar(255),
	"priority" varchar(10) DEFAULT 'normal',
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "questionnaire_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questionnaire_id" uuid NOT NULL,
	"user_id" varchar NOT NULL,
	"responses" jsonb NOT NULL,
	"available_sundays" jsonb,
	"preferred_mass_times" jsonb,
	"alternative_times" jsonb,
	"daily_mass_availability" jsonb,
	"special_events" jsonb,
	"can_substitute" boolean DEFAULT false,
	"notes" text,
	"submitted_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "questionnaires" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"questions" jsonb NOT NULL,
	"deadline" timestamp,
	"target_user_ids" jsonb,
	"notified_user_ids" jsonb,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"time" time NOT NULL,
	"type" "schedule_type" DEFAULT 'missa' NOT NULL,
	"location" varchar(255),
	"minister_id" uuid,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"substitute_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "substitution_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"substitute_id" uuid,
	"reason" text,
	"status" "substitution_status" DEFAULT 'pending' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"whatsapp" varchar(20),
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'ministro' NOT NULL,
	"status" "user_status" DEFAULT 'pending' NOT NULL,
	"requires_password_change" boolean DEFAULT true,
	"last_login" timestamp,
	"join_date" date,
	"photo_url" text,
	"family_id" uuid,
	"birth_date" date,
	"address" text,
	"city" varchar(100),
	"zip_code" varchar(10),
	"marital_status" varchar(20),
	"baptism_date" date,
	"baptism_parish" varchar(255),
	"confirmation_date" date,
	"confirmation_parish" varchar(255),
	"marriage_date" date,
	"marriage_parish" varchar(255),
	"preferred_position" integer,
	"preferred_times" jsonb,
	"available_for_special_events" boolean DEFAULT true,
	"can_serve_as_couple" boolean DEFAULT false,
	"spouse_minister_id" uuid,
	"ministry_start_date" date,
	"experience" text,
	"special_skills" text,
	"liturgical_training" boolean DEFAULT false,
	"last_service" timestamp,
	"total_services" integer DEFAULT 0,
	"formation_completed" boolean DEFAULT false,
	"observations" text,
	"minister_type" varchar(50),
	"approved_at" timestamp,
	"approved_by_id" varchar,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "formation_progress" ADD CONSTRAINT "formation_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation_progress" ADD CONSTRAINT "formation_progress_module_id_formation_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."formation_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_questionnaire_id_questionnaires_id_fk" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_minister_id_users_id_fk" FOREIGN KEY ("minister_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_substitute_id_users_id_fk" FOREIGN KEY ("substitute_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "substitution_requests" ADD CONSTRAINT "substitution_requests_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "substitution_requests" ADD CONSTRAINT "substitution_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "substitution_requests" ADD CONSTRAINT "substitution_requests_substitute_id_users_id_fk" FOREIGN KEY ("substitute_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "substitution_requests" ADD CONSTRAINT "substitution_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");