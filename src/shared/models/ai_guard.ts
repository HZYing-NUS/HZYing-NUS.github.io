import { and, count, eq, lte, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiRequestLease, user } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

export async function assertAiAccess(userId: string) {
  const [account] = await db()
    .select({ status: user.aiAccessStatus })
    .from(user)
    .where(eq(user.id, userId));
  if (!account || account.status !== 'active') {
    throw new Error('AI_ACCESS_BLOCKED');
  }
}

export async function acquireAiRequestLease({
  userId,
  limit,
  ttlSeconds,
}: {
  userId: string;
  limit: number;
  ttlSeconds: number;
}) {
  const normalizedLimit = Math.max(1, Math.floor(limit) || 1);
  const normalizedTtlSeconds = Math.max(1, Math.floor(ttlSeconds) || 180);

  return db().transaction(async (tx: any) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    await tx
      .delete(aiRequestLease)
      .where(
        and(
          eq(aiRequestLease.userId, userId),
          lte(aiRequestLease.expiresAt, new Date())
        )
      );
    const [active] = await tx
      .select({ count: count() })
      .from(aiRequestLease)
      .where(eq(aiRequestLease.userId, userId));
    if ((active?.count || 0) >= normalizedLimit) {
      throw new Error('AI_CONCURRENCY_LIMIT');
    }
    const [lease] = await tx
      .insert(aiRequestLease)
      .values({
        id: getUuid(),
        userId,
        expiresAt: new Date(Date.now() + normalizedTtlSeconds * 1000),
      })
      .returning();
    return lease;
  });
}

export async function releaseAiRequestLease(id: string, userId: string) {
  await db()
    .delete(aiRequestLease)
    .where(and(eq(aiRequestLease.id, id), eq(aiRequestLease.userId, userId)));
}
