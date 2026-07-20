import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { setCommunityLike } from '@/shared/services/community/interactions';
import { requireCommunityUser } from '@/shared/services/community/permissions';

export async function PUT(request: NextRequest) {
  try {
    const [user, body] = await Promise.all([
      requireCommunityUser(),
      request.json(),
    ]);
    if (!['article', 'comment'].includes(body.targetType))
      return respErr('COMMUNITY_LIKE_TYPE_INVALID');
    return respData(
      await setCommunityLike({
        userId: user.id,
        targetType: body.targetType,
        targetId: String(body.targetId || ''),
        active: Boolean(body.active),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
