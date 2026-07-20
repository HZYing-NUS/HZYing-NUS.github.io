import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import {
  getCommunityEmailPreferences,
  updateCommunityEmailPreferences,
} from '@/shared/services/community/email-workflow';
import { requireCommunityUser } from '@/shared/services/community/permissions';

export async function GET() {
  try {
    const user = await requireCommunityUser();
    return respData(await getCommunityEmailPreferences(user.id));
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const [user, body] = await Promise.all([
      requireCommunityUser(),
      request.json(),
    ]);
    return respData(
      await updateCommunityEmailPreferences({
        userId: user.id,
        pendingCommentReminder: Boolean(body.pendingCommentReminder),
        articleReviewResult: Boolean(body.articleReviewResult),
        productMarketing: Boolean(body.productMarketing),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
