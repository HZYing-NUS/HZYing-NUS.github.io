import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import {
  getCommunityPrivacy,
  updateCommunityPrivacy,
} from '@/shared/services/community/interactions';
import { requireCommunityUser } from '@/shared/services/community/permissions';

export async function GET() {
  try {
    const user = await requireCommunityUser();
    return respData(await getCommunityPrivacy(user.id));
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const [user, body] = await Promise.all([
      requireCommunityUser(),
      request.json(),
    ]);
    return respData(
      await updateCommunityPrivacy({
        userId: user.id,
        showFollowingList: Boolean(body.showFollowingList),
        showFollowerList: Boolean(body.showFollowerList),
        showLikes: Boolean(body.showLikes),
        showBookmarks: Boolean(body.showBookmarks),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
