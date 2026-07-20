import { respData, respErr } from '@/shared/lib/resp';
import { retryCommunityEmailDelivery } from '@/shared/services/community/email-workflow';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [, { id }] = await Promise.all([requireCommunityAdmin(), params]);
    return respData(await retryCommunityEmailDelivery(id));
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
