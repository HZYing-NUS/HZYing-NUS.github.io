CREATE TABLE "community_article_bookmark" (
	"user_id" text NOT NULL,
	"article_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_article_bookmark_user_id_article_id_pk" PRIMARY KEY("user_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "community_article_like" (
	"user_id" text NOT NULL,
	"article_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_article_like_user_id_article_id_pk" PRIMARY KEY("user_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "community_article_revision" (
	"id" text PRIMARY KEY NOT NULL,
	"article_id" text NOT NULL,
	"version" integer NOT NULL,
	"title_zh" text,
	"title_en" text,
	"summary_zh" text,
	"summary_en" text,
	"content_zh" text,
	"content_en" text,
	"cover_image_url" text,
	"category_slug" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_locale" text NOT NULL,
	"translation_status" text DEFAULT 'draft' NOT NULL,
	"translation_error" text,
	"translation_model_id" text,
	"translation_provider_id" text,
	"translation_prompt_version" text,
	"translation_completed_at" timestamp,
	"content_fingerprint" text,
	"review_status" text DEFAULT 'draft' NOT NULL,
	"reviewed_by" text,
	"review_reason" text,
	"moderation_review_id" text,
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"published_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_revision_source_locale_valid" CHECK ("community_article_revision"."source_locale" in ('zh', 'en')),
	CONSTRAINT "community_revision_translation_status_valid" CHECK ("community_article_revision"."translation_status" in ('draft', 'pending', 'running', 'completed', 'failed')),
	CONSTRAINT "community_revision_review_status_valid" CHECK ("community_article_revision"."review_status" in ('draft', 'pending_review', 'changes_requested', 'rejected', 'approved', 'published'))
);
--> statement-breakpoint
CREATE TABLE "community_article_slug_history" (
	"id" text PRIMARY KEY NOT NULL,
	"article_id" text NOT NULL,
	"slug" text NOT NULL,
	"replaced_by_slug" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_article_tag" (
	"article_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "community_article_tag_article_id_tag_id_pk" PRIMARY KEY("article_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "community_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_type" text NOT NULL,
	"action" text NOT NULL,
	"object_type" text NOT NULL,
	"object_id" text NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"metadata" jsonb,
	"request_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_blog_article" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source_locale" text NOT NULL,
	"category_slug" text,
	"cover_image_url" text,
	"current_published_revision_id" text,
	"current_working_revision_id" text,
	"featured" boolean DEFAULT false NOT NULL,
	"featured_reason" text,
	"featured_at" timestamp,
	"featured_by" text,
	"allow_comments" boolean DEFAULT true NOT NULL,
	"allow_replies" boolean DEFAULT true NOT NULL,
	"allow_ai_citation" boolean DEFAULT false NOT NULL,
	"first_published_at" timestamp,
	"deleted_at" timestamp,
	"restore_deadline_at" timestamp,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_article_status_valid" CHECK ("community_blog_article"."status" in ('draft', 'translating', 'translation_failed', 'pending_review', 'changes_requested', 'rejected', 'published', 'revision_draft', 'revision_pending_review', 'deleted_by_author', 'archived')),
	CONSTRAINT "community_article_source_locale_valid" CHECK ("community_blog_article"."source_locale" in ('zh', 'en')),
	CONSTRAINT "community_article_ai_citation_disabled" CHECK ("community_blog_article"."allow_ai_citation" = false)
);
--> statement-breakpoint
CREATE TABLE "community_blog_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_zh" text NOT NULL,
	"name_en" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_collection_bookmark" (
	"user_id" text NOT NULL,
	"collection_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_collection_bookmark_user_id_collection_id_pk" PRIMARY KEY("user_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "community_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"article_id" text NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" text,
	"depth" integer DEFAULT 0 NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'moderation_pending' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"moderation_review_id" text,
	"author_handled_by" text,
	"author_handled_at" timestamp,
	"reported_at" timestamp,
	"closed_reason" text,
	"reminder_batch_key" text,
	"hidden_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_comment_not_self_parent" CHECK ("community_comment"."parent_id" <> "community_comment"."id"),
	CONSTRAINT "community_comment_depth_valid" CHECK ("community_comment"."depth" in (0, 1)),
	CONSTRAINT "community_comment_parent_depth_valid" CHECK (("community_comment"."depth" = 0 and "community_comment"."parent_id" is null) or ("community_comment"."depth" = 1 and "community_comment"."parent_id" is not null)),
	CONSTRAINT "community_comment_status_valid" CHECK ("community_comment"."status" in ('moderation_pending', 'blocked', 'pending_admin', 'pending_author', 'published', 'rejected', 'reported', 'hidden', 'closed_unhandled', 'deleted'))
);
--> statement-breakpoint
CREATE TABLE "community_comment_like" (
	"user_id" text NOT NULL,
	"comment_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_comment_like_user_id_comment_id_pk" PRIMARY KEY("user_id","comment_id")
);
--> statement-breakpoint
CREATE TABLE "community_content_report" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_id" text NOT NULL,
	"object_type" text NOT NULL,
	"object_id" text NOT NULL,
	"reason_type" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"handled_by" text,
	"handled_at" timestamp,
	"result_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_content_report_status_valid" CHECK ("community_content_report"."status" in ('pending', 'reviewing', 'resolved', 'dismissed'))
);
--> statement-breakpoint
CREATE TABLE "community_email_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email_type" text NOT NULL,
	"business_event_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"locale" text NOT NULL,
	"template_version" text NOT NULL,
	"provider_message_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"failed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_email_delivery_locale_valid" CHECK ("community_email_delivery"."locale" in ('zh', 'en')),
	CONSTRAINT "community_email_delivery_status_valid" CHECK ("community_email_delivery"."status" in ('pending', 'processing', 'sent', 'failed', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "community_email_preference" (
	"user_id" text PRIMARY KEY NOT NULL,
	"pending_comment_reminder" boolean DEFAULT true NOT NULL,
	"article_review_result" boolean DEFAULT true NOT NULL,
	"product_marketing" boolean DEFAULT true NOT NULL,
	"marketing_unsubscribed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_follow" (
	"follower_id" text NOT NULL,
	"followed_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_follow_follower_id_followed_id_pk" PRIMARY KEY("follower_id","followed_id"),
	CONSTRAINT "community_follow_not_self" CHECK ("community_follow"."follower_id" <> "community_follow"."followed_id")
);
--> statement-breakpoint
CREATE TABLE "community_job" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"business_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"run_after" timestamp DEFAULT now() NOT NULL,
	"locked_by" text,
	"locked_at" timestamp,
	"lease_expires_at" timestamp,
	"claim_token" text,
	"last_error" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_job_status_valid" CHECK ("community_job"."status" in ('pending', 'processing', 'completed', 'failed')),
	CONSTRAINT "community_job_attempts_valid" CHECK ("community_job"."attempt_count" >= 0 and "community_job"."max_attempts" > 0 and "community_job"."attempt_count" <= "community_job"."max_attempts")
);
--> statement-breakpoint
CREATE TABLE "community_list_article" (
	"list_id" text NOT NULL,
	"article_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_list_article_list_id_article_id_pk" PRIMARY KEY("list_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "community_list_bookmark" (
	"user_id" text NOT NULL,
	"list_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_list_bookmark_user_id_list_id_pk" PRIMARY KEY("user_id","list_id")
);
--> statement-breakpoint
CREATE TABLE "community_list_collection" (
	"list_id" text NOT NULL,
	"collection_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_list_collection_list_id_collection_id_pk" PRIMARY KEY("list_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "community_list_resource" (
	"list_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_list_resource_list_id_resource_id_pk" PRIMARY KEY("list_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "community_moderation_appeal" (
	"id" text PRIMARY KEY NOT NULL,
	"review_id" text NOT NULL,
	"user_id" text NOT NULL,
	"statement" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"result_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_moderation_appeal_status_valid" CHECK ("community_moderation_appeal"."status" in ('pending', 'confirmed_violation', 'false_positive_recheck'))
);
--> statement-breakpoint
CREATE TABLE "community_moderation_review" (
	"id" text PRIMARY KEY NOT NULL,
	"object_type" text NOT NULL,
	"object_id" text NOT NULL,
	"object_version" text NOT NULL,
	"user_id" text,
	"raw_content" jsonb NOT NULL,
	"normalized_content" jsonb NOT NULL,
	"deterministic_findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content_fingerprint" text NOT NULL,
	"decision" text,
	"risk_level" text,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" numeric(5, 4),
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reason" text,
	"requires_human_review" boolean DEFAULT false NOT NULL,
	"model_id" text,
	"provider_id" text,
	"actual_model_id" text,
	"usage" jsonb,
	"internal_cost_usd" numeric(12, 8),
	"prompt_version" text NOT NULL,
	"rule_version" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"policy_decision" text,
	"error" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"failed_at" timestamp,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_moderation_status_valid" CHECK ("community_moderation_review"."status" in ('pending', 'running', 'completed', 'failed', 'pending_admin'))
);
--> statement-breakpoint
CREATE TABLE "community_privacy_setting" (
	"user_id" text PRIMARY KEY NOT NULL,
	"show_following_list" boolean DEFAULT true NOT NULL,
	"show_follower_list" boolean DEFAULT true NOT NULL,
	"show_likes" boolean DEFAULT true NOT NULL,
	"show_bookmarks" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_profile_revision" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"version" integer NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"headline" text,
	"about_zh" text,
	"about_en" text,
	"experience" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"region" text,
	"website_url" text,
	"social_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content_fingerprint" text NOT NULL,
	"moderation_status" text DEFAULT 'pending' NOT NULL,
	"moderation_review_id" text,
	"created_by" text NOT NULL,
	"submitted_at" timestamp,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_profile_revision_moderation_status_valid" CHECK ("community_profile_revision"."moderation_status" in ('pending', 'moderation_pending', 'published', 'pending_admin', 'blocked', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "community_reserved_username" (
	"username" text PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_resource_bookmark" (
	"user_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_resource_bookmark_user_id_resource_id_pk" PRIMARY KEY("user_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "community_user_list" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"visibility" text DEFAULT 'public' NOT NULL,
	"moderation_status" text DEFAULT 'pending' NOT NULL,
	"moderation_review_id" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_user_list_visibility_valid" CHECK ("community_user_list"."visibility" in ('public', 'private')),
	CONSTRAINT "community_user_list_moderation_status_valid" CHECK ("community_user_list"."moderation_status" in ('pending', 'published', 'pending_admin', 'blocked', 'hidden'))
);
--> statement-breakpoint
CREATE TABLE "community_user_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"headline" text,
	"about_zh" text,
	"about_en" text,
	"experience" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"region" text,
	"website_url" text,
	"social_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_published_revision_id" text,
	"pending_revision_id" text,
	"moderation_status" text DEFAULT 'pending' NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"hidden_reason" text,
	"username_changed_at" timestamp,
	"allow_ai_citation" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_profile_moderation_status_valid" CHECK ("community_user_profile"."moderation_status" in ('pending', 'moderation_pending', 'published', 'pending_admin', 'blocked', 'failed')),
	CONSTRAINT "community_profile_ai_citation_disabled" CHECK ("community_user_profile"."allow_ai_citation" = false)
);
--> statement-breakpoint
CREATE TABLE "community_username_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"replaced_by_username" text,
	"released_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_community_article_revision_owner" ON "community_article_revision" USING btree ("article_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_community_profile_revision_owner" ON "community_profile_revision" USING btree ("profile_id","id");--> statement-breakpoint
ALTER TABLE "community_article_bookmark" ADD CONSTRAINT "community_article_bookmark_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_article_bookmark" ADD CONSTRAINT "community_article_bookmark_article_id_community_blog_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."community_blog_article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_article_like" ADD CONSTRAINT "community_article_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_article_like" ADD CONSTRAINT "community_article_like_article_id_community_blog_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."community_blog_article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_article_revision" ADD CONSTRAINT "community_article_revision_article_id_community_blog_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."community_blog_article"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_article_revision" ADD CONSTRAINT "community_article_revision_translation_model_id_ai_model_id_fk" FOREIGN KEY ("translation_model_id") REFERENCES "public"."ai_model"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_article_revision" ADD CONSTRAINT "community_article_revision_translation_provider_id_ai_provider_id_fk" FOREIGN KEY ("translation_provider_id") REFERENCES "public"."ai_provider"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_article_revision" ADD CONSTRAINT "community_article_revision_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_article_revision" ADD CONSTRAINT "community_article_revision_moderation_review_id_community_moderation_review_id_fk" FOREIGN KEY ("moderation_review_id") REFERENCES "public"."community_moderation_review"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_article_revision" ADD CONSTRAINT "community_article_revision_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_article_slug_history" ADD CONSTRAINT "community_article_slug_history_article_id_community_blog_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."community_blog_article"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_article_tag" ADD CONSTRAINT "community_article_tag_article_id_community_blog_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."community_blog_article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_article_tag" ADD CONSTRAINT "community_article_tag_tag_id_community_blog_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."community_blog_tag"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_audit_log" ADD CONSTRAINT "community_audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_blog_article" ADD CONSTRAINT "community_blog_article_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_blog_article" ADD CONSTRAINT "community_blog_article_featured_by_user_id_fk" FOREIGN KEY ("featured_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_blog_article" ADD CONSTRAINT "community_article_published_revision_owner_fk" FOREIGN KEY ("id","current_published_revision_id") REFERENCES "public"."community_article_revision"("article_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_blog_article" ADD CONSTRAINT "community_article_working_revision_owner_fk" FOREIGN KEY ("id","current_working_revision_id") REFERENCES "public"."community_article_revision"("article_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_collection_bookmark" ADD CONSTRAINT "community_collection_bookmark_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_collection_bookmark" ADD CONSTRAINT "community_collection_bookmark_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comment" ADD CONSTRAINT "community_comment_article_id_community_blog_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."community_blog_article"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comment" ADD CONSTRAINT "community_comment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comment" ADD CONSTRAINT "community_comment_parent_id_community_comment_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."community_comment"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comment" ADD CONSTRAINT "community_comment_moderation_review_id_community_moderation_review_id_fk" FOREIGN KEY ("moderation_review_id") REFERENCES "public"."community_moderation_review"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comment" ADD CONSTRAINT "community_comment_author_handled_by_user_id_fk" FOREIGN KEY ("author_handled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comment_like" ADD CONSTRAINT "community_comment_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comment_like" ADD CONSTRAINT "community_comment_like_comment_id_community_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."community_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_content_report" ADD CONSTRAINT "community_content_report_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_content_report" ADD CONSTRAINT "community_content_report_handled_by_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_email_delivery" ADD CONSTRAINT "community_email_delivery_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_email_preference" ADD CONSTRAINT "community_email_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_follow" ADD CONSTRAINT "community_follow_follower_id_user_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_follow" ADD CONSTRAINT "community_follow_followed_id_user_id_fk" FOREIGN KEY ("followed_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_list_article" ADD CONSTRAINT "community_list_article_list_id_community_user_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."community_user_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_list_article" ADD CONSTRAINT "community_list_article_article_id_community_blog_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."community_blog_article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_list_bookmark" ADD CONSTRAINT "community_list_bookmark_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_list_bookmark" ADD CONSTRAINT "community_list_bookmark_list_id_community_user_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."community_user_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_list_collection" ADD CONSTRAINT "community_list_collection_list_id_community_user_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."community_user_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_list_collection" ADD CONSTRAINT "community_list_collection_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_list_resource" ADD CONSTRAINT "community_list_resource_list_id_community_user_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."community_user_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_list_resource" ADD CONSTRAINT "community_list_resource_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_moderation_appeal" ADD CONSTRAINT "community_moderation_appeal_review_id_community_moderation_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."community_moderation_review"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_moderation_appeal" ADD CONSTRAINT "community_moderation_appeal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_moderation_appeal" ADD CONSTRAINT "community_moderation_appeal_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_moderation_review" ADD CONSTRAINT "community_moderation_review_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_moderation_review" ADD CONSTRAINT "community_moderation_review_model_id_ai_model_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."ai_model"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_moderation_review" ADD CONSTRAINT "community_moderation_review_provider_id_ai_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_provider"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_moderation_review" ADD CONSTRAINT "community_moderation_review_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_privacy_setting" ADD CONSTRAINT "community_privacy_setting_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_profile_revision" ADD CONSTRAINT "community_profile_revision_profile_id_community_user_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."community_user_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_profile_revision" ADD CONSTRAINT "community_profile_revision_moderation_review_id_community_moderation_review_id_fk" FOREIGN KEY ("moderation_review_id") REFERENCES "public"."community_moderation_review"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_profile_revision" ADD CONSTRAINT "community_profile_revision_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reserved_username" ADD CONSTRAINT "community_reserved_username_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_resource_bookmark" ADD CONSTRAINT "community_resource_bookmark_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_resource_bookmark" ADD CONSTRAINT "community_resource_bookmark_resource_id_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_user_list" ADD CONSTRAINT "community_user_list_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_user_list" ADD CONSTRAINT "community_user_list_moderation_review_id_community_moderation_review_id_fk" FOREIGN KEY ("moderation_review_id") REFERENCES "public"."community_moderation_review"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_user_profile" ADD CONSTRAINT "community_user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_user_profile" ADD CONSTRAINT "community_profile_published_revision_owner_fk" FOREIGN KEY ("id","current_published_revision_id") REFERENCES "public"."community_profile_revision"("profile_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_user_profile" ADD CONSTRAINT "community_profile_pending_revision_owner_fk" FOREIGN KEY ("id","pending_revision_id") REFERENCES "public"."community_profile_revision"("profile_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_username_history" ADD CONSTRAINT "community_username_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_community_article_like_article" ON "community_article_like" USING btree ("article_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_community_article_revision_version" ON "community_article_revision" USING btree ("article_id","version");--> statement-breakpoint
CREATE INDEX "idx_community_article_revision_review" ON "community_article_revision" USING btree ("review_status","submitted_at");--> statement-breakpoint
CREATE INDEX "idx_community_article_revision_translation" ON "community_article_revision" USING btree ("translation_status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_community_article_slug_history_slug" ON "community_article_slug_history" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_community_article_slug_history_article" ON "community_article_slug_history" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "idx_community_article_tag_tag" ON "community_article_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "idx_community_audit_object" ON "community_audit_log" USING btree ("object_type","object_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_community_audit_actor" ON "community_audit_log" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_community_article_slug" ON "community_blog_article" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_community_article_feed" ON "community_blog_article" USING btree ("status","featured","first_published_at");--> statement-breakpoint
CREATE INDEX "idx_community_article_author_status" ON "community_blog_article" USING btree ("author_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "idx_community_article_deleted" ON "community_blog_article" USING btree ("deleted_at","restore_deadline_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_community_blog_tag_slug" ON "community_blog_tag" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_community_comment_article_status" ON "community_comment" USING btree ("article_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_community_comment_parent" ON "community_comment" USING btree ("parent_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_community_comment_author_queue" ON "community_comment" USING btree ("status","created_at","reminder_batch_key");--> statement-breakpoint
CREATE INDEX "idx_community_comment_user" ON "community_comment" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_community_comment_like_comment" ON "community_comment_like" USING btree ("comment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_community_content_report_dedupe" ON "community_content_report" USING btree ("reporter_id","object_type","object_id","reason_type");--> statement-breakpoint
CREATE INDEX "idx_community_content_report_status" ON "community_content_report" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_community_email_delivery_idempotency" ON "community_email_delivery" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_community_email_delivery_queue" ON "community_email_delivery" USING btree ("status","scheduled_at","created_at");--> statement-breakpoint
CREATE INDEX "idx_community_follow_followed" ON "community_follow" USING btree ("followed_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_community_job_business_key" ON "community_job" USING btree ("type","business_key");--> statement-breakpoint
CREATE INDEX "idx_community_job_claim" ON "community_job" USING btree ("status","run_after","lease_expires_at");--> statement-breakpoint
CREATE INDEX "idx_community_list_bookmark_list" ON "community_list_bookmark" USING btree ("list_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_community_moderation_appeal_once" ON "community_moderation_appeal" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "idx_community_moderation_appeal_status" ON "community_moderation_appeal" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_community_moderation_object_fingerprint" ON "community_moderation_review" USING btree ("object_type","object_id","object_version","content_fingerprint","rule_version");--> statement-breakpoint
CREATE INDEX "idx_community_moderation_queue" ON "community_moderation_review" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_community_moderation_object" ON "community_moderation_review" USING btree ("object_type","object_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_community_profile_revision_version" ON "community_profile_revision" USING btree ("profile_id","version");--> statement-breakpoint
CREATE INDEX "idx_community_profile_revision_moderation" ON "community_profile_revision" USING btree ("moderation_status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_community_user_list_owner_slug" ON "community_user_list" USING btree ("owner_id","slug");--> statement-breakpoint
CREATE INDEX "idx_community_user_list_public" ON "community_user_list" USING btree ("visibility","moderation_status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_community_profile_user" ON "community_user_profile" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_community_profile_username" ON "community_user_profile" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_community_profile_visibility" ON "community_user_profile" USING btree ("is_hidden","moderation_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_community_username_history_username" ON "community_username_history" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_community_username_history_user" ON "community_username_history" USING btree ("user_id");
