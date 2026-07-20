import { randomBytes } from 'node:crypto';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lte,
  ne,
  or,
  sql,
  sum,
} from 'drizzle-orm';

import { db } from '@/core/db';
import {
  credit,
  creditIdentityClaim,
  creditReservation,
  order,
  paymentIdentityClaim,
  paymentRiskEvent,
  referralAttribution,
  referralEventOutbox,
  referralInviteClick,
  referralMonthlyCap,
  referralProfile,
  referralPurchaseTombstone,
  referralReward,
  referralRewardClawback,
  user,
} from '@/config/db/schema';
import { PaymentType } from '@/extensions/payment/types';
import { getSnowId, getUuid } from '@/shared/lib/hash';
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
} from '@/shared/services/referral-policy';

export type ReferralReward = typeof referralReward.$inferSelect;
export type ReferralRewardClawback = typeof referralRewardClawback.$inferSelect;

export async function findFirstEligibleReferralPurchase(
  tx: any,
  userId: string
) {
  const purchaseOccurredAt = sql<Date>`coalesce(${order.paidAt}, ${order.updatedAt}, ${order.createdAt})`;
  const [firstPurchase] = await tx
    .select({
      id: order.id,
      orderNo: order.orderNo,
      packageCredits: order.creditsAmount,
      occurredAt: purchaseOccurredAt,
      provider: order.paymentProvider,
      paymentUserId: order.paymentUserId,
    })
    .from(order)
    .where(
      and(
        eq(order.userId, userId),
        eq(order.status, 'paid'),
        eq(order.paymentType, PaymentType.ONE_TIME),
        eq(order.paymentProvider, 'creem'),
        gt(order.creditsAmount, 0)
      )
    )
    .orderBy(asc(purchaseOccurredAt), asc(order.id))
    .limit(1);
  return firstPurchase;
}

export async function reconcileReferralPurchaseAfterSettlement({
  tx,
  userId,
}: {
  tx: any;
  userId: string;
}) {
  const firstPurchase = await findFirstEligibleReferralPurchase(tx, userId);
  if (!firstPurchase) return null;
  const [lockedPurchase] = await tx
    .select({
      orderNo: order.orderNo,
      packageCredits: order.creditsAmount,
      occurredAt: sql<Date>`coalesce(${order.paidAt}, ${order.updatedAt}, ${order.createdAt})`,
      status: order.status,
    })
    .from(order)
    .where(eq(order.id, firstPurchase.id))
    .for('update');
  if (!lockedPurchase || lockedPurchase.status !== 'paid') return null;

  const [reward] = await tx
    .select()
    .from(referralReward)
    .where(
      eq(
        referralReward.idempotencyKey,
        referralRewardKey('first_purchase', userId)
      )
    )
    .for('update');
  if (!reward) return null;

  const correction = purchaseRewardCorrection({
    status: reward.status,
    rewardId: reward.id,
    currentSourceOrderNo: reward.sourceOrderNo,
    firstPurchase: {
      orderNo: lockedPurchase.orderNo,
      packageCredits: Number(lockedPurchase.packageCredits),
      occurredAt: lockedPurchase.occurredAt,
    },
  });
  if (!correction) return reward;

  if (
    correction.action === 'update_pending' ||
    correction.action === 'update_frozen'
  ) {
    const legacyCorrectionFreeze =
      reward.status === 'frozen' &&
      reward.riskEventId?.startsWith('referral-source-correction:');
    const [updated] = await tx
      .update(referralReward)
      .set({
        ...correction.sourceUpdate,
        status: legacyCorrectionFreeze ? 'pending' : undefined,
        grantedAt: legacyCorrectionFreeze ? null : undefined,
        riskEventId: legacyCorrectionFreeze ? null : undefined,
        reviewNote: legacyCorrectionFreeze ? null : reward.reviewNote,
      })
      .where(eq(referralReward.id, reward.id))
      .returning();
    return updated;
  }

  await clawbackGrantedReward({
    tx,
    reward,
    reason: 'PURCHASE_SOURCE_CORRECTION',
    riskEventId: correction.idempotencyKey,
    idempotencyKey: correction.idempotencyKey,
  });
  const [pending] = await tx
    .update(referralReward)
    .set({
      ...correction.sourceUpdate,
      status: 'pending',
      grantedAt: null,
      riskEventId: null,
      reviewNote: 'FIRST_PURCHASE_SOURCE_CHANGED',
    })
    .where(eq(referralReward.id, reward.id))
    .returning();
  return pending;
}

async function restoreReferralAccessIfRecovered(tx: any, userId: string) {
  const [recipient] = await tx
    .select({ aiAccessStatus: user.aiAccessStatus })
    .from(user)
    .where(eq(user.id, userId));
  if (recipient?.aiAccessStatus !== 'blocked_payment_risk') return;
  const [externalRisk] = await tx
    .select({ id: paymentRiskEvent.id })
    .from(paymentRiskEvent)
    .where(
      and(
        eq(paymentRiskEvent.userId, userId),
        ne(paymentRiskEvent.status, 'unmatched')
      )
    )
    .limit(1);
  const [otherOwed] = await tx
    .select({ id: referralRewardClawback.id })
    .from(referralRewardClawback)
    .where(
      and(
        eq(referralRewardClawback.userId, userId),
        gt(referralRewardClawback.owedCredits, 0)
      )
    )
    .limit(1);
  if (!externalRisk && !otherOwed) {
    await tx
      .update(user)
      .set({ aiAccessStatus: 'active' })
      .where(eq(user.id, userId));
  }
}

