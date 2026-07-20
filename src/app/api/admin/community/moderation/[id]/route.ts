import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import {
  getCommunityModerationReview,
  manuallyReviewCommunityModeration,
} from '@/shared/services/community/moderation-workflow';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCommunityAdmin();
    const { id } = await params;
    const row = await getCommunityModerationReview(id);
    return row ? respData(row) : respErr('MODERATION_REVIEW_NOT_FOUND');
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [admin, { id }, body] = await Promise.all([
      requireCommunityAdmin(),
      params,
      request.json(),
    ]);
    if (!['allow', 'blocked', 'recheck'].includes(body.action))
      return respErr('MODERATION_REVIEW_ACTION_INVALID');
    return respData(
      await manuallyReviewCommunityModeration({
        reviewId: id,
        adminId: admin.id,
        action: body.action,
        note: String(body.note || ''),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
