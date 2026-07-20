import {
  claimCommunityTranslationJob,
  processCommunityTranslationJob,
} from '@/shared/services/community/article-workflow';

export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return (
    Boolean(secret) &&
    request.headers.get('authorization') === `Bearer ${secret}`
  );
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const workerId = request.headers.get('x-worker-id') || `vercel-${Date.now()}`;
  const job = await claimCommunityTranslationJob({ workerId });
  if (!job) return Response.json({ processed: false });
  try {
    const result = await processCommunityTranslationJob({ job });
    return Response.json({ processed: true, jobId: job.id, result });
  } catch (error) {
    return Response.json(
      {
        processed: false,
        jobId: job.id,
        error: error instanceof Error ? error.message : 'TRANSLATION_FAILED',
      },
      { status: 500 }
    );
  }
}
