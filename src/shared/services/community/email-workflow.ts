import 'server-only';

import { and, asc, desc, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import {
  communityBlogArticle,
  communityComment,
  communityEmailDelivery,
  communityEmailPreference,
  communityJob,
  user,
} from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';
import { getAllConfigs } from '@/shared/models/config';
import { getEmailService } from '@/shared/services/email';

import {
  buildCommunityEmailUrl,
  createCommunityUnsubscribeToken,
  getCommunityEmailIdempotencyKey,
  getCommunityEmailJobRecoveryAction,
  getPendingCommentReminderEventId,
  isCommunityEmailEnabled,
  normalizeCommunityEmailLocale,
} from './email-policy';
import {
  COMMUNITY_EMAIL_TEMPLATE_VERSION,
  CommunityEmailLocale,
  CommunityEmailType,
  renderCommunityEmailTemplate,
} from './email-templates';
import { PENDING_COMMENT_REMINDER_MS } from './interaction-policy';

type EmailJobPayload = {
  deliveryId: string;
  emailType: CommunityEmailType;
  userId: string;
  businessEventId: string;
  articleId?: string;
  articleSlug?: string;
  articleTitle?: string;
  reviewOutcome?: 'changes_requested' | 'rejected';
  reason?: string;
  publishedAt?: string;
  pendingCount?: number;
  commentIds?: string[];
};

export async function getCommunityEmailPreferences(userId: string) {
  const [preferences] = await db()
    .select()
    .from(communityEmailPreference)
    .where(eq(communityEmailPreference.userId, userId))
    .limit(1);
  return (
    preferences || {
      userId,
      pendingCommentReminder: true,
      articleReviewResult: true,
      productMarketing: true,
      marketingUnsubscribedAt: null,
      updatedAt: new Date(),
    }
  );
}

export async function updateCommunityEmailPreferences({
  userId,
  pendingCommentReminder,
  articleReviewResult,
  productMarketing,
}: {
  userId: string;
  pendingCommentReminder: boolean;
  articleReviewResult: boolean;
  productMarketing: boolean;
}) {
  const now = new Date();
  const [preferences] = await db()
    .insert(communityEmailPreference)
    .values({
      userId,
      pendingCommentReminder,
      articleReviewResult,
      productMarketing,
      marketingUnsubscribedAt: productMarketing ? null : now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: communityEmailPreference.userId,
      set: {
        pendingCommentReminder,
        articleReviewResult,
        productMarketing,
        marketingUnsubscribedAt: productMarketing ? null : now,
        updatedAt: now,
      },
    })
    .returning();
  return preferences;
}

export async function unsubscribeCommunityEmailPreference({
  userId,
  preference,
}: {
  userId: string;
  preference:
    | 'pendingCommentReminder'
    | 'articleReviewResult'
    | 'productMarketing';
}) {
  const current = await getCommunityEmailPreferences(userId);
  return updateCommunityEmailPreferences({
    userId,
    pendingCommentReminder:
      preference === 'pendingCommentReminder'
        ? false
        : current.pendingCommentReminder,
    articleReviewResult:
      preference === 'articleReviewResult'
        ? false
        : current.articleReviewResult,
    productMarketing:
      preference === 'productMarketing' ? false : current.productMarketing,
  });
}

export async function enqueueCommunityEmailJob(
  tx: any,
  input: Omit<EmailJobPayload, 'deliveryId'> & {
    locale: CommunityEmailLocale;
    scheduledAt?: Date;
  }
) {
  const idempotencyKey = getCommunityEmailIdempotencyKey(
    input.emailType,
    input.businessEventId,
    input.userId
  );
  const deliveryId = getUuid();
  const scheduledAt = input.scheduledAt || new Date();
  const [delivery] = await tx
    .insert(communityEmailDelivery)
    .values({
      id: deliveryId,
      userId: input.userId,
      emailType: input.emailType,
      businessEventId: input.businessEventId,
      idempotencyKey,
      locale: input.locale,
      templateVersion: COMMUNITY_EMAIL_TEMPLATE_VERSION,
      scheduledAt,
    })
    .onConflictDoNothing()
    .returning({ id: communityEmailDelivery.id });
  if (!delivery) return { created: false, idempotencyKey };
  const payload: EmailJobPayload = { ...input, deliveryId };
  await tx.insert(communityJob).values({
    id: getUuid(),
    type: 'send_email',
    businessKey: idempotencyKey,
    payload,
    runAfter: scheduledAt,
  });
  return { created: true, deliveryId, idempotencyKey };
}

async function recordSkippedCommunityEmailDelivery(
  tx: any,
  input: {
    emailType: CommunityEmailType;
    userId: string;
    businessEventId: string;
    locale: CommunityEmailLocale;
    scheduledAt: Date;
  }
) {
  const idempotencyKey = getCommunityEmailIdempotencyKey(
    input.emailType,
    input.businessEventId,
    input.userId
  );
  await tx
    .insert(communityEmailDelivery)
    .values({
      id: getUuid(),
      userId: input.userId,
      emailType: input.emailType,
      businessEventId: input.businessEventId,
      idempotencyKey,
      locale: input.locale,
      templateVersion: COMMUNITY_EMAIL_TEMPLATE_VERSION,
      status: 'skipped',
      scheduledAt: input.scheduledAt,
      updatedAt: input.scheduledAt,
    })
    .onConflictDoNothing();
  return idempotencyKey;
}

export async function scanPendingCommentReminderJobs(now = new Date()) {
  const cutoff = new Date(now.getTime() - PENDING_COMMENT_REMINDER_MS);
  return db().transaction(async (tx: any) => {
    const rows = await tx
      .select({
        authorId: communityBlogArticle.authorId,
        commentId: communityComment.id,
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
          lte(communityComment.createdAt, cutoff)
        )
      )
      .orderBy(
        asc(communityBlogArticle.authorId),
        asc(communityComment.createdAt)
      )
      .limit(1000)
      .for('update', { skipLocked: true });
    const grouped = new Map<string, string[]>();
    for (const row of rows)
      grouped.set(row.authorId, [
        ...(grouped.get(row.authorId) || []),
        row.commentId,
      ]);
    let queued = 0;
    let skipped = 0;
    for (const [authorId, commentIds] of grouped) {
      const [[recipient], [preferences]] = await Promise.all([
        tx
          .select({ locale: user.locale, emailVerified: user.emailVerified })
          .from(user)
          .where(eq(user.id, authorId))
          .limit(1),
        tx
          .select()
          .from(communityEmailPreference)
          .where(eq(communityEmailPreference.userId, authorId))
          .limit(1),
      ]);
      const enabled = preferences?.pendingCommentReminder ?? true;
      const businessEventId = getPendingCommentReminderEventId(authorId, now);
      if (!recipient?.emailVerified || !enabled) {
        const idempotencyKey = await recordSkippedCommunityEmailDelivery(tx, {
          emailType: 'pending_comment_reminder',
          userId: authorId,
          businessEventId,
          locale: normalizeCommunityEmailLocale(recipient?.locale),
          scheduledAt: now,
        });
        await tx
          .update(communityComment)
          .set({ reminderBatchKey: idempotencyKey, updatedAt: now })
          .where(
            and(
              inArray(communityComment.id, commentIds),
              eq(communityComment.status, 'pending_author'),
              isNull(communityComment.reminderBatchKey)
            )
          );
        skipped += 1;
        continue;
      }
      const result = await enqueueCommunityEmailJob(tx, {
        emailType: 'pending_comment_reminder',
        userId: authorId,
        businessEventId,
        locale: normalizeCommunityEmailLocale(recipient?.locale),
        pendingCount: commentIds.length,
        commentIds,
        scheduledAt: now,
      });
      if (!result.created) {
        skipped += 1;
        continue;
      }
      await tx
        .update(communityComment)
        .set({ reminderBatchKey: result.idempotencyKey, updatedAt: now })
        .where(
          and(
            inArray(communityComment.id, commentIds),
            eq(communityComment.status, 'pending_author'),
            isNull(communityComment.reminderBatchKey)
          )
        );
      queued += 1;
    }
    return {
      scanned: rows.length,
      candidateAuthors: grouped.size,
      queued,
      skipped,
    };
  });
}

export async function claimCommunityEmailJob({
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
            eq(communityJob.type, 'send_email'),
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
      const recoveryAction = getCommunityEmailJobRecoveryAction(job, now);
      if (recoveryAction === 'fail') {
        const payload = job.payload as EmailJobPayload;
        const error =
          job.status === 'processing'
            ? 'COMMUNITY_EMAIL_WORKER_CRASHED_AFTER_MAX_ATTEMPTS'
            : 'COMMUNITY_EMAIL_MAX_ATTEMPTS_EXHAUSTED';
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
          .update(communityEmailDelivery)
          .set({
            status: 'failed',
            attemptCount: job.attemptCount,
            error,
            failedAt: now,
            updatedAt: now,
          })
          .where(eq(communityEmailDelivery.id, payload.deliveryId));
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
      if (claimed) {
        const payload = claimed.payload as EmailJobPayload;
        await tx
          .update(communityEmailDelivery)
          .set({
            status: 'processing',
            attemptCount: claimed.attemptCount,
            updatedAt: now,
          })
          .where(eq(communityEmailDelivery.id, payload.deliveryId));
      }
      return claimed || null;
    }
  });
}

