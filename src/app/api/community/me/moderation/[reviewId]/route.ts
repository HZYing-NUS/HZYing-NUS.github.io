import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getOwnCommunityModerationReview } from '@/shared/services/community/moderation-workflow';
import { requireCommunityUser } from '@/shared/services/community/permissions';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const [user, { reviewId }] = await Promise.all([
      requireCommunityUser(),
      params,
    ]);
    const row = await getOwnCommunityModerationReview({
      reviewId,
      userId: user.id,
    });
    return row ? respData(row) : respErr('MODERATION_REVIEW_NOT_FOUND');
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
