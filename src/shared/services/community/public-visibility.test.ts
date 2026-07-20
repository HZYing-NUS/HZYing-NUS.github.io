import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCommunityPermanentRedirectPath,
  getCommunityArticleHttpStatus,
  resolveCommunityRedirectLookupResponse,
  resolveCommunityVisibilityResponse,
} from './public-visibility';

const now = new Date('2026-07-19T00:00:00Z');
test('community article visibility returns real public status decisions', () => {
  assert.equal(getCommunityArticleHttpStatus(null, now), 404);
  assert.equal(
    getCommunityArticleHttpStatus(
      {
        status: 'draft',
        currentPublishedRevisionId: null,
        deletedAt: null,
        restoreDeadlineAt: null,
        archivedAt: null,
      },
      now
    ),
    404
  );
  assert.equal(
    getCommunityArticleHttpStatus(
      {
        status: 'published',
        currentPublishedRevisionId: 'revision-1',
        deletedAt: null,
        restoreDeadlineAt: null,
        archivedAt: null,
      },
      now
    ),
    200
  );
  for (const status of [
    'revision_draft',
    'translating',
    'revision_pending_review',
    'changes_requested',
    'rejected',
  ]) {
    assert.equal(
      getCommunityArticleHttpStatus(
        {
          status,
          currentPublishedRevisionId: 'revision-1',
          deletedAt: null,
          restoreDeadlineAt: null,
          archivedAt: null,
        },
        now
      ),
      200
    );
  }
  assert.equal(
    getCommunityArticleHttpStatus(
      {
        status: 'deleted_by_author',
        currentPublishedRevisionId: 'revision-1',
        deletedAt: new Date(),
        restoreDeadlineAt: new Date('2026-07-20'),
        archivedAt: null,
      },
      now
    ),
    404
  );
  assert.equal(
    getCommunityArticleHttpStatus(
      {
        status: 'archived',
        currentPublishedRevisionId: 'revision-1',
        deletedAt: new Date(),
        restoreDeadlineAt: new Date('2026-07-18'),
        archivedAt: new Date('2026-07-18'),
      },
      now
    ),
    410
  );
  assert.equal(
    getCommunityArticleHttpStatus(
      {
        status: 'archived',
        currentPublishedRevisionId: 'revision-1',
        deletedAt: null,
        restoreDeadlineAt: null,
        archivedAt: new Date('2026-07-18'),
      },
      now
    ),
    404
  );
});

test('visibility lookup failures fail closed with a retryable 503', () => {
  assert.equal(resolveCommunityVisibilityResponse({ ok: false }), 503);
  assert.equal(
    resolveCommunityVisibilityResponse({ ok: true, status: 'invalid' }),
    503
  );
  assert.equal(
    resolveCommunityVisibilityResponse({ ok: true, status: 200 }),
    200
  );
  assert.equal(
    resolveCommunityVisibilityResponse({ ok: true, status: 410 }),
    410
  );
});

test('permanent redirect lookup failures fail closed', () => {
  assert.deepEqual(resolveCommunityRedirectLookupResponse({ ok: false }), {
    status: 503,
    target: null,
  });
  assert.deepEqual(
    resolveCommunityRedirectLookupResponse({ ok: true, target: 'new-slug' }),
    { status: 200, target: 'new-slug' }
  );
});

test('community permanent redirects preserve locale and query string', () => {
  assert.equal(
    buildCommunityPermanentRedirectPath({
      localePrefix: '/zh',
      type: 'article',
      target: 'new-slug',
      search: '?ref=old',
    }),
    '/zh/blog/new-slug?ref=old'
  );
  assert.equal(
    buildCommunityPermanentRedirectPath({
      localePrefix: '',
      type: 'profile',
      target: 'maker-new',
    }),
    '/u/maker-new'
  );
});
