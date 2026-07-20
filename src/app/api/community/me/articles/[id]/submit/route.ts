import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { submitCommunityArticle } from '@/shared/services/community/article-workflow';
import { requireCommunityUser } from '@/shared/services/community/permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [user, { id }] = await Promise.all([requireCommunityUser(), params]);
    const idempotencyKey =
      request.headers.get('idempotency-key') ||
      (await request.json().catch(() => ({}))).idempotencyKey;
    return respData(
      await submitCommunityArticle({
        articleId: id,
        authorId: user.id,
        idempotencyKey: String(idempotencyKey || ''),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
