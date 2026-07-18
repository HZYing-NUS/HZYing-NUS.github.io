import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  aiModel,
  aiProvider,
  skill,
  skillVersion,
} from '../src/config/db/schema.postgres';

const args = new Set(process.argv.slice(2));
const envArgument = [...args].find((arg) => arg.startsWith('--env='));
const envFile = envArgument?.replace('--env=', '');
const apply = args.has('--apply');

if (!envFile) throw new Error('Missing --env=<file>.');
config({ path: envFile, override: true });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
if (apply && process.env.CONFIRM_AI_ASSISTANT_SEED !== '1') {
  throw new Error('Writing requires CONFIRM_AI_ASSISTANT_SEED=1 and --apply.');
}

const client = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(client);
const now = new Date();
const providerId = 'ai-provider:openrouter-compatible';
const fallbackProviderId = 'ai-provider:fallback-compatible';
const skillId = 'skill:product-idea-diagnosis';
const skillVersionId = 'skill-version:product-idea-diagnosis:v1';

const models = [
  ['claude-haiku-4-5-20251001', 'Claude Haiku 4.5', '1.6', '8', 1, false],
  ['claude-sonnet-4-6', 'Claude Sonnet 4.6', '4.8', '24', 2, false],
  ['claude-sonnet-5', 'Claude Sonnet 5', '3.2', '16', 3, false],
  ['deepseek-v4-flash', 'DeepSeek Flash', '0.14', '0.28', 4, false],
  ['deepseek-v4-pro', 'DeepSeek Pro', '0.435', '0.87', 5, false],
] as const;

async function seed() {
  if (!apply) {
    console.log(
      `Dry run: 2 providers, ${models.length} models, 1 skill version.`
    );
    return;
  }

  await db
    .insert(aiProvider)
    .values({
      id: providerId,
      code: 'openrouter-compatible',
      name: 'OpenRouter Compatible',
      apiBaseUrl: process.env.AI_PROVIDER_BASE_URL || null,
      apiKeyEnvName: 'AI_PROVIDER_API_KEY',
      status: 'active',
    })
    .onConflictDoUpdate({
      target: aiProvider.code,
      set: {
        apiBaseUrl: process.env.AI_PROVIDER_BASE_URL || null,
        apiKeyEnvName: 'AI_PROVIDER_API_KEY',
        status: 'active',
      },
    });

  await db
    .insert(aiProvider)
    .values({
      id: fallbackProviderId,
      code: 'fallback-compatible',
      name: 'Fallback Compatible',
      apiBaseUrl: process.env.AI_FALLBACK_PROVIDER_BASE_URL || null,
      apiKeyEnvName: 'AI_FALLBACK_PROVIDER_API_KEY',
      status: 'inactive',
      priority: 100,
    })
    .onConflictDoUpdate({
      target: aiProvider.code,
      set: {
        apiBaseUrl: process.env.AI_FALLBACK_PROVIDER_BASE_URL || null,
        apiKeyEnvName: 'AI_FALLBACK_PROVIDER_API_KEY',
      },
    });

  const [provider] = await db
    .select({ id: aiProvider.id })
    .from(aiProvider)
    .where(eq(aiProvider.code, 'openrouter-compatible'));
  const [fallbackProvider] = await db
    .select({ id: aiProvider.id })
    .from(aiProvider)
    .where(eq(aiProvider.code, 'fallback-compatible'));

  for (const [
    publicId,
    visibleName,
    inputPrice,
    outputPrice,
    sort,
    supportsVision,
  ] of models) {
    await db
      .insert(aiModel)
      .values({
        id: `ai-model:${publicId}`,
        publicId,
        visibleName,
        providerId: provider.id,
        providerModelId: publicId,
        fallbackProviderId: fallbackProvider.id,
        fallbackProviderModelId: publicId,
        fallbackIsSameModel: true,
        fallbackInputPricePerMillion: inputPrice,
        fallbackOutputPricePerMillion: outputPrice,
        inputPricePerMillion: inputPrice,
        outputPricePerMillion: outputPrice,
        currency: 'USD',
        pricingVersion: '2026-07-17',
        pricingSource: 'WebTools AI Assistant V1 SPEC',
        pricingEffectiveAt: now,
        contextWindow: 128000,
        maxOutputTokens: 8192,
        supportsStreaming: true,
        supportsVision,
        supportsReasoning: false,
        reasoningEffort: 'medium',
        enabled: true,
        sort,
      })
      .onConflictDoUpdate({
        target: aiModel.publicId,
        set: {
          visibleName,
          providerId: provider.id,
          providerModelId: publicId,
          fallbackProviderId: fallbackProvider.id,
          fallbackProviderModelId: publicId,
          fallbackIsSameModel: true,
          fallbackInputPricePerMillion: inputPrice,
          fallbackOutputPricePerMillion: outputPrice,
          inputPricePerMillion: inputPrice,
          outputPricePerMillion: outputPrice,
          pricingVersion: '2026-07-17',
          pricingEffectiveAt: now,
          supportsVision,
          enabled: true,
          sort,
        },
      });
  }

  await db
    .insert(skill)
    .values({
      id: skillId,
      slug: 'product-idea-diagnosis',
      name: '产品想法诊断',
      description: '诊断产品想法、目标用户、付费意愿、分发路径和 MVP 范围。',
      suitableFor: '产品判断、MVP、定价、首批用户、出海与 B2B 机会。',
      unsuitableFor: '纯技术排错、违法欺诈或侵权项目。',
      status: 'published',
      userEnabled: true,
    })
    .onConflictDoUpdate({
      target: skill.slug,
      set: { status: 'published', userEnabled: true },
    });
  const [storedSkill] = await db
    .select({ id: skill.id })
    .from(skill)
    .where(eq(skill.slug, 'product-idea-diagnosis'));
  await db
    .insert(skillVersion)
    .values({
      id: skillVersionId,
      skillId: storedSkill.id,
      version: 1,
      methodology:
        '围绕痛、钱、分发诊断，并给出五类明确结论、最危险假设和 MVP 降级方案。',
      systemPrompt:
        '先给判断，再补关键事实；每轮最多追问一个最影响结论的问题。不得模仿任何现实人物。',
      diagnosticSteps: [
        '判断五类结论',
        '识别最危险假设',
        '检查痛、钱、分发',
        '给出本周行动',
      ],
      followUpQuestions: [
        '最近一次真实场景是什么？',
        '谁会付钱？',
        '第一批十个用户在哪里？',
      ],
      quickOutputFormat: '明确结论＋最危险假设＋一个行动＋至多一个问题。',
      deepOutputFormat:
        '当前结论、目标用户、付费方、分发路径、最危险假设、最小验证版本、本周行动。',
      completionConditions: '事实足以形成明确结论，或用户已有可执行验证动作。',
      referenceMaterials: [
        'b2b-decision-chain',
        'find-idea',
        'imitation-6-layers',
        'overseas',
        'price-anxiety',
        'window-alpha',
      ],
      auditMetadata: {
        source: 'docs/skills/product-idea-diagnosis',
        neutralized: true,
      },
      status: 'published',
      publishedAt: now,
    })
    .onConflictDoUpdate({
      target: [skillVersion.skillId, skillVersion.version],
      set: { status: 'published', publishedAt: now },
    });

  console.log('AI assistant catalog seed completed.');
}

seed().finally(() => client.end());
