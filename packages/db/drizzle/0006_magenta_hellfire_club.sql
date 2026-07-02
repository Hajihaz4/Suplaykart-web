CREATE TABLE "legacy_customer_links" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"wp_user_id" bigint,
	"outcome" text NOT NULL,
	"matched_count" integer DEFAULT 0 NOT NULL,
	"legacy_orders" integer DEFAULT 0 NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "legacy_customer_links" ADD CONSTRAINT "legacy_customer_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;