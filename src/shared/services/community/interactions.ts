import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
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
  communityAuditLog,
  communityBlogArticle,
  communityCollectionBookmark,
  communityComment,
  communityCommentLike,
  communityContentReport,
  communityFollow,
  communityJob,
  communityListArticle,
  communityListBookmark,
  communityListCollection,
  communityListResource,
  communityModerationReview,
  communityPrivacySetting,
  communityResourceBookmark,
  communityUserList,
  communityUserProfile,
  resource,
} from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';
import {
  getCommunityCommentDepthForInsert,
  getCommunityPublicArticleConditions,
} from '@/shared/models/community';

import {
  ARTICLE_RESTORE_MS,
  canCreateCommunityComment,
  canReadCommunityComment,
  canRestoreCommunityArticle,
  getCommunityProfileReportDecision,
  getReportedCommentResolutionStatus,
  isCommunityReportReasonType,
  PENDING_COMMENT_CLOSE_MS,
  shouldShowDeletedCommentPlaceholder,
} from './interaction-policy';
import {
  getCommunityModerationFingerprint,
  sanitizeCommunityModerationInput,
} from './moderation-rules';
import { getCommunityArticleHttpStatus } from './public-visibility';

type TargetType = 'article' | 'comment';
type BookmarkType = 'resource' | 'collection' | 'article' | 'list';
type ListItemType = 'resource' | 'collection' | 'article';

async function audit(
  tx: any,
  input: {
    actorId?: string | null;
    actorType?: string;
    action: string;
    objectType: string;
    objectId: string;
    beforeState?: unknown;
    afterState?: unknown;
    metadata?: unknown;
    requestId?: string | null;
  }
) {
  await tx.insert(communityAuditLog).values({
    id: getUuid(),
    actorId: input.actorId || null,
    actorType: input.actorType || 'user',
    action: input.action,
    objectType: input.objectType,
    objectId: input.objectId,
    beforeState: input.beforeState,
    afterState: input.afterState,
    metadata: input.metadata,
    requestId: input.requestId || null,
  });
}

async function enqueueModeration(
  tx: any,
  input: {
    objectType: 'comment' | 'list';
    objectId: string;
    objectVersion: string;
    businessKey: string;
    purpose?: string;
    fingerprint?: string;
  }
) {
  await tx
    .insert(communityJob)
    .values({
      id: getUuid(),
      type: 'moderate_content',
      businessKey: input.businessKey,
      payload: {
        objectType: input.objectType,
        objectId: input.objectId,
        objectVersion: input.objectVersion,
        purpose: input.purpose,
        fingerprint: input.fingerprint,
      },
    })
    .onConflictDoNothing();
}

async function getPublishedArticleForUpdate(tx: any, articleId: string) {
  const [article] = await tx
    .select()
    .from(communityBlogArticle)
    .where(eq(communityBlogArticle.id, articleId))
    .limit(1)
    .for('update');
  if (!article || getCommunityArticleHttpStatus(article) !== 200)
    throw new Error('COMMUNITY_ARTICLE_NOT_PUBLIC');
  return article;
}

export async function createCommunityComment({
  articleId,
  userId,
  content,
  parentId,
  requestId,
}: {
  articleId: string;
  userId: string;
  content: string;
  parentId?: string | null;
  requestId?: string | null;
}) {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  if (!normalized || normalized.length > 10_000)
    throw new Error('COMMUNITY_COMMENT_INVALID');
  return db().transaction(async (tx: any) => {
    const article = await getPublishedArticleForUpdate(tx, articleId);
    const depth = await getCommunityCommentDepthForInsert({
      tx,
      articleId,
      parentId,
    });
    if (
      !canCreateCommunityComment({
        depth,
        allowComments: article.allowComments,
        allowReplies: article.allowReplies,
      })
    )
      throw new Error(
        depth === 0
          ? 'COMMUNITY_COMMENTS_DISABLED'
          : 'COMMUNITY_REPLIES_DISABLED'
      );
    const [{ value: recentCount }] = await tx
      .select({ value: count() })
      .from(communityComment)
      .where(
        and(
          eq(communityComment.userId, userId),
          gte(communityComment.createdAt, new Date(Date.now() - 3_600_000))
        )
      );
    if (Number(recentCount) >= 20)
      throw new Error('COMMUNITY_COMMENT_RATE_LIMIT');
    const id = getUuid();
    const [comment] = await tx
      .insert(communityComment)
      .values({
        id,
        articleId,
        userId,
        parentId: parentId || null,
        depth,
        content: normalized,
      })
      .returning();
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-moderation:comment:${id}`}))`
    );
    await enqueueModeration(tx, {
      objectType: 'comment',
      objectId: id,
      objectVersion: id,
      businessKey: `comment:${id}:initial`,
      fingerprint: getCommunityModerationFingerprint(
        sanitizeCommunityModerationInput({
          content: normalized,
          articleId,
          parentId: parentId || null,
        }).normalized,
        'community-comment-content-v1'
      ),
    });
    await audit(tx, {
      actorId: userId,
      action: depth === 0 ? 'comment.created' : 'comment.reply_created',
      objectType: 'comment',
      objectId: id,
      afterState: { status: comment.status, articleId, parentId, depth },
      requestId,
    });
    return comment;
  });
}