async function referralIdentityRiskReason(tx: any, reward: ReferralReward) {
  if (reward.rewardType === 'first_ai_settlement') {
    const [referredIdentity] = await tx
      .select({ id: creditIdentityClaim.id })
      .from(creditIdentityClaim)
      .where(eq(creditIdentityClaim.userId, reward.referredUserId))
      .limit(1);
    if (!referredIdentity) return 'REFERRED_IDENTITY_NOT_ELIGIBLE';
    return null;
  }
  if (reward.rewardType === 'first_purchase' && reward.sourceOrderNo) {
    const [sourceOrder] = await tx
      .select({
        provider: order.paymentProvider,
        paymentUserId: order.paymentUserId,
      })
      .from(order)
      .where(eq(order.orderNo, reward.sourceOrderNo))
      .limit(1);
    if (!sourceOrder?.paymentUserId) return 'PURCHASE_IDENTITY_NOT_ELIGIBLE';
    const [purchaseIdentity] = await tx
      .select({ userId: paymentIdentityClaim.userId })
      .from(paymentIdentityClaim)
      .where(
        and(
          eq(paymentIdentityClaim.provider, sourceOrder.provider),
          eq(paymentIdentityClaim.paymentUserId, sourceOrder.paymentUserId)
        )
      )
      .limit(1);
    if (
      !purchaseIdentity ||
      purchaseIdentity.userId !== reward.referredUserId
    ) {
      return 'PURCHASE_IDENTITY_NOT_ELIGIBLE';
    }
  }
  return null;
}

async function referralIpRiskReason(tx: any, reward: ReferralReward) {
  const [participants] = await tx
    .select({ inviterIp: user.ip })
    .from(user)
    .where(eq(user.id, reward.inviterUserId));
  const [referred] = await tx
    .select({ ip: user.ip })
    .from(user)
    .where(eq(user.id, reward.referredUserId));
  const referredIp = referred?.ip?.trim();
  if (!referredIp) return null;
  if (participants?.inviterIp?.trim() === referredIp) {
    return 'INVITER_IP_MATCH';
  }
  const [linkedInvitee] = await tx
    .select({ id: referralAttribution.id })
    .from(referralAttribution)
    .innerJoin(user, eq(user.id, referralAttribution.referredUserId))
    .where(
      and(
        eq(referralAttribution.inviterUserId, reward.inviterUserId),
        ne(referralAttribution.referredUserId, reward.referredUserId),
        eq(user.ip, referredIp)
      )
    )
    .limit(1);
  return linkedInvitee ? 'REFERRED_IP_REUSED' : null;
}

async function hasPurchaseRisk(tx: any, orderNo: string) {
  const [tombstone] = await tx
    .select({ id: referralPurchaseTombstone.id })
    .from(referralPurchaseTombstone)
    .where(eq(referralPurchaseTombstone.orderNo, orderNo))
    .limit(1);
  if (tombstone) return true;
  const [risk] = await tx
    .select({ id: paymentRiskEvent.id })
    .from(paymentRiskEvent)
    .where(
      and(
        eq(paymentRiskEvent.orderNo, orderNo),
        sql`${paymentRiskEvent.eventType} in ('payment.refunded', 'payment.disputed')`
      )
    )
    .limit(1);
  return Boolean(risk);
}

function inviteCode() {
  return randomBytes(6).toString('base64url');
}

export async function ensureReferralProfile(userId: string) {
  const [existing] = await db()
    .select()
    .from(referralProfile)
    .where(eq(referralProfile.userId, userId));
  if (existing) return existing;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const [created] = await db()
      .insert(referralProfile)
      .values({ id: getUuid(), userId, inviteCode: inviteCode() })
      .onConflictDoNothing()
      .returning();
    if (created) return created;
    const [concurrent] = await db()
      .select()
      .from(referralProfile)
      .where(eq(referralProfile.userId, userId));
    if (concurrent) return concurrent;
  }
  throw new Error('Unable to create referral profile');
}

export async function createReferralInviteClick(code: string) {
  const [profile] = await db()
    .select()
    .from(referralProfile)
    .where(
      and(
        eq(referralProfile.inviteCode, code),
        eq(referralProfile.status, 'active')
      )
    );
  if (!profile) return null;
  const clickedAt = new Date();
  const [click] = await db()
    .insert(referralInviteClick)
    .values({
      id: getUuid(),
      token: randomBytes(24).toString('base64url'),
      inviterUserId: profile.userId,
      inviteCode: code,
      clickedAt,
      expiresAt: referralExpiry(clickedAt),
    })
    .returning();
  return click;
}

export async function isValidReferralInviteClick(clickId: string) {
  const [click] = await db()
    .select({ id: referralInviteClick.id })
    .from(referralInviteClick)
    .where(
      and(
        eq(referralInviteClick.id, clickId),
        gt(referralInviteClick.expiresAt, new Date()),
        isNull(referralInviteClick.claimedAt)
      )
    );
  return Boolean(click);
}

export async function claimReferralInvite({
  clickId,
  referredUserId,
}: {
  clickId: string;
  referredUserId: string;
}) {
  const now = new Date();
  return db().transaction(async (tx: any) => {
    const [existingAttribution] = await tx
      .select()
      .from(referralAttribution)
      .where(eq(referralAttribution.referredUserId, referredUserId));
    if (existingAttribution) return existingAttribution;

    const [click] = await tx
      .select()
      .from(referralInviteClick)
      .where(eq(referralInviteClick.id, clickId))
      .for('update');
    if (!click || click.claimedAt) return null;
    const [referredUser] = await tx
      .select({ createdAt: user.createdAt })
      .from(user)
      .where(eq(user.id, referredUserId));
    if (!referredUser || referredUser.createdAt < click.clickedAt) return null;
    if (
      !canAttributeReferral({
        inviterUserId: click.inviterUserId,
        referredUserId,
        expiresAt: click.expiresAt,
        now,
      })
    ) {
      return null;
    }

    const [attribution] = await tx
      .insert(referralAttribution)
      .values({
        id: getUuid(),
        inviterUserId: click.inviterUserId,
        referredUserId,
        inviteCode: click.inviteCode,
        clickedAt: click.clickedAt,
        expiresAt: click.expiresAt,
      })
      .onConflictDoNothing({ target: referralAttribution.referredUserId })
      .returning();
    if (!attribution) return null;
    await tx
      .update(referralInviteClick)
      .set({ claimedAt: now, claimedByUserId: referredUserId })
      .where(eq(referralInviteClick.id, click.id));
    return attribution;
  });
}

