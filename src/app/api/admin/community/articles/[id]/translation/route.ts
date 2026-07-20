import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { updateCommunityArticleTranslation } from '@/shared/services/community/article-workflow';
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
      await updateCommunityArticleTranslation({
        articleId: id,
        adminId: admin.id,
        translatedTitle: String(body.title || ''),
        translatedSummary: String(body.summary || ''),
        translatedContent: String(body.content || ''),
        coverImageUrl: body.coverImageUrl,
        categorySlug: body.categorySlug,
        tags: Array.isArray(body.tags) ? body.tags : [],
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
