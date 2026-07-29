import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';
import { listCommunityAdminProfiles } from '@/shared/services/community/profile-admin';

export async function GET(request: NextRequest) {
  try {
    await requireCommunityAdmin();
    return respData(
      await listCommunityAdminProfiles({
        query: request.nextUrl.searchParams.get('query') || '',
        status: request.nextUrl.searchParams.get('status') || '',
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
