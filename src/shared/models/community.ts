import {
  and,
  count,
  desc,
  eq,
  gt,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
} from 'drizzle-orm';

import { db } from '@/core/db';
import {
  collection,
  communityArticleBookmark,
  communityArticleLike,
  communityArticleRevision,
  communityArticleSlugHistory,
  communityBlogArticle,
  communityCollectionBookmark,
  communityComment,
  communityCommentLike,
  communityEmailPreference,
  communityFollow,
  communityJob,
  communityListBookmark,
  communityPrivacySetting,
  communityProfileRevision,
  communityReservedUsername,
  communityResourceBookmark,
  communityUserList,
  communityUsernameHistory,
  communityUserProfile,
  resource,
} from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

export type CommunityUserProfile = typeof communityUserProfile.$inferSelect;
export type CommunityBlogArticle = typeof communityBlogArticle.$inferSelect;
export type CommunityArticleRevision =
  typeof communityArticleRevision.$inferSelect;
export type PublicCommunityArticleRow = {
  article: CommunityBlogArticle;
  revision: CommunityArticleRevision;
  profile: CommunityUserProfile | null;
};

export function getCommunityPublicArticleConditions() {
  return [
    isNotNull(communityBlogArticle.currentPublishedRevisionId),
    isNull(communityBlogArticle.deletedAt),
    isNull(communityBlogArticle.archivedAt),
    ne(communityBlogArticle.status, 'archived'),
  ];
}

export function isUsernameUnavailable({
  current,
  history,
  reserved,
}: {
  current: boolean;
  history: boolean;
  reserved: boolean;
}) {
  return current || history || reserved;
}

export function assertCommunityCommentParent({
  articleId,
  parent,
}: {
  articleId: string;
  parent: { articleId: string; depth: number; status: string } | null;
}) {
  if (!parent) return 0;
  if (parent.articleId !== articleId || parent.depth !== 0) {
    throw new Error(
      'Comment parent must be a root comment in the same article'
    );
  }
  if (parent.status !== 'published') {
    throw new Error('Comment parent is not open for replies');
  }
  return 1;
}

export function isActiveCommunityJobClaim({
  job,
  claimToken,
  now = new Date(),
}: {
  job: {
    status: string;
    claimToken: string | null;
    leaseExpiresAt: Date | null;
  };
  claimToken: string;
  now?: Date;
}) {
  return (
    job.status === 'processing' &&
    job.claimToken === claimToken &&
    Boolean(job.leaseExpiresAt && job.leaseExpiresAt > now)
  );
}

function usernamePrefix(name: string) {
  return (
    name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24) || 'maker'
  );
}

