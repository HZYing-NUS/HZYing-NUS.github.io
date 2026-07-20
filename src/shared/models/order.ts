import { and, count, desc, eq, inArray, or } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  credit,
  order,
  paymentIdentityClaim,
  paymentRiskEvent,
  referralPurchaseTombstone,
  subscription,
  user,
} from '@/config/db/schema';
import { PaymentType } from '@/extensions/payment/types';
import { getUuid } from '@/shared/lib/hash';

import { NewCredit } from './credit';
import { reconcileReferralPurchaseAfterSettlement } from './referral';
import {
  NewSubscription,
  UpdateSubscription,
  updateSubscriptionBySubscriptionNo,
} from './subscription';
import { appendUserToResult, User } from './user';

export type Order = typeof order.$inferSelect & {
  user?: User;
};
export type NewOrder = typeof order.$inferInsert;
export type UpdateOrder = Partial<
  Omit<NewOrder, 'id' | 'orderNo' | 'createdAt'>
>;

export enum OrderStatus {
  // processing status
  PENDING = 'pending', // order saved, waiting for checkout
  CREATED = 'created', // checkout success
  // final status
  COMPLETED = 'completed', // checkout completed, but failed
  PAID = 'paid', // order paid success
  FAILED = 'failed', // order paid, but failed
}

/**
 * create order
 */
export async function createOrder(newOrder: NewOrder) {
  const [result] = await db().insert(order).values(newOrder).returning();

  return result;
}

/**
 * get orders
 */
