import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { deleteOwnCommunityComment } from '@/shared/services/community/interactions';
import { requireCommunityUser } from '@/shared/services/community/permissions';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [user, { id }] = await Promise.all([requireCommunityUser(), params]);
    return respData(
      await deleteOwnCommunityComment({
        commentId: id,
        userId: user.id,
        requestId: request.headers.get('x-request-id'),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
