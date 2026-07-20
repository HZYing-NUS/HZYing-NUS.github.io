import assert from 'node:assert/strict';
import test from 'node:test';

function failedStatus(status: 'processing' | 'created') {
  return status === 'processing' ? 'failed' : 'created';
}

test('pre-provider failures stay hidden', () => {
  assert.equal(failedStatus('processing'), 'failed');
});

test('post-activation failures remain visible', () => {
  assert.equal(failedStatus('created'), 'created');
});