export async function getOrders({
  orderNo,
  userId,
  status,
  getUser,
  paymentType,
  paymentProvider,
  page = 1,
  limit = 30,
}: {
  orderNo?: string;
  userId?: string;
  status?: OrderStatus;
  getUser?: boolean;
  paymentType?: PaymentType;
  paymentProvider?: string;
  page?: number;
  limit?: number;
} = {}): Promise<Order[]> {
  const result = await db()
    .select()
    .from(order)
    .where(
      and(
        orderNo ? eq(order.orderNo, orderNo) : undefined,
        userId ? eq(order.userId, userId) : undefined,
        status ? eq(order.status, status) : undefined,
        paymentType ? eq(order.paymentType, paymentType) : undefined,
        paymentProvider ? eq(order.paymentProvider, paymentProvider) : undefined
      )
    )
    .orderBy(desc(order.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}

/**
 * get orders count
 */
export async function getOrdersCount({
  orderNo,
  userId,
  paymentType,
  status,
  paymentProvider,
}: {
  orderNo?: string;
  userId?: string;
  paymentType?: PaymentType;
  paymentProvider?: string;
  status?: OrderStatus;
} = {}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(order)
    .where(
      and(
        orderNo ? eq(order.orderNo, orderNo) : undefined,
        userId ? eq(order.userId, userId) : undefined,
        status ? eq(order.status, status) : undefined,
        paymentType ? eq(order.paymentType, paymentType) : undefined,
        paymentProvider ? eq(order.paymentProvider, paymentProvider) : undefined
      )
    );

  return result?.count || 0;
}

/**
 * find order by id
 */
export async function findOrderById(id: string) {
  const [result] = await db().select().from(order).where(eq(order.id, id));

  return result;
}

/**
 * find order by order no
 */
export async function findOrderByOrderNo(orderNo: string) {
  const [result] = await db()
    .select()
    .from(order)
    .where(eq(order.orderNo, orderNo));

  return result;
}

/**
 * find order by transaction id and payment provider
 */
export async function findOrderByTransactionId({
  transactionId,
  paymentProvider,
}: {
  transactionId: string;
  paymentProvider: string;
}) {
  const [result] = await db()
    .select()
    .from(order)
    .where(
      and(
        eq(order.transactionId, transactionId),
        eq(order.paymentProvider, paymentProvider)
      )
    );

  return result;
}

/**
 * update order
 */
export async function updateOrderByOrderNo(
  orderNo: string,
  updateOrder: UpdateOrder,
  options?: {
    // Only update if current status matches (optimistic lock)
    expectedStatus?: OrderStatus;
  }
) {
  const conditions = [eq(order.orderNo, orderNo)];

  // Add status check for optimistic locking
  if (options?.expectedStatus) {
    conditions.push(eq(order.status, options.expectedStatus));
  }

  const [result] = await db()
    .update(order)
    .set(updateOrder)
    .where(and(...conditions))
    .returning();

  return result;
}

/**
 * update order by order id
 */
export async function updateOrderByOrderId(
  orderId: string,
  updateOrder: UpdateOrder
) {
  const [result] = await db()
    .update(order)
    .set(updateOrder)
    .where(eq(order.id, orderId))
    .returning();

  return result;
}

export async function updateOrderInTransaction({
  orderNo,
  updateOrder,
  newSubscription,
  newCredit,
  paymentIdentity,
}: {
  orderNo: string;
  updateOrder: UpdateOrder;
  newSubscription?: NewSubscription;
  newCredit?: NewCredit;
  paymentIdentity?: {
    provider: string;
    paymentUserId: string;
    userId: string;
  };
}) {
  if (!orderNo || !updateOrder) {
    throw new Error('orderNo and updateOrder are required');
  }

  // only update order, no need transaction
  if (!newSubscription && !newCredit) {
    return updateOrderByOrderNo(orderNo, updateOrder);
  }

  // need transaction
  const result = await db().transaction(async (tx: any) => {
    let result: any = {
      order: null,
      subscription: null,
      credit: null,
      rejectionReason: null,
    };

    if (updateOrder.status === OrderStatus.PAID) {
      const [settlementTarget] = await tx
        .select({ userId: order.userId })
        .from(order)
        .where(eq(order.orderNo, orderNo));
      if (!settlementTarget) return result;
      await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, settlementTarget.userId))
        .for('update');
      const [currentOrder] = await tx
        .select({
          status: order.status,
          paymentProvider: order.paymentProvider,
        })
        .from(order)
        .where(eq(order.orderNo, orderNo))
        .for('update');
      if (
        !currentOrder ||
        (currentOrder.status !== OrderStatus.CREATED &&
          currentOrder.status !== OrderStatus.PENDING)
      ) {
        return result;
      }
      const transactionId = updateOrder.transactionId;
      const [riskEvent] = await tx
        .select({ id: paymentRiskEvent.id })
        .from(paymentRiskEvent)
        .where(
          and(
            eq(paymentRiskEvent.provider, currentOrder.paymentProvider),
            inArray(paymentRiskEvent.eventType, [
              'payment.refunded',
              'payment.disputed',
            ]),
            or(
              eq(paymentRiskEvent.orderNo, orderNo),
              transactionId
                ? eq(paymentRiskEvent.transactionId, transactionId)
                : undefined
            )
          )
        )
        .limit(1);
      const [tombstone] = await tx
        .select({ id: referralPurchaseTombstone.id })
        .from(referralPurchaseTombstone)
        .where(eq(referralPurchaseTombstone.orderNo, orderNo))
        .limit(1);
      if (riskEvent || tombstone) {
        const [blockedOrder] = await tx
          .update(order)
          .set({ status: OrderStatus.FAILED })
          .where(
            and(
              eq(order.orderNo, orderNo),
              or(
                eq(order.status, OrderStatus.CREATED),
                eq(order.status, OrderStatus.PENDING)
              )
            )
          )
          .returning();
        result.order = blockedOrder;
        result.rejectionReason = 'PAYMENT_RISK_ALREADY_RECORDED';
        return result;
      }

      if (paymentIdentity) {
        const [claimed] = await tx
          .insert(paymentIdentityClaim)
          .values({
            id: getUuid(),
            provider: paymentIdentity.provider,
            paymentUserId: paymentIdentity.paymentUserId,
            userId: paymentIdentity.userId,
            firstOrderNo: orderNo,
          })
          .onConflictDoNothing({
            target: [
              paymentIdentityClaim.provider,
              paymentIdentityClaim.paymentUserId,
            ],
          })
          .returning();
        const identityOwner = claimed
          ? claimed
          : (
              await tx
                .select()
                .from(paymentIdentityClaim)
                .where(
                  and(
                    eq(paymentIdentityClaim.provider, paymentIdentity.provider),
                    eq(
                      paymentIdentityClaim.paymentUserId,
                      paymentIdentity.paymentUserId
                    )
                  )
                )
                .for('update')
            )[0];
        if (!identityOwner || identityOwner.userId !== paymentIdentity.userId) {
          const [blockedOrder] = await tx
            .update(order)
            .set({ status: OrderStatus.FAILED })
            .where(
              and(
                eq(order.orderNo, orderNo),
                or(
                  eq(order.status, OrderStatus.CREATED),
                  eq(order.status, OrderStatus.PENDING)
                )
              )
            )
            .returning();
          result.order = blockedOrder;
          result.rejectionReason = 'PAYMENT_IDENTITY_ALREADY_USED';
          return result;
        }
      }
    }

    const [orderResult] = await tx
      .update(order)
      .set(updateOrder)
      .where(
        and(
          eq(order.orderNo, orderNo),
          updateOrder.status === OrderStatus.PAID
            ? or(
                eq(order.status, OrderStatus.CREATED),
                eq(order.status, OrderStatus.PENDING)
              )
            : undefined
        )
      )
      .returning();
    if (!orderResult && updateOrder.status === OrderStatus.PAID) {
      return result;
    }
    result.order = orderResult;

    if (
      orderResult &&
      updateOrder.status === OrderStatus.PAID &&
      orderResult.paymentType === PaymentType.ONE_TIME &&
      orderResult.paymentProvider === 'creem' &&
      Number(orderResult.creditsAmount) > 0
    ) {
      await reconcileReferralPurchaseAfterSettlement({
        tx,
        userId: orderResult.userId,
      });
    }

    // deal with subscription
    if (newSubscription) {
      let existingSubscription: any = null;
      if (newSubscription.subscriptionId && newSubscription.paymentProvider) {
        // not create subscription with same subscription id and payment provider
        const [existingSubscriptionResult] = await tx
          .select()
          .from(subscription)
          .where(
            and(
              eq(subscription.subscriptionId, newSubscription.subscriptionId),
              eq(subscription.paymentProvider, newSubscription.paymentProvider)
            )
          );

        existingSubscription = existingSubscriptionResult;
      }

      if (!existingSubscription) {
        // create subscription
        const [subscriptionResult] = await tx
          .insert(subscription)
          .values(newSubscription)
          .returning();

        existingSubscription = subscriptionResult;
      }

      result.subscription = existingSubscription;
    }

    // deal with credit
    if (newCredit) {
      // not create credit with same order no
      let [existingCredit] = await tx
        .select()
        .from(credit)
        .where(eq(credit.orderNo, orderNo));

      if (!existingCredit) {
        // create credit
        const [creditResult] = await tx
          .insert(credit)
          .values(newCredit)
          .returning();

        existingCredit = creditResult;
      }

      result.credit = existingCredit;
    }

    return result;
  });

  return result;
}

