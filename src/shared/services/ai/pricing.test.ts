import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateAddonOnlyPrice,
  calculateContextAddonCosts,
  calculateFileParseCostUsd,
} from './cost-calculation';

const rates = {
  fileContextCostPerMillionTokens: 2,
  memoryContextCostPerMillionTokens: 4,
  fileParseCostPerMbUsd: 0.5,
};

test('context addon costs use independently configured token rates', () => {
  assert.deepEqual(
    calculateContextAddonCosts({
      fileContextTokens: 500_000,
      memoryContextTokens: 250_000,
      fileContextCostPerMillionTokens: rates.fileContextCostPerMillionTokens,
      memoryContextCostPerMillionTokens:
        rates.memoryContextCostPerMillionTokens,
    }),
    { fileCostUsd: 1, memoryCostUsd: 1 }
  );
});

test('file parsing cost is based on stored bytes', () => {
  assert.equal(
    calculateFileParseCostUsd(2 * 1024 * 1024, rates.fileParseCostPerMbUsd),
    1
  );
  assert.equal(calculateFileParseCostUsd(0, rates.fileParseCostPerMbUsd), 0);
});

test('zero addon cost never triggers the model minimum charge', () => {
  assert.equal(
    calculateAddonOnlyPrice({
      internalCostUsd: 0,
      multiplier: 2.857143,
      creditValueUsd: 0.05,
      minimumMarginUsd: 0,
    }).credits,
    0
  );
});
