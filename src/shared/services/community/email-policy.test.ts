import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCommunityUnsubscribeToken,
  getCommunityEmailIdempotencyKey,
  getCommunityEmailJobRecoveryAction,
  getPendingCommentReminderEventId,
  verifyCommunityUnsubscribeToken,
} from './email-policy';

test('community email business keys are stable for duplicate events', () => {
  const now = new Date('2026-07-20T12:00:00Z');
  assert.equal(
    getPendingCommentReminderEventId('author', now),
    'pending-comments:author:2026-07-20'
  );
  assert.equal(
    getCommunityEmailIdempotencyKey('article_approved', 'revision-1', 'user-1'),
    'article_approved:revision-1:user-1'
  );
});

test('unsubscribe token is signed and rejects tampering', () => {
  const token = createCommunityUnsubscribeToken({
    userId: 'user-1',
    preference: 'productMarketing',
    secret: 'test-secret',
  });
  assert.deepEqual(verifyCommunityUnsubscribeToken(token, 'test-secret'), {
    userId: 'user-1',
    preference: 'productMarketing',
  });
  assert.equal(
    verifyCommunityUnsubscribeToken(`${token}x`, 'test-secret'),
    null
  );
});

test('expired email workers fail exhausted jobs and allow later jobs to proceed', () => {
  const now = new Date('2026-07-20T12:00:00Z');
  assert.equal(
    getCommunityEmailJobRecoveryAction(
      {
        status: 'processing',
        attemptCount: 5,
        maxAttempts: 5,
        leaseExpiresAt: new Date('2026-07-20T11:59:00Z'),
      },
      now
    ),
    'fail'
  );
  assert.equal(
    getCommunityEmailJobRecoveryAction(
      {
        status: 'processing',
        attemptCount: 4,
        maxAttempts: 5,
        leaseExpiresAt: new Date('2026-07-20T11:59:00Z'),
      },
      now
    ),
    'claim'
  );
  assert.equal(
    getCommunityEmailJobRecoveryAction(
      {
        status: 'processing',
        attemptCount: 5,
        maxAttempts: 5,
        leaseExpiresAt: new Date('2026-07-20T12:01:00Z'),
      },
      now
    ),
    'ignore'
  );
});