export async function listCommunityArticleComments({
  articleId,
  viewerId,
  isAdmin = false,
}: {
  articleId: string;
  viewerId?: string | null;
  isAdmin?: boolean;
}) {
  const [article] = await db()
    .select({
      authorId: communityBlogArticle.authorId,
      status: communityBlogArticle.status,
      deletedAt: communityBlogArticle.deletedAt,
      currentPublishedRevisionId:
        communityBlogArticle.currentPublishedRevisionId,
    })
    .from(communityBlogArticle)
    .where(eq(communityBlogArticle.id, articleId))
    .limit(1);
  if (!article || getCommunityArticleHttpStatus(article) !== 200) return [];
  const rows = await db()
    .select({
      comment: communityComment,
      username: communityUserProfile.username,
      displayName: communityUserProfile.displayName,
      avatarUrl: communityUserProfile.avatarUrl,
      likeCount: sql<number>`(select count(*) from ${communityCommentLike} where ${communityCommentLike.commentId} = ${communityComment.id})`,
      replyCount: sql<number>`(select count(*) from ${communityComment} reply where reply.parent_id = ${communityComment.id} and reply.status <> 'deleted')`,
      liked: viewerId
        ? sql<boolean>`exists (select 1 from ${communityCommentLike} where ${communityCommentLike.commentId} = ${communityComment.id} and ${communityCommentLike.userId} = ${viewerId})`
        : sql<boolean>`false`,
    })
    .from(communityComment)
    .leftJoin(
      communityUserProfile,
      eq(communityComment.userId, communityUserProfile.userId)
    )
    .where(eq(communityComment.articleId, articleId))
    .orderBy(asc(communityComment.createdAt));
  return rows
    .filter(
      ({
        comment,
        replyCount,
      }: {
        comment: typeof communityComment.$inferSelect;
        replyCount: number;
      }) =>
        (comment.status === 'deleted' &&
          comment.depth === 0 &&
          shouldShowDeletedCommentPlaceholder(Number(replyCount))) ||
        canReadCommunityComment({
          status: comment.status,
          viewerId,
          commenterId: comment.userId,
          authorId: article.authorId,
          isAdmin,
        })
    )
    .filter(
      ({
        comment,
        replyCount,
      }: {
        comment: typeof communityComment.$inferSelect;
        replyCount: number;
      }) =>
        comment.status !== 'deleted' ||
        (comment.depth === 0 &&
          shouldShowDeletedCommentPlaceholder(Number(replyCount))) ||
        viewerId === comment.userId ||
        isAdmin
    )
    .map(
      (row: {
        comment: typeof communityComment.$inferSelect;
        replyCount: number;
        [key: string]: unknown;
      }) => ({
        ...row,
        comment: {
          ...row.comment,
          content:
            row.comment.status === 'deleted' &&
            viewerId !== row.comment.userId &&
            !isAdmin
              ? null
              : row.comment.content,
        },
      })
    );
}

async function enforceCommentModerationPolicy(tx: any, comment: any) {
  if (!comment.moderationReviewId)
    throw new Error('COMMUNITY_COMMENT_MODERATION_REQUIRED');
  const [review] = await tx
    .select()
    .from(communityModerationReview)
    .where(
      and(
        eq(communityModerationReview.id, comment.moderationReviewId),
        eq(communityModerationReview.objectType, 'comment'),
        eq(communityModerationReview.objectId, comment.id)
      )
    )
    .limit(1);
  if (
    !review ||
    review.status !== 'completed' ||
    review.policyDecision !== 'allow' ||
    review.decision === 'block'
  )
    throw new Error('COMMUNITY_COMMENT_MODERATION_NOT_APPROVED');
}

export async function authorHandleCommunityComment({
  commentId,
  authorId,
  action,
  reasonType,
  description,
  requestId,
}: {
  commentId: string;
  authorId: string;
  action: 'publish' | 'feature' | 'reject' | 'report' | 'hide' | 'restore';
  reasonType?: string;
  description?: string;
  requestId?: string | null;
}) {
  return db().transaction(async (tx: any) => {
    const [row] = await tx
      .select({ comment: communityComment, article: communityBlogArticle })
      .from(communityComment)
      .innerJoin(
        communityBlogArticle,
        eq(communityComment.articleId, communityBlogArticle.id)
      )
      .where(eq(communityComment.id, commentId))
      .limit(1)
      .for('update');
    if (!row || row.article.authorId !== authorId)
      throw new Error('COMMUNITY_COMMENT_NOT_FOUND');
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-moderation:comment:${commentId}`}))`
    );
    if (
      row.comment.depth !== 0 &&
      ['publish', 'feature', 'reject', 'report'].includes(action)
    )
      throw new Error('COMMUNITY_COMMENT_ACTION_INVALID');
    const now = new Date();
    if (action === 'publish' || action === 'feature') {
      if (row.comment.status !== 'pending_author')
        throw new Error('COMMUNITY_COMMENT_NOT_PENDING_AUTHOR');
      await enforceCommentModerationPolicy(tx, row.comment);
      await tx
        .update(communityComment)
        .set({
          status: 'published',
          featured: action === 'feature',
          authorHandledBy: authorId,
          authorHandledAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(communityComment.id, commentId),
            eq(communityComment.status, 'pending_author')
          )
        );
    } else if (action === 'reject') {
      if (row.comment.status !== 'pending_author')
        throw new Error('COMMUNITY_COMMENT_NOT_PENDING_AUTHOR');
      await tx
        .update(communityComment)
        .set({
          status: 'rejected',
          featured: false,
          authorHandledBy: authorId,
          authorHandledAt: now,
          updatedAt: now,
        })
        .where(eq(communityComment.id, commentId));
    } else if (action === 'report') {
      if (!isCommunityReportReasonType(reasonType))
        throw new Error('COMMUNITY_REPORT_REASON_REQUIRED');
      if (
        !['pending_author', 'published', 'hidden'].includes(row.comment.status)
      )
        throw new Error('COMMUNITY_COMMENT_ACTION_INVALID');
      await tx
        .insert(communityContentReport)
        .values({
          id: getUuid(),
          reporterId: authorId,
          objectType: 'comment',
          objectId: commentId,
          reasonType,
          description: description?.trim() || null,
        })
        .onConflictDoNothing();
      await tx
        .update(communityComment)
        .set({
          status: 'reported',
          reportedAt: now,
          featured: false,
          updatedAt: now,
        })
        .where(eq(communityComment.id, commentId));
    } else if (action === 'hide') {
      if (row.comment.status !== 'published')
        throw new Error('COMMUNITY_COMMENT_ACTION_INVALID');
      await tx
        .update(communityComment)
        .set({
          status: 'hidden',
          hiddenAt: now,
          featured: false,
          updatedAt: now,
        })
        .where(eq(communityComment.id, commentId));
    } else {
      if (row.comment.status !== 'hidden')
        throw new Error('COMMUNITY_COMMENT_ACTION_INVALID');
      await tx
        .update(communityComment)
        .set({
          status: 'moderation_pending',
          moderationReviewId: null,
          hiddenAt: null,
          updatedAt: now,
        })
        .where(eq(communityComment.id, commentId));
      await enqueueModeration(tx, {
        objectType: 'comment',
        objectId: commentId,
        objectVersion: `${commentId}:restore:${now.getTime()}`,
        businessKey: `comment:${commentId}:restore:${now.getTime()}`,
        purpose: 'restore_comment',
        fingerprint: getCommunityModerationFingerprint(
          sanitizeCommunityModerationInput({
            content: row.comment.content,
            articleId: row.comment.articleId,
            parentId: row.comment.parentId,
          }).normalized,
          'community-comment-content-v1'
        ),
      });
    }
    await audit(tx, {
      actorId: authorId,
      action: `comment.author_${action}`,
      objectType: 'comment',
      objectId: commentId,
      beforeState: {
        status: row.comment.status,
        featured: row.comment.featured,
      },
      afterState: { action },
      metadata: reasonType ? { reasonType, description } : undefined,
      requestId,
    });
    return { id: commentId, action };
  });
}

