import { and, desc, eq, gt, inArray } from 'drizzle-orm';

import { db } from '@/core/db';
import { credit, order, paymentRiskEvent, user } from '@/config/db/schema';
import { getSnowId, getUuid } from '@/shared/lib/hash';

import { CreditStatus, CreditTransactionType } from './credit';
import { handleReferralPaymentRisk } from './referral';

export type PaymentRiskEvent = typeof paymentRiskEvent.$inferSelect;

export async function recordPaymentValidationRisk({
  provider,
  providerEventId,
  orderNo,
  transactionId,
  userId,
  reason,
  payload,
}: {
  provider: string;
  providerEventId: string;
  orderNo: string;
  transactionId?: string;
  userId: string;
  reason: string;
  payload: Record<string, unknown>;
}) {
  const [event] = await db()
    .insert(paymentRiskEvent)
    .values({
      id: getUuid(),
      provider,
      providerEventId,
      eventType: 'payment.validation_failed',
      orderNo,
      transactionId,
      userId,
      status: 'blocked',
      payload: { reason, ...payload },
    })
    .onConflictDoNothing({
      target: [paymentRiskEvent.provider, paymentRiskEvent.providerEventId],
    })
    .returning();
  return event;
}

export async function handlePaymentRiskEvent({
  provider,
  providerEventId,
  eventType,
  orderNo,
  transactionId,
  payload,
}: {
  provider: string;
  providerEventId: string;
  eventType: 'payment.refunded' | 'payment.disputed';
  orderNo?: string;
  transactionId?: string;
  payload: Record<string, unknown>;
}) {
  return db().transaction(async (tx: any) => {
    const [inserted] = await tx
      .insert(paymentRiskEvent)
      .values({
        id: getUuid(),
        provider,
        providerEventId,
        eventType,
        orderNo,
        transactionId,
        status: 'processing',
        payload,
      })
      .onConflictDoNothing({
        target: [paymentRiskEvent.provider, paymentRiskEvent.providerEventId],
      })
      .returning();

    const [riskEvent] = inserted
      ? [inserted]
      : await tx
          .select()
          .from(paymentRiskEvent)
          .where(
            and(
              eq(paymentRiskEvent.provider, provider),
              eq(paymentRiskEvent.providerEventId, providerEventId)
            )
          )
          .for('update');
    if (!riskEvent || riskEvent.status === 'processed') return riskEvent;

    const [matchedOrderCandidate] = await tx
      .select()
      .from(order)
      .where(
        orderNo
          ? eq(order.orderNo, orderNo)
          : transactionId
            ? and(
                eq(order.transactionId, transactionId),
                eq(order.paymentProvider, provider)
              )
            : eq(order.orderNo, '__unmatched_payment_risk_event__')
      )
      .limit(1);

    if (!matchedOrderCandidate) {
      const [unmatched] = await tx
        .update(paymentRiskEvent)
        .set({ status: 'unmatched' })
        .where(eq(paymentRiskEvent.id, riskEvent.id))
        .returning();
      return unmatched;
    }

    await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, matchedOrderCandidate.userId))
      .for('update');
    const [matchedOrder] = await tx
      .select()
      .from(order)
      .where(eq(order.id, matchedOrderCandidate.id))
      .for('update');
    if (!matchedOrder) throw new Error('Payment risk order disappeared');

    await tx
      .update(order)
      .set({ status: 'failed' })
      .where(
        and(
          eq(order.id, matchedOrder.id),
          inArray(order.status, ['created', 'pending'])
        )
      );

    const grants = await tx
      .select()
      .from(credit)
      .where(
        and(
          eq(credit.userId, matchedOrder.userId),
          eq(credit.orderNo, matchedOrder.orderNo),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.transactionScene, 'payment'),
          eq(credit.status, CreditStatus.ACTIVE),
          gt(credit.remainingCredits, 0)
        )
      )
      .for('update');
    const frozenCredits = grants.reduce(
      (total: number, grant: { remainingCredits: number }) =>
        total + grant.remainingCredits,
      0
    );

    for (const grant of grants) {
      await tx
        .update(credit)
        .set({ status: CreditStatus.FROZEN })
        .where(eq(credit.id, grant.id));
    }
    if (frozenCredits > 0) {
      await tx
        .insert(credit)
        .values({
          id: getUuid(),
          userId: matchedOrder.userId,
          userEmail: matchedOrder.userEmail,
          orderNo: matchedOrder.orderNo,
          transactionNo: getSnowId(),
          transactionType: CreditTransactionType.FREEZE,
          transactionScene: 'payment',
          credits: -frozenCredits,
          remainingCredits: 0,
          status: CreditStatus.ACTIVE,
          idempotencyKey: `payment-risk:${provider}:${providerEventId}`,
          description: `${eventType} froze unspent purchased Credit`,
          consumedDetail: JSON.stringify(
            grants.map((grant: { id: string; remainingCredits: number }) => ({
              creditId: grant.id,
              creditsFrozen: grant.remainingCredits,
            }))
          ),
        })
        .onConflictDoNothing({ target: credit.idempotencyKey });
    }

    await handleReferralPaymentRisk({
      tx,
      orderNo: matchedOrder.orderNo,
      riskEventId: riskEvent.id,
      userId: matchedOrder.userId,
      reason: eventType,
    });

    await tx
      .update(user)
      .set({ aiAccessStatus: 'blocked_payment_risk' })
      .where(eq(user.id, matchedOrder.userId));
    const [processed] = await tx
      .update(paymentRiskEvent)
      .set({
        orderNo: matchedOrder.orderNo,
        transactionId: matchedOrder.transactionId,
        userId: matchedOrder.userId,
        status: 'processed',
      })
      .where(eq(paymentRiskEvent.id, riskEvent.id))
      .returning();
    return processed;
  });
}

export async function getPaymentRiskEvents({
  userId,
  limit = 100,
}: {
  userId?: string;
  limit?: number;
} = {}): Promise<PaymentRiskEvent[]> {
  return db()
    .select()
    .from(paymentRiskEvent)
    .where(userId ? eq(paymentRiskEvent.userId, userId) : undefined)
    .orderBy(desc(paymentRiskEvent.createdAt))
    .limit(limit);
}
