import assert from 'node:assert/strict';
import test from 'node:test';

import {
  localizeCallbackPath,
  safeInternalCallbackPath,
  stripCallbackLocale,
} from './auth-callback';

test('accepts only same-site relative callback paths', () => {
  assert.equal(
    safeInternalCallbackPath('/resources/tool?q=ai'),
    '/resources/tool?q=ai'
  );
  assert.equal(safeInternalCallbackPath('https://evil.example'), '/');
  assert.equal(safeInternalCallbackPath('//evil.example/path'), '/');
  assert.equal(safeInternalCallbackPath('/\\evil.example/path'), '/');
  assert.equal(safeInternalCallbackPath('/%2F%2Fevil.example/path'), '/');
  assert.equal(safeInternalCallbackPath('/%5Cevil.example/path'), '/');
  assert.equal(
    safeInternalCallbackPath('/path%0d%0aLocation:%20https://evil.example'),
    '/'
  );
});

test('removes and adds the active locale exactly once', () => {
  assert.equal(
    stripCallbackLocale('/zh/submit?from=resource', 'zh'),
    '/submit?from=resource'
  );
  assert.equal(stripCallbackLocale('/submit', 'zh'), '/submit');
  assert.equal(localizeCallbackPath('/zh/submit', 'zh'), '/zh/submit');
  assert.equal(localizeCallbackPath('/submit', 'zh'), '/zh/submit');
});
