CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_task" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"media_type" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt" text NOT NULL,
	"options" text,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"task_id" text,
	"task_info" text,
	"task_result" text,
	"cost_credits" integer DEFAULT 0 NOT NULL,
	"scene" text DEFAULT '' NOT NULL,
	"credit_id" text
);
--> statement-breakpoint
CREATE TABLE "apikey" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"name_zh" text NOT NULL,
	"name_en" text,
	"slug" text NOT NULL,
	"description_zh" text,
	"description_en" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "chat" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"model" text NOT NULL,
	"provider" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"parts" text NOT NULL,
	"metadata" text,
	"content" text
);
--> statement-breakpoint
CREATE TABLE "chat_message" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"chat_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"role" text NOT NULL,
	"parts" text NOT NULL,
	"metadata" text,
	"model" text NOT NULL,
	"provider" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection" (
	"id" text PRIMARY KEY NOT NULL,
	"title_zh" text NOT NULL,
	"title_en" text,
	"slug" text NOT NULL,
	"summary_zh" text,
	"summary_en" text,
	"content_zh" text,
	"content_en" text,
	"stage_id" text,
	"category_id" text,
	"seo_title_zh" text,
	"seo_title_en" text,
	"seo_description_zh" text,
	"seo_description_en" text,
	"featured" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"allow_ai_citation" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collection_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "collection_post" (
	"collection_id" text NOT NULL,
	"post_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "collection_post_collection_id_post_id_pk" PRIMARY KEY("collection_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "collection_resource" (
	"collection_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "collection_resource_collection_id_resource_id_pk" PRIMARY KEY("collection_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "collection_tag" (
	"collection_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "collection_tag_collection_id_tag_id_pk" PRIMARY KEY("collection_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "config" (
	"name" text NOT NULL,
	"value" text,
	CONSTRAINT "config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "credit" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text,
	"order_no" text,
	"subscription_no" text,
	"transaction_no" text NOT NULL,
	"transaction_type" text NOT NULL,
	"transaction_scene" text,
	"credits" integer NOT NULL,
	"remaining_credits" integer DEFAULT 0 NOT NULL,
	"description" text,
	"expires_at" timestamp,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"consumed_detail" text,
	"metadata" text,
	CONSTRAINT "credit_transaction_no_unique" UNIQUE("transaction_no")
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" text PRIMARY KEY NOT NULL,
	"order_no" text NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text,
	"status" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"product_id" text,
	"payment_type" text,
	"payment_interval" text,
	"payment_provider" text NOT NULL,
	"payment_session_id" text,
	"checkout_info" text NOT NULL,
	"checkout_result" text,
	"payment_result" text,
	"discount_code" text,
	"discount_amount" integer,
	"discount_currency" text,
	"payment_email" text,
	"payment_amount" integer,
	"payment_currency" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"description" text,
	"product_name" text,
	"subscription_id" text,
	"subscription_result" text,
	"checkout_url" text,
	"callback_url" text,
	"credits_amount" integer,
	"credits_valid_days" integer,
	"plan_name" text,
	"payment_product_id" text,
	"invoice_id" text,
	"invoice_url" text,
	"subscription_no" text,
	"transaction_id" text,
	"payment_user_name" text,
	"payment_user_id" text,
	CONSTRAINT "order_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
CREATE TABLE "permission" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "permission_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" text,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"title" text,
	"description" text,
	"image" text,
	"content" text,
	"categories" text,
	"tags" text,
	"author_name" text,
	"author_image" text,
	"status" text NOT NULL,
	"locale" text,
	"summary_zh" text,
	"summary_en" text,
	"content_zh" text,
	"content_en" text,
	"cover_image_url" text,
	"seo_title_zh" text,
	"seo_title_en" text,
	"seo_description_zh" text,
	"seo_description_en" text,
	"allow_ai_citation" boolean DEFAULT true NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"legacy_file_name" text,
	"translation_group" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "post_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "post_resource" (
	"post_id" text NOT NULL,
	"resource_id" text NOT NULL,
	CONSTRAINT "post_resource_post_id_resource_id_pk" PRIMARY KEY("post_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "post_tag" (
	"post_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "post_tag_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "profile_content" (
	"id" text PRIMARY KEY NOT NULL,
	"locale" text NOT NULL,
	"content" jsonb NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"allow_ai_citation" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource" (
	"id" text PRIMARY KEY NOT NULL,
	"name_zh" text NOT NULL,
	"name_en" text,
	"slug" text NOT NULL,
	"website_url" text,
	"resource_type" text NOT NULL,
	"stage_id" text,
	"category_id" text,
	"summary_zh" text,
	"summary_en" text,
	"reason_zh" text,
	"reason_en" text,
	"use_case_zh" text,
	"use_case_en" text,
	"pricing_type" text DEFAULT 'unknown' NOT NULL,
	"icon_url" text,
	"screenshot_url" text,
	"source_note" text,
	"seo_title_zh" text,
	"seo_title_en" text,
	"seo_description_zh" text,
	"seo_description_en" text,
	"featured" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"allow_ai_citation" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "resource_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "resource_tag" (
	"resource_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "resource_tag_resource_id_tag_id_pk" PRIMARY KEY("resource_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "role_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_permission" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"permission_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "stage" (
	"id" text PRIMARY KEY NOT NULL,
	"name_zh" text NOT NULL,
	"name_en" text,
	"slug" text NOT NULL,
	"description_zh" text,
	"description_en" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stage_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "submission" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"description" text,
	"suggested_tags" text,
	"related_content_type" text,
	"related_content_id" text,
	"submitter_user_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"converted_content_type" text,
	"converted_content_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_no" text NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text,
	"status" text NOT NULL,
	"payment_provider" text NOT NULL,
	"subscription_id" text NOT NULL,
	"subscription_result" text,
	"product_id" text,
	"description" text,
	"amount" integer,
	"currency" text,
	"interval" text,
	"interval_count" integer,
	"trial_period_days" integer,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"plan_name" text,
	"billing_url" text,
	"product_name" text,
	"credits_amount" integer,
	"credits_valid_days" integer,
	"payment_product_id" text,
	"payment_user_id" text,
	"canceled_at" timestamp,
	"canceled_end_at" timestamp,
	"canceled_reason" text,
	"canceled_reason_type" text,
	CONSTRAINT "subscription_subscription_no_unique" UNIQUE("subscription_no")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" text PRIMARY KEY NOT NULL,
	"name_zh" text NOT NULL,
	"name_en" text,
	"slug" text NOT NULL,
	"description_zh" text,
	"description_en" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tag_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "taxonomy" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" text,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image" text,
	"icon" text,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "taxonomy_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"utm_source" text DEFAULT '' NOT NULL,
	"ip" text DEFAULT '' NOT NULL,
	"locale" text DEFAULT '' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_role" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_task" ADD CONSTRAINT "ai_task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection" ADD CONSTRAINT "collection_stage_id_stage_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection" ADD CONSTRAINT "collection_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_post" ADD CONSTRAINT "collection_post_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_post" ADD CONSTRAINT "collection_post_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_resource" ADD CONSTRAINT "collection_resource_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_resource" ADD CONSTRAINT "collection_resource_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_tag" ADD CONSTRAINT "collection_tag_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_tag" ADD CONSTRAINT "collection_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit" ADD CONSTRAINT "credit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_resource" ADD CONSTRAINT "post_resource_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_resource" ADD CONSTRAINT "post_resource_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tag" ADD CONSTRAINT "post_tag_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tag" ADD CONSTRAINT "post_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_stage_id_stage_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_tag" ADD CONSTRAINT "resource_tag_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_tag" ADD CONSTRAINT "resource_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_submitter_user_id_user_id_fk" FOREIGN KEY ("submitter_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy" ADD CONSTRAINT "taxonomy_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_account_user_id" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_account_provider_account" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "idx_ai_task_user_media_type" ON "ai_task" USING btree ("user_id","media_type");--> statement-breakpoint
CREATE INDEX "idx_ai_task_media_type_status" ON "ai_task" USING btree ("media_type","status");--> statement-breakpoint
CREATE INDEX "idx_apikey_user_status" ON "apikey" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_apikey_key_status" ON "apikey" USING btree ("key","status");--> statement-breakpoint
CREATE INDEX "idx_category_slug" ON "category" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_chat_user_status" ON "chat" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_chat_message_chat_id" ON "chat_message" USING btree ("chat_id","status");--> statement-breakpoint
CREATE INDEX "idx_chat_message_user_id" ON "chat_message" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_collection_slug" ON "collection" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_collection_status" ON "collection" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_collection_featured" ON "collection" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "idx_credit_consume_fifo" ON "credit" USING btree ("user_id","status","transaction_type","remaining_credits","expires_at");--> statement-breakpoint
CREATE INDEX "idx_credit_order_no" ON "credit" USING btree ("order_no");--> statement-breakpoint
CREATE INDEX "idx_credit_subscription_no" ON "credit" USING btree ("subscription_no");--> statement-breakpoint
CREATE INDEX "idx_order_user_status_payment_type" ON "order" USING btree ("user_id","status","payment_type");--> statement-breakpoint
CREATE INDEX "idx_order_transaction_provider" ON "order" USING btree ("transaction_id","payment_provider");--> statement-breakpoint
CREATE INDEX "idx_order_created_at" ON "order" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_permission_resource_action" ON "permission" USING btree ("resource","action");--> statement-breakpoint
CREATE INDEX "idx_post_type_status" ON "post" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "idx_resource_slug" ON "resource" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_resource_status" ON "resource" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_resource_type" ON "resource" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "idx_resource_featured" ON "resource" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "idx_role_status" ON "role" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_role_permission_role_permission" ON "role_permission" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE INDEX "idx_session_user_expires" ON "session" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "idx_stage_slug" ON "stage" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_submission_status" ON "submission" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_submission_type" ON "submission" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_submission_submitter" ON "submission" USING btree ("submitter_user_id");--> statement-breakpoint
CREATE INDEX "idx_subscription_user_status_interval" ON "subscription" USING btree ("user_id","status","interval");--> statement-breakpoint
CREATE INDEX "idx_subscription_provider_id" ON "subscription" USING btree ("subscription_id","payment_provider");--> statement-breakpoint
CREATE INDEX "idx_subscription_created_at" ON "subscription" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_tag_slug" ON "tag" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_taxonomy_type_status" ON "taxonomy" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "idx_user_name" ON "user" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_user_created_at" ON "user" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_user_role_user_expires" ON "user_role" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "idx_verification_identifier" ON "verification" USING btree ("identifier");