export async function processCommunityEmailJobBatch({
  workerPrefix,
  maxJobs = 20,
}: {
  workerPrefix: string;
  maxJobs?: number;
}) {
  const results = [];
  for (let index = 0; index < maxJobs; index += 1) {
    const job = await claimCommunityEmailJob({
      workerId: `${workerPrefix}-${Date.now()}-${index}`,
    });
    if (!job) break;
    try {
      results.push({
        jobId: job.id,
        result: await processCommunityEmailJob({ job }),
      });
    } catch (error) {
      results.push({
        jobId: job.id,
        error: error instanceof Error ? error.message : 'EMAIL_SEND_FAILED',
      });
    }
  }
  return results;
}

export async function processNextCommunityEmailJob(workerId: string) {
  const job = await claimCommunityEmailJob({ workerId });
  if (!job) return { processed: false as const };
  return {
    processed: true as const,
    jobId: job.id,
    result: await processCommunityEmailJob({ job }),
  };
}

export async function processCommunityEmailJob({
  job,
}: {
  job: typeof communityJob.$inferSelect;
}) {
  if (!job.claimToken) throw new Error('COMMUNITY_JOB_CLAIM_REQUIRED');
  const payload = job.payload as EmailJobPayload;
  try {
    const [[delivery], [recipient], [preferences], configs] = await Promise.all(
      [
        db()
          .select()
          .from(communityEmailDelivery)
          .where(eq(communityEmailDelivery.id, payload.deliveryId))
          .limit(1),
        db()
          .select({
            email: user.email,
            emailVerified: user.emailVerified,
            name: user.name,
            locale: user.locale,
          })
          .from(user)
          .where(eq(user.id, payload.userId))
          .limit(1),
        db()
          .select()
          .from(communityEmailPreference)
          .where(eq(communityEmailPreference.userId, payload.userId))
          .limit(1),
        getAllConfigs(),
      ]
    );
    if (!delivery) throw new Error('COMMUNITY_EMAIL_DELIVERY_NOT_FOUND');
    if (delivery.status === 'sent')
      return completeCommunityEmailJob({
        job,
        deliveryId: payload.deliveryId,
        providerMessageId: delivery.providerMessageId || undefined,
      });
    const effectivePreferences = preferences || {
      pendingCommentReminder: true,
      articleReviewResult: true,
      productMarketing: true,
    };
    if (
      !recipient?.emailVerified ||
      !isCommunityEmailEnabled(effectivePreferences, payload.emailType)
    )
      return completeCommunityEmailJob({
        job,
        deliveryId: payload.deliveryId,
        skipped: true,
      });
    const locale = normalizeCommunityEmailLocale(
      delivery.locale || recipient.locale
    );
    const appUrl = envConfigs.app_url;
    const preferencesUrl = buildCommunityEmailUrl(
      appUrl,
      locale,
      '/settings/community/email'
    );
    const ctaUrl =
      payload.emailType === 'pending_comment_reminder'
        ? buildCommunityEmailUrl(appUrl, locale, '/settings/community/comments')
        : payload.emailType === 'article_approved'
          ? buildCommunityEmailUrl(
              appUrl,
              locale,
              `/blog/${payload.articleSlug}`
            )
          : buildCommunityEmailUrl(
              appUrl,
              locale,
              `/settings/community/articles?articleId=${encodeURIComponent(payload.articleId || '')}`
            );
    const template = renderCommunityEmailTemplate(payload.emailType, {
      locale,
      appName: envConfigs.app_name,
      recipientName: recipient.name,
      ctaUrl,
      preferencesUrl,
      articleTitle: payload.articleTitle,
      publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : null,
      reason: payload.reason,
      reviewOutcome: payload.reviewOutcome,
      pendingCount: payload.pendingCount,
    });
    const unsubscribeToken = createCommunityUnsubscribeToken({
      userId: payload.userId,
      preference:
        payload.emailType === 'pending_comment_reminder'
          ? 'pendingCommentReminder'
          : 'articleReviewResult',
      secret: envConfigs.auth_secret,
    });
    const unsubscribeUrl = `${appUrl.replace(/\/$/, '')}/api/community/email/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
    const emailService = await getEmailService(configs);
    const result = await emailService.sendEmail({
      to: recipient.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: [payload.emailType],
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Entity-Ref-ID': delivery.idempotencyKey,
      },
      idempotencyKey: delivery.idempotencyKey,
    });
    if (!result.success) throw new Error(result.error || 'EMAIL_SEND_FAILED');
    return completeCommunityEmailJob({
      job,
      deliveryId: payload.deliveryId,
      providerMessageId: result.messageId,
    });
  } catch (error) {
    await failCommunityEmailJob({
      job,
      deliveryId: payload.deliveryId,
      error: error instanceof Error ? error.message : 'EMAIL_SEND_FAILED',
    });
    throw error;
  }
}

async function completeCommunityEmailJob({
  job,
  deliveryId,
  providerMessageId,
  skipped = false,
}: {
  job: typeof communityJob.$inferSelect;
  deliveryId: string;
  providerMessageId?: string;
  skipped?: boolean;
}) {
  return db().transaction(async (tx: any) => {
    const now = new Date();
    const [completed] = await tx
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
          eq(communityJob.claimToken, job.claimToken || ''),
          gte(communityJob.leaseExpiresAt, now)
        )
      )
      .returning({ id: communityJob.id });
    if (!completed) throw new Error('COMMUNITY_JOB_LEASE_LOST');
    await tx
      .update(communityEmailDelivery)
      .set({
        status: skipped ? 'skipped' : 'sent',
        providerMessageId: providerMessageId || null,
        error: null,
        sentAt: skipped ? null : now,
        failedAt: null,
        updatedAt: now,
      })
      .where(eq(communityEmailDelivery.id, deliveryId));
    return { sent: !skipped, skipped, providerMessageId };
  });
}

export async function failCommunityEmailJob({
  job,
  deliveryId,
  error,
}: {
  job: typeof communityJob.$inferSelect;
  deliveryId: string;
  error: string;
}) {
  return db().transaction(async (tx: any) => {
    const now = new Date();
    const terminal = job.attemptCount >= job.maxAttempts;
    const [updated] = await tx
      .update(communityJob)
      .set({
        status: terminal ? 'failed' : 'pending',
        runAfter: new Date(
          now.getTime() +
            Math.min(3600, 2 ** Math.max(0, job.attemptCount)) * 1000
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
    if (!updated) return { applied: false };
    await tx
      .update(communityEmailDelivery)
      .set({
        status: terminal ? 'failed' : 'pending',
        attemptCount: job.attemptCount,
        error: error.slice(0, 2000),
        failedAt: terminal ? now : null,
        updatedAt: now,
      })
      .where(eq(communityEmailDelivery.id, deliveryId));
    return { applied: true, terminal };
  });
}

export async function retryCommunityEmailDelivery(deliveryId: string) {
  return db().transaction(async (tx: any) => {
    const [delivery] = await tx
      .select()
      .from(communityEmailDelivery)
      .where(eq(communityEmailDelivery.id, deliveryId))
      .limit(1)
      .for('update');
    if (!delivery || delivery.status !== 'failed')
      throw new Error('COMMUNITY_EMAIL_NOT_RETRYABLE');
    const [job] = await tx
      .select()
      .from(communityJob)
      .where(
        and(
          eq(communityJob.type, 'send_email'),
          eq(communityJob.businessKey, delivery.idempotencyKey)
        )
      )
      .limit(1)
      .for('update');
    if (!job) throw new Error('COMMUNITY_EMAIL_JOB_NOT_FOUND');
    const retryPayload = job.payload as EmailJobPayload;
    const retryBusinessKey = `${delivery.idempotencyKey}:retry:${getUuid()}`;
    await tx
      .update(communityJob)
      .set({
        businessKey: retryBusinessKey,
        updatedAt: new Date(),
      })
      .where(eq(communityJob.id, job.id));
    await tx.insert(communityJob).values({
      id: getUuid(),
      type: 'send_email',
      businessKey: delivery.idempotencyKey,
      payload: retryPayload,
      status: 'pending',
      attemptCount: 0,
      maxAttempts: job.maxAttempts,
      runAfter: new Date(),
    });
    await tx
      .update(communityEmailDelivery)
      .set({ status: 'pending', attemptCount: 0, error: null, failedAt: null })
      .where(eq(communityEmailDelivery.id, deliveryId));
    return { deliveryId, retried: true };
  });
}

export async function listAdminCommunityEmailDeliveries(limit = 200) {
  return db()
    .select({
      delivery: communityEmailDelivery,
      email: user.email,
      name: user.name,
      maxAttempts: communityJob.maxAttempts,
    })
    .from(communityEmailDelivery)
    .innerJoin(user, eq(communityEmailDelivery.userId, user.id))
    .leftJoin(
      communityJob,
      and(
        eq(communityJob.type, 'send_email'),
        eq(communityJob.businessKey, communityEmailDelivery.idempotencyKey)
      )
    )
    .orderBy(desc(communityEmailDelivery.createdAt))
    .limit(limit);
}
