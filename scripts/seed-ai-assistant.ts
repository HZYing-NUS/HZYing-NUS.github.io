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
const claudeProviderId = 'ai-provider:honoursoft-anthropic';
const deepSeekProviderId = 'ai-provider:deepseek-openai-compatible';
const fallbackProviderId = 'ai-provider:fallback-compatible';
const skillId = 'skill:product-idea-diagnosis';
const skillVersionId = 'skill-version:product-idea-diagnosis:v1';

const models = [
  [
    'claude-haiku-4-5-20251001',
    'Claude Haiku 4.5',
    '1.6',
    '8',
    1,
    false,
    'claude',
  ],
  ['claude-sonnet-4-6', 'Claude Sonnet 4.6', '4.8', '24', 2, false, 'claude'],
  ['claude-sonnet-5', 'Claude Sonnet 5', '3.2', '16', 3, false, 'claude'],
  ['claude-opus-4-6', 'Claude Opus 4.6', '8', '40', 4, false, 'claude'],
  ['claude-opus-4-8', 'Claude Opus 4.8', '8', '40', 5, false, 'claude'],
  ['deepseek-v4-flash', 'DeepSeek Flash', '0.14', '0.28', 6, false, 'deepseek'],
  ['deepseek-v4-pro', 'DeepSeek Pro', '0.435', '0.87', 7, false, 'deepseek'],
] as const;

async function seed() {
  if (!apply) {
    console.log(
      `Dry run: 3 providers, ${models.length} models, 1 skill version.`
    );
    return;
  }

  await db
    .insert(aiProvider)
    .values({
      id: claudeProviderId,
      code: 'anthropic-compatible',
      name: 'Honoursoft Claude',
      apiBaseUrl: process.env.HONOURSOFT_API_BASE_URL || null,
      apiKeyEnvName: 'HONOURSOFT_API_KEY',
      status: 'active',
    })
    .onConflictDoUpdate({
      target: aiProvider.code,
      set: {
        name: 'Honoursoft Claude',
        apiBaseUrl: process.env.HONOURSOFT_API_BASE_URL || null,
        apiKeyEnvName: 'HONOURSOFT_API_KEY',
        status: 'active',
      },
    });

  await db
    .insert(aiProvider)
    .values({
      id: deepSeekProviderId,
      code: 'openai-compatible',
      name: 'DeepSeek Official',
      apiBaseUrl: process.env.DEEPSEEK_API_BASE_URL || null,
      apiKeyEnvName: 'DEEPSEEK_API_KEY',
      status: 'active',
      priority: 10,
    })
    .onConflictDoUpdate({
      target: aiProvider.code,
      set: {
        name: 'DeepSeek Official',
        apiBaseUrl: process.env.DEEPSEEK_API_BASE_URL || null,
        apiKeyEnvName: 'DEEPSEEK_API_KEY',
        status: 'active',
        priority: 10,
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

  const [claudeProvider] = await db
    .select({ id: aiProvider.id })
    .from(aiProvider)
    .where(eq(aiProvider.code, 'anthropic-compatible'));
  const [deepSeekProvider] = await db
    .select({ id: aiProvider.id })
    .from(aiProvider)
    .where(eq(aiProvider.code, 'openai-compatible'));
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
    providerType,
  ] of models) {
    const provider =
      providerType === 'claude' ? claudeProvider : deepSeekProvider;
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
        pricingVersion: '2026-07-19',
        pricingSource: 'WebTools AI Assistant V1 SPEC',
        pricingEffectiveAt: now,
        contextWindow: 128000,
        maxOutputTokens: 8192,
        supportsStreaming: false,
        supportsVision,
        supportsReasoning: false,
        reasoningEffort: 'medium',
        enabled: false,
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
          pricingVersion: '2026-07-19',
          pricingEffectiveAt: now,
          contextWindow: 128000,
          maxOutputTokens: 8192,
          supportsStreaming: false,
          supportsVision,
          supportsReasoning: false,
          reasoningEffort: 'medium',
          enabled: false,
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
      nameEn: 'Product idea diagnosis',
      description: '诊断产品想法、目标用户、付费意愿、分发路径和 MVP 范围。',
      descriptionEn:
        'Evaluate a product idea, target user, willingness to pay, distribution path, and MVP scope.',
      suitableFor: '产品判断、MVP、定价、首批用户、出海与 B2B 机会。',
      suitableForEn:
        'Product decisions, MVP scope, pricing, first customers, international markets, and B2B opportunities.',
      unsuitableFor: '纯技术排错、违法欺诈或侵权项目。',
      unsuitableForEn:
        'Pure technical debugging, illegal or fraudulent projects, and infringement.',
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
      methodologyEn:
        'Evaluate pain, payment, and distribution, then give one of five clear conclusions, the riskiest assumption, and a reduced MVP path.',
      systemPrompt:
        '先给判断，再补关键事实；每轮最多追问一个最影响结论的问题。不得模仿任何现实人物。',
      systemPromptEn:
        'Lead with a clear judgment, then add the key facts. Ask at most one question per turn: the question that most affects the conclusion. Do not imitate any real person.',
      diagnosticSteps: [
        '判断五类结论',
        '识别最危险假设',
        '检查痛、钱、分发',
        '给出本周行动',
      ],
      diagnosticStepsEn: [
        'Choose one of five conclusions',
        'Identify the riskiest assumption',
        'Check pain, payment, and distribution',
        'Give one action for this week',
      ],
      followUpQuestions: [
        '最近一次真实场景是什么？',
        '谁会付钱？',
        '第一批十个用户在哪里？',
      ],
      followUpQuestionsEn: [
        'What was the most recent real situation?',
        'Who will pay?',
        'Where are the first ten users?',
      ],
      quickOutputFormat: '明确结论＋最危险假设＋一个行动＋至多一个问题。',
      quickOutputFormatEn:
        'Clear conclusion, riskiest assumption, one action, and at most one question.',
      deepOutputFormat:
        '当前结论、目标用户、付费方、分发路径、最危险假设、最小验证版本、本周行动。',
      deepOutputFormatEn:
        'Current conclusion, target user, payer, distribution path, riskiest assumption, minimum validation version, and action for this week.',
      completionConditions: '事实足以形成明确结论，或用户已有可执行验证动作。',
      completionConditionsEn:
        'The facts support a clear conclusion, or the user has an executable validation action.',
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
      set: {
        methodologyEn:
          'Evaluate pain, payment, and distribution, then give one of five clear conclusions, the riskiest assumption, and a reduced MVP path.',
        systemPromptEn:
          'Lead with a clear judgment, then add the key facts. Ask at most one question per turn: the question that most affects the conclusion. Do not imitate any real person.',
        diagnosticStepsEn: [
          'Choose one of five conclusions',
          'Identify the riskiest assumption',
          'Check pain, payment, and distribution',
          'Give one action for this week',
        ],
        followUpQuestionsEn: [
          'What was the most recent real situation?',
          'Who will pay?',
          'Where are the first ten users?',
        ],
        quickOutputFormatEn:
          'Clear conclusion, riskiest assumption, one action, and at most one question.',
        deepOutputFormatEn:
          'Current conclusion, target user, payer, distribution path, riskiest assumption, minimum validation version, and action for this week.',
        completionConditionsEn:
          'The facts support a clear conclusion, or the user has an executable validation action.',
        status: 'published',
        publishedAt: now,
      },
    });

  console.log('AI assistant catalog seed completed.');
}

seed().finally(() => client.end());