export async function deleteOwnCommunityComment({
  commentId,
  userId,
  requestId,
}: {
  commentId: string;
  userId: string;
  requestId?: string | null;
}) {
  return db().transaction(async (tx: any) => {
    const [comment] = await tx
      .select()
      .from(communityComment)
      .where(eq(communityComment.id, commentId))
      .limit(1)
      .for('update');
    if (!comment || comment.userId !== userId)
      throw new Error('COMMUNITY_COMMENT_NOT_FOUND');
    if (comment.status === 'deleted') return { id: commentId, deleted: true };
    const now = new Date();
    await tx
      .update(communityComment)
      .set({
        status: 'deleted',
        featured: false,
        deletedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(communityComment.id, commentId),
          ne(communityComment.status, 'deleted')
        )
      );
    await audit(tx, {
      actorId: userId,
      action: 'comment.deleted',
      objectType: 'comment',
      objectId: commentId,
      beforeState: { status: comment.status },
      afterState: { status: 'deleted' },
      requestId,
    });
    return { id: commentId, deleted: true };
  });
}

export async function closeUnhandledCommunityComments(now = new Date()) {
  return db().transaction(async (tx: any) => {
    const cutoff = new Date(now.getTime() - PENDING_COMMENT_CLOSE_MS);
    const rows = await tx
      .update(communityComment)
      .set({
        status: 'closed_unhandled',
        closedReason: 'author_unhandled_30_days',
        updatedAt: now,
      })
      .where(
        and(
          eq(communityComment.depth, 0),
          eq(communityComment.status, 'pending_author'),
          lt(communityComment.createdAt, cutoff)
        )
      )
      .returning({ id: communityComment.id });
    for (const row of rows)
      await audit(tx, {
        actorType: 'system',
        action: 'comment.closed_unhandled',
        objectType: 'comment',
        objectId: row.id,
        afterState: { status: 'closed_unhandled' },
      });
    return rows.length;
  });
}

export async function listPendingCommentReminderCandidates(now = new Date()) {
  return db()
    .select({
      authorId: communityBlogArticle.authorId,
      commentId: communityComment.id,
      createdAt: communityComment.createdAt,
    })
    .from(communityComment)
    .innerJoin(
      communityBlogArticle,
      eq(communityComment.articleId, communityBlogArticle.id)
    )
    .where(
      and(
        eq(communityComment.depth, 0),
        eq(communityComment.status, 'pending_author'),
        isNull(communityComment.reminderBatchKey),
        lt(communityComment.createdAt, new Date(now.getTime() - 86_400_000))
      )
    )
    .orderBy(
      asc(communityBlogArticle.authorId),
      asc(communityComment.createdAt)
    );
}

export async function setCommunityFollow({
  followerId,
  followedId,
  active,
}: {
  followerId: string;
  followedId: string;
  active: boolean;
}) {
  if (followerId === followedId) throw new Error('COMMUNITY_FOLLOW_SELF');
  if (active) {
    const [profile] = await db()
      .select({ userId: communityUserProfile.userId })
      .from(communityUserProfile)
      .where(
        and(
          eq(communityUserProfile.userId, followedId),
          eq(communityUserProfile.isHidden, false)
        )
      )
      .limit(1);
    if (!profile) throw new Error('COMMUNITY_PROFILE_NOT_FOUND');
    await db()
      .insert(communityFollow)
      .values({ followerId, followedId })
      .onConflictDoNothing();
  } else {
    await db()
      .delete(communityFollow)
      .where(
        and(
          eq(communityFollow.followerId, followerId),
          eq(communityFollow.followedId, followedId)
        )
      );
  }
  return { followedId, active };
}

export async function setCommunityLike({
  userId,
  targetType,
  targetId,
  active,
}: {
  userId: string;
  targetType: TargetType;
  targetId: string;
  active: boolean;
}) {
  if (targetType === 'article') {
    const [target] = await db()
      .select({ id: communityBlogArticle.id })
      .from(communityBlogArticle)
      .where(
        and(
          eq(communityBlogArticle.id, targetId),
          ...getCommunityPublicArticleConditions()
        )
      )
      .limit(1);
    if (!target) throw new Error('COMMUNITY_ARTICLE_NOT_PUBLIC');
    if (active)
      await db()
        .insert(communityArticleLike)
        .values({ userId, articleId: targetId })
        .onConflictDoNothing();
    else
      await db()
        .delete(communityArticleLike)
        .where(
          and(
            eq(communityArticleLike.userId, userId),
            eq(communityArticleLike.articleId, targetId)
          )
        );
  } else {
    const [target] = await db()
      .select({ id: communityComment.id })
      .from(communityComment)
      .where(
        and(
          eq(communityComment.id, targetId),
          eq(communityComment.status, 'published')
        )
      )
      .limit(1);
    if (!target) throw new Error('COMMUNITY_COMMENT_NOT_PUBLIC');
    if (active)
      await db()
        .insert(communityCommentLike)
        .values({ userId, commentId: targetId })
        .onConflictDoNothing();
    else
      await db()
        .delete(communityCommentLike)
        .where(
          and(
            eq(communityCommentLike.userId, userId),
            eq(communityCommentLike.commentId, targetId)
          )
        );
  }
  return { targetType, targetId, active };
}

