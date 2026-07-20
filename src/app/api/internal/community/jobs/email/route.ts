import { processNextCommunityEmailJob } from '@/shared/services/community/email-workflow';

export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    return Response.json(
      await processNextCommunityEmailJob(
        request.headers.get('x-worker-id') || `email-worker-${Date.now()}`
      )
    );
  } catch (error) {
    return Response.json(
      {
        processed: false,
        error: error instanceof Error ? error.message : 'EMAIL_SEND_FAILED',
      },
      { status: 500 }
    );
  }
}
