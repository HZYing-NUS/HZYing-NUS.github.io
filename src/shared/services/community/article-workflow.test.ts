import assert from 'node:assert/strict';
import test from 'node:test';

import { isActiveCommunityJobClaim } from '@/shared/models/community';

import {
  canSubmitCommunityArticleStatus,
  getCommunityTranslationJobRecoveryAction,
  isCommunityArticleSlugAvailable,
  normalizeCommunityArticleSlug,
  normalizeCommunityFeaturedReason,
} from './article-content';

test('article slugs normalize consistently before uniqueness checks', () => {
  assert.equal(
    normalizeCommunityArticleSlug('  First Web Product!  '),
    'first-web-product'
  );
  assert.equal(normalizeCommunityArticleSlug('中文 与 Web'), '中文-与-web');
});

test('article slugs cannot reuse legacy, current, or historical slugs', () => {
  assert.equal(
    isCommunityArticleSlugAvailable({
      occupancy: { legacyPostId: 'legacy-post' },
    }),
    false
  );
  assert.equal(
    isCommunityArticleSlugAvailable({
      occupancy: { currentArticleId: 'other-article' },
      articleId: 'article',
    }),
    false
  );
  assert.equal(
    isCommunityArticleSlugAvailable({
      occupancy: { historyArticleId: 'article' },
      articleId: 'article',
    }),
    false
  );
  assert.equal(
    isCommunityArticleSlugAvailable({
      occupancy: { currentArticleId: 'article' },
      articleId: 'article',
    }),
    true
  );
  assert.equal(isCommunityArticleSlugAvailable({ occupancy: {} }), true);
});

test('featuring requires a normalized recommendation reason', () => {
  assert.throws(
    () => normalizeCommunityFeaturedReason(true, '  '),
    /ARTICLE_FEATURED_REASON_REQUIRED/
  );
  assert.equal(
    normalizeCommunityFeaturedReason(true, '  Practical launch guide  '),
    'Practical launch guide'
  );
  assert.equal(normalizeCommunityFeaturedReason(false, 'old reason'), null);
});

test('only editable article states can create a translation submission', () => {
  for (const status of [
    'draft',
    'revision_draft',
    'translation_failed',
    'changes_requested',
    'rejected',
  ]) {
    assert.equal(canSubmitCommunityArticleStatus(status), true);
  }
  for (const status of ['translating', 'pending_review', 'published']) {
    assert.equal(canSubmitCommunityArticleStatus(status), false);
  }
});

test('expired or replaced worker claims cannot update business state', () => {
  const now = new Date('2026-07-19T12:00:00.000Z');
  const active = {
    status: 'processing',
    claimToken: 'current',
    leaseExpiresAt: new Date('2026-07-19T12:01:00.000Z'),
  };
  assert.equal(
    isActiveCommunityJobClaim({ job: active, claimToken: 'current', now }),
    true
  );
  assert.equal(
    isActiveCommunityJobClaim({ job: active, claimToken: 'old', now }),
    false
  );
  assert.equal(
    isActiveCommunityJobClaim({
      job: { ...active, leaseExpiresAt: now },
      claimToken: 'current',
      now,
    }),
    false
  );
});

test('expired translation workers fail exhausted jobs instead of blocking the queue', () => {
  const now = new Date('2026-07-20T12:00:00.000Z');
  assert.equal(
    getCommunityTranslationJobRecoveryAction(
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
    getCommunityTranslationJobRecoveryAction(
      {
        status: 'pending',
        attemptCount: 4,
        maxAttempts: 5,
        leaseExpiresAt: null,
      },
      now
    ),
    'claim'
  );
});