export async function getCommunityInteractionState({
  userId,
  targetType,
  targetId,
}: {
  userId: string;
  targetType: TargetType | BookmarkType;
  targetId: string;
}) {
  const [like, bookmark] = await Promise.all([
    targetType === 'article'
      ? db()
          .select({ id: communityArticleLike.articleId })
          .from(communityArticleLike)
          .where(
            and(
              eq(communityArticleLike.userId, userId),
              eq(communityArticleLike.articleId, targetId)
            )
          )
          .limit(1)
      : targetType === 'comment'
        ? db()
            .select({ id: communityCommentLike.commentId })
            .from(communityCommentLike)
            .where(
              and(
                eq(communityCommentLike.userId, userId),
                eq(communityCommentLike.commentId, targetId)
              )
            )
            .limit(1)
        : Promise.resolve([]),
    targetType === 'resource'
      ? db()
          .select({ id: communityResourceBookmark.resourceId })
          .from(communityResourceBookmark)
          .where(
            and(
              eq(communityResourceBookmark.userId, userId),
              eq(communityResourceBookmark.resourceId, targetId)
            )
          )
          .limit(1)
      : targetType === 'collection'
        ? db()
            .select({ id: communityCollectionBookmark.collectionId })
            .from(communityCollectionBookmark)
            .where(
              and(
                eq(communityCollectionBookmark.userId, userId),
                eq(communityCollectionBookmark.collectionId, targetId)
              )
            )
            .limit(1)
        : targetType === 'article'
          ? db()
              .select({ id: communityArticleBookmark.articleId })
              .from(communityArticleBookmark)
              .where(
                and(
                  eq(communityArticleBookmark.userId, userId),
                  eq(communityArticleBookmark.articleId, targetId)
                )
              )
              .limit(1)
          : targetType === 'list'
            ? db()
                .select({ id: communityListBookmark.listId })
                .from(communityListBookmark)
                .where(
                  and(
                    eq(communityListBookmark.userId, userId),
                    eq(communityListBookmark.listId, targetId)
                  )
                )
                .limit(1)
            : Promise.resolve([]),
  ]);
  return { liked: like.length > 0, bookmarked: bookmark.length > 0 };
}

export async function listOwnCommunityBookmarks(userId: string) {
  const [resources, collections, articles, lists] = await Promise.all([
    db()
      .select({
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
          isNull(communityUserList.deletedAt)
        )
      ),
  ]);
  return { resources, collections, articles, lists };
}

export async function setCommunityBookmark({
  userId,
  targetType,
  targetId,
  active,
}: {
  userId: string;
  targetType: BookmarkType;
  targetId: string;
  active: boolean;
}) {
  const config = {
    resource: {
      target: resource,
      targetId: resource.id,
      targetStatus: resource.status,
      table: communityResourceBookmark,
      idColumn: communityResourceBookmark.resourceId,
      values: { userId, resourceId: targetId },
    },
    collection: {
      target: collection,
      targetId: collection.id,
      targetStatus: collection.status,
      table: communityCollectionBookmark,
      idColumn: communityCollectionBookmark.collectionId,
      values: { userId, collectionId: targetId },
    },
    article: {
      target: communityBlogArticle,
      targetId: communityBlogArticle.id,
      targetStatus: communityBlogArticle.status,
      table: communityArticleBookmark,
      idColumn: communityArticleBookmark.articleId,
      values: { userId, articleId: targetId },
    },
    list: {
      target: communityUserList,
      targetId: communityUserList.id,
      targetStatus: communityUserList.moderationStatus,
      table: communityListBookmark,
      idColumn: communityListBookmark.listId,
      values: { userId, listId: targetId },
    },
  }[targetType];
  if (!config) throw new Error('COMMUNITY_BOOKMARK_TYPE_INVALID');
  if (active) {
    const expectedStatus = targetType === 'list' ? 'published' : 'published';
    const extra =
      targetType === 'article'
        ? and(...getCommunityPublicArticleConditions())
        : targetType === 'list'
          ? and(
              eq(communityUserList.visibility, 'public'),
              isNull(communityUserList.deletedAt)
            )
          : undefined;
    const [target] = await db()
      .select({ id: config.targetId })
      .from(config.target as any)
      .where(
        and(
          eq(config.targetId as any, targetId),
          eq(config.targetStatus as any, expectedStatus),
          extra
        )
      )
      .limit(1);
    if (!target) throw new Error('COMMUNITY_BOOKMARK_TARGET_NOT_PUBLIC');
    await db()
      .insert(config.table as any)
      .values(config.values)
      .onConflictDoNothing();
  } else {
    await db()
      .delete(config.table as any)
      .where(
        and(
          eq((config.table as any).userId, userId),
          eq(config.idColumn as any, targetId)
        )
      );
  }
  return { targetType, targetId, active };
}

function normalizeListSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  if (!slug) throw new Error('COMMUNITY_LIST_SLUG_INVALID');
  return slug;
}

export async function saveCommunityUserList({
  listId,
  ownerId,
  title,
  slug,
  description,
  visibility = 'public',
}: {
  listId?: string;
  ownerId: string;
  title: string;
  slug: string;
  description?: string | null;
  visibility?: 'public' | 'private';
}) {
  const cleanTitle = title.trim();
  if (!cleanTitle || cleanTitle.length > 120)
    throw new Error('COMMUNITY_LIST_TITLE_INVALID');
  if ((description || '').length > 2000)
    throw new Error('COMMUNITY_LIST_DESCRIPTION_INVALID');
  return db().transaction(async (tx: any) => {
    const id = listId || getUuid();
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-moderation:list:${id}`}))`
    );
    const now = new Date();
    const normalizedSlug = normalizeListSlug(slug);
    const rawContent = {
      title: cleanTitle,
      description: description?.trim() || null,
      visibility,
    };
    const fingerprint = getCommunityModerationFingerprint(
      sanitizeCommunityModerationInput(rawContent).normalized,
      'community-list-content-v1'
    );
    let before: any = null;
    if (listId) {
      [before] = await tx
        .select()
        .from(communityUserList)
        .where(eq(communityUserList.id, listId))
        .limit(1)
        .for('update');
      if (!before || before.ownerId !== ownerId)
        throw new Error('COMMUNITY_LIST_NOT_FOUND');
      await tx
        .update(communityUserList)
        .set({
          title: cleanTitle,
          slug: normalizedSlug,
          description: description?.trim() || null,
          visibility,
          moderationStatus: 'pending',
          moderationReviewId: null,
          updatedAt: now,
        })
        .where(eq(communityUserList.id, id));
    } else {
      await tx.insert(communityUserList).values({
        id,
        ownerId,
        title: cleanTitle,
        slug: normalizedSlug,
        description: description?.trim() || null,
        visibility,
      });
    }
    await enqueueModeration(tx, {
      objectType: 'list',
      objectId: id,
      objectVersion: String(now.getTime()),
      businessKey: `list:${id}:${now.getTime()}`,
      fingerprint,
    });
    await audit(tx, {
      actorId: ownerId,
      action: listId ? 'list.updated' : 'list.created',
      objectType: 'list',
      objectId: id,
      beforeState: before,
      afterState: { title: cleanTitle, slug: normalizedSlug, visibility },
    });
    const [saved] = await tx
      .select()
      .from(communityUserList)
      .where(eq(communityUserList.id, id))
      .limit(1);
    return saved;
  });
}

