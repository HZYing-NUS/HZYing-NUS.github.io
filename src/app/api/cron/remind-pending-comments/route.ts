import {
  processCommunityEmailJobBatch,
  scanPendingCommentReminderJobs,
} from '@/shared/services/community/email-workflow';

export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return (
    Boolean(secret) &&
    request.headers.get('authorization') === `Bearer ${secret}`
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request))
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const scan = await scanPendingCommentReminderJobs();
  const results = await processCommunityEmailJobBatch({
    workerPrefix: 'pending-comment-cron',
    maxJobs: 20,
  });
  return Response.json({ scan, processed: results.length, results });
}
