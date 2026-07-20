import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { ensureCommunityProfile } from '@/shared/models/community';
import { requireCommunityUser } from '@/shared/services/community/permissions';
import {
  getOwnCommunityProfileDraft,
  saveCommunityProfileDraft,
  submitCommunityProfile,
} from '@/shared/services/community/profile-workflow';

export async function GET() {
  try {
    const user = await requireCommunityUser();
    await ensureCommunityProfile({
      userId: user.id,
      name: user.name,
      image: user.image,
    });
    return respData(await getOwnCommunityProfileDraft(user.id));
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
      await saveCommunityProfileDraft({ userId: user.id, input: body })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}

export async function POST(request: NextRequest) {
  try {
    const [user, body] = await Promise.all([
      requireCommunityUser(),
      request.json().catch(() => ({})),
    ]);
    const idempotencyKey =
      request.headers.get('idempotency-key') || body.idempotencyKey;
    return respData(
      await submitCommunityProfile({
        userId: user.id,
        idempotencyKey: String(idempotencyKey || ''),
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'REQUEST_FAILED');
  }
}
