import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { reviewCommunityModerationAppeal } from '@/shared/services/community/moderation-workflow';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

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
    if (
      !['confirmed_violation', 'false_positive_recheck'].includes(body.action)
    )
      return respErr('MODERATION_APPEAL_ACTION_INVALID');
    return respData(
      await reviewCommunityModerationAppeal({
        appealId: id,
        adminId: admin.id,
        action: body.action,
        note: String(body.note || ''),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
