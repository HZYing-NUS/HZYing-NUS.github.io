import 'server-only';

import { and, eq } from 'drizzle-orm';

import { communityModerationReview } from '@/config/db/schema';

import { isCommunityPublishReviewApproved } from './moderation-rules';

export class CommunityPublishPolicyError extends Error {}

export async function enforceCommunityArticlePublishPolicy({
  tx,
  revision,
}: {
  tx: any;
  revision: {
    contentFingerprint: string | null;
    moderationReviewId: string | null;
  };
}) {
  if (!revision.contentFingerprint || !revision.moderationReviewId) {
    throw new CommunityPublishPolicyError('CONTENT_MODERATION_REQUIRED');
  }

  const [review] = await tx
    .select({
      status: communityModerationReview.status,
      contentFingerprint: communityModerationReview.contentFingerprint,
      policyDecision: communityModerationReview.policyDecision,
      decision: communityModerationReview.decision,
      requiresHumanReview: communityModerationReview.requiresHumanReview,
      reviewedBy: communityModerationReview.reviewedBy,
      reviewedAt: communityModerationReview.reviewedAt,
    })
    .from(communityModerationReview)
    .where(
      and(
        eq(communityModerationReview.id, revision.moderationReviewId),
        eq(
          communityModerationReview.contentFingerprint,
          revision.contentFingerprint
        )
      )
    )
    .limit(1);

  if (!review || !isCommunityPublishReviewApproved(review)) {
    throw new CommunityPublishPolicyError('CONTENT_MODERATION_NOT_APPROVED');
  }
}
