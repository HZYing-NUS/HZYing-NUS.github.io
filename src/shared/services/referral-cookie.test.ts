import assert from 'node:assert/strict';
import test from 'node:test';

import { createReferralCookie, verifyReferralCookie } from './referral-cookie';

test('referral cookie rejects tampering and expiration', () => {
  const secret = 'test-secret';
  const value = createReferralCookie(
    { clickId: 'click-1', expiresAt: 2_000 },
    secret
  );
  assert.deepEqual(verifyReferralCookie(value, secret, 1_000), {
    clickId: 'click-1',
    expiresAt: 2_000,
  });
  assert.equal(verifyReferralCookie(`${value}x`, secret, 1_000), null);
  assert.equal(verifyReferralCookie(value, secret, 2_000), null);
});