export async function updateSubscriptionInTransaction({
  subscriptionNo,
  updateSubscription,
  newOrder,
  newCredit,
}: {
  subscriptionNo: string; // subscription unique id in table
  updateSubscription: UpdateSubscription;
  newOrder?: NewOrder;
  newCredit?: NewCredit;
}) {
  if (!subscriptionNo || !updateSubscription) {
    throw new Error('subscriptionNo and updateSubscription are required');
  }

  // only update order, no need transaction
  if (!newOrder && !newCredit) {
    return updateSubscriptionBySubscriptionNo(
      subscriptionNo,
      updateSubscription
    );
  }

  // need transaction
  const result = await db().transaction(async (tx: any) => {
    let result: any = {
      order: null,
      subscription: null,
      credit: null,
    };

    // deal with order
    if (newOrder) {
      let existingOrder: any = null;
      if (newOrder.transactionId && newOrder.paymentProvider) {
        // not create order with same payment transaction id and payment provider
        const [existingOrderResult] = await tx
          .select()
          .from(order)
          .where(
            and(
              eq(order.transactionId, newOrder.transactionId),
              eq(order.paymentProvider, newOrder.paymentProvider)
            )
          );

        existingOrder = existingOrderResult;
      }

      if (!existingOrder) {
        const [orderResult] = await tx
          .insert(order)
          .values(newOrder)
          .onConflictDoNothing({
            target: [order.transactionId, order.paymentProvider],
          })
          .returning();
        if (orderResult) {
          existingOrder = orderResult;
        } else if (newOrder.transactionId && newOrder.paymentProvider) {
          const [concurrentOrder] = await tx
            .select()
            .from(order)
            .where(
              and(
                eq(order.transactionId, newOrder.transactionId),
                eq(order.paymentProvider, newOrder.paymentProvider)
              )
            );
          existingOrder = concurrentOrder;
        }
      }

      if (!existingOrder) throw new Error('Renewal order conflict');

      result.order = existingOrder;
    }

    // deal with credit
    if (newCredit) {
      let existingCredit: any = null;
      if (result.order && result.order.orderNo) {
        // not create credit with same order no
        const [existingCreditResult] = await tx
          .select()
          .from(credit)
          .where(eq(credit.orderNo, result.order.orderNo));

        existingCredit = existingCreditResult;
      }

      if (!existingCredit) {
        // create credit
        const [creditResult] = await tx
          .insert(credit)
          .values({ ...newCredit, orderNo: result.order?.orderNo })
          .onConflictDoNothing({ target: credit.idempotencyKey })
          .returning();
        existingCredit = creditResult;
        if (!existingCredit && newCredit.idempotencyKey) {
          [existingCredit] = await tx
            .select()
            .from(credit)
            .where(eq(credit.idempotencyKey, newCredit.idempotencyKey));
        }
      }

      result.credit = existingCredit;
    }

    // update subscription
    const [subscriptionResult] = await tx
      .update(subscription)
      .set(updateSubscription)
      .where(eq(subscription.subscriptionNo, subscriptionNo))
      .returning();

    result.subscription = subscriptionResult;

    return result;
  });

  return result;
}
