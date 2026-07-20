import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { setCommunityFollow } from '@/shared/services/community/interactions';
import { requireCommunityUser } from '@/shared/services/community/permissions';

export async function PUT(request: NextRequest) {
  try {
    const [user, body] = await Promise.all([
      requireCommunityUser(),
      request.json(),
    ]);
    return respData(
      await setCommunityFollow({
        followerId: user.id,
        followedId: String(body.userId || ''),
        active: Boolean(body.active),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
