import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertCommunityManualModerationAction,
  communityModerationResultSchema,
  decideCommunityModerationPolicy,
  evaluateCommunityDeterministicRules,
  getCommunityModerationFingerprint,
  getCommunityModerationJobRecoveryAction,
  getCommunityModerationReviewVersionFields,
  getCommunityModerationThresholds,
  hasCommunityNonOverridableRisk,
  inferCommunityModerationLocales,
  isCommunityPublishReviewApproved,
  sanitizeCommunityModerationInput,
} from './moderation-rules';

test('sanitization removes scripts and deterministic rules block dangerous protocols', () => {
  const sanitized = sanitizeCommunityModerationInput({
    content:
      '<script>alert(1)</script><a href="javascript:alert(1)" onclick="x()">link</a>',
  });
  assert.equal(JSON.stringify(sanitized.normalized).includes('<script'), false);
  const rules = evaluateCommunityDeterministicRules(sanitized);
  assert.equal(rules.forceBlock, true);
  assert.ok(rules.findings.includes('illegal_protocol'));
});

test('structured output rejects unknown fields', () => {
  assert.equal(
    communityModerationResultSchema.safeParse({
      decision: 'allow',
      riskLevel: 'low',
      categories: [],
      confidence: 0.9,
      evidence: [],
      reason: 'safe',
      requiresHumanReview: false,
      publish: true,
    }).success,
    false
  );
});

test('forced categories block and medium risk waits for admin', () => {
  const base = {
    decision: 'allow' as const,
    riskLevel: 'low' as const,
    categories: [],
    confidence: 0.9,
    evidence: [],
    reason: 'safe',
    requiresHumanReview: false,
  };
  assert.equal(
    decideCommunityModerationPolicy({
      result: {
        ...base,
        decision: 'block',
        riskLevel: 'high',
        categories: ['fraud_phishing'],
      },
      deterministic: {
        findings: [],
        forceBlock: false,
        requiresHumanReview: false,
      },
      mediumThreshold: 0.65,
      blockThreshold: 0.85,
    }),
    'blocked'
  );
  assert.equal(
    decideCommunityModerationPolicy({
      result: {
        ...base,
        decision: 'review',
        riskLevel: 'medium',
        requiresHumanReview: true,
      },
      deterministic: {
        findings: [],
        forceBlock: false,
        requiresHumanReview: false,
      },
      mediumThreshold: 0.65,
      blockThreshold: 0.85,
    }),
    'pending_admin'
  );
});

test('rule version changes the content fingerprint', () => {
  const normalized = { content: 'same' };
  assert.notEqual(
    getCommunityModerationFingerprint(normalized, 'v1'),
    getCommunityModerationFingerprint(normalized, 'v2')
  );
});

test('moderation review persistence always receives a non-empty rule version', () => {
  assert.deepEqual(
    getCommunityModerationReviewVersionFields({ ruleVersion: ' rules-v2 ' }),
    { ruleVersion: 'rules-v2' }
  );
  assert.throws(
    () => getCommunityModerationReviewVersionFields({ ruleVersion: '  ' }),
    /RULE_VERSION_REQUIRED/
  );
});

test('manual moderation cannot override completed or mandatory blocked reviews', () => {
  assert.throws(
    () =>
      assertCommunityManualModerationAction({
        status: 'completed',
        action: 'allow',
        hasNonOverridableRisk: false,
      }),
    /RECHECK_REQUIRED/
  );
  assert.throws(
    () =>
      assertCommunityManualModerationAction({
        status: 'pending_admin',
        action: 'allow',
        hasNonOverridableRisk: true,
      }),
    /POLICY_BLOCKED/
  );
  assert.doesNotThrow(() =>
    assertCommunityManualModerationAction({
      status: 'completed',
      action: 'recheck',
      hasNonOverridableRisk: true,
    })
  );
  assert.equal(
    hasCommunityNonOverridableRisk({
      categories: ['fraud_phishing'],
      confidence: 0.9,
      deterministicFindings: [],
      blockThreshold: 0.85,
    }),
    true
  );
});

test('expired moderation workers fail exhausted jobs instead of blocking the queue', () => {
  const now = new Date('2026-07-20T12:00:00.000Z');
  assert.equal(
    getCommunityModerationJobRecoveryAction(
      {
        status: 'processing',
        attemptCount: 5,
        maxAttempts: 5,
        leaseExpiresAt: new Date('2026-07-20T11:59:00.000Z'),
      },
      now
    ),
    'fail'
  );
  assert.equal(
    getCommunityModerationJobRecoveryAction(
      {
        status: 'processing',
        attemptCount: 4,
        maxAttempts: 5,
        leaseExpiresAt: new Date('2026-07-20T11:59:00.000Z'),
      },
      now
    ),
    'claim'
  );
});

test('moderation locale inference handles Chinese, English and bilingual profiles', () => {
  assert.deepEqual(inferCommunityModerationLocales({ content: '中文评论' }), [
    'zh',
  ]);
  assert.deepEqual(inferCommunityModerationLocales({ title: 'English list' }), [
    'en',
  ]);
  assert.deepEqual(
    inferCommunityModerationLocales({ aboutZh: '中文', aboutEn: 'English' }),
    ['zh', 'en']
  );
});

test('bilingual moderation uses the stricter configured thresholds', () => {
  assert.deepEqual(
    getCommunityModerationThresholds({
      locales: ['zh', 'en'],
      configs: {
        community_moderation_zh_medium_threshold: '0.55',
        community_moderation_zh_block_threshold: '0.8',
        community_moderation_en_medium_threshold: '0.7',
        community_moderation_en_block_threshold: '0.9',
      },
    }),
    { mediumThreshold: 0.55, blockThreshold: 0.8 }
  );
});

test('publish policy accepts a traced manual allow without erasing risk evidence', () => {
  assert.equal(
    isCommunityPublishReviewApproved({
      status: 'completed',
      policyDecision: 'allow',
      decision: 'review',
      requiresHumanReview: true,
      reviewedBy: 'admin-1',
      reviewedAt: new Date(),
    }),
    true
  );
  assert.equal(
    isCommunityPublishReviewApproved({
      status: 'completed',
      policyDecision: 'allow',
      decision: 'review',
      requiresHumanReview: true,
      reviewedBy: null,
      reviewedAt: null,
    }),
    false
  );
});
