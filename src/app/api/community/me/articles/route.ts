import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import {
  listCommunityAuthorArticles,
  saveCommunityArticleDraft,
} from '@/shared/services/community/article-workflow';
import { requireCommunityUser } from '@/shared/services/community/permissions';

export async function GET() {
  try {
    const user = await requireCommunityUser();
    return respData(await listCommunityAuthorArticles(user.id));
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCommunityUser();
    const body = await request.json();
    return respData(
      await saveCommunityArticleDraft({
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
