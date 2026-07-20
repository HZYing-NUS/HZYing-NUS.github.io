import { respData, respErr } from '@/shared/lib/resp';
import { listCommunityAdminReviewArticles } from '@/shared/services/community/article-workflow';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

export async function GET() {
  try {
    await requireCommunityAdmin();
    return respData(await listCommunityAdminReviewArticles());
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
