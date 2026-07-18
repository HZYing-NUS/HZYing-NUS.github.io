import { refundExpiredCreditReservations } from '@/shared/models/credit';

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

  const results = [];
  for (let batch = 0; batch < 10; batch += 1) {
    const refunded = await refundExpiredCreditReservations(100);
    results.push(...refunded);
    if (refunded.length < 100) break;
  }
  return Response.json({ reservations: results });
}
