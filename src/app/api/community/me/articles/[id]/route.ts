import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import {
  getCommunityAuthorArticle,
  saveCommunityArticleDraft,
} from '@/shared/services/community/article-workflow';
import { requireCommunityUser } from '@/shared/services/community/permissions';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [user, { id }] = await Promise.all([requireCommunityUser(), params]);
    const article = await getCommunityAuthorArticle(id, user.id);
    return article ? respData(article) : respErr('ARTICLE_NOT_FOUND');
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}

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
      await saveCommunityArticleDraft({
        articleId: id,
        authorId: user.id,
        input: {
          sourceLocale: body.sourceLocale,
          title: String(body.title || ''),
          summary: String(body.summary || ''),
          content: String(body.content || ''),
          slug: String(body.slug || ''),
          coverImageUrl: body.coverImageUrl,
          categorySlug: body.categorySlug,
          tags: Array.isArray(body.tags) ? body.tags : [],
        },
        requestId: request.headers.get('x-request-id'),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
