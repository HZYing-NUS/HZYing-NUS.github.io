import { NextResponse } from 'next/server';

import { envConfigs } from '@/config';
import { getCookieFromHeader } from '@/shared/lib/cookie';
import {
  createReferralInviteClick,
  isValidReferralInviteClick,
} from '@/shared/models/referral';
import {
  createReferralCookie,
  verifyReferralCookie,
} from '@/shared/services/referral-cookie';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const signUpUrl = new URL('/sign-up', envConfigs.app_url || request.url);
  const response = NextResponse.redirect(signUpUrl);
  const currentCookie = getCookieFromHeader(
    request.headers.get('cookie'),
    'webtools_referral'
  );
  if (currentCookie) {
    const currentPayload = verifyReferralCookie(
      currentCookie,
      envConfigs.referral_cookie_secret
    );
    if (
      currentPayload &&
      (await isValidReferralInviteClick(currentPayload.clickId))
    ) {
      return response;
    }
  }
  const click = await createReferralInviteClick(code);
  if (click) {
    response.cookies.set(
      'webtools_referral',
      createReferralCookie(
        { clickId: click.id, expiresAt: click.expiresAt.getTime() },
        envConfigs.referral_cookie_secret
      ),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        expires: click.expiresAt,
      }
    );
  }
  return response;
}
