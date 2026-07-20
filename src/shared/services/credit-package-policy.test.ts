import assert from 'node:assert/strict';
import test from 'node:test';

import { authoritativeCheckoutValues } from './credit-package-policy';

test('checkout ignores client supplied amount, credits, and currency', () => {
  assert.deepEqual(
    authoritativeCheckoutValues(
      { code: 'credit_popular', credits: 800, amountUsdCents: 4499 },
      { amount: 1, credits: 999999, currency: 'cny' }
    ),
    {
      productId: 'credit_popular',
      credits: 800,
      amount: 4499,
      currency: 'usd',
    }
  );
});
