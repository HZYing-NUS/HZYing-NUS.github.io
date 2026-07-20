import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { adminSetCommunityProfileVisibility } from '@/shared/services/community/interactions';
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
    if (!['hide', 'restore'].includes(body.action))
      return respErr('COMMUNITY_PROFILE_ACTION_INVALID');
    return respData(
      await adminSetCommunityProfileVisibility({
        profileId: id,
        adminId: admin.id,
        hidden: body.action === 'hide',
        note: body.note,
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