export async function listOwnCommunityLists(ownerId: string) {
  const lists = await db()
    .select()
    .from(communityUserList)
    .where(
      and(
        eq(communityUserList.ownerId, ownerId),
        isNull(communityUserList.deletedAt)
      )
    )
    .orderBy(desc(communityUserList.updatedAt));
  return Promise.all(
    lists.map(async (list: typeof communityUserList.$inferSelect) => ({
      ...list,
      items: await listCommunityListItems(list.id),
    }))
  );
}

async function listCommunityListItems(listId: string) {
  const [resources, collections, articles] = await Promise.all([
    db()
      .select({
        id: resource.id,
        slug: resource.slug,
        titleZh: resource.nameZh,
        titleEn: resource.nameEn,
      })
      .from(communityListResource)
      .innerJoin(resource, eq(communityListResource.resourceId, resource.id))
      .where(eq(communityListResource.listId, listId))
      .orderBy(asc(communityListResource.sortOrder)),
    db()
      .select({
        id: collection.id,
        slug: collection.slug,
        titleZh: collection.titleZh,
        titleEn: collection.titleEn,
      })
      .from(communityListCollection)
      .innerJoin(
        collection,
        eq(communityListCollection.collectionId, collection.id)
      )
      .where(eq(communityListCollection.listId, listId))
      .orderBy(asc(communityListCollection.sortOrder)),
    db()
      .select({
        id: communityBlogArticle.id,
        slug: communityBlogArticle.slug,
        titleZh: communityArticleRevision.titleZh,
        titleEn: communityArticleRevision.titleEn,
      })
      .from(communityListArticle)
      .innerJoin(
        communityBlogArticle,
        eq(communityListArticle.articleId, communityBlogArticle.id)
      )
      .leftJoin(
        communityArticleRevision,
        eq(
          communityBlogArticle.currentPublishedRevisionId,
          communityArticleRevision.id
        )
      )
      .where(eq(communityListArticle.listId, listId))
      .orderBy(asc(communityListArticle.sortOrder)),
  ]);
  return [
    ...resources.map((item: any) => ({
      ...item,
      itemType: 'resource' as const,
    })),
    ...collections.map((item: any) => ({
      ...item,
      itemType: 'collection' as const,
    })),
    ...articles.map((item: any) => ({
      ...item,
      itemType: 'article' as const,
    })),
  ];
}

export async function deleteCommunityUserList({
  listId,
  ownerId,
}: {
  listId: string;
  ownerId: string;
}) {
  return db().transaction(async (tx: any) => {
    const [list] = await tx
      .select()
      .from(communityUserList)
      .where(eq(communityUserList.id, listId))
      .limit(1)
      .for('update');
    if (!list || list.ownerId !== ownerId)
      throw new Error('COMMUNITY_LIST_NOT_FOUND');
    if (list.deletedAt) return { id: listId, deleted: true };
    const now = new Date();
    await tx
      .update(communityUserList)
      .set({ deletedAt: now, visibility: 'private', updatedAt: now })
      .where(eq(communityUserList.id, listId));
    await audit(tx, {
      actorId: ownerId,
      action: 'list.deleted',
      objectType: 'list',
      objectId: listId,
      beforeState: list,
      afterState: { deletedAt: now, visibility: 'private' },
    });
    return { id: listId, deleted: true };
  });
}

export async function getPublicCommunityList(username: string, slug: string) {
  const [list] = await db()
    .select({ list: communityUserList, profile: communityUserProfile })
    .from(communityUserList)
    .innerJoin(
      communityUserProfile,
      eq(communityUserList.ownerId, communityUserProfile.userId)
    )
    .where(
      and(
        eq(communityUserProfile.username, username.toLowerCase()),
        eq(communityUserProfile.isHidden, false),
        eq(communityUserList.slug, slug),
        eq(communityUserList.visibility, 'public'),
        eq(communityUserList.moderationStatus, 'published'),
        isNull(communityUserList.deletedAt)
      )
    )
    .limit(1);
  if (!list) return null;
  const [resources, collections, articles] = await Promise.all([
    db()
      .select({
        id: resource.id,
        slug: resource.slug,
        nameZh: resource.nameZh,
        nameEn: resource.nameEn,
      })
      .from(communityListResource)
      .innerJoin(resource, eq(communityListResource.resourceId, resource.id))
      .where(
        and(
          eq(communityListResource.listId, list.list.id),
          eq(resource.status, 'published')
        )
      )
      .orderBy(asc(communityListResource.sortOrder)),
    db()
      .select({
        id: collection.id,
        slug: collection.slug,
        titleZh: collection.titleZh,
        titleEn: collection.titleEn,
      })
      .from(communityListCollection)
      .innerJoin(
        collection,
        eq(communityListCollection.collectionId, collection.id)
      )
      .where(
        and(
          eq(communityListCollection.listId, list.list.id),
          eq(collection.status, 'published')
        )
      )
      .orderBy(asc(communityListCollection.sortOrder)),
    db()
      .select({ id: communityBlogArticle.id, slug: communityBlogArticle.slug })
      .from(communityListArticle)
      .innerJoin(
        communityBlogArticle,
        eq(communityListArticle.articleId, communityBlogArticle.id)
      )
      .where(
        and(
          eq(communityListArticle.listId, list.list.id),
          ...getCommunityPublicArticleConditions()
        )
      )
      .orderBy(asc(communityListArticle.sortOrder)),
  ]);
  return { ...list, resources, collections, articles };
}

