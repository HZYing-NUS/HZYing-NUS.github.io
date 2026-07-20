import { createHmac, timingSafeEqual } from 'node:crypto';

export type ReferralCookiePayload = {
  clickId: string;
  expiresAt: number;
};

function encode(value: string) {
  return Buffer.from(value).toString('base64url');
}

function signature(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createReferralCookie(
  payload: ReferralCookiePayload,
  secret: string
) {
  if (!secret) throw new Error('Referral cookie secret is required');
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${signature(encoded, secret)}`;
}

export function verifyReferralCookie(
  value: string,
  secret: string,
  now = Date.now()
): ReferralCookiePayload | null {
  if (!secret) return null;
  const [encoded, provided] = value.split('.');
  if (!encoded || !provided) return null;
  const expected = signature(encoded, secret);
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right))
    return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as ReferralCookiePayload;
    if (!payload.clickId || !Number.isFinite(payload.expiresAt)) return null;
    if (payload.expiresAt <= now) return null;
    return payload;
  } catch {
    return null;
  }
}
