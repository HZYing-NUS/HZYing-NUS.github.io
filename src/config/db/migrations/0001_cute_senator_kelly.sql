CREATE TABLE "ai_file" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"chat_id" text,
	"original_name" text NOT NULL,
	"object_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"content_hash" text NOT NULL,
	"parse_status" text DEFAULT 'pending' NOT NULL,
	"parse_error" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "ai_file_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "ai_model" (
	"id" text PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"visible_name" text NOT NULL,
	"description" text,
	"provider_id" text NOT NULL,
	"provider_model_id" text NOT NULL,
	"fallback_provider_id" text,
	"fallback_provider_model_id" text,
	"fallback_is_same_model" boolean DEFAULT true NOT NULL,
	"fallback_input_price_per_million" numeric(18, 8),
	"fallback_output_price_per_million" numeric(18, 8),
	"fallback_cache_read_price_per_million" numeric(18, 8),
	"fallback_cache_write_price_per_million" numeric(18, 8),
	"input_price_per_million" numeric(18, 8) NOT NULL,
	"output_price_per_million" numeric(18, 8) NOT NULL,
	"cache_read_price_per_million" numeric(18, 8),
	"cache_write_price_per_million" numeric(18, 8),
	"currency" text DEFAULT 'USD' NOT NULL,
	"pricing_version" text NOT NULL,
	"pricing_source" text,
	"pricing_effective_at" timestamp NOT NULL,
	"context_window" integer NOT NULL,
	"max_output_tokens" integer NOT NULL,
	"supports_vision" boolean DEFAULT false NOT NULL,
	"supports_tools" boolean DEFAULT false NOT NULL,
	"supports_streaming" boolean DEFAULT true NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"recommendation_mode" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_model_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "ai_provider" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"api_base_url" text,
	"api_key_env_name" text,
	"status" text DEFAULT 'active' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_provider_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "ai_request_lease" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_identity_claim" (
	"id" text PRIMARY KEY NOT NULL,
	"identity_hash" text NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credit_identity_claim_identity_hash_unique" UNIQUE("identity_hash")
);
--> statement-breakpoint
CREATE TABLE "credit_reservation" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"user_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"reserved_credits" integer NOT NULL,
	"settled_credits" integer DEFAULT 0 NOT NULL,
	"refunded_credits" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"price_snapshot" jsonb NOT NULL,
	"cost_breakdown" jsonb NOT NULL,
	"consumed_detail" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"settled_at" timestamp,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"file_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"token_count" integer,
	"retrieval_metadata" jsonb,
	"embedding" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_memory" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"source_chat_id" text,
	"source_message_id" text,
	"confirmed_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_risk_event" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"order_no" text,
	"transaction_id" text,
	"user_id" text,
	"status" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_audience" text,
	"stage" text,
	"technology" text,
	"confirmed_decisions" text,
	"completed_items" text,
	"current_problem" text,
	"next_steps" text,
	"important_conclusions" text,
	"recent_progress" text,
	"auto_memory_enabled" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp,
	"purge_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_memory" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"importance" integer DEFAULT 0 NOT NULL,
	"source_chat_id" text,
	"source_message_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"suitable_for" text,
	"unsuitable_for" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"user_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skill_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "skill_version" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_id" text NOT NULL,
	"version" integer NOT NULL,
	"methodology" text NOT NULL,
	"system_prompt" text NOT NULL,
	"diagnostic_steps" jsonb NOT NULL,
	"follow_up_questions" jsonb NOT NULL,
	"quick_output_format" text NOT NULL,
	"deep_output_format" text NOT NULL,
	"completion_conditions" text NOT NULL,
	"reference_materials" jsonb,
	"audit_metadata" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"user_id" text NOT NULL,
	"reservation_id" text,
	"entry_type" text NOT NULL,
	"provider_id" text,
	"model_id" text,
	"skill_version_id" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"cache_write_tokens" integer DEFAULT 0 NOT NULL,
	"web_search_cost_usd" numeric(18, 8) DEFAULT '0' NOT NULL,
	"file_cost_usd" numeric(18, 8) DEFAULT '0' NOT NULL,
	"memory_cost_usd" numeric(18, 8) DEFAULT '0' NOT NULL,
	"internal_cost_usd" numeric(18, 8) DEFAULT '0' NOT NULL,
	"retail_cost_usd" numeric(18, 8) DEFAULT '0' NOT NULL,
	"raw_credits" numeric(18, 8) DEFAULT '0' NOT NULL,
	"charged_credits" integer DEFAULT 0 NOT NULL,
	"refunded_credits" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"failure_reason" text,
	"price_snapshot" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "chat" ADD COLUMN "skill_version_id" text;--> statement-breakpoint
