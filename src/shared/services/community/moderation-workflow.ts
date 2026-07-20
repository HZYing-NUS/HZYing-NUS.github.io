import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  or,
  sql,
} from 'drizzle-orm';

import { db } from '@/core/db';
import {
  communityArticleRevision,
  communityAuditLog,
  communityBlogArticle,
  communityComment,
  communityJob,
  communityModerationAppeal,
  communityModerationReview,
  communityProfileRevision,
  communityUserList,
  communityUserProfile,
  user,
} from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';
import { getAllConfigs } from '@/shared/models/config';

import { COMMUNITY_COMMENT_MODERATION_WRITABLE_STATUSES } from './interaction-policy';
import {
  assertCommunityManualModerationAction,
  COMMUNITY_MODERATION_PROMPT_VERSION,
  COMMUNITY_MODERATION_RULE_VERSION,
  CommunityModerator,
  decideCommunityModerationPolicy,
  evaluateCommunityDeterministicRules,
  getCommunityModerationFingerprint,
  getCommunityModerator,
  hasCommunityNonOverridableRisk,
  sanitizeCommunityModerationInput,
} from './moderation';
import {
  getCommunityModerationJobRecoveryAction,
  getCommunityModerationReviewVersionFields,
  getCommunityModerationThresholds,
  inferCommunityModerationLocales,
} from './moderation-rules';
import { canPublishCommunityProfileRevision } from './profile-content';

type ModerationPayload = {
  objectType: 'article' | 'profile' | 'comment' | 'list';
  objectId: string;
  objectVersion: string;
  fingerprint?: string;
  articleId?: string;
  revisionId?: string;
  reviewId?: string;
  purpose?: string;
};

