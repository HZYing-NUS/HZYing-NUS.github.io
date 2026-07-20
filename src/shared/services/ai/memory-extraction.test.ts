import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMemoryDedupeKey,
  extractGlobalMemoryCandidates,
  extractProjectMemoryCandidates,
} from './memory-extraction';

test('confirmed decisions only come from explicit user confirmation', () => {
  assert.equal(
    extractProjectMemoryCandidates('这个方案怎么样？', '结论是采用 D1。').some(
      (item) => item.category === 'decision'
    ),
    false
  );
  assert.equal(
    extractProjectMemoryCandidates('我们决定采用 D1。', '收到。').some(
      (item) => item.category === 'decision'
    ),
    true
  );
  assert.equal(
    extractProjectMemoryCandidates(
      'We have decided to use D1.',
      'Confirmed.'
    ).some((item) => item.category === 'decision'),
    true
  );
});

test('global memory candidates support Chinese and English and reject secrets', () => {
  assert.deepEqual(extractGlobalMemoryCandidates('以后请叫我梓颖。'), [
    '[称呼偏好] 梓颖',
  ]);
  assert.deepEqual(extractGlobalMemoryCandidates('Please call me Ziying.'), [
    '[称呼偏好] Ziying',
  ]);
  assert.deepEqual(
    extractGlobalMemoryCandidates('我的 API Key 是 secret。'),
    []
  );
  assert.deepEqual(
    extractGlobalMemoryCandidates('My email is me@example.com.'),
    []
  );
  assert.deepEqual(extractGlobalMemoryCandidates('I am tired today.'), []);
  assert.deepEqual(extractGlobalMemoryCandidates('以后不要使用 emoji。'), [
    '[长期偏好] 不要使用 emoji',
  ]);
});

test('project candidates preserve source roles', () => {
  const candidates = extractProjectMemoryCandidates(
    '我们决定采用 D1。当前问题是迁移失败。',
    '根因是迁移脚本失败。下一步修复迁移脚本。'
  );
  assert.equal(
    candidates.find((item) => item.category === 'decision')?.sourceRole,
    'user'
  );
  assert.equal(
    candidates.find((item) => item.category === 'conclusion')?.sourceRole,
    'assistant'
  );
});

test('memory dedupe keys isolate users and scopes', () => {
  const base = createMemoryDedupeKey({
    userId: 'u1',
    scopeId: 'p1',
    content: '[下一步] 部署。',
  });
  assert.equal(
    base,
    createMemoryDedupeKey({
      userId: 'u1',
      scopeId: 'p1',
      content: '[下一步] 部署',
    })
  );
  assert.notEqual(
    base,
    createMemoryDedupeKey({
      userId: 'u2',
      scopeId: 'p1',
      content: '[下一步] 部署',
    })
  );
});