ALTER TABLE "chat" ADD COLUMN "skill_disabled_at" timestamp;--> statement-breakpoint
ALTER TABLE "chat" ADD COLUMN "web_search_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chat" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "chat" ADD COLUMN "purge_at" timestamp;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "content" text;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "skill_version_id" text;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "web_search_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "output_tokens" integer;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "cache_read_tokens" integer;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "cache_write_tokens" integer;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "estimated_credits" integer;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "reserved_credits" integer;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "settled_credits" integer;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "refunded_credits" integer;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "reservation_id" text;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "source_details" jsonb;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "file_ids" jsonb;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "error_reason" text;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "fallback_confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "credit" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ai_access_status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_file" ADD CONSTRAINT "ai_file_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_file" ADD CONSTRAINT "ai_file_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_file" ADD CONSTRAINT "ai_file_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model" ADD CONSTRAINT "ai_model_provider_id_ai_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_provider"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model" ADD CONSTRAINT "ai_model_fallback_provider_id_ai_provider_id_fk" FOREIGN KEY ("fallback_provider_id") REFERENCES "public"."ai_provider"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_request_lease" ADD CONSTRAINT "ai_request_lease_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_identity_claim" ADD CONSTRAINT "credit_identity_claim_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_reservation" ADD CONSTRAINT "credit_reservation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_chunk" ADD CONSTRAINT "file_chunk_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_chunk" ADD CONSTRAINT "file_chunk_file_id_ai_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."ai_file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_memory" ADD CONSTRAINT "global_memory_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_memory" ADD CONSTRAINT "global_memory_source_chat_id_chat_id_fk" FOREIGN KEY ("source_chat_id") REFERENCES "public"."chat"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_memory" ADD CONSTRAINT "global_memory_source_message_id_chat_message_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."chat_message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_risk_event" ADD CONSTRAINT "payment_risk_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memory" ADD CONSTRAINT "project_memory_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memory" ADD CONSTRAINT "project_memory_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memory" ADD CONSTRAINT "project_memory_source_chat_id_chat_id_fk" FOREIGN KEY ("source_chat_id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memory" ADD CONSTRAINT "project_memory_source_message_id_chat_message_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."chat_message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_version" ADD CONSTRAINT "skill_version_skill_id_skill_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_reservation_id_credit_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."credit_reservation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_provider_id_ai_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_provider"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_model_id_ai_model_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."ai_model"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_skill_version_id_skill_version_id_fk" FOREIGN KEY ("skill_version_id") REFERENCES "public"."skill_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_file_owner_project" ON "ai_file" USING btree ("user_id","project_id","status");--> statement-breakpoint
CREATE INDEX "idx_ai_file_owner_chat" ON "ai_file" USING btree ("user_id","chat_id","status");--> statement-breakpoint
CREATE INDEX "idx_ai_model_enabled_sort" ON "ai_model" USING btree ("enabled","sort");--> statement-breakpoint
CREATE INDEX "idx_ai_model_provider" ON "ai_model" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_ai_model_fallback_provider" ON "ai_model" USING btree ("fallback_provider_id");--> statement-breakpoint
CREATE INDEX "idx_ai_provider_status" ON "ai_provider" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "idx_ai_request_lease_owner" ON "ai_request_lease" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "idx_credit_identity_claim_user" ON "credit_identity_claim" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_credit_reservation_idempotency" ON "credit_reservation" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_credit_reservation_owner" ON "credit_reservation" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_credit_reservation_request" ON "credit_reservation" USING btree ("user_id","request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_file_chunk_unique" ON "file_chunk" USING btree ("file_id","chunk_index");--> statement-breakpoint
CREATE INDEX "idx_file_chunk_owner" ON "file_chunk" USING btree ("user_id","file_id","status");--> statement-breakpoint
CREATE INDEX "idx_global_memory_owner" ON "global_memory" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payment_risk_event_provider_id" ON "payment_risk_event" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "idx_payment_risk_event_order" ON "payment_risk_event" USING btree ("provider","order_no");--> statement-breakpoint
CREATE INDEX "idx_project_user_status" ON "project" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_project_memory_owner" ON "project_memory" USING btree ("user_id","project_id","status");--> statement-breakpoint
CREATE INDEX "idx_project_memory_source_chat" ON "project_memory" USING btree ("source_chat_id");--> statement-breakpoint
CREATE INDEX "idx_skill_status" ON "skill" USING btree ("status","user_enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_skill_version_unique" ON "skill_version" USING btree ("skill_id","version");--> statement-breakpoint
CREATE INDEX "idx_skill_version_status" ON "skill_version" USING btree ("skill_id","status");--> statement-breakpoint
CREATE INDEX "idx_usage_ledger_owner" ON "usage_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_usage_ledger_request" ON "usage_ledger" USING btree ("user_id","request_id");--> statement-breakpoint
CREATE INDEX "idx_usage_ledger_reservation" ON "usage_ledger" USING btree ("reservation_id");--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_skill_version_id_skill_version_id_fk" FOREIGN KEY ("skill_version_id") REFERENCES "public"."skill_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_skill_version_id_skill_version_id_fk" FOREIGN KEY ("skill_version_id") REFERENCES "public"."skill_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_reservation_id_credit_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."credit_reservation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chat_project" ON "chat" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_credit_idempotency_key" ON "credit" USING btree ("idempotency_key");