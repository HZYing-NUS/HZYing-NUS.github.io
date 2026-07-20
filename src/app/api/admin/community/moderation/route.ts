import { respData, respErr } from '@/shared/lib/resp';
import { listCommunityModerationQueue } from '@/shared/services/community/moderation-workflow';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

export async function GET() {
  try {
    await requireCommunityAdmin();
    return respData(await listCommunityModerationQueue());
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
