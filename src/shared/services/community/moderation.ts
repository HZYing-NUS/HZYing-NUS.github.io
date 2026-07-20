import { createHash } from 'node:crypto';
import { generateObject } from 'ai';
import { z } from 'zod';

import { getAllConfigs } from '@/shared/models/config';
import { resolveAiModel } from '@/shared/services/ai/model-router';

export const COMMUNITY_MODERATION_PROMPT_VERSION = 'community-moderation-v1';
export const COMMUNITY_MODERATION_RULE_VERSION = 'community-rules-v1';

const categories = [
  'illegal',
  'sexual',
  'sexual_minors',
  'violent_threat',
  'hate_harassment',
  'fraud_phishing',
  'malware_dangerous_download',
  'privacy_exposure',
  'spam_advertising',
  'duplicate_flooding',
] as const;

const nonOverridableCategories = new Set([
  'illegal',
  'sexual',
  'sexual_minors',
  'violent_threat',
  'fraud_phishing',
  'malware_dangerous_download',
  'privacy_exposure',
]);

const nonOverridableFindings = new Set([
  'illegal_protocol',
  'known_malicious_domain',
]);

export const communityModerationResultSchema = z
  .object({
    decision: z.enum(['allow', 'review', 'block']),
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
    categories: z.array(z.enum(categories)),
    confidence: z.number().min(0).max(1),
    evidence: z
      .array(
        z
          .object({
            category: z.enum(categories),
            excerpt: z.string().min(1).max(500),
            explanation: z.string().min(1).max(1000),
          })
          .strict()
      )
      .max(20),
    reason: z.string().min(1).max(2000),
    requiresHumanReview: z.boolean(),
  })
  .strict();

export type CommunityModerationResult = z.infer<
  typeof communityModerationResultSchema
>;
export type CommunityModerationSnapshot = Record<string, unknown>;

const dangerousProtocols = /(?:javascript|data|vbscript|file):/i;
const eventHandlers = /\son[a-z]+\s*=/gi;
const scriptBlocks = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const hiddenText =
  /(?:font-size\s*:\s*0|display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0)/i;
const knownMaliciousHosts = new Set(['example-malware.test', 'phishing.test']);

