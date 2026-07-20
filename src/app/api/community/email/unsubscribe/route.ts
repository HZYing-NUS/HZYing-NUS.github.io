import { NextRequest } from 'next/server';

import { envConfigs } from '@/config';
import { verifyCommunityUnsubscribeToken } from '@/shared/services/community/email-policy';
import { unsubscribeCommunityEmailPreference } from '@/shared/services/community/email-workflow';

function parseToken(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  return verifyCommunityUnsubscribeToken(token, envConfigs.auth_secret);
}

export async function GET(request: NextRequest) {
  const payload = parseToken(request);
  if (!payload)
    return Response.json(
      { error: 'INVALID_UNSUBSCRIBE_TOKEN' },
      { status: 400 }
    );
  return Response.json({ valid: true, preference: payload.preference });
}

export async function POST(request: NextRequest) {
  const payload = parseToken(request);
  if (!payload)
    return Response.json(
      { error: 'INVALID_UNSUBSCRIBE_TOKEN' },
      { status: 400 }
    );
  await unsubscribeCommunityEmailPreference(payload);
  return Response.json({ unsubscribed: true, preference: payload.preference });
}
