import { respData, respErr } from '@/shared/lib/resp';
import { listOwnCommunityBookmarks } from '@/shared/services/community/interactions';
import { requireCommunityUser } from '@/shared/services/community/permissions';

export async function GET() {
  try {
    const user = await requireCommunityUser();
    return respData(await listOwnCommunityBookmarks(user.id));
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
