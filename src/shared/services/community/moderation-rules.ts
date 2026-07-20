import { createHash } from 'node:crypto';
import { z } from 'zod';

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

export function sanitizeCommunityModerationInput(
  raw: CommunityModerationSnapshot
) {
  const clean = (value: unknown): unknown => {
    if (typeof value === 'string')
      return value
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/\son[a-z]+\s*=/gi, ' data-removed=')
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
  const links = [
    ...JSON.stringify(normalized).matchAll(/https?:\/\/[^\s"'<>\])}]+/gi),
  ].map((match) => match[0]);
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
  if (/(?:javascript|data|vbscript|file):/i.test(text))
    findings.push('illegal_protocol');
  if (
    /(?:font-size\s*:\s*0|display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0)/i.test(
      text
    ) ||
    /[\u200B-\u200D\u2060\uFEFF]{3,}/.test(text)
  )
    findings.push('hidden_text_bypass');
  for (const link of input.links) {
    try {
      if (
        ['example-malware.test', 'phishing.test'].includes(
          new URL(link).hostname.toLowerCase()
        )
      )
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

export function getCommunityModerationReviewVersionFields({
  ruleVersion,
}: {
  ruleVersion: string;
}) {
  const normalizedRuleVersion = ruleVersion.trim();
  if (!normalizedRuleVersion)
    throw new Error('COMMUNITY_MODERATION_RULE_VERSION_REQUIRED');
  return { ruleVersion: normalizedRuleVersion };
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

export function getCommunityModerationJobRecoveryAction(
  job: {
    status: string;
    attemptCount: number;
    maxAttempts: number;
    leaseExpiresAt: Date | null;
  },
  now = new Date()
) {
  const claimable =
    job.status === 'pending' ||
    (job.status === 'processing' &&
      Boolean(job.leaseExpiresAt && job.leaseExpiresAt <= now));
  if (!claimable) return 'ignore' as const;
  return job.attemptCount >= job.maxAttempts
    ? ('fail' as const)
    : ('claim' as const);
}

export function inferCommunityModerationLocales(
  rawContent: Record<string, unknown>
) {
  const declared = rawContent.sourceLocale;
  if (declared === 'zh' || declared === 'en') return [declared] as const;

  const locales = new Set<'zh' | 'en'>();
  const addTextLocale = (value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return;
    locales.add(/[\u3400-\u9fff]/u.test(value) ? 'zh' : 'en');
  };
  addTextLocale(rawContent.aboutZh);
  addTextLocale(rawContent.aboutEn);
  if (rawContent.aboutZh) locales.add('zh');
  if (rawContent.aboutEn) locales.add('en');
  if (locales.size === 0) {
    addTextLocale(rawContent.content);
    addTextLocale(rawContent.title);
    addTextLocale(rawContent.description);
  }
  return locales.size > 0 ? [...locales] : (['en'] as const);
}

export function getCommunityModerationThresholds({
  locales,
  configs,
}: {
  locales: readonly ('zh' | 'en')[];
  configs: Record<string, string | undefined>;
}) {
  const configured = locales.map((locale) => ({
    medium: Number(
      configs[`community_moderation_${locale}_medium_threshold`] || '0.65'
    ),
    block: Number(
      configs[`community_moderation_${locale}_block_threshold`] || '0.85'
    ),
  }));
  if (
    configured.some(
      ({ medium, block }) =>
        !Number.isFinite(medium) ||
        medium < 0 ||
        medium > 1 ||
        !Number.isFinite(block) ||
        block < 0 ||
        block > 1
    )
  )
    throw new Error('COMMUNITY_MODERATION_THRESHOLD_INVALID');
  return {
    mediumThreshold: Math.min(...configured.map(({ medium }) => medium)),
    blockThreshold: Math.min(...configured.map(({ block }) => block)),
  };
}

export function isCommunityPublishReviewApproved(review: {
  status: string;
  policyDecision: string | null;
  decision: string | null;
  requiresHumanReview: boolean;
  reviewedBy: string | null;
  reviewedAt: Date | null;
}) {
  return (
    review.status === 'completed' &&
    review.policyDecision === 'allow' &&
    review.decision !== 'block' &&
    (!review.requiresHumanReview ||
      Boolean(review.reviewedBy && review.reviewedAt))
  );
}