export async function ensureCommunityProfile({
  userId,
  name,
  image,
}: {
  userId: string;
  name: string;
  image?: string | null;
}) {
  const [existing] = await db()
    .select()
    .from(communityUserProfile)
    .where(eq(communityUserProfile.userId, userId))
    .limit(1);
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const username = `${usernamePrefix(name)}-${getUuid().replace(/-/g, '').slice(0, 6)}`;
    const created = await db().transaction(async (tx: any) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`community-username:${username}`}))`
      );
      const [[current], [history], [reserved]] = await Promise.all([
        tx
          .select({ id: communityUserProfile.id })
          .from(communityUserProfile)
          .where(eq(communityUserProfile.username, username))
          .limit(1),
        tx
          .select({ id: communityUsernameHistory.id })
          .from(communityUsernameHistory)
          .where(eq(communityUsernameHistory.username, username))
          .limit(1),
        tx
          .select({ username: communityReservedUsername.username })
          .from(communityReservedUsername)
          .where(eq(communityReservedUsername.username, username))
          .limit(1),
      ]);
      if (
        isUsernameUnavailable({
          current: Boolean(current),
          history: Boolean(history),
          reserved: Boolean(reserved),
        })
      ) {
        return null;
      }
      const [profile] = await tx
        .insert(communityUserProfile)
        .values({
          id: getUuid(),
          userId,
          username,
          displayName: name,
          avatarUrl: image || null,
        })
        .onConflictDoNothing()
        .returning();
      if (!profile) return null;
      await Promise.all([
        tx.insert(communityUsernameHistory).values({
          id: getUuid(),
          userId,
          username,
        }),
        tx
          .insert(communityPrivacySetting)
          .values({ userId })
          .onConflictDoNothing(),
        tx
          .insert(communityEmailPreference)
          .values({ userId })
          .onConflictDoNothing(),
      ]);
      return profile;
    });
    if (created) return created;
    const [concurrent] = await db()
      .select()
      .from(communityUserProfile)
      .where(eq(communityUserProfile.userId, userId))
      .limit(1);
    if (concurrent) return concurrent;
  }
  throw new Error('Unable to allocate a unique community username');
}

export async function getCommunityCommentDepthForInsert({
  tx,
  articleId,
  parentId,
}: {
  tx: any;
  articleId: string;
  parentId?: string | null;
}) {
  if (!parentId) return 0;
  const [parent] = await tx
    .select({
      articleId: communityComment.articleId,
      depth: communityComment.depth,
      status: communityComment.status,
    })
    .from(communityComment)
    .where(eq(communityComment.id, parentId))
    .limit(1);
  if (!parent) throw new Error('Comment parent does not exist');
  return assertCommunityCommentParent({ articleId, parent });
}

export async function findPublicCommunityProfile(username: string) {
  const [profile] = await db()
    .select({
      id: communityUserProfile.id,
      userId: communityUserProfile.userId,
      username: communityUserProfile.username,
      displayName: communityProfileRevision.displayName,
      avatarUrl: communityProfileRevision.avatarUrl,
      headline: communityProfileRevision.headline,
      aboutZh: communityProfileRevision.aboutZh,
      aboutEn: communityProfileRevision.aboutEn,
      experience: communityProfileRevision.experience,
      skills: communityProfileRevision.skills,
      region: communityProfileRevision.region,
      websiteUrl: communityProfileRevision.websiteUrl,
      socialLinks: communityProfileRevision.socialLinks,
      publishedAt: communityProfileRevision.publishedAt,
    })
    .from(communityUserProfile)
    .leftJoin(
      communityProfileRevision,
      and(
        eq(
          communityUserProfile.currentPublishedRevisionId,
          communityProfileRevision.id
        ),
        eq(communityProfileRevision.profileId, communityUserProfile.id),
        eq(communityProfileRevision.moderationStatus, 'published')
      )
    )
    .where(
      and(
        eq(communityUserProfile.username, username.toLowerCase()),
        eq(communityUserProfile.isHidden, false)
      )
    )
    .limit(1);
  return profile;
}

export async function listIndexableCommunityProfiles(limit = 500) {
  return db()
    .select({
      username: communityUserProfile.username,
      updatedAt: communityUserProfile.updatedAt,
    })
    .from(communityUserProfile)
    .where(
      and(
        eq(communityUserProfile.isHidden, false),
        or(
          isNotNull(communityUserProfile.currentPublishedRevisionId),
          sql`exists (
            select 1 from ${communityBlogArticle}
            where ${communityBlogArticle.authorId} = ${communityUserProfile.userId}
              and ${communityBlogArticle.currentPublishedRevisionId} is not null
              and ${communityBlogArticle.deletedAt} is null
              and ${communityBlogArticle.archivedAt} is null
              and ${communityBlogArticle.status} <> 'archived'
          )`
        )
      )
    )
    .orderBy(desc(communityUserProfile.updatedAt))
    .limit(limit);
}

export async function listPublishedCommunityArticles({
  featured = false,
  followedBy,
  authorId,
  categorySlug,
  tag,
  limit = 50,
}: {
  featured?: boolean;
  followedBy?: string;
  authorId?: string;
  categorySlug?: string;
  tag?: string;
  limit?: number;
} = {}): Promise<PublicCommunityArticleRow[]> {
  const query = db()
    .select({
      article: communityBlogArticle,
      revision: communityArticleRevision,
      profile: communityUserProfile,
    })
    .from(communityBlogArticle)
    .innerJoin(
      communityArticleRevision,
      eq(
        communityBlogArticle.currentPublishedRevisionId,
        communityArticleRevision.id
      )
    )
    .leftJoin(
      communityUserProfile,
      and(
        eq(communityBlogArticle.authorId, communityUserProfile.userId),
        eq(communityUserProfile.isHidden, false)
      )
    )
    .where(
      and(
        ...getCommunityPublicArticleConditions(),
        featured ? eq(communityBlogArticle.featured, true) : undefined,
        authorId ? eq(communityBlogArticle.authorId, authorId) : undefined,
        categorySlug
          ? eq(communityArticleRevision.categorySlug, categorySlug)
          : undefined,
        tag
          ? sql`exists (
              select 1
              from jsonb_array_elements_text(${communityArticleRevision.tags}) as community_tag(value)
              where community_tag.value = ${tag}
            )`
          : undefined,
        followedBy
          ? sql`exists (select 1 from ${communityFollow} where ${communityFollow.followerId} = ${followedBy} and ${communityFollow.followedId} = ${communityBlogArticle.authorId})`
          : undefined
      )
    )
    .orderBy(
      desc(communityBlogArticle.firstPublishedAt),
      desc(communityBlogArticle.updatedAt)
    )
    .limit(limit);
  return query as Promise<PublicCommunityArticleRow[]>;
}

export async function findPublishedCommunityArticle(slug: string) {
  const [row] = await db()
    .select({
      article: communityBlogArticle,
      revision: communityArticleRevision,
      profile: communityUserProfile,
    })
    .from(communityBlogArticle)
    .innerJoin(
      communityArticleRevision,
      eq(
        communityBlogArticle.currentPublishedRevisionId,
        communityArticleRevision.id
      )
    )
    .leftJoin(
      communityUserProfile,
      and(
        eq(communityBlogArticle.authorId, communityUserProfile.userId),
        eq(communityUserProfile.isHidden, false)
      )
    )
    .where(eq(communityBlogArticle.slug, slug))
    .limit(1);
  return row || null;
}

export async function listCommunityBlogFacets(limit = 100) {
  const rows: Array<{ categorySlug: string | null; tags: unknown }> = await db()
    .select({
      categorySlug: communityArticleRevision.categorySlug,
      tags: communityArticleRevision.tags,
    })
    .from(communityBlogArticle)
    .innerJoin(
      communityArticleRevision,
      eq(
        communityBlogArticle.currentPublishedRevisionId,
        communityArticleRevision.id
      )
    )
    .where(and(...getCommunityPublicArticleConditions()))
    .limit(limit);
  return {
    categories: Array.from(
      new Set(
        rows
          .map((row: { categorySlug: string | null }) => row.categorySlug)
          .filter(Boolean)
      )
    ) as string[],
    tags: Array.from(
      new Set(
        rows.flatMap((row: { tags: unknown }) =>
          Array.isArray(row.tags) ? row.tags.map(String).filter(Boolean) : []
        )
      )
    ),
  };
}

export async function findCommunityArticleSlugRedirect(slug: string) {
  const [row] = await db()
    .select({ replacedBySlug: communityArticleSlugHistory.replacedBySlug })
    .from(communityArticleSlugHistory)
    .where(eq(communityArticleSlugHistory.slug, slug))
    .limit(1);
  return row?.replacedBySlug || null;
}

export async function updateCommunityUsername({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/.test(normalized))
    throw new Error('COMMUNITY_USERNAME_INVALID');
  return db().transaction(async (tx: any) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-username:${normalized}`}))`
    );
    const [profile] = await tx
      .select()
      .from(communityUserProfile)
      .where(eq(communityUserProfile.userId, userId))
      .limit(1)
      .for('update');
    if (!profile) throw new Error('COMMUNITY_PROFILE_NOT_FOUND');
    if (profile.username === normalized) return profile;
    if (
      profile.usernameChangedAt &&
      profile.usernameChangedAt > new Date(Date.now() - 90 * 86_400_000)
    )
      throw new Error('COMMUNITY_USERNAME_CHANGE_COOLDOWN');
    const [[current], [history], [reserved]] = await Promise.all([
      tx
        .select({ id: communityUserProfile.id })
        .from(communityUserProfile)
        .where(eq(communityUserProfile.username, normalized))
        .limit(1),
      tx
        .select({ id: communityUsernameHistory.id })
        .from(communityUsernameHistory)
        .where(eq(communityUsernameHistory.username, normalized))
        .limit(1),
      tx
        .select({ username: communityReservedUsername.username })
        .from(communityReservedUsername)
        .where(eq(communityReservedUsername.username, normalized))
        .limit(1),
    ]);
    if (
      isUsernameUnavailable({
        current: Boolean(current),
        history: Boolean(history),
        reserved: Boolean(reserved),
      })
    )
      throw new Error('COMMUNITY_USERNAME_UNAVAILABLE');
    const now = new Date();
    await tx
      .update(communityUsernameHistory)
      .set({ replacedByUsername: normalized, releasedAt: now })
      .where(
        and(
          eq(communityUsernameHistory.userId, userId),
          eq(communityUsernameHistory.username, profile.username)
        )
      );
    await tx
      .insert(communityUsernameHistory)
      .values({ id: getUuid(), userId, username: normalized });
    const [updated] = await tx
      .update(communityUserProfile)
      .set({ username: normalized, usernameChangedAt: now, updatedAt: now })
      .where(eq(communityUserProfile.id, profile.id))
      .returning();
    return updated;
  });
}

export async function completeCommunityJob({
  jobId,
  claimToken,
}: {
  jobId: string;
  claimToken: string;
}) {
  const now = new Date();
  const [completed] = await db()
    .update(communityJob)
    .set({
      status: 'completed',
      completedAt: now,
      lockedBy: null,
      lockedAt: null,
      leaseExpiresAt: null,
      claimToken: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(communityJob.id, jobId),
        eq(communityJob.status, 'processing'),
        eq(communityJob.claimToken, claimToken),
        gt(communityJob.leaseExpiresAt, now)
      )
    )
    .returning({ id: communityJob.id });
  return Boolean(completed);
}

export async function findCommunityUsernameRedirect(username: string) {
  const [history] = await db()
    .select({ replacedByUsername: communityUsernameHistory.replacedByUsername })
    .from(communityUsernameHistory)
    .where(eq(communityUsernameHistory.username, username.toLowerCase()))
    .limit(1);
  return history?.replacedByUsername || null;
}

export async function getPublicCommunityProfileStats(userId: string) {
  const [[articles], [likes], [lists]] = await Promise.all([
    db()
      .select({ value: count() })
      .from(communityBlogArticle)
      .where(
        and(
          eq(communityBlogArticle.authorId, userId),
          ...getCommunityPublicArticleConditions()
        )
      ),
    db()
      .select({ value: count() })
      .from(communityArticleLike)
      .innerJoin(
        communityBlogArticle,
        eq(communityArticleLike.articleId, communityBlogArticle.id)
      )
      .where(
        and(
          eq(communityBlogArticle.authorId, userId),
          ...getCommunityPublicArticleConditions()
        )
      ),
    db()
      .select({ value: count() })
      .from(communityUserList)
      .where(
        and(
          eq(communityUserList.ownerId, userId),
          eq(communityUserList.visibility, 'public'),
          eq(communityUserList.moderationStatus, 'published'),
          isNull(communityUserList.deletedAt)
        )
      ),
  ]);
  return {
    publishedArticles: articles?.value || 0,
    receivedLikes: likes?.value || 0,
    publicLists: lists?.value || 0,
  };
}

export async function getPublicCommunityProfileContent(userId: string) {
  const [articles, [privacy], [following], [followers], publicLists] =
    await Promise.all([
      listPublishedCommunityArticles({ authorId: userId }),
      db()
        .select()
        .from(communityPrivacySetting)
        .where(eq(communityPrivacySetting.userId, userId))
        .limit(1),
      db()
        .select({ value: count() })
        .from(communityFollow)
        .where(eq(communityFollow.followerId, userId)),
      db()
        .select({ value: count() })
        .from(communityFollow)
        .where(eq(communityFollow.followedId, userId)),
      db()
        .select()
        .from(communityUserList)
        .where(
          and(
            eq(communityUserList.ownerId, userId),
            eq(communityUserList.visibility, 'public'),
            eq(communityUserList.moderationStatus, 'published'),
            isNull(communityUserList.deletedAt)
          )
        ),
    ]);
  const [
    articleLikes,
    commentLikes,
    bookmarks,
    followingProfiles,
    followerProfiles,
  ] = await Promise.all([
    privacy?.showLikes
      ? db()
          .select({
            articleId: communityArticleLike.articleId,
            slug: communityBlogArticle.slug,
            titleZh: communityArticleRevision.titleZh,
            titleEn: communityArticleRevision.titleEn,
          })
          .from(communityArticleLike)
          .innerJoin(
            communityBlogArticle,
            eq(communityArticleLike.articleId, communityBlogArticle.id)
          )
          .innerJoin(
            communityArticleRevision,
            eq(
              communityBlogArticle.currentPublishedRevisionId,
              communityArticleRevision.id
            )
          )
          .where(
            and(
              eq(communityArticleLike.userId, userId),
              ...getCommunityPublicArticleConditions()
            )
          )
      : Promise.resolve([]),
    privacy?.showLikes
      ? db()
          .select({
            commentId: communityCommentLike.commentId,
            content: communityComment.content,
            slug: communityBlogArticle.slug,
            articleId: communityComment.articleId,
          })
          .from(communityCommentLike)
          .innerJoin(
            communityComment,
            eq(communityCommentLike.commentId, communityComment.id)
          )
          .innerJoin(
            communityBlogArticle,
            eq(communityComment.articleId, communityBlogArticle.id)
          )
          .where(
            and(
              eq(communityCommentLike.userId, userId),
              eq(communityComment.status, 'published'),
              ...getCommunityPublicArticleConditions()
            )
          )
      : Promise.resolve([]),
    privacy?.showBookmarks
      ? Promise.all([
          db()
            .select({
              type: sql<string>`'resource'`,
              id: resource.id,
              slug: resource.slug,
              title: resource.nameZh,
              titleEn: resource.nameEn,
            })
            .from(communityResourceBookmark)
            .innerJoin(
              resource,
              eq(communityResourceBookmark.resourceId, resource.id)
            )
            .where(
              and(
                eq(communityResourceBookmark.userId, userId),
                eq(resource.status, 'published')
              )
            ),
          db()
            .select({
              type: sql<string>`'collection'`,
              id: collection.id,
              slug: collection.slug,
              title: collection.titleZh,
              titleEn: collection.titleEn,
            })
            .from(communityCollectionBookmark)
            .innerJoin(
              collection,
              eq(communityCollectionBookmark.collectionId, collection.id)
            )
            .where(
              and(
                eq(communityCollectionBookmark.userId, userId),
                eq(collection.status, 'published')
              )
            ),
          db()
            .select({
              type: sql<string>`'article'`,
              id: communityBlogArticle.id,
              slug: communityBlogArticle.slug,
              title: communityArticleRevision.titleZh,
              titleEn: communityArticleRevision.titleEn,
            })
            .from(communityArticleBookmark)
            .innerJoin(
              communityBlogArticle,
              eq(communityArticleBookmark.articleId, communityBlogArticle.id)
            )
            .innerJoin(
              communityArticleRevision,
              eq(
                communityBlogArticle.currentPublishedRevisionId,
                communityArticleRevision.id
              )
            )
            .where(
              and(
                eq(communityArticleBookmark.userId, userId),
                ...getCommunityPublicArticleConditions()
              )
            ),
          db()
            .select({
              type: sql<string>`'list'`,
              id: communityUserList.id,
              slug: communityUserList.slug,
              title: communityUserList.title,
              titleEn: communityUserList.title,
              username: communityUserProfile.username,
            })
            .from(communityListBookmark)
            .innerJoin(
              communityUserList,
              eq(communityListBookmark.listId, communityUserList.id)
            )
            .innerJoin(
              communityUserProfile,
              eq(communityUserList.ownerId, communityUserProfile.userId)
            )
            .where(
              and(
                eq(communityListBookmark.userId, userId),
                eq(communityUserList.visibility, 'public'),
                eq(communityUserList.moderationStatus, 'published'),
                isNull(communityUserList.deletedAt),
                eq(communityUserProfile.isHidden, false)
              )
            ),
        ]).then((groups) => groups.flat())
      : Promise.resolve([]),
    privacy?.showFollowingList
      ? db()
          .select({
            username: communityUserProfile.username,
            displayName: communityUserProfile.displayName,
          })
          .from(communityFollow)
          .innerJoin(
            communityUserProfile,
            eq(communityFollow.followedId, communityUserProfile.userId)
          )
          .where(
            and(
              eq(communityFollow.followerId, userId),
              eq(communityUserProfile.isHidden, false)
            )
          )
      : Promise.resolve([]),
    privacy?.showFollowerList
      ? db()
          .select({
            username: communityUserProfile.username,
            displayName: communityUserProfile.displayName,
          })
          .from(communityFollow)
          .innerJoin(
            communityUserProfile,
            eq(communityFollow.followerId, communityUserProfile.userId)
          )
          .where(
            and(
              eq(communityFollow.followedId, userId),
              eq(communityUserProfile.isHidden, false)
            )
          )
      : Promise.resolve([]),
  ]);
  return {
    articles,
    privacy: privacy || null,
    following: following?.value || 0,
    followers: followers?.value || 0,
    publicLists,
    articleLikes,
    commentLikes,
    bookmarks,
    followingProfiles,
    followerProfiles,
  };
}
