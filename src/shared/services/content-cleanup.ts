import {
  AiFile,
  deleteAiFile,
  getChatFilesForCleanup,
  getProjectFilesForCleanup,
  getRetryableFileCleanups,
} from '@/shared/models/ai_file';
import { permanentlyDeleteChat } from '@/shared/models/chat';
import { permanentlyDeleteProject } from '@/shared/models/project';
import { cleanupFileObjects } from '@/shared/services/file-cleanup';

export async function purgeProjectContent(projectId: string, userId: string) {
  const files = await getProjectFilesForCleanup(userId, projectId);
  const cleanup = await cleanupFileObjects(files);
  if (!cleanup.complete) {
    return {
      complete: false as const,
      id: projectId,
      failedFileIds: cleanup.failedFileIds,
    };
  }

  const deleted = await permanentlyDeleteProject(projectId, userId);
  return { complete: Boolean(deleted), id: projectId, deleted };
}

export async function purgeStandaloneChatContent(
  chatId: string,
  userId: string
) {
  const files = await getChatFilesForCleanup(userId, chatId);
  const cleanup = await cleanupFileObjects(files);
  if (!cleanup.complete) {
    return {
      complete: false as const,
      id: chatId,
      failedFileIds: cleanup.failedFileIds,
    };
  }

  const deleted = await permanentlyDeleteChat(chatId, userId);
  return { complete: Boolean(deleted), id: chatId, deleted };
}

export async function retryDetachedFileCleanups(limit = 100) {
  const files = await getRetryableFileCleanups(limit);
  const cleanup = await cleanupFileObjects(files);

  for (const fileId of cleanup.cleanedFileIds) {
    const file = files.find((candidate: AiFile) => candidate.id === fileId);
    if (file?.status === 'uploading' || file?.status === 'cleanup_failed') {
      await deleteAiFile(file.id, file.userId);
    }
  }

  return cleanup;
}
