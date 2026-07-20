import { respData, respErr } from '@/shared/lib/resp';
import { listAdminCommunityComments } from '@/shared/services/community/interactions';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

export async function GET() {
  try {
    await requireCommunityAdmin();
    return respData(await listAdminCommunityComments());
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
