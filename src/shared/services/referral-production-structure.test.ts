import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const orderModel = readFileSync(
  new URL('../models/order.ts', import.meta.url),
  'utf8'
);
const referralModel = readFileSync(
  new URL('../models/referral.ts', import.meta.url),
  'utf8'
);
const paymentRiskModel = readFileSync(
  new URL('../models/payment_risk.ts', import.meta.url),
  'utf8'
);
const migration = readFileSync(
  new URL(
    '../../config/db/migrations/0010_brainy_glorian.sql',
    import.meta.url
  ),
  'utf8'
);

test('payment settlement uses database identity claim and risk checks in transaction', () => {
  assert.match(orderModel, /\.insert\(paymentIdentityClaim\)/);
  assert.match(orderModel, /\.for\('update'\)/);
  assert.match(orderModel, /PAYMENT_RISK_ALREADY_RECORDED/);
  assert.match(
    orderModel,
    /eq\(paymentRiskEvent\.provider, currentOrder\.paymentProvider\)/
  );
  assert.match(
    migration,
    /CREATE UNIQUE INDEX "idx_payment_identity_claim_unique" ON "payment_identity_claim" USING btree \("provider","payment_user_id"\)/
  );
});

test('purchase reward queries the earliest valid paid Creem order', () => {
  assert.match(referralModel, /findFirstEligibleReferralPurchase/);
  assert.match(referralModel, /eq\(order\.paymentProvider, 'creem'\)/);
  assert.match(
    referralModel,
    /\.orderBy\(asc\(purchaseOccurredAt\), asc\(order\.id\)\)/
  );
  assert.match(referralModel, /sourceOrderNo: firstPurchase\.orderNo/);
  assert.match(referralModel, /\.where\(eq\(order\.id, firstPurchase\.id\)\)/);
  assert.match(
    referralModel,
    /await hasPurchaseRisk\(tx, lockedPurchase\.orderNo\)/
  );
  assert.match(referralModel, /existing\.status === 'pending'/);
  assert.match(referralModel, /purchaseRewardAvailableAt\(now\)/);
  assert.match(
    paymentRiskModel,
    /\.where\(eq\(order\.id, matchedOrderCandidate\.id\)\)\s*\.for\('update'\)/
  );
});

test('signup cap stores and releases the same month key', () => {
  assert.match(referralModel, /capMonthKey: monthKey/);
  assert.match(referralModel, /const monthKey = reward\.capMonthKey/);
  assert.match(migration, /"cap_month_key" text/);
});

test('release validates payment owner and existing IP risk signals', () => {
  assert.match(
    referralModel,
    /eq\(paymentIdentityClaim\.provider, sourceOrder\.provider\)/
  );
  assert.match(
    referralModel,
    /eq\(paymentIdentityClaim\.paymentUserId, sourceOrder\.paymentUserId\)/
  );
  assert.doesNotMatch(
    referralModel,
    /eq\(paymentIdentityClaim\.firstOrderNo, reward\.sourceOrderNo\)/
  );
  assert.match(referralModel, /INVITER_IP_MATCH/);
  assert.match(referralModel, /REFERRED_IP_REUSED/);
  assert.doesNotMatch(referralModel, /INVITER_IDENTITY_MATCH/);
  assert.match(referralModel, /status: 'frozen'/);
});

test('release has a final payment-risk guard', () => {
  assert.match(referralModel, /const sourceOrderRisk =/);
  assert.match(
    referralModel,
    /await hasPurchaseRisk\(tx, reward\.sourceOrderNo\)/
  );
  assert.match(
    referralModel,
    /status: 'revoked', reviewNote: 'PAYMENT_RISK_EVENT'/
  );
});

