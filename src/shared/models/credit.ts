import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  isNull,
  lte,
  or,
  sum,
} from 'drizzle-orm';

import { db } from '@/core/db';
import {
  aiFile,
  credit,
  creditIdentityClaim,
  creditReservation,
  usageLedger,
} from '@/config/db/schema';
import { getSnowId, getUuid } from '@/shared/lib/hash';

import { getAllConfigs } from './config';
import { appendUserToResult, User } from './user';

export type Credit = typeof credit.$inferSelect & {
  user?: User;
};
export type NewCredit = typeof credit.$inferInsert;
export type UpdateCredit = Partial<
  Omit<NewCredit, 'id' | 'transactionNo' | 'createdAt'>
>;

export enum CreditStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen',
  EXPIRED = 'expired',
  DELETED = 'deleted',
}

export enum CreditTransactionType {
  GRANT = 'grant', // grant credit
  CONSUME = 'consume', // consume credit
  REFUND = 'refund',
  FREEZE = 'freeze',
}

export enum CreditTransactionScene {
  PAYMENT = 'payment', // payment
  SUBSCRIPTION = 'subscription', // subscription
  RENEWAL = 'renewal', // renewal
  GIFT = 'gift', // gift
  REWARD = 'reward', // reward
}

export enum CreditReservationStatus {
  RESERVED = 'reserved',
  SETTLED = 'settled',
  REFUNDED = 'refunded',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export interface CreditAllocation {
  creditId: string;
  transactionNo: string;
  expiresAt: Date | null;
  credits: number;
}

export interface CreditPriceSnapshot {
  providerId?: string;
  modelId?: string;
  pricingVersion: string;
  currency: string;
  [key: string]: unknown;
}

export interface CreditCostBreakdown {
  model?: number;
  webSearch?: number;
  file?: number;
  memory?: number;
  [key: string]: unknown;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

// Calculate credit expiration time based on order and subscription info
export function calculateCreditExpirationTime({
  creditsValidDays,
  currentPeriodEnd,
}: {
  creditsValidDays: number;
  currentPeriodEnd?: Date;
}): Date | null {
  const now = new Date();

  // Check if credits should never expire
  if (!creditsValidDays || creditsValidDays <= 0) {
    // never expires
    return null;
  }

  const expiresAt = new Date();

  if (currentPeriodEnd) {
    // For subscription: credits expire at the end of current period
    expiresAt.setTime(currentPeriodEnd.getTime());
  } else {
    // For one-time payment: use configured validity days
    expiresAt.setDate(now.getDate() + creditsValidDays);
  }

  return expiresAt;
}

// Helper function to create expiration condition for queries
export function createExpirationCondition() {
  const currentTime = new Date();
  // Credit is valid if: expires_at IS NULL OR expires_at > current_time
  return or(isNull(credit.expiresAt), gt(credit.expiresAt, currentTime));
}

// create credit
export async function createCredit(newCredit: NewCredit) {
  const [result] = await db().insert(credit).values(newCredit).returning();
  return result;
}

// get credits
export async function getCredits({
  userId,
  status,
  transactionType,
  getUser = false,
  page = 1,
  limit = 30,
}: {
  userId?: string;
  status?: CreditStatus;
  transactionType?: CreditTransactionType;
  getUser?: boolean;
  page?: number;
  limit?: number;
}): Promise<Credit[]> {
  const result = await db()
    .select()
    .from(credit)
    .where(
      and(
        userId ? eq(credit.userId, userId) : undefined,
        status ? eq(credit.status, status) : undefined,
        transactionType
          ? eq(credit.transactionType, transactionType)
          : undefined
      )
    )
    .orderBy(desc(credit.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}

// get credits count
export async function getCreditsCount({
  userId,
  status,
  transactionType,
}: {
  userId?: string;
  status?: CreditStatus;
  transactionType?: CreditTransactionType;
}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(credit)
    .where(
      and(
        userId ? eq(credit.userId, userId) : undefined,
        status ? eq(credit.status, status) : undefined,
        transactionType
          ? eq(credit.transactionType, transactionType)
          : undefined
      )
    );

  return result?.count || 0;
}

// consume credits
export async function consumeCredits({
  userId,
  credits,
  scene,
  description,
  metadata,
  idempotencyKey,
  tx,
}: {
  userId: string;
  credits: number; // credits to consume
  scene?: string;
  description?: string;
  metadata?: string;
  idempotencyKey?: string;
  tx?: any;
}) {
  const currentTime = new Date();

  // consume credits
  const execute = async (tx: any) => {
    if (idempotencyKey) {
      const [existing] = await tx
        .select()
        .from(credit)
        .where(eq(credit.idempotencyKey, idempotencyKey));
      if (existing) return existing;
    }

    // 1. check credits balance
    const [creditsBalance] = await tx
      .select({
        total: sum(credit.remainingCredits),
      })
      .from(credit)
      .where(
        and(
          eq(credit.userId, userId),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.status, CreditStatus.ACTIVE),
          gt(credit.remainingCredits, 0),
          or(
            isNull(credit.expiresAt), // Never expires
            gt(credit.expiresAt, currentTime) // Not yet expired
          )
        )
      );

    // balance is not enough
    if (
      !creditsBalance ||
      !creditsBalance.total ||
      parseInt(creditsBalance.total) < credits
    ) {
      throw new Error(
        `Insufficient credits, ${creditsBalance?.total || 0} < ${credits}`
      );
    }

    // 2. get available credits, FIFO queue with expiresAt, batch query
    let remainingToConsume = credits; // remaining credits to consume

    // only deal with 10000 credit grant records
    let batchNo = 1; // batch no
    const maxBatchNo = 10; // max batch no
    const batchSize = 1000; // batch size
    const consumedItems: any[] = [];

    while (remainingToConsume > 0) {
      // get batch credits
      const batchCredits = await tx
        .select()
        .from(credit)
        .where(
          and(
            eq(credit.userId, userId),
            eq(credit.transactionType, CreditTransactionType.GRANT),
            eq(credit.status, CreditStatus.ACTIVE),
            gt(credit.remainingCredits, 0),
            or(
              isNull(credit.expiresAt), // Never expires
              gt(credit.expiresAt, currentTime) // Not yet expired
            )
          )
        )
        .orderBy(
          // FIFO queue: expired credits first, then by expiration date
          // NULL values (never expires) will be ordered last
          asc(credit.expiresAt)
        )
        .limit(batchSize) // batch size
        .offset((batchNo - 1) * batchSize) // offset
        .for('update'); // lock for update

      // no more credits
      if (batchCredits?.length === 0) {
        break;
      }

      // consume credits for each item
      for (const item of batchCredits) {
        // no need to consume more
        if (remainingToConsume <= 0) {
          break;
        }
        const toConsume = Math.min(remainingToConsume, item.remainingCredits);

        // update remaining credits
        await tx
          .update(credit)
          .set({ remainingCredits: item.remainingCredits - toConsume })
          .where(eq(credit.id, item.id));

        // update consumed items
        consumedItems.push({
          creditId: item.id,
          transactionNo: item.transactionNo,
          expiresAt: item.expiresAt,
          creditsToConsume: remainingToConsume,
          creditsConsumed: toConsume,
          creditsBefore: item.remainingCredits,
          creditsAfter: item.remainingCredits - toConsume,
          batchSize: batchSize,
          batchNo: batchNo,
        });

        batchNo += 1;
        remainingToConsume -= toConsume;

        // if too many batches, throw error
        if (batchNo > maxBatchNo) {
          throw new Error(`Too many batches: ${batchNo} > ${maxBatchNo}`);
        }
      }
    }

    // 3. create consumed credit
    const consumedCredit: NewCredit = {
      id: getUuid(),
      transactionNo: getSnowId(),
      transactionType: CreditTransactionType.CONSUME,
      transactionScene: scene,
      userId: userId,
      status: CreditStatus.ACTIVE,
      description: description,
      credits: -credits,
      consumedDetail: JSON.stringify(consumedItems),
      metadata: metadata,
      idempotencyKey,
    };
    await tx.insert(credit).values(consumedCredit);

    return consumedCredit;
  };

  // use provided transaction
  if (tx) {
    return await execute(tx);
  }

  // use default transaction
  return await db().transaction(execute);
}

async function lockAndAllocateCredits({
  tx,
  userId,
  credits,
}: {
  tx: any;
  userId: string;
  credits: number;
}): Promise<CreditAllocation[]> {
  const currentTime = new Date();
  const grants = await tx
    .select()
    .from(credit)
    .where(
      and(
        eq(credit.userId, userId),
        eq(credit.transactionType, CreditTransactionType.GRANT),
        eq(credit.status, CreditStatus.ACTIVE),
        gt(credit.remainingCredits, 0),
        or(isNull(credit.expiresAt), gt(credit.expiresAt, currentTime))
      )
    )
    .orderBy(asc(credit.expiresAt), asc(credit.createdAt))
    .limit(10000)
    .for('update');

  const available = grants.reduce(
    (total: number, grant: Credit) => total + grant.remainingCredits,
    0
  );
  if (available < credits) {
    throw new Error(`Insufficient credits, ${available} < ${credits}`);
  }

  let remaining = credits;
  const allocations: CreditAllocation[] = [];
  for (const grant of grants) {
    if (remaining <= 0) break;
    const allocated = Math.min(remaining, grant.remainingCredits);
    await tx
      .update(credit)
      .set({ remainingCredits: grant.remainingCredits - allocated })
      .where(and(eq(credit.id, grant.id), eq(credit.userId, userId)));
    allocations.push({
      creditId: grant.id,
      transactionNo: grant.transactionNo,
      expiresAt: grant.expiresAt,
      credits: allocated,
    });
    remaining -= allocated;
  }

  return allocations;
}

export async function reserveCredits({
  requestId,
  userId,
  credits,
  idempotencyKey,
  priceSnapshot,
  costBreakdown,
  expiresAt,
}: {
  requestId: string;
  userId: string;
  credits: number;
  idempotencyKey: string;
  priceSnapshot: CreditPriceSnapshot;
  costBreakdown: CreditCostBreakdown;
  expiresAt: Date;
}) {
  if (!Number.isInteger(credits) || credits <= 0) {
    throw new Error('Reserved credits must be a positive integer');
  }
  if (expiresAt <= new Date()) {
    throw new Error('Reservation expiration must be in the future');
  }

  return db().transaction(async (tx: any) => {
    const [inserted] = await tx
      .insert(creditReservation)
      .values({
        id: getUuid(),
        requestId,
        userId,
        idempotencyKey,
        reservedCredits: credits,
        status: CreditReservationStatus.RESERVED,
        priceSnapshot,
        costBreakdown,
        consumedDetail: [],
        expiresAt,
      })
      .onConflictDoNothing({
        target: [creditReservation.userId, creditReservation.idempotencyKey],
      })
      .returning();
    if (!inserted) {
      const [existing] = await tx
        .select()
        .from(creditReservation)
        .where(
          and(
            eq(creditReservation.userId, userId),
            eq(creditReservation.idempotencyKey, idempotencyKey)
          )
        );
      if (!existing) throw new Error('Credit reservation conflict');
      if (
        existing.requestId !== requestId ||
        existing.reservedCredits !== credits ||
        stableJson(existing.priceSnapshot) !== stableJson(priceSnapshot) ||
        stableJson(existing.costBreakdown) !== stableJson(costBreakdown)
      ) {
        throw new Error(
          'Idempotency key was reused with different reservation data'
        );
      }
      return existing;
    }

    const allocations = await lockAndAllocateCredits({ tx, userId, credits });
    const [reservation] = await tx
      .update(creditReservation)
      .set({ consumedDetail: allocations })
      .where(eq(creditReservation.id, inserted.id))
      .returning();

    await tx.insert(usageLedger).values({
      id: getUuid(),
      requestId,
      userId,
      reservationId: reservation.id,
      entryType: 'reservation',
      providerId: priceSnapshot.providerId,
      modelId: priceSnapshot.modelId,
      chargedCredits: credits,
      status: 'reserved',
      priceSnapshot,
      metadata: { costBreakdown },
    });

    return reservation;
  });
}

export async function extendCreditReservation({
  reservationId,
  userId,
  additionalCredits,
  extensionId,
}: {
  reservationId: string;
  userId: string;
  additionalCredits: number;
  extensionId: string;
}) {
  if (!Number.isInteger(additionalCredits) || additionalCredits <= 0) {
    throw new Error('Additional reserved credits must be a positive integer');
  }

  return db().transaction(async (tx: any) => {
    const [reservation] = await tx
      .select()
      .from(creditReservation)
      .where(
        and(
          eq(creditReservation.id, reservationId),
          eq(creditReservation.userId, userId)
        )
      )
      .for('update');
    if (!reservation) throw new Error('Credit reservation not found');
    if (reservation.status !== CreditReservationStatus.RESERVED) {
      throw new Error(
        `Reservation cannot be extended from ${reservation.status}`
      );
    }

    const [extension] = await tx
      .insert(usageLedger)
      .values({
        id: extensionId,
        requestId: reservation.requestId,
        userId,
        reservationId,
        entryType: 'reservation_extension',
        chargedCredits: additionalCredits,
        status: 'reserved',
        priceSnapshot: reservation.priceSnapshot,
      })
      .onConflictDoNothing({ target: usageLedger.id })
      .returning();
    if (!extension) return reservation;

    const allocations = await lockAndAllocateCredits({
      tx,
      userId,
      credits: additionalCredits,
    });
    const [updated] = await tx
      .update(creditReservation)
      .set({
        reservedCredits: reservation.reservedCredits + additionalCredits,
        consumedDetail: [
          ...(reservation.consumedDetail as CreditAllocation[]),
          ...allocations,
        ],
      })
      .where(eq(creditReservation.id, reservationId))
      .returning();
    return updated;
  });
}

async function restoreAllocations({
  tx,
  userId,
  allocations,
  credits,
}: {
  tx: any;
  userId: string;
  allocations: CreditAllocation[];
  credits: number;
}) {
  let remaining = credits;
  const restored: CreditAllocation[] = [];
  for (const allocation of [...allocations].reverse()) {
    if (remaining <= 0) break;
    const amount = Math.min(remaining, allocation.credits);
    const [grant] = await tx
      .select()
      .from(credit)
      .where(and(eq(credit.id, allocation.creditId), eq(credit.userId, userId)))
      .for('update');
    if (!grant)
      throw new Error(`Credit grant not found: ${allocation.creditId}`);
    await tx
      .update(credit)
      .set({ remainingCredits: grant.remainingCredits + amount })
      .where(and(eq(credit.id, grant.id), eq(credit.userId, userId)));
    restored.push({ ...allocation, credits: amount });
    remaining -= amount;
  }
  if (remaining > 0) throw new Error('Reservation allocation is incomplete');
  return restored;
}

export interface UsageSettlement {
  providerId?: string;
  modelId?: string;
  skillVersionId?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  webSearchCostUsd?: string;
  fileCostUsd?: string;
  memoryCostUsd?: string;
  internalCostUsd: string;
  retailCostUsd: string;
  rawCredits: string;
  status?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  fileParseCharges?: Array<{
    fileId: string;
    attemptId: string;
    actualCostUsd: string;
  }>;
}

export async function settleCreditReservation({
  reservationId,
  userId,
  actualCredits,
  usage,
}: {
  reservationId: string;
  userId: string;
  actualCredits: number;
  usage: UsageSettlement;
}) {
  if (!Number.isInteger(actualCredits) || actualCredits < 0) {
    throw new Error('Actual credits must be a non-negative integer');
  }

  return db().transaction(async (tx: any) => {
    const [reservation] = await tx
      .select()
      .from(creditReservation)
      .where(
        and(
          eq(creditReservation.id, reservationId),
          eq(creditReservation.userId, userId)
        )
      )
      .for('update');
    if (!reservation) throw new Error('Credit reservation not found');
    if (
      reservation.status === CreditReservationStatus.SETTLED ||
      reservation.status === CreditReservationStatus.REFUNDED
    ) {
      return reservation;
    }
    if (reservation.status !== CreditReservationStatus.RESERVED) {
      throw new Error(
        `Reservation cannot be settled from ${reservation.status}`
      );
    }
    if (actualCredits > reservation.reservedCredits) {
      throw new Error('Actual credits exceed reserved credits');
    }

    const refundCredits = reservation.reservedCredits - actualCredits;
    const allocations = reservation.consumedDetail as CreditAllocation[];
    const restored = refundCredits
      ? await restoreAllocations({
          tx,
          userId,
          allocations,
          credits: refundCredits,
        })
      : [];
    const consumedAllocations = allocations.map((allocation) => ({
      ...allocation,
    }));
    for (const restoration of restored) {
      let remaining = restoration.credits;
      for (let index = consumedAllocations.length - 1; index >= 0; index -= 1) {
        const allocation = consumedAllocations[index];
        if (allocation.creditId !== restoration.creditId || remaining <= 0) {
          continue;
        }
        const amount = Math.min(remaining, allocation.credits);
        allocation.credits -= amount;
        remaining -= amount;
      }
    }
    const chargedAllocations = consumedAllocations.filter(
      (allocation) => allocation.credits > 0
    );

    if (actualCredits > 0) {
      await tx.insert(credit).values({
        id: getUuid(),
        userId,
        transactionNo: getSnowId(),
        transactionType: CreditTransactionType.CONSUME,
        transactionScene: 'ai_request',
        credits: -actualCredits,
        remainingCredits: 0,
        status: CreditStatus.ACTIVE,
        idempotencyKey: `settlement:${reservation.idempotencyKey}`,
        description: `AI request ${reservation.requestId} settlement`,
        consumedDetail: JSON.stringify(chargedAllocations),
      });
    }
    if (refundCredits > 0) {
      await tx.insert(credit).values({
        id: getUuid(),
        userId,
        transactionNo: getSnowId(),
        transactionType: CreditTransactionType.REFUND,
        transactionScene: 'ai_request',
        credits: refundCredits,
        remainingCredits: 0,
        status: CreditStatus.ACTIVE,
        idempotencyKey: `refund:${reservation.idempotencyKey}`,
        description: `AI request ${reservation.requestId} unused reservation refund`,
        consumedDetail: JSON.stringify(restored),
      });
    }

    const settledAt = new Date();
    const [updated] = await tx
      .update(creditReservation)
      .set({
        settledCredits: actualCredits,
        refundedCredits: refundCredits,
        status:
          actualCredits === 0
            ? CreditReservationStatus.REFUNDED
            : CreditReservationStatus.SETTLED,
        settledAt,
        failureReason: usage.failureReason,
      })
      .where(
        and(
          eq(creditReservation.id, reservationId),
          eq(creditReservation.userId, userId)
        )
      )
      .returning();

    await tx.insert(usageLedger).values({
      id: getUuid(),
      requestId: reservation.requestId,
      userId,
      reservationId,
      entryType: 'settlement',
      providerId: usage.providerId,
      modelId: usage.modelId,
      skillVersionId: usage.skillVersionId,
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      cacheReadTokens: usage.cacheReadTokens ?? 0,
      cacheWriteTokens: usage.cacheWriteTokens ?? 0,
      webSearchCostUsd: usage.webSearchCostUsd ?? '0',
      fileCostUsd: usage.fileCostUsd ?? '0',
      memoryCostUsd: usage.memoryCostUsd ?? '0',
      internalCostUsd: usage.internalCostUsd,
      retailCostUsd: usage.retailCostUsd,
      rawCredits: usage.rawCredits,
      chargedCredits: actualCredits,
      refundedCredits: 0,
      status: usage.status ?? 'settled',
      failureReason: usage.failureReason,
      priceSnapshot: reservation.priceSnapshot,
      metadata: usage.metadata,
    });

    for (const charge of usage.fileParseCharges || []) {
      const [marked] = await tx
        .update(aiFile)
        .set({
          parseCostUsd: charge.actualCostUsd,
          parseChargedAt: settledAt,
        })
        .where(
          and(
            eq(aiFile.id, charge.fileId),
            eq(aiFile.userId, userId),
            eq(aiFile.parseAttemptId, charge.attemptId)
          )
        )
        .returning({ id: aiFile.id });
      if (!marked) {
        throw new Error(`File parse charge target not found: ${charge.fileId}`);
      }
    }

    if (refundCredits > 0) {
      await tx.insert(usageLedger).values({
        id: getUuid(),
        requestId: reservation.requestId,
        userId,
        reservationId,
        entryType: 'refund',
        providerId: usage.providerId,
        modelId: usage.modelId,
        skillVersionId: usage.skillVersionId,
        chargedCredits: 0,
        refundedCredits: refundCredits,
        status: 'refunded',
        failureReason: usage.failureReason,
        priceSnapshot: reservation.priceSnapshot,
        metadata: { restoredAllocations: restored },
      });
    }

    return updated;
  });
}

export async function refundCreditReservation({
  reservationId,
  userId,
  reason,
}: {
  reservationId: string;
  userId: string;
  reason: string;
}) {
  return settleCreditReservation({
    reservationId,
    userId,
    actualCredits: 0,
    usage: {
      internalCostUsd: '0',
      retailCostUsd: '0',
      rawCredits: '0',
      status: 'refunded',
      failureReason: reason,
    },
  });
}

export async function refundExpiredCreditReservations(limit = 100) {
  const expired = await db()
    .select({
      id: creditReservation.id,
      userId: creditReservation.userId,
    })
    .from(creditReservation)
    .where(
      and(
        eq(creditReservation.status, CreditReservationStatus.RESERVED),
        lte(creditReservation.expiresAt, new Date())
      )
    )
    .orderBy(asc(creditReservation.expiresAt))
    .limit(limit);

  const results: Array<{ id: string; refunded: boolean; error?: string }> = [];
  for (const reservation of expired) {
    try {
      await refundCreditReservation({
        reservationId: reservation.id,
        userId: reservation.userId,
        reason: 'RESERVATION_EXPIRED',
      });
      results.push({ id: reservation.id, refunded: true });
    } catch (error) {
      results.push({
        id: reservation.id,
        refunded: false,
        error: error instanceof Error ? error.message : 'REFUND_FAILED',
      });
    }
  }
  return results;
}

// get remaining credits
export async function getRemainingCredits(userId: string): Promise<number> {
  const currentTime = new Date();

  const [result] = await db()
    .select({
      total: sum(credit.remainingCredits),
    })
    .from(credit)
    .where(
      and(
        eq(credit.userId, userId),
        eq(credit.transactionType, CreditTransactionType.GRANT),
        eq(credit.status, CreditStatus.ACTIVE),
        gt(credit.remainingCredits, 0),
        or(
          isNull(credit.expiresAt), // Never expires
          gt(credit.expiresAt, currentTime) // Not yet expired
        )
      )
    );

  return parseInt(result?.total || '0');
}

// grant credits for new user
export async function grantCreditsForNewUser(user: Pick<User, 'id' | 'email'>) {
  // get configs from db
  const configs = await getAllConfigs();

  // if initial credits enabled
  if (configs.initial_credits_enabled === 'false') {
    return;
  }

  // get initial credits amount and valid days
  const credits = parseInt(configs.initial_credits_amount as string) || 10;
  if (credits <= 0) {
    return;
  }

  const creditsValidDays =
    parseInt(configs.initial_credits_valid_days as string) || 30;

  const description = configs.initial_credits_description || 'initial credits';

  const newCredit = await grantCreditsForUser({
    user: user,
    credits: credits,
    validDays: creditsValidDays,
    description: description,
    idempotencyKey: `new-user-gift:${user.id}`,
  });

  return newCredit;
}

export async function claimAndGrantNewUserCredits({
  user,
  identityHash,
}: {
  user: Pick<User, 'id' | 'email'>;
  identityHash: string;
}) {
  const claimId = getUuid();
  const [claim] = await db()
    .insert(creditIdentityClaim)
    .values({ id: claimId, identityHash, userId: user.id })
    .onConflictDoNothing({ target: creditIdentityClaim.identityHash })
    .returning();
  if (!claim) return;
  try {
    return await grantCreditsForNewUser(user);
  } catch (error) {
    await db()
      .delete(creditIdentityClaim)
      .where(eq(creditIdentityClaim.id, claimId));
    throw error;
  }
}

// grant credits for user
export async function grantCreditsForUser({
  user,
  credits,
  validDays,
  description,
  idempotencyKey,
}: {
  user: Pick<User, 'id' | 'email'>;
  credits: number;
  validDays?: number;
  description?: string;
  idempotencyKey?: string;
}) {
  if (credits <= 0) {
    return;
  }

  const creditsValidDays = validDays && validDays > 0 ? validDays : 0;

  const expiresAt = calculateCreditExpirationTime({
    creditsValidDays: creditsValidDays,
  });

  const creditDescription = description || 'grant credits';

  const newCredit: NewCredit = {
    id: getUuid(),
    userId: user.id,
    userEmail: user.email,
    orderNo: '',
    subscriptionNo: '',
    transactionNo: getSnowId(),
    transactionType: CreditTransactionType.GRANT,
    transactionScene: CreditTransactionScene.GIFT,
    credits: credits,
    remainingCredits: credits,
    description: creditDescription,
    expiresAt: expiresAt,
    status: CreditStatus.ACTIVE,
    idempotencyKey,
  };

  const [created] = await db()
    .insert(credit)
    .values(newCredit)
    .onConflictDoNothing({ target: credit.idempotencyKey })
    .returning();

  return created;
}

export async function adminFreezeUserCredits({
  userId,
  description,
  idempotencyKey,
}: {
  userId: string;
  description: string;
  idempotencyKey: string;
}) {
  return db().transaction(async (tx: any) => {
    const [existing] = await tx
      .select({ id: credit.id })
      .from(credit)
      .where(eq(credit.idempotencyKey, idempotencyKey));
    if (existing) return existing;

    const grants = await tx
      .select()
      .from(credit)
      .where(
        and(
          eq(credit.userId, userId),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.status, CreditStatus.ACTIVE),
          gt(credit.remainingCredits, 0),
          createExpirationCondition()
        )
      )
      .for('update');
    const frozenCredits = grants.reduce(
      (total: number, grant: Credit) => total + grant.remainingCredits,
      0
    );
    if (!frozenCredits) return;

    await tx
      .update(credit)
      .set({ status: CreditStatus.FROZEN })
      .where(
        and(
          eq(credit.userId, userId),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.status, CreditStatus.ACTIVE),
          gt(credit.remainingCredits, 0),
          createExpirationCondition()
        )
      );
    const [result] = await tx
      .insert(credit)
      .values({
        id: getUuid(),
        userId,
        transactionNo: getSnowId(),
        transactionType: CreditTransactionType.FREEZE,
        transactionScene: 'admin',
        credits: -frozenCredits,
        remainingCredits: 0,
        status: CreditStatus.ACTIVE,
        idempotencyKey,
        description,
        consumedDetail: JSON.stringify(
          grants.map((grant: Credit) => ({
            creditId: grant.id,
            creditsFrozen: grant.remainingCredits,
          }))
        ),
      })
      .returning({ id: credit.id, credits: credit.credits });
    return result;
  });
}

export async function adminUnfreezeUserCredits({
  userId,
  description,
  idempotencyKey,
}: {
  userId: string;
  description: string;
  idempotencyKey: string;
}) {
  return db().transaction(async (tx: any) => {
    const [existing] = await tx
      .select({ id: credit.id })
      .from(credit)
      .where(eq(credit.idempotencyKey, idempotencyKey));
    if (existing) return existing;

    const grants = await tx
      .select()
      .from(credit)
      .where(
        and(
          eq(credit.userId, userId),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.status, CreditStatus.FROZEN),
          gt(credit.remainingCredits, 0)
        )
      )
      .for('update');
    const unfrozenCredits = grants.reduce(
      (total: number, grant: Credit) => total + grant.remainingCredits,
      0
    );
    if (!unfrozenCredits) return;

    await tx
      .update(credit)
      .set({ status: CreditStatus.ACTIVE })
      .where(
        and(
          eq(credit.userId, userId),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.status, CreditStatus.FROZEN),
          gt(credit.remainingCredits, 0)
        )
      );
    const [result] = await tx
      .insert(credit)
      .values({
        id: getUuid(),
        userId,
        transactionNo: getSnowId(),
        transactionType: CreditTransactionType.REFUND,
        transactionScene: 'admin_unfreeze',
        credits: unfrozenCredits,
        remainingCredits: 0,
        status: CreditStatus.ACTIVE,
        idempotencyKey,
        description,
        consumedDetail: JSON.stringify(
          grants.map((grant: Credit) => ({
            creditId: grant.id,
            creditsUnfrozen: grant.remainingCredits,
          }))
        ),
      })
      .returning({ id: credit.id, credits: credit.credits });
    return result;
  });
}
