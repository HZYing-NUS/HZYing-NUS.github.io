CREATE TABLE "collection_step_progress" (
	"user_id" text NOT NULL,
	"collection_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collection_step_progress_user_id_collection_id_resource_id_pk" PRIMARY KEY("user_id","collection_id","resource_id")
);
--> statement-breakpoint
ALTER TABLE "collection_step_progress" ADD CONSTRAINT "collection_step_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_step_progress" ADD CONSTRAINT "collection_step_progress_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_step_progress" ADD CONSTRAINT "collection_step_progress_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_step_progress" ADD CONSTRAINT "collection_step_progress_step_fk" FOREIGN KEY ("collection_id","resource_id") REFERENCES "public"."collection_resource"("collection_id","resource_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_collection_step_progress_user_updated" ON "collection_step_progress" USING btree ("user_id","updated_at");