export async function recordAiSettlementReferralEvent({
  tx,
  userId,
  reservationId,
  actualCredits,
}: {
  tx: any;
  userId: string;
  reservationId: string;
  actualCredits: number;
}) {
  if (actualCredits <= 0) return;
  await tx
    .insert(referralEventOutbox)
    .values({
      id: getUuid(),
      eventType: 'first_ai_settlement',
      userId,
      idempotencyKey: referralEventKey('first_ai_settlement', userId),
      payload: { reservationId, actualCredits },
    })
    .onConflictDoNothing({ target: referralEventOutbox.idempotencyKey });
}

export async function enqueueReferralEventBestEffort({
  eventType,
  userId,
  idempotencyKey,
  payload,
  createdAt,
}: {
  eventType: 'first_ai_settlement' | 'first_purchase';
  userId: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  createdAt?: Date;
}) {
  try {
    if (
      eventType === 'first_purchase' &&
      !(await findFirstEligibleReferralPurchase(db(), userId))
    ) {
      return;
    }
    await db()
      .insert(referralEventOutbox)
      .values({
        id: getUuid(),
        eventType,
        userId,
        idempotencyKey,
        payload,
        createdAt,
      })
      .onConflictDoNothing({ target: referralEventOutbox.idempotencyKey });
  } catch (error) {
    console.error('enqueue referral event failed', error);
  }
}

export async function repairMissingReferralEvents(limit = 200) {
  const registrations = await db()
    .select({
      userId: user.id,
      clickId: user.registrationReferralClickId,
    })
    .from(user)
    .leftJoin(
      referralAttribution,
      eq(referralAttribution.referredUserId, user.id)
    )
    .where(
      and(
        sql`${user.registrationReferralClickId} is not null`,
        isNull(referralAttribution.id)
      )
    )
    .orderBy(asc(user.createdAt))
    .limit(limit);
  for (const registration of registrations) {
    if (!registration.clickId) continue;
    try {
      await claimReferralInvite({
        clickId: registration.clickId,
        referredUserId: registration.userId,
      });
    } catch (error) {
      console.error('repair referral attribution failed', error);
    }
  }
  const settlementOccurredAt = sql<Date>`coalesce(${creditReservation.settledAt}, ${creditReservation.updatedAt}, ${creditReservation.createdAt})`;
  const settlements = await db()
    .selectDistinctOn([creditReservation.userId], {
      userId: creditReservation.userId,
      reservationId: creditReservation.id,
      actualCredits: creditReservation.settledCredits,
      createdAt: settlementOccurredAt,
    })
    .from(creditReservation)
    .where(
      and(
        eq(creditReservation.status, 'settled'),
        gt(creditReservation.settledCredits, 0),
        sql`not exists (
          select 1 from ${referralEventOutbox} event
          where event.idempotency_key = 'referral:first-ai:' || ${creditReservation.userId}
        )`
      )
    )
    .orderBy(
      creditReservation.userId,
      asc(settlementOccurredAt),
      asc(creditReservation.id)
    )
    .limit(limit);
  for (const settlement of settlements) {
    await enqueueReferralEventBestEffort({
      eventType: 'first_ai_settlement',
      userId: settlement.userId,
      idempotencyKey: referralEventKey(
        'first_ai_settlement',
        settlement.userId
      ),
      payload: {
        reservationId: settlement.reservationId,
        actualCredits: settlement.actualCredits,
      },
      createdAt: settlement.createdAt,
    });
  }
  const purchaseOccurredAt = sql<Date>`coalesce(${order.paidAt}, ${order.updatedAt}, ${order.createdAt})`;
  const purchases = await db()
    .selectDistinctOn([order.userId], {
      userId: order.userId,
      orderNo: order.orderNo,
      packageCredits: order.creditsAmount,
      createdAt: purchaseOccurredAt,
    })
    .from(order)
    .where(
      and(
        eq(order.status, 'paid'),
        eq(order.paymentType, PaymentType.ONE_TIME),
        eq(order.paymentProvider, 'creem'),
        gt(order.creditsAmount, 0),
        sql`not exists (
          select 1 from ${referralPurchaseTombstone} tombstone
          where tombstone.order_no = ${order.orderNo}
        )`,
        sql`not exists (
          select 1 from ${paymentRiskEvent} risk
          where risk.order_no = ${order.orderNo}
            and risk.event_type in ('payment.refunded', 'payment.disputed')
        )`,
        sql`not exists (
          select 1 from ${referralEventOutbox} event
          where event.idempotency_key = 'referral:first-purchase:' || ${order.userId}
        )`
      )
    )
    .orderBy(order.userId, asc(purchaseOccurredAt), asc(order.id))
    .limit(limit);
  for (const purchase of purchases) {
    await enqueueReferralEventBestEffort({
      eventType: 'first_purchase',
      userId: purchase.userId,
      idempotencyKey: referralEventKey('first_purchase', purchase.userId),
      payload: {},
      createdAt: purchase.createdAt,
    });
  }
}

