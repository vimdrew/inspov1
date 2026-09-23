ALTER TABLE "outfits" ADD COLUMN "rating" integer;--> statement-breakpoint
ALTER TABLE "outfits" ADD CONSTRAINT "outfit_rating_range" CHECK ("rating" between 1 and 5);