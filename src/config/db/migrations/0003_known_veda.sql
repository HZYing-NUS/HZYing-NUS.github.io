ALTER TABLE "ai_model" ADD COLUMN "supports_reasoning" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_model" ADD COLUMN "reasoning_effort" text DEFAULT 'medium' NOT NULL;