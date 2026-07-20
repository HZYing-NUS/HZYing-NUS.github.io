import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import {
  deleteCommunityUserList,
  saveCommunityUserList,
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
    return respData(
      await saveCommunityUserList({
        listId: id,
        ownerId: user.id,
        title: String(body.title || ''),
        slug: String(body.slug || ''),
        description: body.description,
        visibility: body.visibility === 'private' ? 'private' : 'public',
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [user, { id }] = await Promise.all([requireCommunityUser(), params]);
    return respData(
      await deleteCommunityUserList({ listId: id, ownerId: user.id })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
