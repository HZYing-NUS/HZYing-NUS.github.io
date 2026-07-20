import { NextRequest } from 'next/server';

import { canAccessAdmin } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import { getSignUser } from '@/shared/models/user';
import {
  createCommunityComment,
  listCommunityArticleComments,
} from '@/shared/services/community/interactions';
import { requireCommunityUser } from '@/shared/services/community/permissions';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [{ id }, user] = await Promise.all([params, getSignUser()]);
    return respData(
      await listCommunityArticleComments({
        articleId: id,
        viewerId: user?.id,
        isAdmin: user ? await canAccessAdmin(user.id) : false,
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}

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
    return respData(
      await createCommunityComment({
        articleId: id,
        userId: user.id,
        content: String(body.content || ''),
        parentId: body.parentId ? String(body.parentId) : null,
        requestId: request.headers.get('x-request-id'),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
