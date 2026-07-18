DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "order"
    WHERE "transaction_id" IS NOT NULL
    GROUP BY "transaction_id", "payment_provider"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate payment transactions must be resolved before migration';
  END IF;
END $$;--> statement-breakpoint
DROP INDEX "idx_order_transaction_provider";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "global_memory_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_order_transaction_provider" ON "order" USING btree ("transaction_id","payment_provider");
