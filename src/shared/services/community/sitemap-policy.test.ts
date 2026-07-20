import assert from 'node:assert/strict';
import test from 'node:test';

import { getCommunitySitemapStaticRoutes } from './sitemap-policy';

test('sitemap removes About only after the community profile migration is configured', () => {
  assert.equal(getCommunitySitemapStaticRoutes(false).includes('/about'), true);
  assert.equal(getCommunitySitemapStaticRoutes(true).includes('/about'), false);
});