export async function setCommunityListItem({
  ownerId,
  listId,
  itemType,
  itemId,
  active,
}: {
  ownerId: string;
  listId: string;
  itemType: ListItemType;
  itemId: string;
  active: boolean;
}) {
  const [list] = await db()
    .select()
    .from(communityUserList)
    .where(
      and(eq(communityUserList.id, listId), isNull(communityUserList.deletedAt))
    )
    .limit(1);
  if (!list || list.ownerId !== ownerId)
    throw new Error('COMMUNITY_LIST_NOT_FOUND');
  const config = {
    resource: {
      table: communityListResource,
      idColumn: communityListResource.resourceId,
      values: { listId, resourceId: itemId },
      target: resource,
      targetId: resource.id,
      targetStatus: resource.status,
    },
    collection: {
      table: communityListCollection,
      idColumn: communityListCollection.collectionId,
      values: { listId, collectionId: itemId },
      target: collection,
      targetId: collection.id,
      targetStatus: collection.status,
    },
    article: {
      table: communityListArticle,
      idColumn: communityListArticle.articleId,
      values: { listId, articleId: itemId },
      target: communityBlogArticle,
      targetId: communityBlogArticle.id,
      targetStatus: communityBlogArticle.status,
    },
  }[itemType];
  if (!config) throw new Error('COMMUNITY_LIST_ITEM_TYPE_INVALID');
  if (active) {
    const [target] = await db()
      .select({ id: config.targetId })
      .from(config.target as any)
      .where(
        and(
          eq(config.targetId as any, itemId),
          eq(config.targetStatus as any, 'published')
        )
      )
      .limit(1);
    if (!target) throw new Error('COMMUNITY_LIST_ITEM_NOT_PUBLIC');
    await db()
      .insert(config.table as any)
      .values(config.values)
      .onConflictDoNothing();
  } else {
    await db()
      .delete(config.table as any)
      .where(
        and(
          eq((config.table as any).listId, listId),
          eq(config.idColumn as any, itemId)
        )
      );
  }
  return { listId, itemType, itemId, active };
}

export async function getCommunityPrivacy(userId: string) {
  const [settings] = await db()
    .select()
    .from(communityPrivacySetting)
    .where(eq(communityPrivacySetting.userId, userId))
    .limit(1);
  return settings || null;
}

export async function updateCommunityPrivacy({
  userId,
  showFollowingList,
  showFollowerList,
  showLikes,
  showBookmarks,
}: {
  userId: string;
  showFollowingList: boolean;
  showFollowerList: boolean;
  showLikes: boolean;
  showBookmarks: boolean;
}) {
  const [settings] = await db()
    .insert(communityPrivacySetting)
    .values({
      userId,
      showFollowingList,
      showFollowerList,
      showLikes,
      showBookmarks,
    })
    .onConflictDoUpdate({
      target: communityPrivacySetting.userId,
      set: {
        showFollowingList,
        showFollowerList,
        showLikes,
        showBookmarks,
        updatedAt: new Date(),
      },
    })
    .returning();
  return settings;
}

export async function listCommunityRelationships(userId: string) {
  const [following, followers] = await Promise.all([
    db()
      .select({
        userId: communityUserProfile.userId,
        username: communityUserProfile.username,
        displayName: communityUserProfile.displayName,
      })
      .from(communityFollow)
      .innerJoin(
        communityUserProfile,
        eq(communityFollow.followedId, communityUserProfile.userId)
      )
      .where(eq(communityFollow.followerId, userId))
      .orderBy(desc(communityFollow.createdAt)),
    db()
      .select({
        userId: communityUserProfile.userId,
        username: communityUserProfile.username,
        displayName: communityUserProfile.displayName,
      })
      .from(communityFollow)
      .innerJoin(
        communityUserProfile,
        eq(communityFollow.followerId, communityUserProfile.userId)
      )
      .where(eq(communityFollow.followedId, userId))
      .orderBy(desc(communityFollow.createdAt)),
  ]);
  return { following, followers };
}

export async function listOwnCommunityComments(userId: string) {
  const [mine, pendingForMyArticles] = await Promise.all([
    db()
      .select()
      .from(communityComment)
      .where(eq(communityComment.userId, userId))
      .orderBy(desc(communityComment.createdAt)),
    db()
      .select({ comment: communityComment })
      .from(communityComment)
      .innerJoin(
        communityBlogArticle,
        eq(communityComment.articleId, communityBlogArticle.id)
      )
      .where(
        and(
          eq(communityBlogArticle.authorId, userId),
          eq(communityComment.depth, 0),
          inArray(communityComment.status, [
            'pending_author',
            'published',
            'rejected',
            'hidden',
            'reported',
          ])
        )
      )
      .orderBy(desc(communityComment.createdAt)),
  ]);
  return {
    mine,
    pendingForMyArticles: pendingForMyArticles.map(
      (row: { comment: typeof communityComment.$inferSelect }) => row.comment
    ),
  };
}

export async function updateCommunityArticleInteractionSettings({
  articleId,
  authorId,
  allowComments,
  allowReplies,
}: {
  articleId: string;
  authorId: string;
  allowComments: boolean;
  allowReplies: boolean;
}) {
  const [updated] = await db()
    .update(communityBlogArticle)
    .set({ allowComments, allowReplies, updatedAt: new Date() })
    .where(
      and(
        eq(communityBlogArticle.id, articleId),
        eq(communityBlogArticle.authorId, authorId)
      )
    )
    .returning();
  if (!updated) throw new Error('COMMUNITY_ARTICLE_NOT_FOUND');
  return updated;
}

export async function updateCommunityArticleLifecycle({
  articleId,
  authorId,
  action,
}: {
  articleId: string;
  authorId: string;
  action: 'delete' | 'restore';
}) {
  return db().transaction(async (tx: any) => {
    const [article] = await tx
      .select()
      .from(communityBlogArticle)
      .where(eq(communityBlogArticle.id, articleId))
      .limit(1)
      .for('update');
    if (!article || article.authorId !== authorId)
      throw new Error('COMMUNITY_ARTICLE_NOT_FOUND');
    const now = new Date();
    if (action === 'delete') {
      if (article.status === 'deleted_by_author') return article;
      if (getCommunityArticleHttpStatus(article, now) !== 200)
        throw new Error('COMMUNITY_ARTICLE_DELETE_INVALID');
      const [updated] = await tx
        .update(communityBlogArticle)
        .set({
          status: 'deleted_by_author',
          deletedAt: now,
          restoreDeadlineAt: new Date(now.getTime() + ARTICLE_RESTORE_MS),
          updatedAt: now,
        })
        .where(
          and(
            eq(communityBlogArticle.id, articleId),
            isNull(communityBlogArticle.deletedAt)
          )
        )
        .returning();
      await audit(tx, {
        actorId: authorId,
        action: 'article.deleted_by_author',
        objectType: 'article',
        objectId: articleId,
        beforeState: { status: article.status },
        afterState: { status: 'deleted_by_author' },
      });
      return updated;
    }
    if (
      article.status !== 'deleted_by_author' ||
      !canRestoreCommunityArticle(article.restoreDeadlineAt, now) ||
      !article.currentPublishedRevisionId
    )
      throw new Error('COMMUNITY_ARTICLE_RESTORE_EXPIRED');
    const [updated] = await tx
      .update(communityBlogArticle)
      .set({
        status: 'published',
        deletedAt: null,
        restoreDeadlineAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(communityBlogArticle.id, articleId),
          eq(communityBlogArticle.status, 'deleted_by_author')
        )
      )
      .returning();
    await audit(tx, {
      actorId: authorId,
      action: 'article.restored_by_author',
      objectType: 'article',
      objectId: articleId,
      beforeState: { status: article.status },
      afterState: { status: 'published' },
    });
    return updated;
  });
}

