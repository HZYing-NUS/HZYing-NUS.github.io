import {
  processReferralEvents,
  releaseReferralRewards,
  repairMissingReferralEvents,
} from '@/shared/models/referral';

export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return (
    Boolean(secret) &&
    request.headers.get('authorization') === `Bearer ${secret}`
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  await repairMissingReferralEvents(200);
  const events = await processReferralEvents(200);
  const rewards = await releaseReferralRewards(200);
  return Response.json({ events, rewards });
}
