import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { authorHandleCommunityComment } from '@/shared/services/community/interactions';
import { requireCommunityUser } from '@/shared/services/community/permissions';

const actions = new Set([
  'publish',
  'feature',
  'reject',
  'report',
  'hide',
  'restore',
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [user, { id }, body] = await Promise.all([
      requireCommunityUser(),
      params,
      request.json(),
    ]);
    if (!actions.has(body.action))
      return respErr('COMMUNITY_COMMENT_ACTION_INVALID');
    return respData(
      await authorHandleCommunityComment({
        commentId: id,
        authorId: user.id,
        action: body.action,
        reasonType: body.reasonType,
        description: body.description,
        requestId: request.headers.get('x-request-id'),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