export async function listAdminCommunityComments() {
  const [comments, reports, governance] = await Promise.all([
    db()
      .select({
        comment: communityComment,
        articleSlug: communityBlogArticle.slug,
        articleAuthorId: communityBlogArticle.authorId,
        username: communityUserProfile.username,
      })
      .from(communityComment)
      .innerJoin(
        communityBlogArticle,
        eq(communityComment.articleId, communityBlogArticle.id)
      )
      .leftJoin(
        communityUserProfile,
        eq(communityComment.userId, communityUserProfile.userId)
      )
      .orderBy(desc(communityComment.createdAt)),
    db()
      .select()
      .from(communityContentReport)
      .orderBy(asc(communityContentReport.createdAt)),
    listAdminCommunityInteractionGovernance(),
  ]);
  return { comments, reports, governance };
}

async function listAdminCommunityInteractionGovernance() {
  const [privacy, relationships, privateLists, articleLikes, commentLikes] =
    await Promise.all([
      db()
        .select({
          userId: communityPrivacySetting.userId,
          profileId: communityUserProfile.id,
          username: communityUserProfile.username,
          displayName: communityUserProfile.displayName,
          isHidden: communityUserProfile.isHidden,
          hiddenReason: communityUserProfile.hiddenReason,
          showFollowingList: communityPrivacySetting.showFollowingList,
          showFollowerList: communityPrivacySetting.showFollowerList,
          showLikes: communityPrivacySetting.showLikes,
          showBookmarks: communityPrivacySetting.showBookmarks,
        })
        .from(communityPrivacySetting)
        .leftJoin(
          communityUserProfile,
          eq(communityPrivacySetting.userId, communityUserProfile.userId)
        ),
      db()
        .select({
          followerId: communityFollow.followerId,
          followedId: communityFollow.followedId,
          createdAt: communityFollow.createdAt,
        })
        .from(communityFollow)
        .orderBy(desc(communityFollow.createdAt)),
      db()
        .select({
          id: communityUserList.id,
          ownerId: communityUserList.ownerId,
          username: communityUserProfile.username,
          title: communityUserList.title,
          slug: communityUserList.slug,
          moderationStatus: communityUserList.moderationStatus,
        })
        .from(communityUserList)
        .leftJoin(
          communityUserProfile,
          eq(communityUserList.ownerId, communityUserProfile.userId)
        )
        .where(
          and(
            eq(communityUserList.visibility, 'private'),
            isNull(communityUserList.deletedAt)
          )
        )
        .orderBy(desc(communityUserList.updatedAt)),
      db()
        .select({
          userId: communityArticleLike.userId,
          targetId: communityArticleLike.articleId,
          createdAt: communityArticleLike.createdAt,
        })
        .from(communityArticleLike)
        .orderBy(desc(communityArticleLike.createdAt)),
      db()
        .select({
          userId: communityCommentLike.userId,
          targetId: communityCommentLike.commentId,
          createdAt: communityCommentLike.createdAt,
        })
        .from(communityCommentLike)
        .orderBy(desc(communityCommentLike.createdAt)),
    ]);
  const [
    resourceBookmarks,
    collectionBookmarks,
    articleBookmarks,
    listBookmarks,
  ] = await Promise.all([
    db().select().from(communityResourceBookmark),
    db().select().from(communityCollectionBookmark),
    db().select().from(communityArticleBookmark),
    db().select().from(communityListBookmark),
  ]);
  const privateListsWithItems = await Promise.all(
    privateLists.map(async (list: (typeof privateLists)[number]) => ({
      ...list,
      items: await listCommunityListItems(list.id),
    }))
  );
  return {
    privacy,
    relationships,
    privateLists: privateListsWithItems,
    likes: [
      ...articleLikes.map((item: any) => ({ ...item, targetType: 'article' })),
      ...commentLikes.map((item: any) => ({ ...item, targetType: 'comment' })),
    ],
    bookmarks: [
      ...resourceBookmarks.map((item: any) => ({
        ...item,
        targetType: 'resource',
      })),
      ...collectionBookmarks.map((item: any) => ({
        ...item,
        targetType: 'collection',
      })),
      ...articleBookmarks.map((item: any) => ({
        ...item,
        targetType: 'article',
      })),
      ...listBookmarks.map((item: any) => ({
        ...item,
        targetType: 'list',
      })),
    ],
  };
}

export async function adminHandleCommunityReport({
  reportId,
  adminId,
  action,
  note,
}: {
  reportId: string;
  adminId: string;
  action: 'resolve' | 'dismiss';
  note?: string;
}) {
  return db().transaction(async (tx: any) => {
    const [report] = await tx
      .select()
      .from(communityContentReport)
      .where(eq(communityContentReport.id, reportId))
      .limit(1)
      .for('update');
    if (!report) throw new Error('COMMUNITY_REPORT_NOT_FOUND');
    if (!['pending', 'reviewing'].includes(report.status))
      return { reportId, status: report.status };
    const now = new Date();
    const reportStatus = action === 'resolve' ? 'resolved' : 'dismissed';
    let targetStatus: string;
    let beforeTargetState: unknown;
    if (report.objectType === 'comment') {
      const [comment] = await tx
        .select()
        .from(communityComment)
        .where(eq(communityComment.id, report.objectId))
        .limit(1)
        .for('update');
      if (!comment) throw new Error('COMMUNITY_COMMENT_NOT_FOUND');
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`community-moderation:comment:${comment.id}`}))`
      );
      targetStatus = getReportedCommentResolutionStatus({
        action,
        hiddenAt: comment.hiddenAt,
        authorHandledAt: comment.authorHandledAt,
      });
      beforeTargetState = { status: comment.status };
      await tx
        .update(communityComment)
        .set({
          status: targetStatus,
          featured: targetStatus === 'hidden' ? false : comment.featured,
          hiddenAt: targetStatus === 'hidden' ? comment.hiddenAt || now : null,
          reportedAt: null,
          updatedAt: now,
        })
        .where(eq(communityComment.id, comment.id));
    } else if (report.objectType === 'profile') {
      const [profile] = await tx
        .select()
        .from(communityUserProfile)
        .where(eq(communityUserProfile.id, report.objectId))
        .limit(1)
        .for('update');
      if (!profile) throw new Error('COMMUNITY_PROFILE_NOT_FOUND');
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`community-moderation:profile:${profile.id}`}))`
      );
      beforeTargetState = {
        isHidden: profile.isHidden,
        hiddenReason: profile.hiddenReason,
      };
      targetStatus = getCommunityProfileReportDecision({
        action,
        currentlyHidden: profile.isHidden,
      });
      if (action === 'resolve')
        await tx
          .update(communityUserProfile)
          .set({
            isHidden: true,
            hiddenReason: note?.trim() || report.reasonType,
            updatedAt: now,
          })
          .where(eq(communityUserProfile.id, profile.id));
    } else {
      throw new Error('COMMUNITY_REPORT_OBJECT_UNSUPPORTED');
    }
    await tx
      .update(communityContentReport)
      .set({
        status: reportStatus,
        handledBy: adminId,
        handledAt: now,
        resultNote: note?.trim() || null,
      })
      .where(eq(communityContentReport.id, reportId));
    await audit(tx, {
      actorId: adminId,
      actorType: 'admin',
      action: `report.${reportStatus}`,
      objectType: 'content_report',
      objectId: reportId,
      beforeState: {
        reportStatus: report.status,
        target: beforeTargetState,
      },
      afterState: { reportStatus, targetStatus },
      metadata: {
        note: note?.trim() || null,
        objectType: report.objectType,
        objectId: report.objectId,
      },
    });
    return { reportId, status: reportStatus, targetStatus };
  });
}

