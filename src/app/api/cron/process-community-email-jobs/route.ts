import { processCommunityEmailJobBatch } from '@/shared/services/community/email-workflow';

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const results = await processCommunityEmailJobBatch({
    workerPrefix: 'community-email-cron',
    maxJobs: 20,
  });
  return Response.json({ processed: results.length, results });
}
