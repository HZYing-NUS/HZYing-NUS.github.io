import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { createCommunityModerationAppeal } from '@/shared/services/community/moderation-workflow';
import { requireCommunityUser } from '@/shared/services/community/permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const [user, { reviewId }, body] = await Promise.all([
      requireCommunityUser(),
      params,
      request.json(),
    ]);
    return respData(
      await createCommunityModerationAppeal({
        reviewId,
        userId: user.id,
        statement: String(body.statement || ''),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
