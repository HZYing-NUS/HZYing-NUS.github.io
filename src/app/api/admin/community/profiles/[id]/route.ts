import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';
import { getCommunityAdminProfile } from '@/shared/services/community/profile-admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCommunityAdmin();
    const { id } = await params;
    const row = await getCommunityAdminProfile(id);
    return row ? respData(row) : respErr('COMMUNITY_PROFILE_NOT_FOUND');
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
