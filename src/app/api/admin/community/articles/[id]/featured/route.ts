import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { updateCommunityArticleFeatured } from '@/shared/services/community/article-workflow';
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
    if (typeof body.featured !== 'boolean')
      return respErr('ARTICLE_FEATURED_VALUE_INVALID');
    return respData(
      await updateCommunityArticleFeatured({
        articleId: id,
        adminId: admin.id,
        featured: body.featured,
        reason: body.reason,
        requestId: request.headers.get('x-request-id'),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
