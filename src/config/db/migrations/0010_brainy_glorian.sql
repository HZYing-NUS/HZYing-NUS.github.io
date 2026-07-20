CREATE TABLE "credit_package" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name_zh" text NOT NULL,
	"name_en" text NOT NULL,
	"credits" integer NOT NULL,
	"amount_usd_cents" integer NOT NULL,
	"creem_sandbox_product_id" text,
	"creem_production_product_id" text,
	"recommended" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credit_package_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "payment_identity_claim" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"payment_user_id" text NOT NULL,
	"user_id" text NOT NULL,
	"first_order_no" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_attribution" (
	"id" text PRIMARY KEY NOT NULL,
	"inviter_user_id" text NOT NULL,
	"referred_user_id" text NOT NULL,
	"invite_code" text NOT NULL,
	"clicked_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"attributed_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"risk_metadata" jsonb,
	CONSTRAINT "referral_attribution_referred_user_id_unique" UNIQUE("referred_user_id")
);
--> statement-breakpoint
CREATE TABLE "referral_event_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"user_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp DEFAULT now() NOT NULL,
	"lease_id" text,
	"lease_expires_at" timestamp,
	"last_error" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_event_outbox_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "referral_invite_click" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"inviter_user_id" text NOT NULL,
	"invite_code" text NOT NULL,
	"clicked_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"claimed_by_user_id" text,
	"claimed_at" timestamp,
	CONSTRAINT "referral_invite_click_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "referral_monthly_cap" (
	"id" text PRIMARY KEY NOT NULL,
	"inviter_user_id" text NOT NULL,
	"month_key" text NOT NULL,
	"awarded_credits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"invite_code" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_profile_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "referral_profile_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "referral_purchase_tombstone" (
	"id" text PRIMARY KEY NOT NULL,
	"order_no" text NOT NULL,
	"user_id" text NOT NULL,
	"risk_event_id" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_purchase_tombstone_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
CREATE TABLE "referral_reward" (
	"id" text PRIMARY KEY NOT NULL,
	"inviter_user_id" text NOT NULL,
	"referred_user_id" text NOT NULL,
	"attribution_id" text NOT NULL,
	"reward_type" text NOT NULL,
	"credits" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"source_reservation_id" text,
	"source_order_no" text,
	"available_at" timestamp NOT NULL,
	"granted_at" timestamp,
	"reviewed_at" timestamp,
	"reviewed_by" text,
	"review_note" text,
	"risk_event_id" text,
	"cap_month_key" text,
	"cap_released_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_reward_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "referral_reward_clawback" (
	"id" text PRIMARY KEY NOT NULL,
	"reward_id" text NOT NULL,
	"user_id" text NOT NULL,
	"risk_event_id" text,
	"reason" text NOT NULL,
	"reward_credits" integer NOT NULL,
	"frozen_credits" integer DEFAULT 0 NOT NULL,
	"owed_credits" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_reward_clawback_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
INSERT INTO "credit_package" (
	"id", "code", "name_zh", "name_en", "credits", "amount_usd_cents",
	"recommended", "enabled", "sort_order"
) VALUES
	('credit_package_starter', 'credit_starter', '入门包', 'Starter', 300, 1999, false, true, 10),
	('credit_package_popular', 'credit_popular', '常用包', 'Popular', 800, 4499, true, true, 20),
	('credit_package_advanced', 'credit_advanced', '进阶包', 'Advanced', 1200, 6499, false, true, 30);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "registration_referral_click_id" text;--> statement-breakpoint
ALTER TABLE "payment_identity_claim" ADD CONSTRAINT "payment_identity_claim_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attribution" ADD CONSTRAINT "referral_attribution_inviter_user_id_user_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attribution" ADD CONSTRAINT "referral_attribution_referred_user_id_user_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_event_outbox" ADD CONSTRAINT "referral_event_outbox_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_invite_click" ADD CONSTRAINT "referral_invite_click_inviter_user_id_user_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_invite_click" ADD CONSTRAINT "referral_invite_click_claimed_by_user_id_user_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_monthly_cap" ADD CONSTRAINT "referral_monthly_cap_inviter_user_id_user_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_profile" ADD CONSTRAINT "referral_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_purchase_tombstone" ADD CONSTRAINT "referral_purchase_tombstone_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_reward" ADD CONSTRAINT "referral_reward_inviter_user_id_user_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_reward" ADD CONSTRAINT "referral_reward_referred_user_id_user_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_reward" ADD CONSTRAINT "referral_reward_attribution_id_referral_attribution_id_fk" FOREIGN KEY ("attribution_id") REFERENCES "public"."referral_attribution"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_reward" ADD CONSTRAINT "referral_reward_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_reward_clawback" ADD CONSTRAINT "referral_reward_clawback_reward_id_referral_reward_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."referral_reward"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_reward_clawback" ADD CONSTRAINT "referral_reward_clawback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_credit_package_enabled_sort" ON "credit_package" USING btree ("enabled","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_credit_package_one_recommended" ON "credit_package" USING btree ("recommended") WHERE "credit_package"."recommended" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payment_identity_claim_unique" ON "payment_identity_claim" USING btree ("provider","payment_user_id");--> statement-breakpoint
CREATE INDEX "idx_payment_identity_claim_user" ON "payment_identity_claim" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_referral_attribution_inviter" ON "referral_attribution" USING btree ("inviter_user_id","attributed_at");--> statement-breakpoint
CREATE INDEX "idx_referral_event_pending" ON "referral_event_outbox" USING btree ("status","next_attempt_at","created_at");--> statement-breakpoint
CREATE INDEX "idx_referral_invite_click_token_expiry" ON "referral_invite_click" USING btree ("token","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_referral_monthly_cap_unique" ON "referral_monthly_cap" USING btree ("inviter_user_id","month_key");--> statement-breakpoint
CREATE INDEX "idx_referral_profile_user" ON "referral_profile" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_referral_tombstone_user" ON "referral_purchase_tombstone" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_referral_reward_first_type" ON "referral_reward" USING btree ("referred_user_id","reward_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_referral_reward_reservation" ON "referral_reward" USING btree ("source_reservation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_referral_reward_source_order" ON "referral_reward" USING btree ("source_order_no");--> statement-breakpoint
CREATE INDEX "idx_referral_reward_release" ON "referral_reward" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "idx_referral_reward_inviter" ON "referral_reward" USING btree ("inviter_user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_referral_reward_order" ON "referral_reward" USING btree ("source_order_no");--> statement-breakpoint
CREATE INDEX "idx_referral_clawback_reward" ON "referral_reward_clawback" USING btree ("reward_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_referral_clawback_user" ON "referral_reward_clawback" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_credit_reservation_referral_repair" ON "credit_reservation" USING btree ("status","settled_at");--> statement-breakpoint
CREATE INDEX "idx_order_referral_repair" ON "order" USING btree ("status","payment_provider","payment_type","paid_at");--> statement-breakpoint
CREATE INDEX "idx_order_referral_first_purchase" ON "order" USING btree ("user_id","status","payment_provider","payment_type","paid_at");--> statement-breakpoint
CREATE INDEX "idx_order_payment_identity" ON "order" USING btree ("payment_provider","payment_user_id","status");--> statement-breakpoint
CREATE INDEX "idx_payment_risk_event_transaction" ON "payment_risk_event" USING btree ("provider","transaction_id","event_type");--> statement-breakpoint
CREATE INDEX "idx_user_registration_referral" ON "user" USING btree ("registration_referral_click_id");