async function processAiSettlementEvent(tx: any, event: any) {
  const [attribution] = await tx
    .select()
    .from(referralAttribution)
    .where(
      and(
        eq(referralAttribution.referredUserId, event.userId),
        eq(referralAttribution.status, 'active')
      )
    );
  if (!attribution) return false;
  const now = event.createdAt;
  const monthKey = referralMonthKey(now);
  await tx
    .insert(referralMonthlyCap)
    .values({
      id: getUuid(),
      inviterUserId: attribution.inviterUserId,
      monthKey,
      awardedCredits: 0,
    })
    .onConflictDoNothing({
      target: [referralMonthlyCap.inviterUserId, referralMonthlyCap.monthKey],
    });
  const [cap] = await tx
    .select()
    .from(referralMonthlyCap)
    .where(
      and(
        eq(referralMonthlyCap.inviterUserId, attribution.inviterUserId),
        eq(referralMonthlyCap.monthKey, monthKey)
      )
    )
    .for('update');
  const credits = availableSignupRewardCredits(cap.awardedCredits);
  if (!credits) return true;
  const [reward] = await tx
    .insert(referralReward)
    .values({
      id: getUuid(),
      inviterUserId: attribution.inviterUserId,
      referredUserId: attribution.referredUserId,
      attributionId: attribution.id,
      rewardType: 'first_ai_settlement',
      credits,
      idempotencyKey: referralRewardKey('first_ai_settlement', event.userId),
      sourceReservationId: String(event.payload.reservationId),
      capMonthKey: monthKey,
      availableAt: referralRewardAvailableAt(now),
    })
    .onConflictDoNothing({ target: referralReward.idempotencyKey })
    .returning();
  if (reward) {
    await tx
      .update(referralMonthlyCap)
      .set({ awardedCredits: cap.awardedCredits + credits })
      .where(eq(referralMonthlyCap.id, cap.id));
  }
  return true;
}

async function processPurchaseEvent(tx: any, event: any) {
  const [attribution] = await tx
    .select()
    .from(referralAttribution)
    .where(
      and(
        eq(referralAttribution.referredUserId, event.userId),
        eq(referralAttribution.status, 'active')
      )
    );
  if (!attribution) return false;
  const firstPurchase = await findFirstEligibleReferralPurchase(
    tx,
    event.userId
  );
  if (!firstPurchase) return false;
  const [lockedPurchase] = await tx
    .select()
    .from(order)
    .where(eq(order.id, firstPurchase.id))
    .for('update');
  if (!lockedPurchase || lockedPurchase.status !== 'paid') return false;
  if (await hasPurchaseRisk(tx, lockedPurchase.orderNo)) {
    const [existing] = await tx
      .select()
      .from(referralReward)
      .where(
        eq(
          referralReward.idempotencyKey,
          referralRewardKey('first_purchase', event.userId)
        )
      )
      .for('update');
    if (existing?.status === 'pending' || existing?.status === 'frozen') {
      await tx
        .update(referralReward)
        .set({ status: 'revoked', reviewNote: 'PAYMENT_RISK_EVENT' })
        .where(eq(referralReward.id, existing.id));
    }
    return true;
  }
  const credits = purchaseRewardCredits(Number(firstPurchase.packageCredits));
  if (!credits) return true;
  const now = firstPurchase.occurredAt;
  const idempotencyKey = referralRewardKey('first_purchase', event.userId);
  const [existing] = await tx
    .select()
    .from(referralReward)
    .where(eq(referralReward.idempotencyKey, idempotencyKey))
    .for('update');
  if (!existing) {
    await tx.insert(referralReward).values({
      id: getUuid(),
      inviterUserId: attribution.inviterUserId,
      referredUserId: attribution.referredUserId,
      attributionId: attribution.id,
      rewardType: 'first_purchase',
      credits,
      idempotencyKey,
      sourceOrderNo: firstPurchase.orderNo,
      availableAt: purchaseRewardAvailableAt(now),
    });
  } else if (
    existing.status === 'pending' &&
    existing.sourceOrderNo !== firstPurchase.orderNo
  ) {
    await tx
      .update(referralReward)
      .set({
        credits,
        sourceOrderNo: firstPurchase.orderNo,
        availableAt: purchaseRewardAvailableAt(now),
      })
      .where(eq(referralReward.id, existing.id));
  }
  return true;
}

