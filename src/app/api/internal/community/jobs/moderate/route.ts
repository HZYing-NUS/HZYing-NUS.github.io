import {
  claimCommunityModerationJob,
  processCommunityModerationJob,
} from '@/shared/services/community/moderation-workflow';

export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const job = await claimCommunityModerationJob({
    workerId: request.headers.get('x-worker-id') || `vercel-${Date.now()}`,
  });
  if (!job) return Response.json({ processed: false });
  try {
    return Response.json({
      processed: true,
      jobId: job.id,
      result: await processCommunityModerationJob({ job }),
    });
  } catch (error) {
    return Response.json(
      {
        processed: false,
        jobId: job.id,
        error: error instanceof Error ? error.message : 'MODERATION_FAILED',
      },
      { status: 500 }
    );
  }
}