async function lockCommunityModerationObject(
  tx: any,
  payload: ModerationPayload
) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`community-moderation:${payload.objectType}:${payload.objectId}`}))`
  );
}

export type CommunityModerationAdapter = {
  load(
    tx: any,
    payload: ModerationPayload
  ): Promise<{
    userId: string | null;
    rawContent: Record<string, unknown>;
    currentFingerprint?: string | null;
  }>;
  apply(
    tx: any,
    payload: ModerationPayload,
    reviewId: string,
    decision: 'allow' | 'pending_admin' | 'blocked'
  ): Promise<void>;
};

const adapters: Record<
  ModerationPayload['objectType'],
  CommunityModerationAdapter
> = {
  article: {
    async load(tx, payload) {
      const [row] = await tx
        .select({
          revision: communityArticleRevision,
          article: communityBlogArticle,
        })
        .from(communityArticleRevision)
        .innerJoin(
          communityBlogArticle,
          eq(communityArticleRevision.articleId, communityBlogArticle.id)
        )
        .where(
          and(
            eq(
              communityArticleRevision.id,
              payload.revisionId || payload.objectVersion
            ),
            eq(communityBlogArticle.id, payload.articleId || payload.objectId)
          )
        )
        .limit(1);
      if (!row) throw new Error('ARTICLE_REVISION_NOT_FOUND');
      return {
        userId: row.article.authorId,
        currentFingerprint: row.revision.contentFingerprint,
        rawContent: {
          titleZh: row.revision.titleZh,
          titleEn: row.revision.titleEn,
          summaryZh: row.revision.summaryZh,
          summaryEn: row.revision.summaryEn,
          contentZh: row.revision.contentZh,
          contentEn: row.revision.contentEn,
          sourceLocale: row.revision.sourceLocale,
          coverImageUrl: row.revision.coverImageUrl,
          categorySlug: row.revision.categorySlug,
          tags: row.revision.tags,
        },
      };
    },
    async apply(tx, payload, reviewId, decision) {
      await tx
        .update(communityArticleRevision)
        .set({ moderationReviewId: reviewId, updatedAt: new Date() })
        .where(
          eq(
            communityArticleRevision.id,
            payload.revisionId || payload.objectVersion
          )
        );
      if (decision !== 'allow') {
        await tx
          .update(communityBlogArticle)
          .set({ updatedAt: new Date() })
          .where(
            eq(communityBlogArticle.id, payload.articleId || payload.objectId)
          );
      }
    },
  },
  profile: {
    async load(tx, payload) {
      const [row] = await tx
        .select()
        .from(communityProfileRevision)
        .where(eq(communityProfileRevision.id, payload.objectVersion))
        .limit(1)
        .for('update');
      if (!row || row.profileId !== payload.objectId)
        throw new Error('PROFILE_REVISION_NOT_FOUND');
      return {
        userId: row.createdBy,
        currentFingerprint: row.contentFingerprint,
        rawContent: {
          displayName: row.displayName,
          headline: row.headline,
          aboutZh: row.aboutZh,
          aboutEn: row.aboutEn,
          experience: row.experience,
          skills: row.skills,
          region: row.region,
          websiteUrl: row.websiteUrl,
          socialLinks: row.socialLinks,
        },
      };
    },
    async apply(tx, payload, reviewId, decision) {
      await lockCommunityModerationObject(tx, payload);
      const [revision] = await tx
        .update(communityProfileRevision)
        .set({
          moderationReviewId: reviewId,
          moderationStatus: decision === 'allow' ? 'published' : decision,
          publishedAt: decision === 'allow' ? new Date() : null,
        })
        .where(
          and(
            eq(communityProfileRevision.id, payload.objectVersion),
            eq(communityProfileRevision.profileId, payload.objectId),
            eq(
              communityProfileRevision.contentFingerprint,
              payload.fingerprint || ''
            ),
            inArray(communityProfileRevision.moderationStatus, [
              'moderation_pending',
              'pending_admin',
              'failed',
            ])
          )
        )
        .returning();
      if (!revision) throw new Error('MODERATION_CONTENT_CHANGED');
      const [profile] = await tx
        .select()
        .from(communityUserProfile)
        .where(eq(communityUserProfile.id, payload.objectId))
        .limit(1)
        .for('update');
      const [latestRevision] = await tx
        .select({ id: communityProfileRevision.id })
        .from(communityProfileRevision)
        .where(eq(communityProfileRevision.profileId, payload.objectId))
        .orderBy(desc(communityProfileRevision.version))
        .limit(1);
      if (
        !profile ||
        !canPublishCommunityProfileRevision({
          latestRevisionId: latestRevision?.id || null,
          revisionId: revision.id,
          currentFingerprint: revision.contentFingerprint,
          expectedFingerprint: payload.fingerprint,
        })
      )
        throw new Error('MODERATION_CONTENT_CHANGED');
      if (decision === 'allow')
        await tx
          .update(communityUserProfile)
          .set({
            displayName: revision.displayName,
            avatarUrl: revision.avatarUrl,
            headline: revision.headline,
            aboutZh: revision.aboutZh,
            aboutEn: revision.aboutEn,
            experience: revision.experience,
            skills: revision.skills,
            region: revision.region,
            websiteUrl: revision.websiteUrl,
            socialLinks: revision.socialLinks,
            currentPublishedRevisionId: revision.id,
            pendingRevisionId: null,
            moderationStatus: 'published',
            allowAiCitation: false,
            updatedAt: new Date(),
          })
          .where(eq(communityUserProfile.id, profile.id));
      else
        await tx
          .update(communityUserProfile)
          .set({
            moderationStatus: decision,
            pendingRevisionId: revision.id,
            updatedAt: new Date(),
          })
          .where(eq(communityUserProfile.id, profile.id));
    },
  },
  comment: {
    async load(tx, payload) {
      const [row] = await tx
        .select()
        .from(communityComment)
        .where(eq(communityComment.id, payload.objectId))
        .limit(1)
        .for('update');
      if (!row) throw new Error('COMMENT_NOT_FOUND');
      return {
        userId: row.userId,
        currentFingerprint: getCommunityModerationFingerprint(
          sanitizeCommunityModerationInput({
            content: row.content,
            articleId: row.articleId,
            parentId: row.parentId,
          }).normalized,
          'community-comment-content-v1'
        ),
        rawContent: {
          content: row.content,
          articleId: row.articleId,
          parentId: row.parentId,
          sourceLocale: /[\u3400-\u9fff]/u.test(row.content) ? 'zh' : 'en',
        },
      };
    },
    async apply(tx, payload, reviewId, decision) {
      await lockCommunityModerationObject(tx, payload);
      const [comment] = await tx
        .select({ depth: communityComment.depth })
        .from(communityComment)
        .where(eq(communityComment.id, payload.objectId))
        .limit(1)
        .for('update');
      if (!comment) throw new Error('MODERATION_CONTENT_CHANGED');
      const loaded = await adapters.comment.load(tx, payload);
      if (loaded.currentFingerprint !== payload.fingerprint)
        throw new Error('MODERATION_CONTENT_CHANGED');
      const status =
        decision === 'allow'
          ? comment?.depth === 1 ||
            payload.purpose === 'restore_comment' ||
            payload.objectVersion.includes(':restore:')
            ? 'published'
            : 'pending_author'
          : decision;
      const [updated] = await tx
        .update(communityComment)
        .set({ moderationReviewId: reviewId, status, updatedAt: new Date() })
        .where(
          and(
            eq(communityComment.id, payload.objectId),
            inArray(
              communityComment.status,
              COMMUNITY_COMMENT_MODERATION_WRITABLE_STATUSES
            )
          )
        )
        .returning({ id: communityComment.id });
      if (!updated) throw new Error('MODERATION_CONTENT_CHANGED');
    },
  },
  list: {
    async load(tx, payload) {
      const [row] = await tx
        .select()
        .from(communityUserList)
        .where(eq(communityUserList.id, payload.objectId))
        .limit(1)
        .for('update');
      if (!row) throw new Error('LIST_NOT_FOUND');
      const rawContent = {
        title: row.title,
        description: row.description,
        visibility: row.visibility,
        sourceLocale: /[\u3400-\u9fff]/u.test(
          `${row.title}\n${row.description || ''}`
        )
          ? 'zh'
          : 'en',
      };
      return {
        userId: row.ownerId,
        currentFingerprint: getCommunityModerationFingerprint(
          sanitizeCommunityModerationInput({
            title: row.title,
            description: row.description,
            visibility: row.visibility,
          }).normalized,
          'community-list-content-v1'
        ),
        rawContent,
      };
    },
    async apply(tx, payload, reviewId, decision) {
      await lockCommunityModerationObject(tx, payload);
      const loaded = await adapters.list.load(tx, payload);
      if (loaded.currentFingerprint !== payload.fingerprint)
        throw new Error('MODERATION_CONTENT_CHANGED');
      const [updated] = await tx
        .update(communityUserList)
        .set({
          moderationReviewId: reviewId,
          moderationStatus: decision === 'allow' ? 'published' : decision,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(communityUserList.id, payload.objectId),
            inArray(communityUserList.moderationStatus, [
              'pending',
              'pending_admin',
              'blocked',
            ])
          )
        )
        .returning({ id: communityUserList.id });
      if (!updated) throw new Error('MODERATION_CONTENT_CHANGED');
    },
  },
};

export function getCommunityModerationAdapter(
  objectType: ModerationPayload['objectType']
) {
  return adapters[objectType];
}

export async function claimCommunityModerationJob({
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
            eq(communityJob.type, 'moderate_content'),
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
      const recoveryAction = getCommunityModerationJobRecoveryAction(job, now);
      if (recoveryAction === 'fail') {
        const rawPayload = job.payload as Partial<ModerationPayload> & {
          articleId?: string;
          revisionId?: string;
        };
        const payload = {
          ...rawPayload,
          objectType: rawPayload.objectType || 'article',
          objectId: rawPayload.objectId || rawPayload.articleId || '',
          objectVersion:
            rawPayload.objectVersion || rawPayload.revisionId || '',
        } as ModerationPayload;
        const error = 'COMMUNITY_MODERATION_WORKER_CRASHED_AFTER_MAX_ATTEMPTS';
        let reviewId = payload.reviewId;
        try {
          const adapter = getCommunityModerationAdapter(payload.objectType);
          const loaded = await adapter.load(tx, payload);
          const sanitized = sanitizeCommunityModerationInput(loaded.rawContent);
          const fingerprint = getCommunityModerationFingerprint(
            sanitized.normalized,
            COMMUNITY_MODERATION_RULE_VERSION
          );
          reviewId ||= getUuid();
          payload.reviewId = reviewId;
          await tx
            .insert(communityModerationReview)
            .values({
              id: reviewId,
              objectType: payload.objectType,
              objectId: payload.objectId,
              objectVersion: payload.objectVersion,
              userId: loaded.userId,
              rawContent: loaded.rawContent,
              normalizedContent: sanitized.normalized,
              deterministicFindings: [],
              contentFingerprint: fingerprint,
              promptVersion: COMMUNITY_MODERATION_PROMPT_VERSION,
              ...getCommunityModerationReviewVersionFields({
                ruleVersion: COMMUNITY_MODERATION_RULE_VERSION,
              }),
              status: 'pending_admin',
              error,
              retryCount: job.attemptCount,
              failedAt: now,
              startedAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: communityModerationReview.id,
              set: {
                status: 'pending_admin',
                error,
                retryCount: job.attemptCount,
                failedAt: now,
                updatedAt: now,
              },
            });
          await adapter.apply(tx, payload, reviewId, 'pending_admin');
        } catch {
          reviewId = undefined;
        }
        await tx
          .update(communityJob)
          .set({
            status: 'failed',
            payload,
            lockedBy: null,
            lockedAt: null,
            leaseExpiresAt: null,
            claimToken: null,
            lastError: error,
            updatedAt: now,
          })
          .where(eq(communityJob.id, job.id));
        await tx.insert(communityAuditLog).values({
          id: getUuid(),
          actorType: 'system',
          action: 'moderation.pending_admin',
          objectType: payload.objectType,
          objectId: payload.objectId,
          metadata: {
            jobId: job.id,
            attemptCount: job.attemptCount,
            error,
            reviewId,
          },
          requestId: job.id,
        });
        continue;
      }
      if (recoveryAction === 'ignore') continue;
      const claimToken = getUuid();
      const [claimed] = await tx
        .update(communityJob)
        .set({
          status: 'processing',
          attemptCount: job.attemptCount + 1,
          lockedBy: workerId,
          lockedAt: now,
          leaseExpiresAt: new Date(now.getTime() + leaseSeconds * 1000),
          claimToken,
          updatedAt: now,
        })
        .where(eq(communityJob.id, job.id))
        .returning();
      return claimed || null;
    }
  });
}

export async function processCommunityModerationJobBatch({
  workerPrefix,
  maxJobs = 5,
}: {
  workerPrefix: string;
  maxJobs?: number;
}) {
  const results = [];
  for (let index = 0; index < maxJobs; index += 1) {
    const job = await claimCommunityModerationJob({
      workerId: `${workerPrefix}-${Date.now()}-${index}`,
    });
    if (!job) break;
    try {
      results.push({
        jobId: job.id,
        result: await processCommunityModerationJob({ job }),
      });
    } catch (error) {
      results.push({
        jobId: job.id,
        error: error instanceof Error ? error.message : 'MODERATION_FAILED',
      });
    }
  }
  return results;
}

export async function processCommunityModerationJob({
  job,
  moderator,
}: {
  job: typeof communityJob.$inferSelect;
  moderator?: CommunityModerator;
}) {
  if (!job.claimToken) throw new Error('COMMUNITY_JOB_CLAIM_REQUIRED');
  const rawPayload = job.payload as Partial<ModerationPayload> & {
    articleId?: string;
    revisionId?: string;
  };
  const payload: ModerationPayload = {
    objectType: rawPayload.objectType || 'article',
    objectId: rawPayload.objectId || rawPayload.articleId || '',
    objectVersion: rawPayload.objectVersion || rawPayload.revisionId || '',
    fingerprint: rawPayload.fingerprint,
    articleId: rawPayload.articleId,
    revisionId: rawPayload.revisionId,
    reviewId: rawPayload.reviewId,
    purpose: rawPayload.purpose,
  };
  if (!payload.objectId || !payload.objectVersion)
    throw new Error('MODERATION_JOB_PAYLOAD_INVALID');
  const adapter = getCommunityModerationAdapter(payload.objectType);
  try {
    const configs = await getAllConfigs();
    const ruleVersion =
      configs.community_moderation_rule_version?.trim() ||
      COMMUNITY_MODERATION_RULE_VERSION;
    const promptVersion =
      configs.community_moderation_prompt_version?.trim() ||
      COMMUNITY_MODERATION_PROMPT_VERSION;
    const loaded = await adapter.load(db(), payload);
    const { mediumThreshold, blockThreshold } =
      getCommunityModerationThresholds({
        locales: inferCommunityModerationLocales(loaded.rawContent),
        configs,
      });
    if (
      payload.fingerprint &&
      loaded.currentFingerprint !== payload.fingerprint
    )
      throw new Error('MODERATION_CONTENT_CHANGED');
    const sanitized = sanitizeCommunityModerationInput(loaded.rawContent);
    const deterministic = evaluateCommunityDeterministicRules(sanitized);
    const fingerprint = getCommunityModerationFingerprint(
      sanitized.normalized,
      ruleVersion
    );
    const reviewId = payload.reviewId || getUuid();
    payload.reviewId = reviewId;
    const [recentCount, duplicateCount, account] = await Promise.all([
      loaded.userId
        ? db()
            .select({ value: count() })
            .from(communityModerationReview)
            .where(
              and(
                eq(communityModerationReview.userId, loaded.userId),
                gte(
                  communityModerationReview.createdAt,
                  new Date(Date.now() - 3_600_000)
                )
              )
            )
        : Promise.resolve([{ value: 0 }]),
      db()
        .select({ value: count() })
        .from(communityModerationReview)
        .where(
          and(
            eq(communityModerationReview.userId, loaded.userId || ''),
            eq(communityModerationReview.contentFingerprint, fingerprint)
          )
        ),
      loaded.userId
        ? db()
            .select({ createdAt: user.createdAt })
            .from(user)
            .where(eq(user.id, loaded.userId))
            .limit(1)
        : Promise.resolve([]),
    ]);
    if (Number(recentCount[0]?.value || 0) >= 10)
      deterministic.findings.push('publishing_rate_limit');
    if (Number(duplicateCount[0]?.value || 0) > 0)
      deterministic.findings.push('duplicate_content');
    if (
      account[0]?.createdAt &&
      account[0].createdAt > new Date(Date.now() - 86_400_000)
    )
      deterministic.findings.push('new_account_risk');
    deterministic.requiresHumanReview = deterministic.findings.length > 0;
    const classified = await (
      moderator || (await getCommunityModerator())
    ).moderate({
      objectType: payload.objectType,
      normalized: sanitized.normalized,
      deterministicFindings: deterministic.findings,
    });
    const policyDecision = decideCommunityModerationPolicy({
      result: classified,
      deterministic,
      mediumThreshold,
      blockThreshold,
    });
    return db().transaction(async (tx: any) => {
      const now = new Date();
      await lockCommunityModerationObject(tx, payload);
      const [completed] = await tx
        .update(communityJob)
        .set({
          status: 'completed',
          payload,
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
      if (!completed) throw new Error('COMMUNITY_JOB_LEASE_LOST');
      const current = await adapter.load(tx, payload);
      if (
        payload.fingerprint &&
        current.currentFingerprint !== payload.fingerprint
      )
        throw new Error('MODERATION_CONTENT_CHANGED');
      await tx
        .insert(communityModerationReview)
        .values({
          id: reviewId,
          objectType: payload.objectType,
          objectId: payload.objectId,
          objectVersion: payload.objectVersion,
          userId: loaded.userId,
          rawContent: loaded.rawContent,
          normalizedContent: sanitized.normalized,
          deterministicFindings: deterministic.findings,
          contentFingerprint: fingerprint,
          decision: classified.decision,
          riskLevel: classified.riskLevel,
          categories: classified.categories,
          confidence: String(classified.confidence),
          evidence: classified.evidence,
          reason: classified.reason,
          requiresHumanReview: classified.requiresHumanReview,
          modelId: classified.modelId,
          providerId: classified.providerId,
          actualModelId: classified.actualModelId,
          usage: classified.usage,
          internalCostUsd: String(classified.internalCostUsd),
          promptVersion: classified.promptVersion,
          ...getCommunityModerationReviewVersionFields({ ruleVersion }),
          status:
            policyDecision === 'pending_admin' ? 'pending_admin' : 'completed',
          policyDecision,
          completedAt: now,
          error: null,
          startedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: communityModerationReview.id,
          set: {
            decision: classified.decision,
            riskLevel: classified.riskLevel,
            categories: classified.categories,
            confidence: String(classified.confidence),
            evidence: classified.evidence,
            deterministicFindings: deterministic.findings,
            reason: classified.reason,
            requiresHumanReview: classified.requiresHumanReview,
            modelId: classified.modelId,
            providerId: classified.providerId,
            actualModelId: classified.actualModelId,
            usage: classified.usage,
            internalCostUsd: String(classified.internalCostUsd),
            promptVersion: classified.promptVersion,
            ruleVersion,
            status:
              policyDecision === 'pending_admin'
                ? 'pending_admin'
                : 'completed',
            policyDecision,
            completedAt: now,
            error: null,
            updatedAt: now,
          },
        });
      if (payload.objectType === 'article')
        await tx
          .update(communityArticleRevision)
          .set({ contentFingerprint: fingerprint })
          .where(eq(communityArticleRevision.id, payload.objectVersion));
      await adapter.apply(tx, payload, reviewId, policyDecision);
      await tx.insert(communityAuditLog).values({
        id: getUuid(),
        actorType: 'system',
        action: 'moderation.completed',
        objectType: payload.objectType,
        objectId: payload.objectId,
        afterState: {
          reviewId,
          policyDecision,
          riskLevel: classified.riskLevel,
        },
        metadata: {
          jobId: job.id,
          ruleVersion,
          deterministicFindings: deterministic.findings,
          promptVersion,
          usage: classified.usage,
          internalCostUsd: classified.internalCostUsd,
        },
        requestId: job.id,
      });
      return { reviewId, policyDecision };
    });
  } catch (error) {
    await failCommunityModerationJob({
      job: { ...job, payload },
      error: error instanceof Error ? error.message : 'MODERATION_FAILED',
    });
    throw error;
  }
}

export async function failCommunityModerationJob({
  job,
  error,
}: {
  job: typeof communityJob.$inferSelect;
  error: string;
}) {
  const rawPayload = job.payload as Partial<ModerationPayload> & {
    articleId?: string;
    revisionId?: string;
  };
  const payload = {
    ...rawPayload,
    objectType: rawPayload.objectType || 'article',
    objectId: rawPayload.objectId || rawPayload.articleId || '',
    objectVersion: rawPayload.objectVersion || rawPayload.revisionId || '',
  } as ModerationPayload;
  return db().transaction(async (tx: any) => {
    const now = new Date();
    const terminal = job.attemptCount >= job.maxAttempts;
    const [claimedFailure] = await tx
      .update(communityJob)
      .set({
        status: terminal ? 'failed' : 'pending',
        runAfter: new Date(
          now.getTime() + Math.min(3600, 2 ** job.attemptCount) * 1000
        ),
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
    if (payload.reviewId)
      await tx
        .update(communityModerationReview)
        .set({
          status: terminal ? 'pending_admin' : 'failed',
          error: error.slice(0, 2000),
          failedAt: now,
          retryCount: job.attemptCount,
          updatedAt: now,
        })
        .where(eq(communityModerationReview.id, payload.reviewId));
    await tx.insert(communityAuditLog).values({
      id: getUuid(),
      actorType: 'system',
      action: terminal
        ? 'moderation.pending_admin'
        : 'moderation.retry_scheduled',
      objectType: payload.objectType,
      objectId: payload.objectId,
      metadata: { jobId: job.id, attemptCount: job.attemptCount, error },
      requestId: job.id,
    });
    return { applied: true, terminal };
  });
}

export async function createCommunityModerationAppeal({
  reviewId,
  userId,
  statement,
}: {
  reviewId: string;
  userId: string;
  statement: string;
}) {
  if (!statement.trim())
    throw new Error('MODERATION_APPEAL_STATEMENT_REQUIRED');
  return db().transaction(async (tx: any) => {
    const [review] = await tx
      .select()
      .from(communityModerationReview)
      .where(eq(communityModerationReview.id, reviewId))
      .limit(1);
    if (!review || review.userId !== userId)
      throw new Error('MODERATION_REVIEW_NOT_FOUND');
    if (review.policyDecision !== 'blocked')
      throw new Error('MODERATION_APPEAL_NOT_ALLOWED');
    const [appeal] = await tx
      .insert(communityModerationAppeal)
      .values({ id: getUuid(), reviewId, userId, statement: statement.trim() })
      .returning();
    await tx.insert(communityAuditLog).values({
      id: getUuid(),
      actorId: userId,
      actorType: 'user',
      action: 'moderation.appealed',
      objectType: review.objectType,
      objectId: review.objectId,
      metadata: { reviewId, appealId: appeal.id },
    });
    return appeal;
  });
}

export async function reviewCommunityModerationAppeal({
  appealId,
  adminId,
  action,
  note,
}: {
  appealId: string;
  adminId: string;
  action: 'confirmed_violation' | 'false_positive_recheck';
  note: string;
}) {
  if (!note.trim()) throw new Error('MODERATION_REVIEW_NOTE_REQUIRED');
  return db().transaction(async (tx: any) => {
    const [row] = await tx
      .select({
        appeal: communityModerationAppeal,
        review: communityModerationReview,
      })
      .from(communityModerationAppeal)
      .innerJoin(
        communityModerationReview,
        eq(communityModerationAppeal.reviewId, communityModerationReview.id)
      )
      .where(eq(communityModerationAppeal.id, appealId))
      .limit(1);
    if (!row || row.appeal.status !== 'pending')
      throw new Error('MODERATION_APPEAL_NOT_PENDING');
    const now = new Date();
    await tx
      .update(communityModerationAppeal)
      .set({
        status: action,
        reviewedBy: adminId,
        reviewedAt: now,
        resultNote: note.trim(),
      })
      .where(eq(communityModerationAppeal.id, appealId));
    await tx
      .update(communityModerationReview)
      .set({
        reviewedBy: adminId,
        reviewedAt: now,
        reviewNote: note.trim(),
        ...(action === 'false_positive_recheck'
          ? { status: 'pending', policyDecision: null, error: null }
          : {}),
      })
      .where(eq(communityModerationReview.id, row.review.id));
    if (action === 'false_positive_recheck') {
      const payload: ModerationPayload = {
        objectType: row.review.objectType as ModerationPayload['objectType'],
        objectId: row.review.objectId,
        objectVersion: row.review.objectVersion,
        reviewId: row.review.id,
      };
      await lockCommunityModerationObject(tx, payload);
      const current = await getCommunityModerationAdapter(
        payload.objectType
      ).load(tx, payload);
      const currentFingerprint = getCommunityModerationFingerprint(
        sanitizeCommunityModerationInput(current.rawContent).normalized,
        row.review.ruleVersion
      );
      if (currentFingerprint !== row.review.contentFingerprint)
        throw new Error('MODERATION_CONTENT_CHANGED');
      payload.fingerprint = current.currentFingerprint || undefined;
      await tx.insert(communityJob).values({
        id: getUuid(),
        type: 'moderate_content',
        businessKey: `appeal:${appealId}`,
        payload,
        status: 'pending',
        runAfter: now,
        createdAt: now,
        updatedAt: now,
      });
    }
    await tx.insert(communityAuditLog).values({
      id: getUuid(),
      actorId: adminId,
      actorType: 'admin',
      action: `moderation.appeal_${action}`,
      objectType: row.review.objectType,
      objectId: row.review.objectId,
      metadata: { reviewId: row.review.id, appealId, note: note.trim() },
    });
    return { appealId, action };
  });
}

export async function listCommunityModerationQueue() {
  const reviews = await db()
    .select()
    .from(communityModerationReview)
    .where(eq(communityModerationReview.status, 'pending_admin'))
    .orderBy(asc(communityModerationReview.createdAt));
  const appeals = await db()
    .select({
      appeal: communityModerationAppeal,
      review: communityModerationReview,
    })
    .from(communityModerationAppeal)
    .innerJoin(
      communityModerationReview,
      eq(communityModerationAppeal.reviewId, communityModerationReview.id)
    )
    .where(eq(communityModerationAppeal.status, 'pending'))
    .orderBy(asc(communityModerationAppeal.createdAt));
  return { reviews, appeals };
}

export async function getCommunityModerationReview(reviewId: string) {
  const [review] = await db()
    .select()
    .from(communityModerationReview)
    .where(eq(communityModerationReview.id, reviewId))
    .limit(1);
  if (!review) return null;
  const [appeal] = await db()
    .select()
    .from(communityModerationAppeal)
    .where(eq(communityModerationAppeal.reviewId, reviewId))
    .limit(1);
  return { review, appeal: appeal || null };
}

export async function getOwnCommunityModerationReview({
  reviewId,
  userId,
}: {
  reviewId: string;
  userId: string;
}) {
  const row = await getCommunityModerationReview(reviewId);
  if (!row || row.review.userId !== userId) return null;
  if (row.review.objectType === 'article') {
    const [article] = await db()
      .select({ authorId: communityBlogArticle.authorId })
      .from(communityBlogArticle)
      .where(eq(communityBlogArticle.id, row.review.objectId))
      .limit(1);
    if (!article || article.authorId !== userId) return null;
  }
  return {
    review: {
      id: row.review.id,
      status: row.review.status,
      policyDecision: row.review.policyDecision,
      reason: row.review.reason,
      reviewedAt: row.review.reviewedAt,
      reviewNote: row.review.reviewNote,
    },
    appeal: row.appeal
      ? {
          id: row.appeal.id,
          status: row.appeal.status,
          statement: row.appeal.statement,
          resultNote: row.appeal.resultNote,
        }
      : null,
  };
}

export async function manuallyReviewCommunityModeration({
  reviewId,
  adminId,
  action,
  note,
}: {
  reviewId: string;
  adminId: string;
  action: 'allow' | 'blocked' | 'recheck';
  note: string;
}) {
  if (!note.trim()) throw new Error('MODERATION_REVIEW_NOTE_REQUIRED');
  return db().transaction(async (tx: any) => {
    const [review] = await tx
      .select()
      .from(communityModerationReview)
      .where(eq(communityModerationReview.id, reviewId))
      .limit(1)
      .for('update');
    if (!review) throw new Error('MODERATION_REVIEW_NOT_REVIEWABLE');
    const payload: ModerationPayload = {
      objectType: review.objectType as ModerationPayload['objectType'],
      objectId: review.objectId,
      objectVersion: review.objectVersion,
      reviewId,
    };
    await lockCommunityModerationObject(tx, payload);
    const current = await getCommunityModerationAdapter(
      payload.objectType
    ).load(tx, payload);
    const currentFingerprint = getCommunityModerationFingerprint(
      sanitizeCommunityModerationInput(current.rawContent).normalized,
      review.ruleVersion
    );
    if (currentFingerprint !== review.contentFingerprint)
      throw new Error('MODERATION_CONTENT_CHANGED');
    payload.fingerprint = current.currentFingerprint || undefined;
    const configs = await getAllConfigs();
    const configuredBlockThresholds = [
      Number(configs.community_moderation_zh_block_threshold || '0.85'),
      Number(configs.community_moderation_en_block_threshold || '0.85'),
    ].filter(Number.isFinite);
    const blockThreshold = Math.min(...configuredBlockThresholds, 0.85);
    const hasNonOverridableRisk = hasCommunityNonOverridableRisk({
      categories: review.categories,
      confidence: Number(review.confidence || 0),
      deterministicFindings: review.deterministicFindings,
      blockThreshold,
    });
    assertCommunityManualModerationAction({
      status: review.status,
      action,
      hasNonOverridableRisk,
    });
    if (action === 'recheck') {
      await tx
        .update(communityModerationReview)
        .set({
          status: 'pending',
          policyDecision: null,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNote: note.trim(),
          error: null,
          updatedAt: new Date(),
        })
        .where(eq(communityModerationReview.id, reviewId));
      await tx.insert(communityJob).values({
        id: getUuid(),
        type: 'moderate_content',
        businessKey: `manual-recheck:${reviewId}:${getUuid()}`,
        payload,
        status: 'pending',
      });
    } else {
      const policyDecision = action === 'allow' ? 'allow' : 'blocked';
      await tx
        .update(communityModerationReview)
        .set({
          status: 'completed',
          policyDecision,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNote: note.trim(),
          updatedAt: new Date(),
        })
        .where(eq(communityModerationReview.id, reviewId));
      await getCommunityModerationAdapter(payload.objectType).apply(
        tx,
        payload,
        reviewId,
        policyDecision
      );
    }
    await tx.insert(communityAuditLog).values({
      id: getUuid(),
      actorId: adminId,
      actorType: 'admin',
      action: `moderation.manual_${action}`,
      objectType: review.objectType,
      objectId: review.objectId,
      beforeState: review,
      afterState: {
        action,
        status: action === 'recheck' ? 'pending' : 'completed',
        policyDecision:
          action === 'recheck'
            ? null
            : action === 'allow'
              ? 'allow'
              : 'blocked',
      },
      metadata: { reviewId, note: note.trim() },
    });
    return { reviewId, action };
  });
}