export async function processReferralEvents(limit = 100) {
  const now = new Date();
  const leaseId = getUuid();
  const leaseExpiresAt = new Date(now.getTime() + 5 * 60 * 1000);
  const claimed = await db().transaction(async (tx: any) => {
    const candidates = await tx
      .select({ id: referralEventOutbox.id })
      .from(referralEventOutbox)
      .where(
        or(
          and(
            eq(referralEventOutbox.status, 'pending'),
            lte(referralEventOutbox.nextAttemptAt, now),
            or(
              isNull(referralEventOutbox.leaseExpiresAt),
              lte(referralEventOutbox.leaseExpiresAt, now)
            )
          ),
          and(
            eq(referralEventOutbox.status, 'processing'),
            lte(referralEventOutbox.leaseExpiresAt, now)
          )
        )
      )
      .orderBy(asc(referralEventOutbox.createdAt))
      .limit(limit)
      .for('update', { skipLocked: true });
    if (!candidates.length) return [];
    const claimedRows = [];
    for (const candidate of candidates) {
      const [row] = await tx
        .update(referralEventOutbox)
        .set({ status: 'processing', leaseId, leaseExpiresAt })
        .where(
          and(
            eq(referralEventOutbox.id, candidate.id),
            or(
              and(
                eq(referralEventOutbox.status, 'pending'),
                lte(referralEventOutbox.nextAttemptAt, now),
                or(
                  isNull(referralEventOutbox.leaseExpiresAt),
                  lte(referralEventOutbox.leaseExpiresAt, now)
                )
              ),
              and(
                eq(referralEventOutbox.status, 'processing'),
                lte(referralEventOutbox.leaseExpiresAt, now)
              )
            )
          )
        )
        .returning();
      if (row) claimedRows.push(row);
    }
    return claimedRows;
  });
  const results = [];
  for (const pendingEvent of claimed) {
    try {
      await db().transaction(async (tx: any) => {
        const [event] = await tx
          .select()
          .from(referralEventOutbox)
          .where(eq(referralEventOutbox.id, pendingEvent.id))
          .for('update');
        if (
          !event ||
          event.status !== 'processing' ||
          event.leaseId !== leaseId
        ) {
          return;
        }
        let processed = true;
        if (event.eventType === 'first_ai_settlement') {
          processed = await processAiSettlementEvent(tx, event);
        } else if (event.eventType === 'first_purchase') {
          processed = await processPurchaseEvent(tx, event);
        } else {
          await tx
            .update(referralEventOutbox)
            .set({
              status: 'dead',
              attempts: event.attempts + 1,
              lastError: `UNKNOWN_EVENT_TYPE:${event.eventType}`,
              processedAt: new Date(),
              leaseId: null,
              leaseExpiresAt: null,
            })
            .where(
              and(
                eq(referralEventOutbox.id, event.id),
                eq(referralEventOutbox.leaseId, leaseId)
              )
            );
          return;
        }
        if (!processed) {
          const [eventUser] = await tx
            .select({ createdAt: user.createdAt })
            .from(user)
            .where(eq(user.id, event.userId));
          const attributionDeadline = eventUser
            ? referralExpiry(eventUser.createdAt)
            : event.createdAt;
          if (attributionDeadline > new Date()) {
            await tx
              .update(referralEventOutbox)
              .set({
                status: 'pending',
                leaseId: null,
                leaseExpiresAt: null,
                nextAttemptAt: new Date(Date.now() + 60 * 60 * 1000),
              })
              .where(
                and(
                  eq(referralEventOutbox.id, event.id),
                  eq(referralEventOutbox.status, 'processing'),
                  eq(referralEventOutbox.leaseId, leaseId)
                )
              );
            return;
          }
          await tx
            .update(referralEventOutbox)
            .set({
              status: 'processed',
              processedAt: new Date(),
              lastError: 'NO_REFERRAL_ATTRIBUTION',
              leaseId: null,
              leaseExpiresAt: null,
            })
            .where(
              and(
                eq(referralEventOutbox.id, event.id),
                eq(referralEventOutbox.status, 'processing'),
                eq(referralEventOutbox.leaseId, leaseId)
              )
            );
          return;
        }
        await tx
          .update(referralEventOutbox)
          .set({
            status: 'processed',
            processedAt: new Date(),
            leaseId: null,
            leaseExpiresAt: null,
          })
          .where(
            and(
              eq(referralEventOutbox.id, event.id),
              eq(referralEventOutbox.status, 'processing'),
              eq(referralEventOutbox.leaseId, leaseId)
            )
          );
      });
      results.push({ id: pendingEvent.id, processed: true });
    } catch (error) {
      const retry = nextReferralOutboxState(pendingEvent.attempts);
      await db()
        .update(referralEventOutbox)
        .set({
          status: retry.status,
          attempts: retry.attempts,
          nextAttemptAt: new Date(Date.now() + retry.delayMinutes * 60 * 1000),
          leaseId: null,
          leaseExpiresAt: null,
          lastError:
            error instanceof Error ? error.message : 'PROCESSING_FAILED',
        })
        .where(
          and(
            eq(referralEventOutbox.id, pendingEvent.id),
            eq(referralEventOutbox.status, 'processing'),
            eq(referralEventOutbox.leaseId, leaseId)
          )
        );
      results.push({ id: pendingEvent.id, processed: false });
    }
  }
  return results;
}

