import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isResourceAssistantSourceType,
  RESOURCE_ASSISTANT_SOURCE_REGISTRY,
} from './resource-assistant-sources';

test('public AI source registry excludes community content and profiles', () => {
  assert.deepEqual(RESOURCE_ASSISTANT_SOURCE_REGISTRY, [
    'resource',
    'collection',
    'legacy_post',
  ]);
  assert.equal(isResourceAssistantSourceType('community_article'), false);
  assert.equal(isResourceAssistantSourceType('community_profile'), false);
});
