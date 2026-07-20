import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyReferralCorrectionDebt,
  availableSignupRewardCredits,
  canAttributeReferral,
  canReleaseReferralReward,
  canTransitionReferralReward,
  nextReferralOutboxState,
  paymentRiskRewardStatus,
  purchaseRewardAvailableAt,
  purchaseRewardCorrection,
  purchaseRewardCredits,
  purchaseRewardSourceUpdate,
  referralEventKey,
  referralExpiry,
  referralGrantKey,
  referralMonthKey,
  referralRewardAvailableAt,
  referralRewardKey,
} from './referral-policy';

test('three packages return the fixed 10% first-purchase reward', () => {
  assert.equal(purchaseRewardCredits(300), 30);
  assert.equal(purchaseRewardCredits(800), 80);
  assert.equal(purchaseRewardCredits(1200), 120);
});

test('referral attribution expires after 30 days and rejects self referral', () => {
  const clickedAt = new Date('2026-07-01T00:00:00.000Z');
  const expiresAt = referralExpiry(clickedAt);
  assert.equal(expiresAt.toISOString(), '2026-07-31T00:00:00.000Z');
  assert.equal(
    canAttributeReferral({
      inviterUserId: 'a',
      referredUserId: 'b',
      expiresAt,
      now: new Date('2026-07-30T23:59:59.000Z'),
    }),
    true
  );
  assert.equal(
    canAttributeReferral({
      inviterUserId: 'a',
      referredUserId: 'a',
      expiresAt,
      now: clickedAt,
    }),
    false
  );
  assert.equal(
    canAttributeReferral({
      inviterUserId: 'a',
      referredUserId: 'b',
      expiresAt,
      now: expiresAt,
    }),
    false
  );
});

test('signup rewards respect the 100 Credit monthly cap', () => {
  assert.equal(availableSignupRewardCredits(0), 10);
  assert.equal(availableSignupRewardCredits(90), 10);
  assert.equal(availableSignupRewardCredits(95), 5);
  assert.equal(availableSignupRewardCredits(100), 0);
  assert.equal(referralMonthKey(new Date('2026-07-31T23:59:59Z')), '2026-07');
});

test('rewards remain pending for 24 hours', () => {
  assert.equal(
    referralRewardAvailableAt(new Date('2026-07-01T10:00:00Z')).toISOString(),
    '2026-07-02T10:00:00.000Z'
  );
});

test('purchase reconciliation waits for both provider hold and a fresh 15 minute window', () => {
  assert.equal(
    purchaseRewardAvailableAt(
      new Date('2026-07-01T10:00:00Z'),
      new Date('2026-07-02T09:50:00Z')
    ).toISOString(),
    '2026-07-02T10:05:00.000Z'
  );
  assert.equal(
    purchaseRewardAvailableAt(
      new Date('2026-07-01T10:00:00Z'),
      new Date('2026-07-01T11:00:00Z')
    ).toISOString(),
    '2026-07-02T10:00:00.000Z'
  );
});

test('purchase reconciliation updates only when an earlier source changes', () => {
  const firstPurchase = {
    orderNo: 'order-first',
    packageCredits: 300,
    occurredAt: new Date('2026-07-01T10:00:00Z'),
  };
  assert.equal(
    purchaseRewardSourceUpdate({
      currentSourceOrderNo: 'order-first',
      firstPurchase,
    }),
    null
  );
  assert.deepEqual(
    purchaseRewardSourceUpdate({
      currentSourceOrderNo: 'order-later',
      firstPurchase,
      observedAt: new Date('2026-07-02T09:50:00Z'),
    }),
    {
      sourceOrderNo: 'order-first',
      credits: 30,
      availableAt: new Date('2026-07-02T10:05:00Z'),
    }
  );
});

