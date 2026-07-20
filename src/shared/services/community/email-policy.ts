import { createHmac, timingSafeEqual } from 'node:crypto';

import { CommunityEmailLocale } from './email-templates';

export type CommunityEmailPreferences = {
  pendingCommentReminder: boolean;
  articleReviewResult: boolean;
  productMarketing: boolean;
};

export function getCommunityEmailJobRecoveryAction(
  job: {
    status: string;
    attemptCount: number;
    maxAttempts: number;
    leaseExpiresAt: Date | null;
  },
  now = new Date()
) {
  const claimable =
    job.status === 'pending' ||
    (job.status === 'processing' &&
      Boolean(job.leaseExpiresAt && job.leaseExpiresAt <= now));
  if (!claimable) return 'ignore' as const;
  return job.attemptCount >= job.maxAttempts
    ? ('fail' as const)
    : ('claim' as const);
}

export function normalizeCommunityEmailLocale(locale?: string | null) {
  return locale?.toLowerCase().startsWith('zh')
    ? ('zh' as const)
    : ('en' as const);
}

export function isCommunityEmailEnabled(
  preferences: CommunityEmailPreferences,
  emailType:
    | 'pending_comment_reminder'
    | 'article_approved'
    | 'article_changes_requested'
) {
  return emailType === 'pending_comment_reminder'
    ? preferences.pendingCommentReminder
    : preferences.articleReviewResult;
}

export function getPendingCommentReminderEventId(
  authorId: string,
  now = new Date()
) {
  return `pending-comments:${authorId}:${now.toISOString().slice(0, 10)}`;
}

export function getCommunityEmailIdempotencyKey(
  emailType: string,
  businessEventId: string,
  userId: string
) {
  return `${emailType}:${businessEventId}:${userId}`;
}

function unsubscribeSignature(input: string, secret: string) {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

export function createCommunityUnsubscribeToken({
  userId,
  preference,
  secret,
}: {
  userId: string;
  preference: keyof CommunityEmailPreferences;
  secret: string;
}) {
  if (!secret) throw new Error('COMMUNITY_EMAIL_UNSUBSCRIBE_SECRET_REQUIRED');
  const payload = Buffer.from(
    JSON.stringify({ userId, preference, version: 1 }),
    'utf8'
  ).toString('base64url');
  return `${payload}.${unsubscribeSignature(payload, secret)}`;
}

export function verifyCommunityUnsubscribeToken(
  token: string,
  secret: string
): { userId: string; preference: keyof CommunityEmailPreferences } | null {
  if (!secret) return null;
  const [payload, signature, ...rest] = token.split('.');
  if (!payload || !signature || rest.length) return null;
  const expected = unsubscribeSignature(payload, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  )
    return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    );
    if (
      typeof parsed.userId !== 'string' ||
      ![
        'pendingCommentReminder',
        'articleReviewResult',
        'productMarketing',
      ].includes(parsed.preference) ||
      parsed.version !== 1
    )
      return null;
    return { userId: parsed.userId, preference: parsed.preference };
  } catch {
    return null;
  }
}

export function buildCommunityEmailUrl(
  appUrl: string,
  locale: CommunityEmailLocale,
  path: string
) {
  const prefix = locale === 'zh' ? '/zh' : '';
  return `${appUrl.replace(/\/$/, '')}${prefix}${path.startsWith('/') ? path : `/${path}`}`;
}