export async function reportCommunityProfile({
  reporterId,
  profileId,
  reasonType,
  description,
}: {
  reporterId: string;
  profileId: string;
  reasonType: string;
  description?: string;
}) {
  if (!isCommunityReportReasonType(reasonType))
    throw new Error('COMMUNITY_REPORT_REASON_INVALID');
  return db().transaction(async (tx: any) => {
    const [profile] = await tx
      .select({
        id: communityUserProfile.id,
        userId: communityUserProfile.userId,
      })
      .from(communityUserProfile)
      .where(
        and(
          eq(communityUserProfile.id, profileId),
          eq(communityUserProfile.isHidden, false)
        )
      )
      .limit(1);
    if (!profile) throw new Error('COMMUNITY_PROFILE_NOT_FOUND');
    if (profile.userId === reporterId)
      throw new Error('COMMUNITY_REPORT_SELF_INVALID');
    const [report] = await tx
      .insert(communityContentReport)
      .values({
        id: getUuid(),
        reporterId,
        objectType: 'profile',
        objectId: profileId,
        reasonType,
        description: description?.trim().slice(0, 1000) || null,
      })
      .onConflictDoNothing()
      .returning();
    if (!report) throw new Error('COMMUNITY_REPORT_ALREADY_SUBMITTED');
    await audit(tx, {
      actorId: reporterId,
      action: 'profile.reported',
      objectType: 'profile',
      objectId: profileId,
      afterState: { reportId: report.id, reasonType },
    });
    return report;
  });
}

export async function adminSetCommunityProfileVisibility({
  profileId,
  adminId,
  hidden,
  note,
}: {
  profileId: string;
  adminId: string;
  hidden: boolean;
  note?: string;
}) {
  return db().transaction(async (tx: any) => {
    const [profile] = await tx
      .select()
      .from(communityUserProfile)
      .where(eq(communityUserProfile.id, profileId))
      .limit(1)
      .for('update');
    if (!profile) throw new Error('COMMUNITY_PROFILE_NOT_FOUND');
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-moderation:profile:${profile.id}`}))`
    );
    const hiddenReason = hidden ? note?.trim() || 'admin_hidden' : null;
    await tx
      .update(communityUserProfile)
      .set({ isHidden: hidden, hiddenReason, updatedAt: new Date() })
      .where(eq(communityUserProfile.id, profileId));
    await audit(tx, {
      actorId: adminId,
      actorType: 'admin',
      action: hidden ? 'profile.admin_hidden' : 'profile.admin_restored',
      objectType: 'profile',
      objectId: profileId,
      beforeState: {
        isHidden: profile.isHidden,
        hiddenReason: profile.hiddenReason,
      },
      afterState: { isHidden: hidden, hiddenReason },
    });
    return { profileId, hidden };
  });
}

export async function adminHandleCommunityComment({
  commentId,
  adminId,
  action,
  note,
}: {
  commentId: string;
  adminId: string;
  action: 'hide' | 'restore';
  note?: string;
}) {
  return db().transaction(async (tx: any) => {
    const [comment] = await tx
      .select()
      .from(communityComment)
      .where(eq(communityComment.id, commentId))
      .limit(1)
      .for('update');
    if (!comment) throw new Error('COMMUNITY_COMMENT_NOT_FOUND');
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-moderation:comment:${commentId}`}))`
    );
    const now = new Date();
    if (action === 'hide') {
      if (!['published', 'reported'].includes(comment.status))
        throw new Error('COMMUNITY_COMMENT_ACTION_INVALID');
      await tx
        .update(communityComment)
        .set({
          status: 'hidden',
          featured: false,
          hiddenAt: now,
          updatedAt: now,
        })
        .where(eq(communityComment.id, commentId));
    } else {
      if (comment.status !== 'hidden')
        throw new Error('COMMUNITY_COMMENT_ACTION_INVALID');
      await tx
        .update(communityComment)
        .set({
          status: 'moderation_pending',
          moderationReviewId: null,
          hiddenAt: null,
          updatedAt: now,
        })
        .where(eq(communityComment.id, commentId));
      await enqueueModeration(tx, {
        objectType: 'comment',
        objectId: commentId,
        objectVersion: `${commentId}:restore:${now.getTime()}`,
        businessKey: `comment:${commentId}:admin-restore:${now.getTime()}`,
        purpose: 'restore_comment',
        fingerprint: getCommunityModerationFingerprint(
          sanitizeCommunityModerationInput({
            content: comment.content,
            articleId: comment.articleId,
            parentId: comment.parentId,
          }).normalized,
          'community-comment-content-v1'
        ),
      });
    }
    await audit(tx, {
      actorId: adminId,
      actorType: 'admin',
      action: `comment.admin_${action}`,
      objectType: 'comment',
      objectId: commentId,
      beforeState: { status: comment.status },
      afterState: { action },
      metadata: { note: note?.trim() || null },
    });
    return { commentId, action };
  });
}
