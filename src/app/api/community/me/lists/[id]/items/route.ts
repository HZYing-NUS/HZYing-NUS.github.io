import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { setCommunityListItem } from '@/shared/services/community/interactions';
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
    if (!['resource', 'collection', 'article'].includes(body.itemType))
      return respErr('COMMUNITY_LIST_ITEM_TYPE_INVALID');
    return respData(
      await setCommunityListItem({
        ownerId: user.id,
        listId: id,
        itemType: body.itemType,
        itemId: String(body.itemId || ''),
        active: Boolean(body.active),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
