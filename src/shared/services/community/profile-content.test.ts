import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canPublishCommunityProfileRevision,
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
    socialLinks: [{ label: 'GitHub', url: 'https://github.com/example' }],
  });
  assert.equal(normalized.displayName, 'Maker');
  assert.deepEqual(normalized.skills, ['Next.js']);
  assert.equal(
    getCommunityProfileFingerprint(normalized),
    getCommunityProfileFingerprint(normalized)
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