export async function releaseReferralRewards(limit = 100) {
  const due = await db()
    .select()
    .from(referralReward)
    .where(
      and(
        eq(referralReward.status, 'pending'),
        lte(referralReward.availableAt, new Date())
      )
    )
    .orderBy(asc(referralReward.availableAt))
    .limit(limit);
  const results = [];
  for (const dueReward of due) {
    const released = await db().transaction(async (tx: any) => {
      await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, dueReward.referredUserId))
        .for('update');

      let lockedFirstPurchase:
        | {
            id: string;
            orderNo: string;
            packageCredits: number | null;
            occurredAt: Date;
            status: string;
          }
        | undefined;
      if (dueReward.rewardType === 'first_purchase') {
        const firstPurchase = await findFirstEligibleReferralPurchase(
          tx,
          dueReward.referredUserId
        );
        if (firstPurchase) {
          [lockedFirstPurchase] = await tx
            .select({
              id: order.id,
              orderNo: order.orderNo,
              packageCredits: order.creditsAmount,
              occurredAt: sql<Date>`coalesce(${order.paidAt}, ${order.updatedAt}, ${order.createdAt})`,
              status: order.status,
            })
            .from(order)
            .where(eq(order.id, firstPurchase.id))
            .for('update');
        }
      }

      const [reward] = await tx
        .select()
        .from(referralReward)
        .where(eq(referralReward.id, dueReward.id))
        .for('update');
      if (
        !reward ||
        reward.status !== 'pending' ||
        reward.availableAt > new Date()
      ) {
        return false;
      }
      if (reward.rewardType === 'first_purchase') {
        if (!lockedFirstPurchase) {
          await tx
            .update(referralReward)
            .set({ status: 'revoked', reviewNote: 'FIRST_PURCHASE_NOT_FOUND' })
            .where(eq(referralReward.id, reward.id));
          return false;
        }
        const lockedPurchase = lockedFirstPurchase;
        if (!lockedPurchase || lockedPurchase.status !== 'paid') return false;
        if (await hasPurchaseRisk(tx, lockedPurchase.orderNo)) {
          await tx
            .update(referralReward)
            .set({ status: 'revoked', reviewNote: 'PAYMENT_RISK_EVENT' })
            .where(eq(referralReward.id, reward.id));
          return false;
        }
        const sourceUpdate = purchaseRewardSourceUpdate({
          currentSourceOrderNo: reward.sourceOrderNo,
          firstPurchase: {
            orderNo: lockedPurchase.orderNo,
            packageCredits: Number(lockedPurchase.packageCredits),
            occurredAt: lockedPurchase.occurredAt,
          },
          observedAt: new Date(),
        });
        if (sourceUpdate) {
          await tx
            .update(referralReward)
            .set({
              ...sourceUpdate,
              reviewNote: null,
            })
            .where(eq(referralReward.id, reward.id));
          return false;
        }
      }
      const [recipient] = await tx
        .select({ email: user.email, aiAccessStatus: user.aiAccessStatus })
        .from(user)
        .where(eq(user.id, reward.inviterUserId));
      const [correctionDebt] =
        reward.rewardType === 'first_purchase'
          ? await tx
              .select({ id: referralRewardClawback.id })
              .from(referralRewardClawback)
              .where(
                and(
                  eq(referralRewardClawback.rewardId, reward.id),
                  eq(
                    referralRewardClawback.reason,
                    'PURCHASE_SOURCE_CORRECTION'
                  ),
                  gt(referralRewardClawback.owedCredits, 0)
                )
              )
              .limit(1)
          : [];
      const [externalInviterRisk] = await tx
        .select({ id: paymentRiskEvent.id })
        .from(paymentRiskEvent)
        .where(
          and(
            eq(paymentRiskEvent.userId, reward.inviterUserId),
            ne(paymentRiskEvent.status, 'unmatched')
          )
        )
        .limit(1);
      const [otherInviterDebt] = await tx
        .select({ id: referralRewardClawback.id })
        .from(referralRewardClawback)
        .where(
          and(
            eq(referralRewardClawback.userId, reward.inviterUserId),
            gt(referralRewardClawback.owedCredits, 0),
            ne(referralRewardClawback.reason, 'PURCHASE_SOURCE_CORRECTION')
          )
        )
        .limit(1);
      const inviterRiskBlocked =
        !recipient ||
        (recipient.aiAccessStatus === 'blocked_payment_risk' &&
          (!correctionDebt || externalInviterRisk || otherInviterDebt));
      if (inviterRiskBlocked) {
        await tx
          .update(referralReward)
          .set({ status: 'frozen', reviewNote: 'Automatic risk hold' })
          .where(eq(referralReward.id, reward.id));
        return false;
      }
      const [referredUser] = await tx
        .select({ aiAccessStatus: user.aiAccessStatus })
        .from(user)
        .where(eq(user.id, reward.referredUserId));
      const referredRiskBlocked =
        !referredUser || referredUser.aiAccessStatus !== 'active';
      const sourceOrderRisk =
        reward.rewardType === 'first_purchase' && reward.sourceOrderNo
          ? await hasPurchaseRisk(tx, reward.sourceOrderNo)
          : false;
      if (sourceOrderRisk) {
        await tx
          .update(referralReward)
          .set({ status: 'revoked', reviewNote: 'PAYMENT_RISK_EVENT' })
          .where(eq(referralReward.id, reward.id));
        return false;
      }
      const identityRiskReason = referredRiskBlocked
        ? null
        : await referralIdentityRiskReason(tx, reward);
      const ipRiskReason =
        referredRiskBlocked || identityRiskReason
          ? null
          : await referralIpRiskReason(tx, reward);
      if (referredRiskBlocked || identityRiskReason || ipRiskReason) {
        await tx
          .update(referralReward)
          .set({
            status: 'frozen',
            reviewNote:
              identityRiskReason || ipRiskReason || 'Referred user risk hold',
          })
          .where(eq(referralReward.id, reward.id));
        return false;
      }
      if (
        !canReleaseReferralReward({
          status: reward.status,
          availableAt: reward.availableAt,
          now: new Date(),
          inviterRiskBlocked,
          referredRiskBlocked,
        })
      ) {
        return false;
      }
      let remainingGrantCredits = reward.credits;
      const correctionClawbacks = await tx
        .select()
        .from(referralRewardClawback)
        .where(
          and(
            eq(referralRewardClawback.rewardId, reward.id),
            eq(referralRewardClawback.reason, 'PURCHASE_SOURCE_CORRECTION'),
            gt(referralRewardClawback.owedCredits, 0)
          )
        )
        .orderBy(asc(referralRewardClawback.createdAt))
        .for('update');
      const debtApplication = applyReferralCorrectionDebt(
        reward.credits,
        correctionClawbacks.map((clawback: ReferralRewardClawback) =>
          Number(clawback.owedCredits)
        )
      );
      remainingGrantCredits = debtApplication.remainingCredits;
      for (const [index, clawback] of correctionClawbacks.entries()) {
        const owedCredits = debtApplication.remainingOwedCredits[index];
        if (owedCredits === clawback.owedCredits) continue;
        await tx
          .update(referralRewardClawback)
          .set({
            owedCredits,
            status: owedCredits ? 'partially_recovered' : 'recovered',
          })
          .where(eq(referralRewardClawback.id, clawback.id));
      }
      await restoreReferralAccessIfRecovered(tx, reward.inviterUserId);
      const grantIdempotencyKey = referralGrantKey({
        rewardId: reward.id,
        rewardType: reward.rewardType,
        sourceOrderNo: reward.sourceOrderNo,
      });
      await tx
        .insert(credit)
        .values({
          id: getUuid(),
          userId: reward.inviterUserId,
          userEmail: recipient.email,
          transactionNo: getSnowId(),
          transactionType: 'grant',
          transactionScene: 'reward',
          credits: reward.credits,
          remainingCredits: remainingGrantCredits,
          status: 'active',
          idempotencyKey: grantIdempotencyKey,
          description: `Referral ${reward.rewardType} reward; recovered=${reward.credits - remainingGrantCredits}`,
          metadata: JSON.stringify({
            referralRewardId: reward.id,
            sourceOrderNo: reward.sourceOrderNo,
          }),
        })
        .onConflictDoNothing({ target: credit.idempotencyKey });
      await tx
        .update(referralReward)
        .set({ status: 'granted', grantedAt: new Date() })
        .where(eq(referralReward.id, reward.id));
      return true;
    });
    results.push({ id: dueReward.id, released });
  }
  return results;
}

