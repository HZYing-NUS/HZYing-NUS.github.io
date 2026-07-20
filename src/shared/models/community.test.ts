import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertCommunityCommentParent,
  isActiveCommunityJobClaim,
  isUsernameUnavailable,
} from './community';

test('username allocation rejects current, historical, and reserved names', () => {
  assert.equal(
    isUsernameUnavailable({ current: true, history: false, reserved: false }),
    true
  );
  assert.equal(
    isUsernameUnavailable({ current: false, history: true, reserved: false }),
    true
  );
  assert.equal(
    isUsernameUnavailable({ current: false, history: false, reserved: true }),
    true
  );
  assert.equal(
    isUsernameUnavailable({ current: false, history: false, reserved: false }),
    false
  );
});

test('comment replies only target root comments in the same article', () => {
  assert.equal(
    assertCommunityCommentParent({ articleId: 'article-1', parent: null }),
    0
  );
  assert.equal(
    assertCommunityCommentParent({
      articleId: 'article-1',
      parent: { articleId: 'article-1', depth: 0, status: 'published' },
    }),
    1
  );
  assert.throws(() =>
    assertCommunityCommentParent({
      articleId: 'article-1',
      parent: { articleId: 'article-2', depth: 0, status: 'published' },
    })
  );
  assert.throws(() =>
    assertCommunityCommentParent({
      articleId: 'article-1',
      parent: { articleId: 'article-1', depth: 1, status: 'published' },
    })
  );
  assert.throws(
    () =>
      assertCommunityCommentParent({
        articleId: 'article-1',
        parent: { articleId: 'article-1', depth: 0, status: 'hidden' },
      }),
    /not open for replies/
  );
});

test('job completion rejects stale claim tokens and expired leases', () => {
  const now = new Date('2026-07-19T00:00:00.000Z');
  const activeJob = {
    status: 'processing',
    claimToken: 'claim-current',
    leaseExpiresAt: new Date('2026-07-19T00:01:00.000Z'),
  };

  assert.equal(
    isActiveCommunityJobClaim({
      job: activeJob,
      claimToken: 'claim-current',
      now,
    }),
    true
  );
  assert.equal(
    isActiveCommunityJobClaim({
      job: activeJob,
      claimToken: 'claim-stale',
      now,
    }),
    false
  );
  assert.equal(
    isActiveCommunityJobClaim({
      job: {
        ...activeJob,
        leaseExpiresAt: new Date('2026-07-18T23:59:59.000Z'),
      },
      claimToken: 'claim-current',
      now,
    }),
    false
  );
});
