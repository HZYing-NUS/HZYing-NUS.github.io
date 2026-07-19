ALTER TABLE "skill" ADD COLUMN "name_en" text;--> statement-breakpoint
ALTER TABLE "skill" ADD COLUMN "description_en" text;--> statement-breakpoint
ALTER TABLE "skill" ADD COLUMN "suitable_for_en" text;--> statement-breakpoint
ALTER TABLE "skill" ADD COLUMN "unsuitable_for_en" text;--> statement-breakpoint
ALTER TABLE "skill_version" ADD COLUMN "methodology_en" text;--> statement-breakpoint
ALTER TABLE "skill_version" ADD COLUMN "system_prompt_en" text;--> statement-breakpoint
ALTER TABLE "skill_version" ADD COLUMN "diagnostic_steps_en" jsonb;--> statement-breakpoint
ALTER TABLE "skill_version" ADD COLUMN "follow_up_questions_en" jsonb;--> statement-breakpoint
ALTER TABLE "skill_version" ADD COLUMN "quick_output_format_en" text;--> statement-breakpoint
ALTER TABLE "skill_version" ADD COLUMN "deep_output_format_en" text;--> statement-breakpoint
ALTER TABLE "skill_version" ADD COLUMN "completion_conditions_en" text;--> statement-breakpoint
UPDATE "skill" SET
  "name_en" = 'Product idea diagnosis',
  "description_en" = 'Evaluate a product idea, target user, willingness to pay, distribution path, and MVP scope.',
  "suitable_for_en" = 'Product decisions, MVP scope, pricing, first customers, international markets, and B2B opportunities.',
  "unsuitable_for_en" = 'Pure technical debugging, illegal or fraudulent projects, and infringement.'
WHERE "slug" = 'product-idea-diagnosis';--> statement-breakpoint
UPDATE "skill_version" SET
  "methodology_en" = 'Evaluate pain, payment, and distribution, then give one of five clear conclusions, the riskiest assumption, and a reduced MVP path.',
  "system_prompt_en" = 'Lead with a clear judgment, then add the key facts. Ask at most one question per turn: the question that most affects the conclusion. Do not imitate any real person.',
  "diagnostic_steps_en" = '["Choose one of five conclusions","Identify the riskiest assumption","Check pain, payment, and distribution","Give one action for this week"]'::jsonb,
  "follow_up_questions_en" = '["What was the most recent real situation?","Who will pay?","Where are the first ten users?"]'::jsonb,
  "quick_output_format_en" = 'Clear conclusion, riskiest assumption, one action, and at most one question.',
  "deep_output_format_en" = 'Current conclusion, target user, payer, distribution path, riskiest assumption, minimum validation version, and action for this week.',
  "completion_conditions_en" = 'The facts support a clear conclusion, or the user has an executable validation action.'
WHERE "skill_id" IN (SELECT "id" FROM "skill" WHERE "slug" = 'product-idea-diagnosis');