export async function handleReferralPaymentRisk({
  tx,
  orderNo,
  riskEventId,
  userId,
  reason,
}: {
  tx: any;
  orderNo: string;
  riskEventId: string;
  userId: string;
  reason: string;
}) {
  await tx
    .insert(referralPurchaseTombstone)
    .values({
      id: getUuid(),
      orderNo,
      userId,
      riskEventId,
      reason,
    })
    .onConflictDoNothing({ target: referralPurchaseTombstone.orderNo });
  const [matchedPurchaseEvent] = await tx
    .select()
    .from(referralEventOutbox)
    .where(
      and(
        eq(referralEventOutbox.eventType, 'first_purchase'),
        sql`${referralEventOutbox.payload}->>'orderNo' = ${orderNo}`
      )
    )
    .for('update');
  if (
    matchedPurchaseEvent?.status === 'pending' ||
    matchedPurchaseEvent?.status === 'processing'
  ) {
    await tx
      .update(referralEventOutbox)
      .set({
        status: 'cancelled',
        processedAt: new Date(),
        lastError: 'PAYMENT_RISK_EVENT',
        leaseId: null,
        leaseExpiresAt: null,
      })
      .where(eq(referralEventOutbox.id, matchedPurchaseEvent.id));
  }
  const rewards = await tx
    .select()
    .from(referralReward)
    .where(eq(referralReward.sourceOrderNo, orderNo))
    .for('update');
  for (const reward of rewards) {
    if (reward.status === 'pending' || reward.status === 'frozen') {
      await releaseSignupCapIfNeeded({ tx, reward });
      await tx
        .update(referralReward)
        .set({ status: paymentRiskRewardStatus(reward.status), riskEventId })
        .where(eq(referralReward.id, reward.id));
      continue;
    }
    if (reward.status !== 'granted') continue;
    await clawbackGrantedReward({
      tx,
      reward,
      reason: 'PAYMENT_RISK_EVENT',
      riskEventId,
      idempotencyKey: `referral-risk:${riskEventId}:${reward.id}`,
    });
    await tx
      .update(referralReward)
      .set({ status: paymentRiskRewardStatus(reward.status), riskEventId })
      .where(eq(referralReward.id, reward.id));
  }
}

async function releaseSignupCapIfNeeded({
  tx,
  reward,
}: {
  tx: any;
  reward: ReferralReward;
}) {
  if (
    reward.rewardType !== 'first_ai_settlement' ||
    reward.grantedAt ||
    reward.capReleasedAt
  ) {
    return;
  }
  const monthKey = reward.capMonthKey;
  if (!monthKey) return;
  const [cap] = await tx
    .select()
    .from(referralMonthlyCap)
    .where(
      and(
        eq(referralMonthlyCap.inviterUserId, reward.inviterUserId),
        eq(referralMonthlyCap.monthKey, monthKey)
      )
    )
    .for('update');
  if (cap) {
    await tx
      .update(referralMonthlyCap)
      .set({ awardedCredits: Math.max(0, cap.awardedCredits - reward.credits) })
      .where(eq(referralMonthlyCap.id, cap.id));
  }
  await tx
    .update(referralReward)
    .set({ capReleasedAt: new Date() })
    .where(
      and(
        eq(referralReward.id, reward.id),
        isNull(referralReward.capReleasedAt)
      )
    );
}

async function clawbackGrantedReward({
  tx,
  reward,
  reason,
  riskEventId,
  idempotencyKey,
}: {
  tx: any;
  reward: ReferralReward;
  reason: string;
  riskEventId?: string;
  idempotencyKey: string;
}) {
  const [existing] = await tx
    .select()
    .from(referralRewardClawback)
    .where(eq(referralRewardClawback.idempotencyKey, idempotencyKey));
  if (existing) return existing;
  const [grant] = await tx
    .select()
    .from(credit)
    .where(
      inArray(credit.idempotencyKey, [
        referralGrantKey({
          rewardId: reward.id,
          rewardType: reward.rewardType,
          sourceOrderNo: reward.sourceOrderNo,
        }),
        `referral-grant:${reward.id}`,
      ])
    )
    .orderBy(desc(credit.createdAt))
    .limit(1)
    .for('update');
  const frozenCredits =
    grant?.status === 'active' ? Math.max(0, grant.remainingCredits) : 0;
  const owedCredits = Math.max(0, reward.credits - frozenCredits);
  if (grant?.status === 'active') {
    await tx
      .update(credit)
      .set({ status: 'frozen' })
      .where(eq(credit.id, grant.id));
  }
  await tx.insert(credit).values({
    id: getUuid(),
    userId: reward.inviterUserId,
    transactionNo: getSnowId(),
    transactionType: 'freeze',
    transactionScene: 'reward',
    credits: -reward.credits,
    remainingCredits: 0,
    status: 'active',
    idempotencyKey: `credit-audit:${idempotencyKey}`,
    description: `${reason}; frozen=${frozenCredits}; owed=${owedCredits}`,
    metadata: JSON.stringify({ rewardId: reward.id, riskEventId }),
  });
  const [clawback] = await tx
    .insert(referralRewardClawback)
    .values({
      id: getUuid(),
      rewardId: reward.id,
      userId: reward.inviterUserId,
      riskEventId,
      reason,
      rewardCredits: reward.credits,
      frozenCredits,
      owedCredits,
      status: owedCredits ? 'partially_recovered' : 'recovered',
      idempotencyKey,
    })
    .returning();
  if (owedCredits > 0) {
    await tx
      .update(user)
      .set({ aiAccessStatus: 'blocked_payment_risk' })
      .where(eq(user.id, reward.inviterUserId));
  }
  return clawback;
}

