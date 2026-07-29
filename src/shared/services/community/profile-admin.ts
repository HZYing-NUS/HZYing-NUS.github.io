import 'server-only';

import { and, desc, eq, ilike, or } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  communityProfileRevision,
  communityUserProfile,
  user,
} from '@/config/db/schema';

export async function listCommunityAdminProfiles({
  query = '',
  status = '',
}: {
  query?: string;
  status?: string;
} = {}) {
  const keyword = query.trim();
  const statusCondition = status.trim()
    ? eq(communityUserProfile.moderationStatus, status.trim())
    : undefined;
  const queryCondition = keyword
    ? or(
        ilike(user.name, `%${keyword}%`),
        ilike(user.email, `%${keyword}%`),
        ilike(communityUserProfile.username, `%${keyword}%`),
        ilike(communityUserProfile.displayName, `%${keyword}%`)
      )
    : undefined;
  const condition =
    statusCondition && queryCondition
      ? and(statusCondition, queryCondition)
      : statusCondition || queryCondition;

  return db()
    .select({
      profile: communityUserProfile,
      account: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(communityUserProfile)
    .innerJoin(user, eq(communityUserProfile.userId, user.id))
    .where(condition)
    .orderBy(desc(communityUserProfile.updatedAt))
    .limit(300);
}

export async function getCommunityAdminProfile(profileId: string) {
  const [row] = await db()
    .select({
      profile: communityUserProfile,
      account: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(communityUserProfile)
    .innerJoin(user, eq(communityUserProfile.userId, user.id))
    .where(eq(communityUserProfile.id, profileId))
    .limit(1);
  if (!row) return null;
  const revisions = await db()
    .select()
    .from(communityProfileRevision)
    .where(eq(communityProfileRevision.profileId, profileId))
    .orderBy(desc(communityProfileRevision.version));
  return { ...row, revisions };
}
