CREATE TABLE "resource_stage" (
	"resource_id" text NOT NULL,
	"stage_id" text NOT NULL,
	CONSTRAINT "resource_stage_resource_id_stage_id_pk" PRIMARY KEY("resource_id","stage_id")
);
--> statement-breakpoint
INSERT INTO "resource_stage" ("resource_id", "stage_id")
SELECT "id", "stage_id" FROM "resource" WHERE "stage_id" IS NOT NULL
ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE "collection_resource" ADD COLUMN "step_title_zh" text;--> statement-breakpoint
ALTER TABLE "collection_resource" ADD COLUMN "step_title_en" text;--> statement-breakpoint
ALTER TABLE "collection_resource" ADD COLUMN "step_description_zh" text;--> statement-breakpoint
ALTER TABLE "collection_resource" ADD COLUMN "step_description_en" text;--> statement-breakpoint
ALTER TABLE "collection_resource" ADD COLUMN "relation_type" text DEFAULT 'required' NOT NULL;--> statement-breakpoint
ALTER TABLE "resource_stage" ADD CONSTRAINT "resource_stage_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_stage" ADD CONSTRAINT "resource_stage_stage_id_stage_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stage"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_resource_stage_stage" ON "resource_stage" USING btree ("stage_id");
