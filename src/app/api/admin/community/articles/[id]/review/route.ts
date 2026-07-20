import { after, NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { reviewCommunityArticle } from '@/shared/services/community/article-workflow';
import { processNextCommunityEmailJob } from '@/shared/services/community/email-workflow';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

const actions = new Set([
  'approve',
  'changes_requested',
  'rejected',
  'archived',
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [admin, { id }, body] = await Promise.all([
      requireCommunityAdmin(),
      params,
      request.json(),
    ]);
    if (!actions.has(body.action))
      return respErr('ARTICLE_REVIEW_ACTION_INVALID');
    const result = await reviewCommunityArticle({
      articleId: id,
      adminId: admin.id,
      action: body.action,
      reason: body.reason,
    });
    if (['approve', 'changes_requested', 'rejected'].includes(body.action))
      after(async () => {
        try {
          await processNextCommunityEmailJob(
            `article-review-${id}-${Date.now()}`
          );
        } catch {
          // The persisted job remains available to the recovery worker.
        }
      });
    return respData(result);
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
