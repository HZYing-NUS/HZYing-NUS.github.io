import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { updateCommunityArticleSlug } from '@/shared/services/community/article-workflow';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [admin, { id }, body] = await Promise.all([
      requireCommunityAdmin(),
      params,
      request.json(),
    ]);
    return respData(
      await updateCommunityArticleSlug({
        articleId: id,
        adminId: admin.id,
        slug: String(body.slug || ''),
        requestId: request.headers.get('x-request-id'),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
