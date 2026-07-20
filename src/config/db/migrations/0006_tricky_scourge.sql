ALTER TABLE "global_memory" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
ALTER TABLE "project_memory" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
DELETE FROM "global_memory" a USING "global_memory" b WHERE a."id" > b."id" AND a."user_id" = b."user_id" AND lower(regexp_replace(a."content", '[[:space:]，。！？；：、,.!?;:''"“”‘’「」【】()\[\]{}]', '', 'g')) = lower(regexp_replace(b."content", '[[:space:]，。！？；：、,.!?;:''"“”‘’「」【】()\[\]{}]', '', 'g'));--> statement-breakpoint
DELETE FROM "project_memory" a USING "project_memory" b WHERE a."id" > b."id" AND a."user_id" = b."user_id" AND a."project_id" = b."project_id" AND lower(regexp_replace(a."content", '[[:space:]，。！？；：、,.!?;:''"“”‘’「」【】()\[\]{}]', '', 'g')) = lower(regexp_replace(b."content", '[[:space:]，。！？；：、,.!?;:''"“”‘’「」【】()\[\]{}]', '', 'g'));--> statement-breakpoint
UPDATE "global_memory" SET "dedupe_key" = 'global:legacy:' || md5("user_id" || ':' || lower(regexp_replace("content", '[[:space:]，。！？；：、,.!?;:''"“”‘’「」【】()\[\]{}]', '', 'g')));--> statement-breakpoint
UPDATE "project_memory" SET "dedupe_key" = "project_id" || ':legacy:' || md5("user_id" || ':' || "project_id" || ':' || lower(regexp_replace("content", '[[:space:]，。！？；：、,.!?;:''"“”‘’「」【】()\[\]{}]', '', 'g')));--> statement-breakpoint
CREATE UNIQUE INDEX "idx_global_memory_dedupe" ON "global_memory" USING btree ("user_id","dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_project_memory_dedupe" ON "project_memory" USING btree ("user_id","project_id","dedupe_key");
