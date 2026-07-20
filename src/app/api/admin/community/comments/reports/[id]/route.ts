import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { adminHandleCommunityReport } from '@/shared/services/community/interactions';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

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
    if (!['resolve', 'dismiss'].includes(body.action))
      return respErr('COMMUNITY_REPORT_ACTION_INVALID');
    return respData(
      await adminHandleCommunityReport({
        reportId: id,
        adminId: admin.id,
        action: body.action,
        note: body.note,
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
