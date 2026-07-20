import { respData, respErr } from '@/shared/lib/resp';
import { listAdminCommunityEmailDeliveries } from '@/shared/services/community/email-workflow';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

export async function GET() {
  try {
    await requireCommunityAdmin();
    return respData(await listAdminCommunityEmailDeliveries());
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
