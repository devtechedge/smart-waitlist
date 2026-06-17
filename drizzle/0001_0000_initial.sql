CREATE TYPE "public"."waitlist_status" AS ENUM('pending', 'invited', 'activated');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email" text NOT NULL,
	"full_name" text,
	"referral_code" text NOT NULL,
	"referred_by_entry_id" uuid,
	"referral_count" integer DEFAULT 0 NOT NULL,
	"visits" integer DEFAULT 0 NOT NULL,
	"status" "waitlist_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_entries_email_unique" UNIQUE("email"),
	CONSTRAINT "waitlist_entries_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_referred_by_entry_id_waitlist_entries_id_fk" FOREIGN KEY ("referred_by_entry_id") REFERENCES "public"."waitlist_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profiles_email_idx" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "profiles_is_admin_idx" ON "profiles" USING btree ("is_admin");--> statement-breakpoint
CREATE INDEX "waitlist_entries_user_id_idx" ON "waitlist_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "waitlist_entries_referred_by_idx" ON "waitlist_entries" USING btree ("referred_by_entry_id");--> statement-breakpoint
CREATE INDEX "waitlist_entries_ranking_idx" ON "waitlist_entries" USING btree ("referral_count","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_entries_referral_code_idx" ON "waitlist_entries" USING btree ("referral_code");