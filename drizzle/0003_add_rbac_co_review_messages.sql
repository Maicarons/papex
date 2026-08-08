CREATE TYPE "public"."co_review_decision" AS ENUM('approve', 'reject', 'revise');--> statement-breakpoint
CREATE TYPE "public"."co_review_status" AS ENUM('pending', 'accepted', 'declined', 'completed', 'expired');--> statement-breakpoint
ALTER TYPE "public"."message_kind" ADD VALUE 'review_result';--> statement-breakpoint
ALTER TYPE "public"."message_kind" ADD VALUE 'co_review_request';--> statement-breakpoint
ALTER TYPE "public"."message_kind" ADD VALUE 'co_review_result';--> statement-breakpoint
ALTER TYPE "public"."message_kind" ADD VALUE 'admin_message';--> statement-breakpoint
ALTER TYPE "public"."message_kind" ADD VALUE 'community_reply';--> statement-breakpoint
CREATE TABLE "co_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"paper_id" text NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"assigned_by_id" uuid NOT NULL,
	"status" "co_review_status" DEFAULT 'pending' NOT NULL,
	"decision" "co_review_decision",
	"comment" text,
	"note" text,
	"message_id" integer,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"paper_id" text NOT NULL,
	"moderator_id" uuid,
	"action" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"group" text DEFAULT 'general' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"user_id" uuid NOT NULL,
	"permission_key" text NOT NULL,
	"grant" boolean NOT NULL,
	CONSTRAINT "user_permissions_user_id_permission_key_pk" PRIMARY KEY("user_id","permission_key")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" integer NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "link" text;--> statement-breakpoint
ALTER TABLE "co_reviews" ADD CONSTRAINT "co_reviews_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_reviews" ADD CONSTRAINT "co_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_reviews" ADD CONSTRAINT "co_reviews_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_reviews" ADD CONSTRAINT "co_reviews_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "co_reviews_paper_idx" ON "co_reviews" USING btree ("paper_id");--> statement-breakpoint
CREATE INDEX "co_reviews_reviewer_idx" ON "co_reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "co_reviews_status_idx" ON "co_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "moderation_logs_paper_idx" ON "moderation_logs" USING btree ("paper_id");