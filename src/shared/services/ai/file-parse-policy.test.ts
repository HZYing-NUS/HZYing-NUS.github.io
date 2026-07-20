import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getFileParseClaimTtlMs,
  sumChargeableParseCosts,
} from './file-parse-policy';

test('claim TTL accepts positive integers and rejects unsafe values', () => {
  assert.equal(getFileParseClaimTtlMs('5000'), 5000);
  assert.equal(getFileParseClaimTtlMs('0'), 120_000);
  assert.equal(getFileParseClaimTtlMs('-1'), 120_000);
  assert.equal(getFileParseClaimTtlMs('abc'), 120_000);
});

test('only owner attempts contribute parsing cost', () => {
  assert.equal(
    sumChargeableParseCosts([
      { status: 'parsed', chargeable: true, costUsd: 0.4 },
      { status: 'reused', chargeable: false, costUsd: 0.4 },
      { status: 'in_progress', chargeable: false, costUsd: 0.4 },
      { status: 'failed', chargeable: true, costUsd: 0.2 },
    ]),
    0.6000000000000001
  );
});