test('late earlier purchase restarts pending observation and regrants by source idempotently', () => {
  const firstPurchase = {
    orderNo: 'order-a',
    packageCredits: 300,
    occurredAt: new Date('2026-07-01T10:00:00Z'),
  };
  const observedAt = new Date('2026-07-02T09:50:00Z');
  assert.deepEqual(
    purchaseRewardCorrection({
      status: 'pending',
      rewardId: 'reward-1',
      currentSourceOrderNo: 'order-b',
      firstPurchase,
      observedAt,
    }),
    {
      action: 'update_pending',
      sourceUpdate: {
        sourceOrderNo: 'order-a',
        credits: 30,
        availableAt: new Date('2026-07-02T10:05:00Z'),
      },
    }
  );
  const grantedCorrection = purchaseRewardCorrection({
    status: 'granted',
    rewardId: 'reward-1',
    currentSourceOrderNo: 'order-b',
    firstPurchase,
    observedAt,
  });
  assert.deepEqual(grantedCorrection, {
    action: 'regrant',
    sourceUpdate: {
      sourceOrderNo: 'order-a',
      credits: 30,
      availableAt: new Date('2026-07-02T10:05:00Z'),
    },
    idempotencyKey: 'referral-source-correction:reward-1:order-a',
  });
  assert.deepEqual(
    purchaseRewardCorrection({
      status: 'granted',
      rewardId: 'reward-1',
      currentSourceOrderNo: 'order-b',
      firstPurchase,
      observedAt,
    }),
    grantedCorrection
  );
  assert.deepEqual(
    purchaseRewardCorrection({
      status: 'frozen',
      rewardId: 'reward-1',
      currentSourceOrderNo: 'order-a',
      firstPurchase: {
        ...firstPurchase,
        orderNo: 'order-earlier',
        packageCredits: 1200,
      },
      observedAt,
    }),
    {
      action: 'update_frozen',
      sourceUpdate: {
        sourceOrderNo: 'order-earlier',
        credits: 120,
        availableAt: new Date('2026-07-02T10:05:00Z'),
      },
    }
  );
});

test('purchase grant keys isolate each corrected source and correction debt preserves net value', () => {
  assert.equal(
    referralGrantKey({
      rewardId: 'reward-1',
      rewardType: 'first_purchase',
      sourceOrderNo: 'order-a',
    }),
    'referral-grant:reward-1:order-a'
  );
  assert.equal(
    referralGrantKey({
      rewardId: 'reward-1',
      rewardType: 'first_purchase',
      sourceOrderNo: 'order-b',
    }),
    'referral-grant:reward-1:order-b'
  );
  assert.deepEqual(applyReferralCorrectionDebt(30, [120]), {
    remainingCredits: 0,
    remainingOwedCredits: [90],
  });
  assert.deepEqual(applyReferralCorrectionDebt(120, [30]), {
    remainingCredits: 90,
    remainingOwedCredits: [0],
  });
  assert.deepEqual(applyReferralCorrectionDebt(120, [30, 80]), {
    remainingCredits: 10,
    remainingOwedCredits: [0, 0],
  });
});

test('first AI and first purchase events use stable per-user idempotency keys', () => {
  assert.equal(
    referralEventKey('first_ai_settlement', 'user-1'),
    'referral:first-ai:user-1'
  );
  assert.equal(
    referralEventKey('first_purchase', 'user-1'),
    'referral:first-purchase:user-1'
  );
  assert.equal(
    referralRewardKey('first_ai_settlement', 'user-1'),
    'referral-reward:first-ai:user-1'
  );
  assert.equal(
    referralRewardKey('first_purchase', 'user-1'),
    'referral-reward:first-purchase:user-1'
  );
});

test('release requires elapsed hold and both users to pass risk checks', () => {
  const availableAt = new Date('2026-07-02T10:00:00Z');
  assert.equal(
    canReleaseReferralReward({
      status: 'pending',
      availableAt,
      now: availableAt,
      inviterRiskBlocked: false,
      referredRiskBlocked: false,
    }),
    true
  );
  assert.equal(
    canReleaseReferralReward({
      status: 'pending',
      availableAt,
      now: availableAt,
      inviterRiskBlocked: true,
      referredRiskBlocked: false,
    }),
    false
  );
  assert.equal(
    canReleaseReferralReward({
      status: 'pending',
      availableAt,
      now: new Date('2026-07-02T09:59:59Z'),
      inviterRiskBlocked: false,
      referredRiskBlocked: false,
    }),
    false
  );
});

test('refund or dispute moves all eligible rewards to terminal revoked state', () => {
  assert.equal(paymentRiskRewardStatus('pending'), 'revoked');
  assert.equal(paymentRiskRewardStatus('granted'), 'revoked');
  assert.equal(paymentRiskRewardStatus('revoked'), 'revoked');
});

test('terminal referral reward states cannot be revived', () => {
  assert.equal(canTransitionReferralReward('pending', 'frozen'), true);
  assert.equal(canTransitionReferralReward('frozen', 'pending'), true);
  assert.equal(canTransitionReferralReward('granted', 'revoked'), true);
  assert.equal(canTransitionReferralReward('revoked', 'pending'), false);
  assert.equal(canTransitionReferralReward('revoked', 'frozen'), false);
});

test('outbox retry backs off and becomes dead after eight failures', () => {
  assert.deepEqual(nextReferralOutboxState(0), {
    attempts: 1,
    status: 'pending',
    delayMinutes: 10,
  });
  assert.equal(nextReferralOutboxState(7).status, 'dead');
  assert.equal(nextReferralOutboxState(20).delayMinutes, 1440);
});
