import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { and, count, desc, eq, inArray, isNotNull, lt } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { account, communityUserProfile, user } from '@/config/db/schema';

import { Permission, Role } from '../services/rbac';
import { getRemainingCredits } from './credit';

export interface UserCredits {
  remainingCredits: number;
  expiresAt: Date | null;
}

export type User = typeof user.$inferSelect & {
  isAdmin?: boolean;
  publicUsername?: string | null;
  credits?: UserCredits;
  roles?: Role[];
  permissions?: Permission[];
};
export type WorkspaceUser = Pick<
  User,
  'id' | 'name' | 'email' | 'emailVerified' | 'createdAt' | 'updatedAt'
> & {
  image?: string | null;
} & Pick<User, 'isAdmin' | 'publicUsername' | 'credits'>;
export type NewUser = typeof user.$inferInsert;
export type UpdateUser = Partial<Omit<NewUser, 'id' | 'createdAt' | 'email'>>;

export async function updateUser(userId: string, updatedUser: UpdateUser) {
  const [result] = await db()
    .update(user)
    .set(updatedUser)
    .where(eq(user.id, userId))
    .returning();

  return result;
}

export async function findUserById(userId: string) {
  const [result] = await db().select().from(user).where(eq(user.id, userId));

  return result;
}

export async function getUsers({
  page = 1,
  limit = 30,
  email,
}: {
  email?: string;
  page?: number;
  limit?: number;
} = {}): Promise<User[]> {
  const result = await db()
    .select()
    .from(user)
    .where(email ? eq(user.email, email) : undefined)
    .orderBy(desc(user.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return result;
}

export async function getUsersCount({ email }: { email?: string }) {
  const [result] = await db()
    .select({ count: count() })
    .from(user)
    .where(email ? eq(user.email, email) : undefined);
  return result?.count || 0;
}

export async function getUserByUserIds(userIds: string[]) {
  const result = await db()
    .select()
    .from(user)
    .where(inArray(user.id, userIds));

  return result;
}

export async function getUserInfo() {
  const signUser = await getSignUser();

  return signUser;
}

export async function getUserPublicUsername(userId: string) {
  const [profile] = await db()
    .select({ username: communityUserProfile.username })
    .from(communityUserProfile)
    .where(
      and(
        eq(communityUserProfile.userId, userId),
        eq(communityUserProfile.isHidden, false),
        isNotNull(communityUserProfile.currentPublishedRevisionId)
      )
    )
    .limit(1);

  return profile?.username || null;
}

export async function getUserCredits(userId: string) {
  const remainingCredits = await getRemainingCredits(userId);

  return { remainingCredits };
}

export async function getSignUser() {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user;
}

export async function isEmailVerified(email: string): Promise<boolean> {
  const { emailVerified } = await getEmailVerificationStatus(email);
  return emailVerified;
}

export async function getEmailVerificationStatus(email: string) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  if (!normalized) return { exists: false, emailVerified: false };

  const [row] = await db()
    .select({ emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.email, normalized))
    .limit(1);

  return {
    exists: Boolean(row),
    emailVerified: Boolean(row?.emailVerified),
  };
}

export async function purgeExpiredUnverifiedUsers({
  olderThan,
  limit = 100,
}: {
  olderThan: Date;
  limit?: number;
}) {
  const candidates = await db()
    .select({ id: user.id })
    .from(user)
    .innerJoin(account, eq(account.userId, user.id))
    .where(
      and(
        eq(user.emailVerified, false),
        eq(account.providerId, 'credential'),
        lt(user.createdAt, olderThan)
      )
    )
    .limit(limit);

  const deleted: string[] = [];

  for (const candidate of candidates) {
    const accounts: Array<Pick<typeof account.$inferSelect, 'providerId'>> =
      await db()
        .select({ providerId: account.providerId })
        .from(account)
        .where(eq(account.userId, candidate.id));

    // Keep accounts that were later linked to a social provider.
    if (accounts.some((item) => item.providerId !== 'credential')) {
      continue;
    }

    try {
      await db().delete(user).where(eq(user.id, candidate.id));
      deleted.push(candidate.id);
    } catch (error) {
      // Restricting foreign keys protect any account that became referenced elsewhere.
      console.warn('purge unverified user skipped:', candidate.id, error);
    }
  }

  return deleted;
}

export async function isTrustedUser(userId: string) {
  const [row] = await db()
    .select({ emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.id, userId));
  if (row?.emailVerified) return true;
  const [socialAccount] = await db()
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        inArray(account.providerId, ['google', 'github'])
      )
    )
    .limit(1);
  return Boolean(socialAccount);
}

export async function getTrustedCreditIdentity(userId: string) {
  const socialAccounts = await db()
    .select({ providerId: account.providerId, accountId: account.accountId })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        inArray(account.providerId, ['google', 'github'])
      )
    );
  const social = socialAccounts.sort(
    (left: { providerId: string }, right: { providerId: string }) =>
      left.providerId.localeCompare(right.providerId)
  )[0];
  if (social) {
    return createHash('sha256')
      .update(`${social.providerId}:${social.accountId}`)
      .digest('hex');
  }
  const [verified] = await db()
    .select({ email: user.email, emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.id, userId));
  if (!verified?.emailVerified) return null;
  return createHash('sha256')
    .update(`email:${verified.email.trim().toLowerCase()}`)
    .digest('hex');
}

export async function appendUserToResult(result: any) {
  if (!result || !result.length) {
    return result;
  }

  const userIds = result.map((item: any) => item.userId);
  const users = await getUserByUserIds(userIds);
  result = result.map((item: any) => {
    const user = users.find((user: any) => user.id === item.userId);
    return { ...item, user };
  });

  return result;
}