test('release reconciles a late earlier purchase before granting', () => {
  const releaseFunction = referralModel.slice(
    referralModel.indexOf('export async function releaseReferralRewards'),
    referralModel.indexOf('export async function handleReferralPaymentRisk')
  );
  assert.match(releaseFunction, /findFirstEligibleReferralPurchase/);
  assert.match(
    releaseFunction,
    /\.where\(eq\(order\.id, firstPurchase\.id\)\)/
  );
  assert.match(releaseFunction, /\.for\('update'\)/);
  assert.match(releaseFunction, /purchaseRewardSourceUpdate\(/);
  assert.match(releaseFunction, /if \(sourceUpdate\)/);
  assert.match(releaseFunction, /\.set\(\{\s*\.\.\.sourceUpdate,/);
  assert.match(releaseFunction, /return false/);
});

test('payment settlement, refund, and release share user-order-reward lock order', () => {
  const settlementUserLock = orderModel.indexOf('.from(user)');
  const settlementOrderLock = orderModel.indexOf(
    ".where(eq(order.orderNo, orderNo))\n        .for('update')"
  );
  assert.ok(
    settlementUserLock >= 0 && settlementUserLock < settlementOrderLock
  );

  const refundUserLock = paymentRiskModel.indexOf('.from(user)');
  const refundOrderLock = paymentRiskModel.indexOf(
    ".where(eq(order.id, matchedOrderCandidate.id))\n      .for('update')"
  );
  const refundRewardLock = referralModel.indexOf(
    ".where(eq(referralReward.sourceOrderNo, orderNo))\n    .for('update')"
  );
  assert.ok(refundUserLock >= 0 && refundUserLock < refundOrderLock);
  assert.ok(refundRewardLock >= 0);

  const releaseStart = referralModel.indexOf(
    'const released = await db().transaction',
    referralModel.indexOf('export async function releaseReferralRewards')
  );
  const releaseModel = referralModel.slice(releaseStart);
  const releaseUserLock = releaseModel.indexOf('.from(user)');
  const releaseOrderLock = releaseModel.indexOf('.from(order)');
  const releaseRewardLock = releaseModel.indexOf('.from(referralReward)');
  assert.ok(
    releaseUserLock >= 0 &&
      releaseUserLock < releaseOrderLock &&
      releaseOrderLock < releaseRewardLock
  );
  assert.match(releaseModel, /reward\.availableAt > new Date\(\)/);
});

test('successful Creem settlement corrects an existing purchase reward in the same transaction', () => {
  assert.match(orderModel, /reconcileReferralPurchaseAfterSettlement/);
  assert.match(
    orderModel,
    /orderResult\.paymentProvider === 'creem'[\s\S]*await reconcileReferralPurchaseAfterSettlement\(\{\s*tx,/
  );
  assert.match(referralModel, /action === 'update_pending'/);
  assert.match(referralModel, /reason: 'PURCHASE_SOURCE_CORRECTION'/);
  assert.match(referralModel, /status: 'pending'/);
  assert.match(referralModel, /referralGrantKey/);
  assert.match(referralModel, /remainingGrantCredits/);
  assert.match(referralModel, /FIRST_PURCHASE_SOURCE_CHANGED/);
});

test('admin freeze cycles use distinct clawback and audit idempotency keys', () => {
  assert.match(referralModel, /select\(\{ count: count\(\) \}\)/);
  assert.match(referralModel, /admin-freeze:\$\{reward\.id\}:/);
  assert.match(referralModel, /credit-audit:admin-unfreeze:\$\{clawback\.id\}/);
});

test('concurrent referral profile creation rereads the winning row', () => {
  assert.match(referralModel, /const \[concurrent\] = await db\(\)/);
  assert.match(referralModel, /if \(concurrent\) return concurrent/);
});

test('a refunded first purchase never promotes the second purchase', () => {
  const purchaseQuery = referralModel.slice(
    referralModel.indexOf(
      'export async function findFirstEligibleReferralPurchase'
    ),
    referralModel.indexOf(
      'export async function reconcileReferralPurchaseAfterSettlement'
    )
  );
  assert.doesNotMatch(purchaseQuery, /referralPurchaseTombstone/);
  assert.doesNotMatch(purchaseQuery, /paymentRiskEvent/);
  assert.match(referralModel, /existing\?\.status === 'pending'/);
  assert.match(
    referralModel,
    /status: 'revoked', reviewNote: 'PAYMENT_RISK_EVENT'/
  );
});
