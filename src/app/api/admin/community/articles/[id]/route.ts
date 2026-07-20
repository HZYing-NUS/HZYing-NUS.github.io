import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getCommunityAdminReviewArticle } from '@/shared/services/community/article-workflow';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCommunityAdmin();
    const { id } = await params;
    const article = await getCommunityAdminReviewArticle(id);
    return article ? respData(article) : respErr('ARTICLE_NOT_FOUND');
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
