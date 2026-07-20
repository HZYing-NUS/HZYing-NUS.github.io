import assert from 'node:assert/strict';
import test from 'node:test';

import { extractCreemProductId } from './creem-payload';

test('Creem product ID supports string and object payloads', () => {
  assert.equal(extractCreemProductId('prod_1'), 'prod_1');
  assert.equal(extractCreemProductId({ id: 'prod_2' }), 'prod_2');
  assert.equal(extractCreemProductId({ product_id: 'prod_3' }), 'prod_3');
  assert.equal(extractCreemProductId(null), undefined);
});
