import assert from 'node:assert/strict';
import test from 'node:test';

import { validateCreditPayment } from './payment-validation';

const order = {
  amount: 4499,
  currency: 'usd',
  paymentProductId: 'prod_popular',
};

test('payment validation requires exact amount, currency, and product', () => {
  assert.equal(
    validateCreditPayment({
      order,
      session: {
        productId: 'prod_popular',
        paymentInfo: { paymentAmount: 4499, paymentCurrency: 'USD' },
      },
    }),
    null
  );
  assert.equal(
    validateCreditPayment({
      order,
      session: {
        productId: 'prod_popular',
        paymentInfo: { paymentAmount: 1, paymentCurrency: 'usd' },
      },
    }),
    'PAYMENT_AMOUNT_MISMATCH'
  );
  assert.equal(
    validateCreditPayment({
      order,
      session: {
        productId: 'wrong',
        paymentInfo: { paymentAmount: 4499, paymentCurrency: 'usd' },
      },
    }),
    'PAYMENT_PRODUCT_MISMATCH'
  );
});
