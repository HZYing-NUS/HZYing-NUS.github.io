import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canPublishCommunityProfileRevision,
  getCommunityHttpsUrl,
  getCommunityProfileFingerprint,
  normalizeCommunityProfileInput,
  shouldCreateCommunityProfileRevision,
} from './profile-content';

test('profile normalization and fingerprint are stable', () => {
  const normalized = normalizeCommunityProfileInput({
    displayName: ' Maker ',
    aboutZh: ' 中文 ',
    aboutEn: ' English ',
    skills: ['Next.js', 'Next.js'],
    focusAreas: ['独立开发', '独立开发'],
    works: [
      {
        title: 'WebTools',
        description: '资源平台',
        url: 'https://example.com/webtools',
      },
    ],
    socialLinks: [{ label: 'GitHub', url: 'https://github.com/example' }],
  });
  assert.equal(normalized.displayName, 'Maker');
  assert.deepEqual(normalized.skills, ['Next.js']);
  assert.deepEqual(normalized.focusAreas, ['独立开发']);
  assert.deepEqual(normalized.works, [
    {
      title: 'WebTools',
      description: '资源平台',
      url: 'https://example.com/webtools',
    },
  ]);
  assert.equal(
    getCommunityProfileFingerprint(normalized),
    getCommunityProfileFingerprint(normalized)
  );
  assert.notEqual(
    getCommunityProfileFingerprint(normalized),
    getCommunityProfileFingerprint({
      ...normalized,
      focusAreas: ['AI 产品'],
    })
  );
});

test('profile external links only accept https URLs', () => {
  assert.throws(
    () =>
      normalizeCommunityProfileInput({
        displayName: 'Maker',
        websiteUrl: 'http://example.com',
      }),
    /COMMUNITY_PROFILE_URL_INVALID/
  );
  assert.throws(
    () =>
      normalizeCommunityProfileInput({
        displayName: 'Maker',
        works: [{ title: 'Unsafe', url: 'javascript:alert(1)' }],
      }),
    /COMMUNITY_PROFILE_URL_INVALID/
  );
  assert.throws(
    () =>
      normalizeCommunityProfileInput({
        displayName: 'Maker',
        socialLinks: [{ label: 'GitHub', url: 'javascript:alert(1)' }],
      }),
    /COMMUNITY_PROFILE_URL_INVALID/
  );
  assert.equal(
    normalizeCommunityProfileInput({
      displayName: 'Maker',
      websiteUrl: 'https://example.com/profile',
    }).websiteUrl,
    'https://example.com/profile'
  );
  assert.equal(getCommunityHttpsUrl('http://example.com'), null);
  assert.equal(getCommunityHttpsUrl('javascript:alert(1)'), null);
  assert.equal(getCommunityHttpsUrl('not a URL'), null);
  assert.equal(
    getCommunityHttpsUrl(' https://example.com/profile '),
    'https://example.com/profile'
  );
});

test('profile works and focus areas stay optional and bounded', () => {
  const normalized = normalizeCommunityProfileInput({ displayName: 'Maker' });
  assert.deepEqual(normalized.works, []);
  assert.deepEqual(normalized.focusAreas, []);
  assert.throws(
    () =>
      normalizeCommunityProfileInput({
        displayName: 'Maker',
        focusAreas: ['x'.repeat(121)],
      }),
    /COMMUNITY_PROFILE_FIELD_TOO_LONG/
  );
});

test('profile publication requires the current working revision and fingerprint', () => {
  assert.equal(
    canPublishCommunityProfileRevision({
      latestRevisionId: 'revision-2',
      revisionId: 'revision-2',
      currentFingerprint: 'new',
      expectedFingerprint: 'new',
    }),
    true
  );
  assert.equal(
    canPublishCommunityProfileRevision({
      latestRevisionId: 'revision-3',
      revisionId: 'revision-2',
      currentFingerprint: 'new',
      expectedFingerprint: 'new',
    }),
    false
  );
  assert.equal(
    canPublishCommunityProfileRevision({
      latestRevisionId: 'revision-2',
      revisionId: 'revision-2',
      currentFingerprint: 'changed',
      expectedFingerprint: 'new',
    }),
    false
  );
});

test('editing a submitted or blocked profile creates a new revision', () => {
  assert.equal(
    shouldCreateCommunityProfileRevision({
      revisionId: 'revision-2',
      publishedRevisionId: 'revision-1',
      moderationStatus: 'pending_admin',
    }),
    true
  );
  assert.equal(
    shouldCreateCommunityProfileRevision({
      revisionId: 'revision-2',
      publishedRevisionId: 'revision-1',
      moderationStatus: 'draft',
    }),
    false
  );
});
