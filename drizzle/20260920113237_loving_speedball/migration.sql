CREATE TABLE "outfits" (
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"user_id" text NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "outfits" ADD CONSTRAINT "outfits_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;