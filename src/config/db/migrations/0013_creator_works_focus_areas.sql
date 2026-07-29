ALTER TABLE "community_profile_revision" ADD COLUMN "works" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "community_profile_revision" ADD COLUMN "focus_areas" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "community_user_profile" ADD COLUMN "works" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "community_user_profile" ADD COLUMN "focus_areas" jsonb DEFAULT '[]'::jsonb NOT NULL;