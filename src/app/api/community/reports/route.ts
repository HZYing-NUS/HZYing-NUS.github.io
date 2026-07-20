import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { reportCommunityProfile } from '@/shared/services/community/interactions';
import { requireCommunityUser } from '@/shared/services/community/permissions';

export async function POST(request: NextRequest) {
  try {
    const [user, body] = await Promise.all([
      requireCommunityUser(),
      request.json(),
    ]);
    if (body.objectType !== 'profile')
      return respErr('COMMUNITY_REPORT_OBJECT_UNSUPPORTED');
    return respData(
      await reportCommunityProfile({
        reporterId: user.id,
        profileId: String(body.objectId || ''),
        reasonType: String(body.reasonType || ''),
        description: body.description,
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
