CREATE TYPE "public"."serviceability_mode" AS ENUM('all', 'pincode', 'radius');--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "service_mode" "serviceability_mode" DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "origin_lat" double precision;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "origin_lng" double precision;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "delivery_radius_km" integer DEFAULT 0 NOT NULL;