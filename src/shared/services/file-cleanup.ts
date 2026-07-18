import {
  AiFile,
  deleteAiFile,
  updateAiFileCleanup,
} from '@/shared/models/ai_file';
import { getStorageService } from '@/shared/services/storage';

function cleanupError(error: unknown, context?: 'upload_rollback') {
  const detail = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
  const prefix =
    context === 'upload_rollback' ? 'UPLOAD_ROLLBACK' : 'R2_CLEANUP_FAILED';
  return `${prefix}: ${detail}`.slice(0, 2000);
}

export async function cleanupFileObjects(
  files: AiFile[],
  options: { context?: 'upload_rollback' } = {}
) {
  const cleanedFileIds: string[] = [];
  const failedFileIds: string[] = [];
  if (!files.length) {
    return { complete: true, cleanedFileIds, failedFileIds };
  }

  let storage: Awaited<ReturnType<typeof getStorageService>>;
  try {
    storage = await getStorageService();
  } catch (error) {
    for (const file of files) {
      await updateAiFileCleanup(
        file.id,
        file.userId,
        'cleanup_failed',
        cleanupError(error, options.context)
      );
      failedFileIds.push(file.id);
    }
    return { complete: false, cleanedFileIds, failedFileIds };
  }

  for (const file of files) {
    if (file.status === 'cleanup_complete') {
      cleanedFileIds.push(file.id);
      continue;
    }

    await updateAiFileCleanup(file.id, file.userId, 'cleanup_pending', null);
    try {
      await storage.deleteObject({ key: file.objectKey });
      await updateAiFileCleanup(file.id, file.userId, 'cleanup_complete', null);
      cleanedFileIds.push(file.id);
    } catch (error) {
      await updateAiFileCleanup(
        file.id,
        file.userId,
        'cleanup_failed',
        cleanupError(error, options.context)
      );
      failedFileIds.push(file.id);
    }
  }

  return {
    complete: failedFileIds.length === 0,
    cleanedFileIds,
    failedFileIds,
  };
}

export async function cleanupAndDeleteFile(file: AiFile) {
  const result = await cleanupFileObjects([file]);
  if (!result.complete) return result;
  await deleteAiFile(file.id, file.userId);
  return result;
}
