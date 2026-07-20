import { findPublishedCommunityArticle } from '@/shared/models/community';
import { getCommunityArticleHttpStatus } from '@/shared/services/community/public-visibility';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const row = await findPublishedCommunityArticle(slug);
  const status = getCommunityArticleHttpStatus(row?.article || null);
  return Response.json({ status }, { status: 200, headers: { 'cache-control': 'public, s-maxage=60' } });
}