export function sanitizeCommunityModerationInput(
  raw: CommunityModerationSnapshot
) {
  const clean = (value: unknown): unknown => {
    if (typeof value === 'string')
      return value
        .replace(scriptBlocks, '')
        .replace(eventHandlers, ' data-removed=')
        .replace(/\r\n/g, '\n')
        .trim();
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [key, clean(nested)])
      );
    return value;
  };
  const normalized = clean(raw) as CommunityModerationSnapshot;
  const serialized = JSON.stringify(normalized);
  const links = [...serialized.matchAll(/https?:\/\/[^\s"'<>\])}]+/gi)].map(
    (match) => match[0]
  );
  return { normalized, links };
}

export function evaluateCommunityDeterministicRules(input: {
  normalized: CommunityModerationSnapshot;
  links: string[];
}) {
  const text = JSON.stringify(input.normalized);
  const findings: string[] = [];
  if (text.length > 200_000) findings.push('content_too_long');
  if (input.links.length > 30) findings.push('too_many_links');
  if (dangerousProtocols.test(text)) findings.push('illegal_protocol');
  if (hiddenText.test(text) || /[\u200B-\u200D\u2060\uFEFF]{3,}/.test(text))
    findings.push('hidden_text_bypass');
  for (const link of input.links) {
    try {
      if (knownMaliciousHosts.has(new URL(link).hostname.toLowerCase()))
        findings.push('known_malicious_domain');
    } catch {
      findings.push('invalid_url');
    }
  }
  return {
    findings: [...new Set(findings)],
    forceBlock: findings.some((item) =>
      ['illegal_protocol', 'known_malicious_domain'].includes(item)
    ),
    requiresHumanReview: findings.length > 0,
  };
}

export function getCommunityModerationFingerprint(
  normalized: CommunityModerationSnapshot,
  ruleVersion: string
) {
  return createHash('sha256')
    .update(JSON.stringify({ normalized, ruleVersion }))
    .digest('hex');
}

export function decideCommunityModerationPolicy(input: {
  result: CommunityModerationResult;
  deterministic: ReturnType<typeof evaluateCommunityDeterministicRules>;
  mediumThreshold: number;
  blockThreshold: number;
}) {
  if (
    input.deterministic.forceBlock ||
    (input.result.categories.some((category) =>
      nonOverridableCategories.has(category)
    ) &&
      input.result.confidence >= input.blockThreshold)
  )
    return 'blocked' as const;
  if (
    input.deterministic.requiresHumanReview ||
    input.result.requiresHumanReview ||
    input.result.decision === 'review' ||
    (input.result.riskLevel !== 'low' &&
      input.result.confidence >= input.mediumThreshold)
  )
    return 'pending_admin' as const;
  return input.result.decision === 'block'
    ? ('blocked' as const)
    : ('allow' as const);
}

export function hasCommunityNonOverridableRisk({
  categories,
  confidence,
  deterministicFindings,
  blockThreshold,
}: {
  categories: unknown;
  confidence: number;
  deterministicFindings: unknown;
  blockThreshold: number;
}) {
  const findings = Array.isArray(deterministicFindings)
    ? deterministicFindings
    : [];
  if (findings.some((finding) => nonOverridableFindings.has(String(finding))))
    return true;
  const parsedCategories = Array.isArray(categories) ? categories : [];
  return (
    confidence >= blockThreshold &&
    parsedCategories.some((category) =>
      nonOverridableCategories.has(String(category))
    )
  );
}

export function assertCommunityManualModerationAction({
  status,
  action,
  hasNonOverridableRisk,
}: {
  status: string;
  action: 'allow' | 'blocked' | 'recheck';
  hasNonOverridableRisk: boolean;
}) {
  if (action === 'recheck') {
    if (!['pending_admin', 'completed', 'failed'].includes(status))
      throw new Error('MODERATION_REVIEW_NOT_REVIEWABLE');
    return;
  }
  if (status !== 'pending_admin')
    throw new Error('MODERATION_REVIEW_RECHECK_REQUIRED');
  if (action === 'allow' && hasNonOverridableRisk)
    throw new Error('MODERATION_REVIEW_POLICY_BLOCKED');
}

export interface CommunityModerator {
  moderate(input: {
    objectType: string;
    sourceLocale?: string;
    normalized: CommunityModerationSnapshot;
    deterministicFindings: string[];
  }): Promise<
    CommunityModerationResult & {
      modelId: string;
      providerId: string;
      actualModelId: string;
      promptVersion: string;
      usage?: unknown;
      internalCostUsd: number;
    }
  >;
}

export class AiCommunityModerator implements CommunityModerator {
  async moderate(input: {
    objectType: string;
    sourceLocale?: string;
    normalized: CommunityModerationSnapshot;
    deterministicFindings: string[];
  }) {
    const configs = await getAllConfigs();
    const publicModelId = configs.community_moderation_model?.trim();
    if (!publicModelId) throw new Error('COMMUNITY_MODERATION_MODEL_REQUIRED');
    const resolved = await resolveAiModel(publicModelId);
    const promptVersion =
      configs.community_moderation_prompt_version?.trim() ||
      COMMUNITY_MODERATION_PROMPT_VERSION;
    const result = await generateObject({
      model: resolved.languageModel,
      schema: communityModerationResultSchema,
      system:
        'Classify Chinese and English user content for platform safety. Off-topic content is not a safety violation. Return only the strict structured result. Never publish, delete, ban, or change business state.',
      prompt: JSON.stringify({ promptVersion, ...input }),
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(30_000),
    });
    const parsed = communityModerationResultSchema.parse(result.object);
    const usage = result.usage as {
      inputTokens?: number;
      outputTokens?: number;
    };
    const internalCostUsd =
      ((usage.inputTokens || 0) *
        Number(resolved.configuration.inputPricePerMillion) +
        (usage.outputTokens || 0) *
          Number(resolved.configuration.outputPricePerMillion)) /
      1_000_000;
    return {
      ...parsed,
      modelId: resolved.configuration.modelId,
      providerId: resolved.configuration.providerId,
      actualModelId: resolved.configuration.providerModelId,
      promptVersion,
      usage: result.usage,
      internalCostUsd,
    };
  }
}

export async function getCommunityModerator() {
  return new AiCommunityModerator();
}
