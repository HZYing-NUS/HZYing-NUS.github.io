import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { creditReservation, usageLedger, user } from '@/config/db/schema';

export type AdminCreditReservation = {
  reservation: typeof creditReservation.$inferSelect;
  userEmail: string;
};
export type AdminUsageLedger = {
  usage: typeof usageLedger.$inferSelect;
  userEmail: string;
};

export async function findCreditReservation(id: string, userId: string) {
  const [result] = await db()
    .select()
    .from(creditReservation)
    .where(
      and(eq(creditReservation.id, id), eq(creditReservation.userId, userId))
    );
  return result;
}

export async function getCreditReservations(userId: string, limit = 30) {
  return db()
    .select()
    .from(creditReservation)
    .where(eq(creditReservation.userId, userId))
    .orderBy(desc(creditReservation.createdAt))
    .limit(limit);
}

export async function getUsageLedger(userId: string, limit = 100) {
  return db()
    .select()
    .from(usageLedger)
    .where(eq(usageLedger.userId, userId))
    .orderBy(desc(usageLedger.createdAt))
    .limit(limit);
}

export async function getAdminCreditReservations({
  userId,
  limit = 100,
}: {
  userId?: string;
  limit?: number;
} = {}): Promise<AdminCreditReservation[]> {
  return db()
    .select({ reservation: creditReservation, userEmail: user.email })
    .from(creditReservation)
    .innerJoin(user, eq(creditReservation.userId, user.id))
    .where(userId ? eq(creditReservation.userId, userId) : undefined)
    .orderBy(desc(creditReservation.createdAt))
    .limit(limit);
}

export async function getAdminUsageLedger({
  userId,
  limit = 100,
}: {
  userId?: string;
  limit?: number;
} = {}): Promise<AdminUsageLedger[]> {
  return db()
    .select({ usage: usageLedger, userEmail: user.email })
    .from(usageLedger)
    .innerJoin(user, eq(usageLedger.userId, user.id))
    .where(userId ? eq(usageLedger.userId, userId) : undefined)
    .orderBy(desc(usageLedger.createdAt))
    .limit(limit);
}
