import { getExpiredStandaloneChats } from '@/shared/models/chat';
import { getExpiredProjects } from '@/shared/models/project';
import {
  purgeProjectContent,
  purgeStandaloneChatContent,
  retryDetachedFileCleanups,
} from '@/shared/services/content-cleanup';

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

  const [projects, chats] = await Promise.all([
    getExpiredProjects(),
    getExpiredStandaloneChats(),
  ]);
  const projectResults = [];
  const chatResults = [];

  for (const project of projects) {
    try {
      projectResults.push(
        await purgeProjectContent(project.id, project.userId)
      );
    } catch (error) {
      projectResults.push({
        complete: false,
        id: project.id,
        error: error instanceof Error ? error.message : 'PURGE_FAILED',
      });
    }
  }

  for (const chat of chats) {
    try {
      chatResults.push(await purgeStandaloneChatContent(chat.id, chat.userId));
    } catch (error) {
      chatResults.push({
        complete: false,
        id: chat.id,
        error: error instanceof Error ? error.message : 'PURGE_FAILED',
      });
    }
  }

  const detachedFiles = await retryDetachedFileCleanups();
  return Response.json({
    projects: projectResults,
    chats: chatResults,
    detachedFiles,
  });
}