export async function adminReviewReferralReward({
  rewardId,
  action,
  reviewerUserId,
  note,
}: {
  rewardId: string;
  action: 'approve' | 'freeze' | 'unfreeze' | 'revoke';
  reviewerUserId: string;
  note?: string;
}) {
  if (!['approve', 'freeze', 'unfreeze', 'revoke'].includes(action)) {
    throw new Error('Invalid referral reward action');
  }
  const nextStatus = {
    approve: 'pending',
    freeze: 'frozen',
    unfreeze: 'pending',
    revoke: 'revoked',
  }[action];
  return db().transaction(async (tx: any) => {
    const [reward] = await tx
      .select()
      .from(referralReward)
      .where(eq(referralReward.id, rewardId))
      .for('update');
    if (!reward) throw new Error('Referral reward not found');
    if (!canTransitionReferralReward(reward.status, nextStatus)) {
      throw new Error(
        `Invalid referral reward transition: ${reward.status} -> ${nextStatus}`
      );
    }

    if (action === 'freeze' && reward.status === 'granted') {
      const [freezeCycles] = await tx
        .select({ count: count() })
        .from(referralRewardClawback)
        .where(
          and(
            eq(referralRewardClawback.rewardId, reward.id),
            eq(referralRewardClawback.reason, 'ADMIN_FREEZE')
          )
        );
      await clawbackGrantedReward({
        tx,
        reward,
        reason: 'ADMIN_FREEZE',
        idempotencyKey: `admin-freeze:${reward.id}:${Number(freezeCycles?.count || 0) + 1}`,
      });
    }
    if (
      action === 'revoke' &&
      (reward.status === 'pending' || reward.status === 'frozen')
    ) {
      await releaseSignupCapIfNeeded({ tx, reward });
    }
    if (action === 'unfreeze' && reward.status === 'frozen') {
      if (reward.riskEventId) {
        throw new Error('Risk-revoked referral reward cannot be unfrozen');
      }
      const [clawback] = await tx
        .select()
        .from(referralRewardClawback)
        .where(
          and(
            eq(referralRewardClawback.rewardId, reward.id),
            eq(referralRewardClawback.reason, 'ADMIN_FREEZE')
          )
        )
        .orderBy(desc(referralRewardClawback.createdAt))
        .limit(1)
        .for('update');
      if (clawback?.owedCredits) {
        throw new Error('Referral reward with owed Credit cannot be unfrozen');
      }
      const [grant] = await tx
        .select()
        .from(credit)
        .where(
          inArray(credit.idempotencyKey, [
            referralGrantKey({
              rewardId: reward.id,
              rewardType: reward.rewardType,
              sourceOrderNo: reward.sourceOrderNo,
            }),
            `referral-grant:${reward.id}`,
          ])
        )
        .orderBy(desc(credit.createdAt))
        .limit(1)
        .for('update');
      if (grant?.status === 'frozen') {
        await tx
          .update(credit)
          .set({ status: 'active' })
          .where(eq(credit.id, grant.id));
        await tx.insert(credit).values({
          id: getUuid(),
          userId: reward.inviterUserId,
          transactionNo: getSnowId(),
          transactionType: 'grant',
          transactionScene: 'reward',
          credits: grant.remainingCredits,
          remainingCredits: 0,
          status: 'active',
          idempotencyKey: `credit-audit:admin-unfreeze:${clawback.id}`,
          description: 'ADMIN_UNFREEZE referral reward audit',
        });
        if (clawback) {
          await tx
            .update(referralRewardClawback)
            .set({ status: 'reversed', owedCredits: 0 })
            .where(eq(referralRewardClawback.id, clawback.id));
        }
      }
    }
    if (action === 'revoke' && reward.status === 'granted') {
      await clawbackGrantedReward({
        tx,
        reward,
        reason: 'ADMIN_REVOKE',
        idempotencyKey: `admin-revoke:${reward.id}`,
      });
    }

    const [updated] = await tx
      .update(referralReward)
      .set({
        status: nextStatus,
        availableAt:
          action === 'approve' || action === 'unfreeze'
            ? new Date()
            : undefined,
        reviewedAt: new Date(),
        reviewedBy: reviewerUserId,
        reviewNote: note,
      })
      .where(eq(referralReward.id, rewardId))
      .returning();
    return updated;
  });
}

export async function getReferralDashboard(userId: string) {
  const profile = await ensureReferralProfile(userId);
  const [attributed] = await db()
    .select({ count: count() })
    .from(referralAttribution)
    .where(eq(referralAttribution.inviterUserId, userId));
  const [totals] = await db()
    .select({
      pending: sum(
        sql<number>`case when ${referralReward.status} = 'pending' then ${referralReward.credits} else 0 end`
      ),
      granted: sum(
        sql<number>`case when ${referralReward.status} = 'granted' then ${referralReward.credits} else 0 end`
      ),
    })
    .from(referralReward)
    .where(eq(referralReward.inviterUserId, userId));
  const rewards = await db()
    .select()
    .from(referralReward)
    .where(eq(referralReward.inviterUserId, userId))
    .orderBy(desc(referralReward.createdAt))
    .limit(50);
  return {
    inviteCode: profile.inviteCode,
    stats: {
      successfulInvites: attributed?.count || 0,
      pendingCredits: Number(totals?.pending || 0),
      earnedCredits: Number(totals?.granted || 0),
    },
    rewards,
  };
}

export async function getAdminReferralRewards(limit = 100) {
  const latestClawback = db()
    .selectDistinctOn([referralRewardClawback.rewardId], {
      rewardId: referralRewardClawback.rewardId,
      id: referralRewardClawback.id,
      owedCredits: referralRewardClawback.owedCredits,
      status: referralRewardClawback.status,
      reason: referralRewardClawback.reason,
    })
    .from(referralRewardClawback)
    .orderBy(
      referralRewardClawback.rewardId,
      desc(referralRewardClawback.createdAt),
      desc(referralRewardClawback.id)
    )
    .as('latest_referral_clawback');
  return db()
    .select({ reward: referralReward, clawback: latestClawback })
    .from(referralReward)
    .leftJoin(latestClawback, eq(latestClawback.rewardId, referralReward.id))
    .orderBy(desc(referralReward.createdAt))
    .limit(limit);
}
