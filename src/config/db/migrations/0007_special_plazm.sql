ALTER TABLE "ai_file" ADD COLUMN "parse_claim_id" text;--> statement-breakpoint
ALTER TABLE "ai_file" ADD COLUMN "parse_claimed_at" timestamp;--> statement-breakpoint
ALTER TABLE "ai_file" ADD COLUMN "parse_charged_at" timestamp;--> statement-breakpoint
ALTER TABLE "ai_file" ADD COLUMN "parse_cost_usd" numeric(18, 8);--> statement-breakpoint
ALTER TABLE "project_memory" ADD COLUMN "category_key" text;--> statement-breakpoint
DELETE FROM "project_memory" WHERE "id" IN (SELECT "id" FROM (SELECT "id", row_number() OVER (PARTITION BY "user_id", "project_id", CASE WHEN "content" LIKE '[当前问题]%' THEN 'current_issue' WHEN "content" LIKE '[下一步]%' THEN 'next_step' END ORDER BY "updated_at" DESC, "id" DESC) AS rn FROM "project_memory" WHERE "content" LIKE '[当前问题]%' OR "content" LIKE '[下一步]%') ranked WHERE rn > 1);--> statement-breakpoint
UPDATE "project_memory" SET "category_key" = CASE WHEN "content" LIKE '[当前问题]%' THEN 'current_issue' WHEN "content" LIKE '[下一步]%' THEN 'next_step' ELSE NULL END;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_project_memory_category" ON "project_memory" USING btree ("user_id","project_id","category_key");
