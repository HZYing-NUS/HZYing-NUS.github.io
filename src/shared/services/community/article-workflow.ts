import 'server-only';

import { and, asc, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { postsSource } from '@/core/docs/source';
import {
  communityArticleRevision,
  communityArticleSlugHistory,
  communityAuditLog,
  communityBlogArticle,
  communityJob,
  post,
  user,
} from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

import {
  canSubmitCommunityArticleStatus,
  CommunityArticleDraftInput,
  getCommunityArticleBilingualFingerprint,
  getCommunityArticleSourceFingerprint,
  getCommunitySourceFields,
  getCommunityTranslationJobRecoveryAction,
  hasCompleteCommunityArticleTranslation,
  isCommunityArticleSlugAvailable,
  normalizeCommunityArticleInput,
  normalizeCommunityArticleSlug,
  normalizeCommunityFeaturedReason,
} from './article-content';
import { enforceCommunityArticlePublishPolicy } from './article-policy';
import {
  CommunityArticleTranslator,
  getCommunityArticleTranslator,
} from './article-translation';
import { normalizeCommunityEmailLocale } from './email-policy';
import { enqueueCommunityEmailJob } from './email-workflow';

type CommunityArticleRevision = typeof communityArticleRevision.$inferSelect;

const editableArticleStatuses = new Set([
  'draft',
  'translation_failed',
  'changes_requested',
  'rejected',
  'revision_draft',
]);

function revisionSource(revision: CommunityArticleRevision) {
  const sourceIsZh = revision.sourceLocale === 'zh';
  return {
    sourceLocale: revision.sourceLocale as 'zh' | 'en',
    title: sourceIsZh ? revision.titleZh : revision.titleEn,
    summary: sourceIsZh ? revision.summaryZh : revision.summaryEn,
    content: sourceIsZh ? revision.contentZh : revision.contentEn,
  };
}

async function writeAudit(
  tx: any,
  input: {
    actorId: string | null;
    actorType: 'user' | 'admin' | 'system';
    action: string;
    objectId: string;
    beforeState?: unknown;
    afterState?: unknown;
    metadata?: unknown;
    requestId?: string | null;
  }
) {
  await tx.insert(communityAuditLog).values({
    id: getUuid(),
    actorId: input.actorId,
    actorType: input.actorType,
    action: input.action,
    objectType: 'article',
    objectId: input.objectId,
    beforeState: input.beforeState,
    afterState: input.afterState,
    metadata: input.metadata,
    requestId: input.requestId || null,
  });
}

async function findArticleWithWorkingRevision(tx: any, articleId: string) {
  const [row] = await tx
    .select({
      article: communityBlogArticle,
      revision: communityArticleRevision,
    })
    .from(communityBlogArticle)
    .leftJoin(
      communityArticleRevision,
      eq(
        communityBlogArticle.currentWorkingRevisionId,
        communityArticleRevision.id
      )
    )
    .where(eq(communityBlogArticle.id, articleId))
    .limit(1);
  return row || null;
}

async function assertCommunityArticleSlugAvailable(
  tx: any,
  slug: string,
  articleId?: string
) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`community-article-slug:${slug}`}))`
  );
  const legacyFile =
    postsSource.getPage([slug], 'en') || postsSource.getPage([slug], 'zh');
  const [[legacyPost], [currentArticle], [history]] = await Promise.all([
    tx.select({ id: post.id }).from(post).where(eq(post.slug, slug)).limit(1),
    tx
      .select({ id: communityBlogArticle.id })
      .from(communityBlogArticle)
      .where(eq(communityBlogArticle.slug, slug))
      .limit(1),
    tx
      .select({ articleId: communityArticleSlugHistory.articleId })
      .from(communityArticleSlugHistory)
      .where(eq(communityArticleSlugHistory.slug, slug))
      .limit(1),
  ]);
  if (
    !isCommunityArticleSlugAvailable({
      articleId,
      occupancy: {
        legacyPostId: legacyPost?.id,
        ...(legacyFile ? { legacyPostId: legacyFile.path } : {}),
        currentArticleId: currentArticle?.id,
        historyArticleId: history?.articleId,
      },
    })
  ) {
    throw new Error('ARTICLE_SLUG_UNAVAILABLE');
  }
}

export async function listCommunityAuthorArticles(authorId: string) {
  return db()
    .select({
      article: communityBlogArticle,
      revision: communityArticleRevision,
    })
    .from(communityBlogArticle)
    .leftJoin(
      communityArticleRevision,
      eq(
        communityBlogArticle.currentWorkingRevisionId,
        communityArticleRevision.id
      )
    )
    .where(eq(communityBlogArticle.authorId, authorId))
    .orderBy(desc(communityBlogArticle.updatedAt));
}

export async function getCommunityAuthorArticle(
  articleId: string,
  authorId: string
) {
  const row = await findArticleWithWorkingRevision(db(), articleId);
  if (!row || row.article.authorId !== authorId) return null;
  return row;
}

export async function saveCommunityArticleDraft({
  articleId,
  authorId,
  input,
  requestId,
}: {
  articleId?: string;
  authorId: string;
  input: CommunityArticleDraftInput;
  requestId?: string | null;
}) {
  const normalized = normalizeCommunityArticleInput(input);
  return db().transaction(async (tx: any) => {
    if (!articleId) {
      await assertCommunityArticleSlugAvailable(tx, normalized.slug);
      const id = getUuid();
      const revisionId = getUuid();
      const sourceFields = getCommunitySourceFields(normalized);
      const now = new Date();
      await tx.insert(communityBlogArticle).values({
        id,
        authorId,
        slug: normalized.slug,
        status: 'draft',
        sourceLocale: normalized.sourceLocale,
        currentWorkingRevisionId: revisionId,
        allowAiCitation: false,
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(communityArticleRevision).values({
        id: revisionId,
        articleId: id,
        version: 1,
        ...sourceFields,
        sourceLocale: normalized.sourceLocale,
        coverImageUrl: normalized.coverImageUrl,
        categorySlug: normalized.categorySlug,
        tags: normalized.tags,
        createdBy: authorId,
        createdAt: now,
        updatedAt: now,
      });
      await writeAudit(tx, {
        actorId: authorId,
        actorType: 'user',
        action: 'article.draft_created',
        objectId: id,
        afterState: { revisionId, version: 1 },
        requestId,
      });
      return findArticleWithWorkingRevision(tx, id);
    }

    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-article:${articleId}`}))`
    );
    const existing = await findArticleWithWorkingRevision(tx, articleId);
    if (!existing) throw new Error('ARTICLE_NOT_FOUND');
    if (existing.article.authorId !== authorId)
      throw new Error('ARTICLE_OWNERSHIP_REQUIRED');
    if (!editableArticleStatuses.has(existing.article.status))
      throw new Error('ARTICLE_NOT_EDITABLE');

    const nextSlug = existing.article.firstPublishedAt
      ? existing.article.slug
      : normalized.slug;
    if (nextSlug !== existing.article.slug)
      await assertCommunityArticleSlugAvailable(tx, nextSlug, articleId);

    const sourceFields = getCommunitySourceFields(normalized);
    const now = new Date();
    let revisionId = existing.revision?.id;
    let version = existing.revision?.version || 0;
    const publishedRevisionIsWorking =
      revisionId === existing.article.currentPublishedRevisionId;

    if (!revisionId || publishedRevisionIsWorking) {
      const [{ maxVersion }] = await tx
        .select({
          maxVersion: sql<number>`coalesce(max(${communityArticleRevision.version}), 0)`,
        })
        .from(communityArticleRevision)
        .where(eq(communityArticleRevision.articleId, articleId));
      revisionId = getUuid();
      version = Number(maxVersion) + 1;
      await tx.insert(communityArticleRevision).values({
        id: revisionId,
        articleId,
        version,
        ...sourceFields,
        sourceLocale: normalized.sourceLocale,
        coverImageUrl: normalized.coverImageUrl,
        categorySlug: normalized.categorySlug,
        tags: normalized.tags,
        createdBy: authorId,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await tx
        .update(communityArticleRevision)
        .set({
          ...sourceFields,
          sourceLocale: normalized.sourceLocale,
          coverImageUrl: normalized.coverImageUrl,
          categorySlug: normalized.categorySlug,
          tags: normalized.tags,
          translationStatus: 'draft',
          translationError: null,
          translationModelId: null,
          translationProviderId: null,
          translationPromptVersion: null,
          translationCompletedAt: null,
          contentFingerprint: null,
          reviewStatus: 'draft',
          reviewedBy: null,
          reviewReason: null,
          moderationReviewId: null,
          submittedAt: null,
          reviewedAt: null,
          publishedAt: null,
          updatedAt: now,
        })
        .where(eq(communityArticleRevision.id, revisionId));
    }

    const nextStatus = existing.article.currentPublishedRevisionId
      ? 'revision_draft'
      : 'draft';
    await tx
      .update(communityBlogArticle)
      .set({
        slug: nextSlug,
        sourceLocale: normalized.sourceLocale,
        currentWorkingRevisionId: revisionId,
        status: nextStatus,
        updatedAt: now,
      })
      .where(eq(communityBlogArticle.id, articleId));
    await writeAudit(tx, {
      actorId: authorId,
      actorType: 'user',
      action: publishedRevisionIsWorking
        ? 'article.revision_created'
        : 'article.draft_saved',
      objectId: articleId,
      beforeState: { status: existing.article.status },
      afterState: { status: nextStatus, revisionId, version },
      requestId,
    });
    return findArticleWithWorkingRevision(tx, articleId);
  });
}

export async function submitCommunityArticle({
  articleId,
  authorId,
  idempotencyKey,
}: {
  articleId: string;
  authorId: string;
  idempotencyKey: string;
}) {
  if (!idempotencyKey.trim()) throw new Error('IDEMPOTENCY_KEY_REQUIRED');
  return db().transaction(async (tx: any) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-submit:${authorId}:${idempotencyKey}`}))`
    );
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-article:${articleId}`}))`
    );
    const existing = await findArticleWithWorkingRevision(tx, articleId);
    if (!existing?.revision) throw new Error('ARTICLE_NOT_FOUND');
    if (existing.article.authorId !== authorId)
      throw new Error('ARTICLE_OWNERSHIP_REQUIRED');

    const fingerprint = getCommunityArticleSourceFingerprint(existing.revision);
    const businessKey = `submit:${authorId}:${idempotencyKey}`;
    const [previousJob] = await tx
      .select()
      .from(communityJob)
      .where(
        and(
          eq(communityJob.type, 'translate_article'),
          eq(communityJob.businessKey, businessKey)
        )
      )
      .limit(1);
    if (previousJob) {
      const payload = previousJob.payload as {
        articleId?: string;
        revisionId?: string;
        fingerprint?: string;
      };
      if (
        payload.articleId !== articleId ||
        payload.revisionId !== existing.revision.id ||
        payload.fingerprint !== fingerprint
      ) {
        throw new Error('IDEMPOTENCY_KEY_REUSED');
      }
      return {
        article: existing.article,
        revision: existing.revision,
        job: previousJob,
      };
    }

    if (!canSubmitCommunityArticleStatus(existing.article.status))
      throw new Error('ARTICLE_NOT_SUBMITTABLE');
    const source = revisionSource(existing.revision);
    if (
      !source.title?.trim() ||
      !source.summary?.trim() ||
      !source.content?.trim()
    )
      throw new Error('ARTICLE_SOURCE_INCOMPLETE');

    const now = new Date();
    const job = {
      id: getUuid(),
      type: 'translate_article',
      businessKey,
      payload: {
        articleId,
        revisionId: existing.revision.id,
        fingerprint,
        authorId,
      },
      status: 'pending',
      maxAttempts: 5,
      runAfter: now,
      createdAt: now,
      updatedAt: now,
    };
    await tx.insert(communityJob).values(job);
    await tx
      .update(communityArticleRevision)
      .set({
        translationStatus: 'pending',
        translationError: null,
        contentFingerprint: fingerprint,
        reviewStatus: 'draft',
        submittedAt: now,
        updatedAt: now,
      })
      .where(eq(communityArticleRevision.id, existing.revision.id));
    await tx
      .update(communityBlogArticle)
      .set({ status: 'translating', updatedAt: now })
      .where(eq(communityBlogArticle.id, articleId));
    await writeAudit(tx, {
      actorId: authorId,
      actorType: 'user',
      action: 'article.submitted',
      objectId: articleId,
      afterState: { revisionId: existing.revision.id, status: 'translating' },
      metadata: { fingerprint },
      requestId: idempotencyKey,
    });
    return {
      article: { ...existing.article, status: 'translating' },
      revision: {
        ...existing.revision,
        translationStatus: 'pending',
        contentFingerprint: fingerprint,
      },
      job,
    };
  });
}

export async function claimCommunityTranslationJob({
  workerId,
  leaseSeconds = 120,
}: {
  workerId: string;
  leaseSeconds?: number;
}) {
  return db().transaction(async (tx: any) => {
    for (;;) {
      const now = new Date();
      const [job] = await tx
        .select()
        .from(communityJob)
        .where(
          and(
            eq(communityJob.type, 'translate_article'),
            lte(communityJob.runAfter, now),
            or(
              eq(communityJob.status, 'pending'),
              and(
                eq(communityJob.status, 'processing'),
                lte(communityJob.leaseExpiresAt, now)
              )
            )
          )
        )
        .orderBy(asc(communityJob.runAfter), asc(communityJob.createdAt))
        .limit(1)
        .for('update', { skipLocked: true });
      if (!job) return null;
      const recoveryAction = getCommunityTranslationJobRecoveryAction(job, now);
      if (recoveryAction === 'fail') {
        const payload = job.payload as {
          articleId: string;
          revisionId: string;
        };
        const error = 'COMMUNITY_TRANSLATION_WORKER_CRASHED_AFTER_MAX_ATTEMPTS';
        await tx
          .update(communityJob)
          .set({
            status: 'failed',
            lockedBy: null,
            lockedAt: null,
            leaseExpiresAt: null,
            claimToken: null,
            lastError: error,
            updatedAt: now,
          })
          .where(eq(communityJob.id, job.id));
        await tx
          .update(communityArticleRevision)
          .set({
            translationStatus: 'failed',
            translationError: error,
            updatedAt: now,
          })
          .where(eq(communityArticleRevision.id, payload.revisionId));
        await tx
          .update(communityBlogArticle)
          .set({ status: 'translation_failed', updatedAt: now })
          .where(eq(communityBlogArticle.id, payload.articleId));
        await writeAudit(tx, {
          actorId: null,
          actorType: 'system',
          action: 'article.translation_failed',
          objectId: payload.articleId,
          metadata: { jobId: job.id, attemptCount: job.attemptCount, error },
          requestId: job.id,
        });
        continue;
      }
      if (recoveryAction === 'ignore') continue;
      const claimToken = getUuid();
      const leaseExpiresAt = new Date(now.getTime() + leaseSeconds * 1000);
      const [claimed] = await tx
        .update(communityJob)
        .set({
          status: 'processing',
          attemptCount: job.attemptCount + 1,
          lockedBy: workerId,
          lockedAt: now,
          leaseExpiresAt,
          claimToken,
          updatedAt: now,
        })
        .where(eq(communityJob.id, job.id))
        .returning();
      return claimed || null;
    }
  });
}

export async function processCommunityTranslationJobBatch({
  workerPrefix,
  maxJobs = 5,
}: {
  workerPrefix: string;
  maxJobs?: number;
}) {
  const results = [];
  for (let index = 0; index < maxJobs; index += 1) {
    const job = await claimCommunityTranslationJob({
      workerId: `${workerPrefix}-${Date.now()}-${index}`,
    });
    if (!job) break;
    try {
      results.push({
        jobId: job.id,
        result: await processCommunityTranslationJob({ job }),
      });
    } catch (error) {
      results.push({
        jobId: job.id,
        error: error instanceof Error ? error.message : 'TRANSLATION_FAILED',
      });
    }
  }
  return results;
}

export async function processCommunityTranslationJob({
  job,
  translator,
}: {
  job: typeof communityJob.$inferSelect;
  translator?: CommunityArticleTranslator;
}) {
  if (!job.claimToken) throw new Error('COMMUNITY_JOB_CLAIM_REQUIRED');
  const payload = job.payload as {
    articleId: string;
    revisionId: string;
    fingerprint: string;
    authorId: string;
  };
  try {
    const [revision] = await db()
      .select()
      .from(communityArticleRevision)
      .where(eq(communityArticleRevision.id, payload.revisionId))
      .limit(1);
    if (!revision || revision.articleId !== payload.articleId)
      throw new Error('ARTICLE_REVISION_NOT_FOUND');
    if (getCommunityArticleSourceFingerprint(revision) !== payload.fingerprint)
      throw new Error('ARTICLE_SOURCE_CHANGED');
    const source = revisionSource(revision);
    if (!source.title || !source.summary || !source.content)
      throw new Error('ARTICLE_SOURCE_INCOMPLETE');

    const translated = await (
      translator || (await getCommunityArticleTranslator())
    ).translate({
      sourceLocale: source.sourceLocale,
      title: source.title,
      summary: source.summary,
      content: source.content,
    });

    return db().transaction(async (tx: any) => {
      const now = new Date();
      const [activeJob] = await tx
        .select()
        .from(communityJob)
        .where(
          and(
            eq(communityJob.id, job.id),
            eq(communityJob.status, 'processing'),
            eq(communityJob.claimToken, job.claimToken!),
            gte(communityJob.leaseExpiresAt, now)
          )
        )
        .limit(1)
        .for('update');
      if (!activeJob) throw new Error('COMMUNITY_JOB_LEASE_LOST');
      const [current] = await tx
        .select()
        .from(communityArticleRevision)
        .where(eq(communityArticleRevision.id, payload.revisionId))
        .limit(1);
      if (
        !current ||
        getCommunityArticleSourceFingerprint(current) !== payload.fingerprint
      ) {
        throw new Error('ARTICLE_SOURCE_CHANGED');
      }

      const [completedJob] = await tx
        .update(communityJob)
        .set({
          status: 'completed',
          completedAt: now,
          lockedBy: null,
          lockedAt: null,
          leaseExpiresAt: null,
          claimToken: null,
          lastError: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(communityJob.id, job.id),
            eq(communityJob.status, 'processing'),
            eq(communityJob.claimToken, job.claimToken!),
            gte(communityJob.leaseExpiresAt, now)
          )
        )
        .returning({ id: communityJob.id });
      if (!completedJob) throw new Error('COMMUNITY_JOB_LEASE_LOST');

      const translatedFields =
        current.sourceLocale === 'zh'
          ? {
              titleEn: translated.title,
              summaryEn: translated.summary,
              contentEn: translated.content,
            }
          : {
              titleZh: translated.title,
              summaryZh: translated.summary,
              contentZh: translated.content,
            };
      const bilingual = { ...current, ...translatedFields };
      const fingerprint = getCommunityArticleBilingualFingerprint(bilingual);
      await tx
        .update(communityArticleRevision)
        .set({
          ...translatedFields,
          translationStatus: 'completed',
          translationError: null,
          translationModelId: translated.modelId,
          translationProviderId: translated.providerId,
          translationPromptVersion: translated.promptVersion,
          translationCompletedAt: now,
          contentFingerprint: fingerprint,
          reviewStatus: 'pending_review',
          updatedAt: now,
        })
        .where(eq(communityArticleRevision.id, payload.revisionId));
      const [article] = await tx
        .select()
        .from(communityBlogArticle)
        .where(eq(communityBlogArticle.id, payload.articleId))
        .limit(1);
      const nextArticleStatus = article?.currentPublishedRevisionId
        ? 'revision_pending_review'
        : 'pending_review';
      await tx
        .update(communityBlogArticle)
        .set({ status: nextArticleStatus, updatedAt: now })
        .where(eq(communityBlogArticle.id, payload.articleId));
      await tx
        .insert(communityJob)
        .values({
          id: getUuid(),
          type: 'moderate_content',
          businessKey: `article:${payload.revisionId}:${fingerprint}`,
          payload: {
            objectType: 'article',
            articleId: payload.articleId,
            revisionId: payload.revisionId,
            fingerprint,
          },
          status: 'pending',
          runAfter: now,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
      await writeAudit(tx, {
        actorId: null,
        actorType: 'system',
        action: 'article.translation_completed',
        objectId: payload.articleId,
        afterState: {
          revisionId: payload.revisionId,
          status: nextArticleStatus,
        },
        metadata: {
          modelId: translated.modelId,
          providerId: translated.providerId,
          actualModelId: translated.actualModelId,
          promptVersion: translated.promptVersion,
          usage: 'usage' in translated ? translated.usage : undefined,
        },
        requestId: job.id,
      });
      return {
        articleStatus: nextArticleStatus,
        revisionId: payload.revisionId,
      };
    });
  } catch (error) {
    await failCommunityTranslationJob({
      job,
      error: error instanceof Error ? error.message : 'TRANSLATION_FAILED',
    });
    throw error;
  }
}

export async function failCommunityTranslationJob({
  job,
  error,
}: {
  job: typeof communityJob.$inferSelect;
  error: string;
}) {
  const payload = job.payload as { articleId: string; revisionId: string };
  return db().transaction(async (tx: any) => {
    const now = new Date();
    const terminal = job.attemptCount >= job.maxAttempts;
    const runAfter = new Date(
      now.getTime() + Math.min(3600, 2 ** Math.max(0, job.attemptCount)) * 1000
    );
    const [claimedFailure] = await tx
      .update(communityJob)
      .set({
        status: terminal ? 'failed' : 'pending',
        runAfter,
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        claimToken: null,
        lastError: error.slice(0, 2000),
        updatedAt: now,
      })
      .where(
        and(
          eq(communityJob.id, job.id),
          eq(communityJob.status, 'processing'),
          eq(communityJob.claimToken, job.claimToken || ''),
          gte(communityJob.leaseExpiresAt, now)
        )
      )
      .returning({ id: communityJob.id });
    if (!claimedFailure) return { applied: false };
    await tx
      .update(communityArticleRevision)
      .set({
        translationStatus: terminal ? 'failed' : 'pending',
        translationError: error.slice(0, 2000),
        updatedAt: now,
      })
      .where(eq(communityArticleRevision.id, payload.revisionId));
    if (terminal) {
      await tx
        .update(communityBlogArticle)
        .set({ status: 'translation_failed', updatedAt: now })
        .where(eq(communityBlogArticle.id, payload.articleId));
    }
    await writeAudit(tx, {
      actorId: null,
      actorType: 'system',
      action: terminal
        ? 'article.translation_failed'
        : 'article.translation_retry_scheduled',
      objectId: payload.articleId,
      metadata: { jobId: job.id, attemptCount: job.attemptCount, error },
      requestId: job.id,
    });
    return { applied: true, terminal };
  });
}

export async function listCommunityAdminReviewArticles() {
  return db()
    .select({
      article: communityBlogArticle,
      revision: communityArticleRevision,
    })
    .from(communityBlogArticle)
    .innerJoin(
      communityArticleRevision,
      eq(
        communityBlogArticle.currentWorkingRevisionId,
        communityArticleRevision.id
      )
    )
    .orderBy(
      sql`case when ${communityArticleRevision.reviewStatus} = 'pending_review' then 0 else 1 end`,
      desc(communityBlogArticle.updatedAt)
    );
}

export async function getCommunityAdminReviewArticle(articleId: string) {
  return findArticleWithWorkingRevision(db(), articleId);
}

export async function updateCommunityArticleSlug({
  articleId,
  adminId,
  slug,
  requestId,
}: {
  articleId: string;
  adminId: string;
  slug: string;
  requestId?: string | null;
}) {
  const normalizedSlug = normalizeCommunityArticleSlug(slug);
  if (!normalizedSlug) throw new Error('ARTICLE_SLUG_REQUIRED');
  return db().transaction(async (tx: any) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-article:${articleId}`}))`
    );
    const row = await findArticleWithWorkingRevision(tx, articleId);
    if (!row) throw new Error('ARTICLE_NOT_FOUND');
    if (row.article.slug === normalizedSlug) return row;
    await assertCommunityArticleSlugAvailable(tx, normalizedSlug, articleId);
    const now = new Date();
    const permanentRedirect = Boolean(row.article.firstPublishedAt);
    if (permanentRedirect) {
      await tx
        .update(communityArticleSlugHistory)
        .set({ replacedBySlug: normalizedSlug })
        .where(eq(communityArticleSlugHistory.articleId, articleId));
      await tx.insert(communityArticleSlugHistory).values({
        id: getUuid(),
        articleId,
        slug: row.article.slug,
        replacedBySlug: normalizedSlug,
        createdAt: now,
      });
    }
    await tx
      .update(communityBlogArticle)
      .set({ slug: normalizedSlug, updatedAt: now })
      .where(eq(communityBlogArticle.id, articleId));
    await writeAudit(tx, {
      actorId: adminId,
      actorType: 'admin',
      action: 'article.slug_changed',
      objectId: articleId,
      beforeState: { slug: row.article.slug },
      afterState: { slug: normalizedSlug },
      metadata: { permanentRedirect },
      requestId,
    });
    return findArticleWithWorkingRevision(tx, articleId);
  });
}

export async function updateCommunityArticleFeatured({
  articleId,
  adminId,
  featured,
  reason,
  requestId,
}: {
  articleId: string;
  adminId: string;
  featured: boolean;
  reason?: string | null;
  requestId?: string | null;
}) {
  const featuredReason = normalizeCommunityFeaturedReason(featured, reason);
  return db().transaction(async (tx: any) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-article:${articleId}`}))`
    );
    const row = await findArticleWithWorkingRevision(tx, articleId);
    if (!row) throw new Error('ARTICLE_NOT_FOUND');
    if (!row.article.currentPublishedRevisionId)
      throw new Error('ARTICLE_NOT_PUBLISHED');
    const now = new Date();
    await tx
      .update(communityBlogArticle)
      .set({
        featured,
        featuredReason: featured ? featuredReason : null,
        featuredAt: featured ? now : null,
        featuredBy: featured ? adminId : null,
        updatedAt: now,
      })
      .where(eq(communityBlogArticle.id, articleId));
    await writeAudit(tx, {
      actorId: adminId,
      actorType: 'admin',
      action: featured ? 'article.featured_set' : 'article.featured_unset',
      objectId: articleId,
      beforeState: {
        featured: row.article.featured,
        reason: row.article.featuredReason,
        featuredAt: row.article.featuredAt,
        featuredBy: row.article.featuredBy,
      },
      afterState: {
        featured,
        reason: featured ? featuredReason : null,
        featuredAt: featured ? now : null,
        featuredBy: featured ? adminId : null,
      },
      requestId,
    });
    return findArticleWithWorkingRevision(tx, articleId);
  });
}

export async function updateCommunityArticleTranslation({
  articleId,
  adminId,
  translatedTitle,
  translatedSummary,
  translatedContent,
  coverImageUrl,
  categorySlug,
  tags,
}: {
  articleId: string;
  adminId: string;
  translatedTitle: string;
  translatedSummary: string;
  translatedContent: string;
  coverImageUrl?: string | null;
  categorySlug?: string | null;
  tags?: string[];
}) {
  return db().transaction(async (tx: any) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-article:${articleId}`}))`
    );
    const row = await findArticleWithWorkingRevision(tx, articleId);
    if (!row?.revision) throw new Error('ARTICLE_NOT_FOUND');
    if (row.revision.reviewStatus !== 'pending_review')
      throw new Error('ARTICLE_NOT_PENDING_REVIEW');
    const translatedFields =
      row.revision.sourceLocale === 'zh'
        ? {
            titleEn: translatedTitle.trim(),
            summaryEn: translatedSummary.trim(),
            contentEn: translatedContent.replace(/\r\n/g, '\n').trim(),
          }
        : {
            titleZh: translatedTitle.trim(),
            summaryZh: translatedSummary.trim(),
            contentZh: translatedContent.replace(/\r\n/g, '\n').trim(),
          };
    if (
      !translatedFields[
        row.revision.sourceLocale === 'zh' ? 'titleEn' : 'titleZh'
      ] ||
      !translatedFields[
        row.revision.sourceLocale === 'zh' ? 'summaryEn' : 'summaryZh'
      ] ||
      !translatedFields[
        row.revision.sourceLocale === 'zh' ? 'contentEn' : 'contentZh'
      ]
    ) {
      throw new Error('ARTICLE_TRANSLATION_INCOMPLETE');
    }
    const formatFields = {
      coverImageUrl: coverImageUrl?.trim() || null,
      categorySlug: categorySlug?.trim().toLowerCase() || null,
      tags: Array.from(
        new Set(
          (tags || []).map((tag) => tag.trim().toLowerCase()).filter(Boolean)
        )
      ).slice(0, 10),
    };
    const updated = { ...row.revision, ...translatedFields, ...formatFields };
    const fingerprint = getCommunityArticleBilingualFingerprint(updated);
    await tx
      .update(communityArticleRevision)
      .set({
        ...translatedFields,
        ...formatFields,
        contentFingerprint: fingerprint,
        moderationReviewId: null,
        updatedAt: new Date(),
      })
      .where(eq(communityArticleRevision.id, row.revision.id));
    await tx
      .insert(communityJob)
      .values({
        id: getUuid(),
        type: 'moderate_content',
        businessKey: `article:${row.revision.id}:${fingerprint}`,
        payload: {
          objectType: 'article',
          articleId,
          revisionId: row.revision.id,
          fingerprint,
        },
        status: 'pending',
      })
      .onConflictDoNothing();
    await writeAudit(tx, {
      actorId: adminId,
      actorType: 'admin',
      action: 'article.translation_corrected',
      objectId: articleId,
      metadata: {
        revisionId: row.revision.id,
        sourceLocale: row.revision.sourceLocale,
      },
    });
    return findArticleWithWorkingRevision(tx, articleId);
  });
}

export async function reviewCommunityArticle({
  articleId,
  adminId,
  action,
  reason,
}: {
  articleId: string;
  adminId: string;
  action: 'approve' | 'changes_requested' | 'rejected' | 'archived';
  reason?: string | null;
}) {
  return db().transaction(async (tx: any) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-article:${articleId}`}))`
    );
    const row = await findArticleWithWorkingRevision(tx, articleId);
    if (!row?.revision) throw new Error('ARTICLE_NOT_FOUND');
    if (row.revision.reviewStatus !== 'pending_review')
      throw new Error('ARTICLE_NOT_PENDING_REVIEW');
    if (action === 'changes_requested' && !reason?.trim())
      throw new Error('ARTICLE_REVIEW_REASON_REQUIRED');
    const now = new Date();

    if (action === 'approve') {
      if (!hasCompleteCommunityArticleTranslation(row.revision))
        throw new Error('ARTICLE_TRANSLATION_INCOMPLETE');
      await enforceCommunityArticlePublishPolicy({
        tx,
        revision: row.revision,
      });
      await tx
        .update(communityArticleRevision)
        .set({
          reviewStatus: 'published',
          reviewedBy: adminId,
          reviewReason: reason?.trim() || null,
          reviewedAt: now,
          publishedAt: now,
          updatedAt: now,
        })
        .where(eq(communityArticleRevision.id, row.revision.id));
      await tx
        .update(communityBlogArticle)
        .set({
          status: 'published',
          currentPublishedRevisionId: row.revision.id,
          sourceLocale: row.revision.sourceLocale,
          coverImageUrl: row.revision.coverImageUrl,
          categorySlug: row.revision.categorySlug,
          firstPublishedAt: row.article.firstPublishedAt || now,
          deletedAt: null,
          restoreDeadlineAt: null,
          updatedAt: now,
        })
        .where(eq(communityBlogArticle.id, articleId));
    } else {
      const revisionStatus =
        action === 'changes_requested' ? 'changes_requested' : 'rejected';
      await tx
        .update(communityArticleRevision)
        .set({
          reviewStatus: revisionStatus,
          reviewedBy: adminId,
          reviewReason: reason?.trim() || null,
          reviewedAt: now,
          updatedAt: now,
        })
        .where(eq(communityArticleRevision.id, row.revision.id));
      await tx
        .update(communityBlogArticle)
        .set({
          status: action,
          archivedAt: action === 'archived' ? now : row.article.archivedAt,
          updatedAt: now,
        })
        .where(eq(communityBlogArticle.id, articleId));
    }
    if (['approve', 'changes_requested', 'rejected'].includes(action)) {
      const [author] = await tx
        .select({ locale: user.locale })
        .from(user)
        .where(eq(user.id, row.article.authorId))
        .limit(1);
      const emailType =
        action === 'approve' ? 'article_approved' : 'article_changes_requested';
      const title =
        row.revision.sourceLocale === 'zh'
          ? row.revision.titleZh
          : row.revision.titleEn;
      await enqueueCommunityEmailJob(tx, {
        emailType,
        userId: row.article.authorId,
        businessEventId: row.revision.id,
        locale: normalizeCommunityEmailLocale(author?.locale),
        articleId,
        articleSlug: row.article.slug,
        articleTitle: title || undefined,
        reviewOutcome: action === 'rejected' ? 'rejected' : 'changes_requested',
        reason: reason?.trim() || undefined,
        publishedAt: action === 'approve' ? now.toISOString() : undefined,
        scheduledAt: now,
      });
    }
    await writeAudit(tx, {
      actorId: adminId,
      actorType: 'admin',
      action: `article.review_${action}`,
      objectId: articleId,
      beforeState: {
        status: row.article.status,
        revisionStatus: row.revision.reviewStatus,
      },
      afterState: { status: action === 'approve' ? 'published' : action },
      metadata: { reason: reason?.trim() || null, revisionId: row.revision.id },
    });
    return findArticleWithWorkingRevision(tx, articleId);
  });
}
