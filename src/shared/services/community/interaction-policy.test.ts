import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canApplyCommunityCommentModeration,
  canCreateCommunityComment,
  canReadCommunityComment,
  canRestoreCommunityArticle,
  canUseCommunityInteraction,
  getCommunityProfileReportDecision,
  getReportedCommentResolutionStatus,
  isCommunityReportReasonType,
  isPendingCommentReminderCandidate,
  shouldShowDeletedCommentPlaceholder,
} from './interaction-policy';

test('first-level comments and replies use independent article switches', () => {
  assert.equal(
    canCreateCommunityComment({
      depth: 0,
      allowComments: false,
      allowReplies: true,
    }),
    false
  );
  assert.equal(
    canCreateCommunityComment({
      depth: 1,
      allowComments: false,
      allowReplies: true,
    }),
    true
  );
});

test('stale moderation workers cannot revive deleted comments', () => {
  assert.equal(canApplyCommunityCommentModeration('moderation_pending'), true);
  assert.equal(canApplyCommunityCommentModeration('pending_admin'), true);
  assert.equal(canApplyCommunityCommentModeration('blocked'), true);
  assert.equal(canApplyCommunityCommentModeration('deleted'), false);
  assert.equal(canApplyCommunityCommentModeration('hidden'), false);
});

test('private comment states are visible only to commenter, author, and admin', () => {
  const input = {
    status: 'hidden',
    commenterId: 'commenter',
    authorId: 'author',
    isAdmin: false,
  };
  assert.equal(canReadCommunityComment({ ...input, viewerId: null }), false);
  assert.equal(
    canReadCommunityComment({ ...input, viewerId: 'visitor' }),
    false
  );
  assert.equal(
    canReadCommunityComment({ ...input, viewerId: 'commenter' }),
    true
  );
  assert.equal(canReadCommunityComment({ ...input, viewerId: 'author' }), true);
  assert.equal(
    canReadCommunityComment({ ...input, viewerId: 'visitor', isAdmin: true }),
    true
  );
  assert.equal(
    canReadCommunityComment({ ...input, status: 'published', viewerId: null }),
    true
  );
});

test('deleted root comment keeps a placeholder only when replies exist', () => {
  assert.equal(shouldShowDeletedCommentPlaceholder(0), false);
  assert.equal(shouldShowDeletedCommentPlaceholder(1), true);
});

test('article restore and pending reminder use strict time windows', () => {
  const now = new Date('2026-07-19T12:00:00.000Z');
  assert.equal(
    canRestoreCommunityArticle(new Date('2026-07-19T12:00:01.000Z'), now),
    true
  );
  assert.equal(canRestoreCommunityArticle(now, now), false);
  assert.equal(
    isPendingCommentReminderCandidate(
      new Date('2026-07-18T11:59:59.000Z'),
      null,
      now
    ),
    true
  );
  assert.equal(
    isPendingCommentReminderCandidate(
      new Date('2026-07-18T11:59:59.000Z'),
      'sent',
      now
    ),
    false
  );
});

test('report reasons and visitor interaction permissions are enforced', () => {
  assert.equal(isCommunityReportReasonType('spam_scam'), true);
  assert.equal(isCommunityReportReasonType('author_reported_violation'), false);
  assert.equal(canUseCommunityInteraction(null), false);
  assert.equal(canUseCommunityInteraction('user-id'), true);
});

test('admin report decisions close the reported comment state', () => {
  assert.equal(
    getReportedCommentResolutionStatus({
      action: 'resolve',
      hiddenAt: null,
      authorHandledAt: null,
    }),
    'hidden'
  );
  assert.equal(
    getReportedCommentResolutionStatus({
      action: 'dismiss',
      hiddenAt: null,
      authorHandledAt: new Date(),
    }),
    'published'
  );
  assert.equal(
    getReportedCommentResolutionStatus({
      action: 'dismiss',
      hiddenAt: null,
      authorHandledAt: null,
    }),
    'pending_author'
  );
});

test('profile reports hide only when an administrator confirms a violation', () => {
  assert.equal(
    getCommunityProfileReportDecision({
      action: 'resolve',
      currentlyHidden: false,
    }),
    'hidden'
  );
  assert.equal(
    getCommunityProfileReportDecision({
      action: 'dismiss',
      currentlyHidden: false,
    }),
    'public'
  );
  assert.equal(
    getCommunityProfileReportDecision({
      action: 'dismiss',
      currentlyHidden: true,
    }),
    'hidden'
  );
});
