import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import {
  updateCommunityArticleInteractionSettings,
  updateCommunityArticleLifecycle,
} from '@/shared/services/community/interactions';
import { requireCommunityUser } from '@/shared/services/community/permissions';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [user, { id }, body] = await Promise.all([
      requireCommunityUser(),
      params,
      request.json(),
    ]);
    if (body.action === 'delete' || body.action === 'restore')
      return respData(
        await updateCommunityArticleLifecycle({
          articleId: id,
          authorId: user.id,
          action: body.action,
        })
      );
    return respData(
      await updateCommunityArticleInteractionSettings({
        articleId: id,
        authorId: user.id,
        allowComments: Boolean(body.allowComments),
        allowReplies: Boolean(body.allowReplies),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
