import { closeUnhandledCommunityComments } from '@/shared/services/community/interactions';

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const closed = await closeUnhandledCommunityComments();
    return Response.json({ processed: true, closed });
  } catch (error) {
    return Response.json(
      {
        processed: false,
        error:
          error instanceof Error
            ? error.message
            : 'CLOSE_UNHANDLED_COMMENTS_FAILED',
      },
      { status: 500 }
    );
  }
}
