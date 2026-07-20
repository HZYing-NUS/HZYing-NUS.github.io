export const PENDING_COMMENT_REMINDER_MS = 24 * 60 * 60 * 1000;
export const PENDING_COMMENT_CLOSE_MS = 30 * 24 * 60 * 60 * 1000;
export const ARTICLE_RESTORE_MS = 30 * 24 * 60 * 60 * 1000;
export const COMMUNITY_COMMENT_MODERATION_WRITABLE_STATUSES = [
  'moderation_pending',
  'pending_admin',
  'blocked',
] as const;

export const COMMUNITY_REPORT_REASON_TYPES = [
  'spam_scam',
  'harassment_hate',
  'illegal_dangerous',
  'privacy_exposure',
  'sexual_content',
  'impersonation',
  'other',
] as const;

export type CommunityReportReasonType =
  (typeof COMMUNITY_REPORT_REASON_TYPES)[number];

export function isCommunityReportReasonType(
  value: unknown
): value is CommunityReportReasonType {
  return COMMUNITY_REPORT_REASON_TYPES.includes(
    value as CommunityReportReasonType
  );
}

export function getCommunityProfileReportDecision({
  action,
  currentlyHidden,
}: {
  action: 'resolve' | 'dismiss';
  currentlyHidden: boolean;
}) {
  if (action === 'resolve') return 'hidden';
  return currentlyHidden ? 'hidden' : 'public';
}

export function canUseCommunityInteraction(viewerId?: string | null) {
  return Boolean(viewerId);
}

export function canCreateCommunityComment({
  depth,
  allowComments,
  allowReplies,
}: {
  depth: number;
  allowComments: boolean;
  allowReplies: boolean;
}) {
  return depth === 0 ? allowComments : allowReplies;
}

export function canApplyCommunityCommentModeration(status: string) {
  return COMMUNITY_COMMENT_MODERATION_WRITABLE_STATUSES.includes(
    status as (typeof COMMUNITY_COMMENT_MODERATION_WRITABLE_STATUSES)[number]
  );
}

export function getReportedCommentResolutionStatus({
  action,
  hiddenAt,
  authorHandledAt,
}: {
  action: 'resolve' | 'dismiss';
  hiddenAt: Date | null;
  authorHandledAt: Date | null;
}) {
  if (action === 'resolve') return 'hidden';
  if (hiddenAt) return 'hidden';
  return authorHandledAt ? 'published' : 'pending_author';
}

export function canReadCommunityComment({
  status,
  viewerId,
  commenterId,
  authorId,
  isAdmin,
}: {
  status: string;
  viewerId?: string | null;
  commenterId: string;
  authorId: string;
  isAdmin: boolean;
}) {
  if (status === 'published') return true;
  return Boolean(
    isAdmin || (viewerId && (viewerId === commenterId || viewerId === authorId))
  );
}

export function shouldShowDeletedCommentPlaceholder(replyCount: number) {
  return replyCount > 0;
}

export function canRestoreCommunityArticle(
  restoreDeadlineAt: Date | null,
  now = new Date()
) {
  return Boolean(restoreDeadlineAt && restoreDeadlineAt > now);
}

export function isPendingCommentReminderCandidate(
  createdAt: Date,
  reminderBatchKey: string | null,
  now = new Date()
) {
  return (
    !reminderBatchKey &&
    createdAt <= new Date(now.getTime() - PENDING_COMMENT_REMINDER_MS)
  );
}
