import { NextRequest } from 'next/server';

import {
  findCommunityArticleSlugRedirect,
  findCommunityUsernameRedirect,
} from '@/shared/models/community';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const type = request.nextUrl.searchParams.get('type');
  const value = request.nextUrl.searchParams.get('value') || '';
  if (!value || !['article', 'profile'].includes(type || ''))
    return Response.json({ target: null });
  const target =
    type === 'article'
      ? await findCommunityArticleSlugRedirect(value)
      : await findCommunityUsernameRedirect(value);
  return Response.json({ target });
}
