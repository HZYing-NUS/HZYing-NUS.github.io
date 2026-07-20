import { processCommunityTranslationJobBatch } from '@/shared/services/community/article-workflow';

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const results = await processCommunityTranslationJobBatch({
    workerPrefix: 'community-translation-cron',
    maxJobs: 5,
  });
  return Response.json({ processed: results.length, results });
}
