import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { updateCommunityUsername } from '@/shared/models/community';
import { requireCommunityUser } from '@/shared/services/community/permissions';

export async function PUT(request: NextRequest) {
  try {
    const [user, body] = await Promise.all([
      requireCommunityUser(),
      request.json(),
    ]);
    return respData(
      await updateCommunityUsername({
        userId: user.id,
        username: String(body.username || ''),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
