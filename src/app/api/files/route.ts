import { createHash, randomUUID } from 'node:crypto';
import { generateId } from 'ai';

import { respData, respErr } from '@/shared/lib/resp';
import {
  activateAiFile,
  AiFile,
  countProjectFiles,
  createAiFile,
  deleteAiFile,
  getChatFiles,
  getProjectFiles,
} from '@/shared/models/ai_file';
import { findChatById } from '@/shared/models/chat';
import { findProjectById } from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';
import { cleanupFileObjects } from '@/shared/services/file-cleanup';
import { getStorageService } from '@/shared/services/storage';

const MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'image/png',
  'image/jpeg',
  'image/webp',
]);
const MAX_FILE_BYTES = 20 * 1024 * 1024;

export async function GET(req: Request) {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');
  const params = new URL(req.url).searchParams;
  if (params.get('projectId')) {
    return respData(await getProjectFiles(user.id, params.get('projectId')!));
  }
  if (params.get('chatId')) {
    return respData(await getChatFiles(user.id, params.get('chatId')!));
  }
  return respErr('OWNER_REQUIRED');
}

export async function POST(req: Request) {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');
  const form = await req.formData();
  const projectId = String(form.get('projectId') || '') || undefined;
  const chatId = String(form.get('chatId') || '') || undefined;
  const files = form
    .getAll('files')
    .filter((file): file is File => file instanceof File);
  if (Boolean(projectId) === Boolean(chatId)) return respErr('OWNER_REQUIRED');
  if (!files.length || files.length > 5) return respErr('FILE_COUNT_LIMIT');
  if (projectId && !(await findProjectById(projectId, user.id))) {
    return respErr('PROJECT_NOT_FOUND');
  }
  if (chatId && !(await findChatById(chatId, user.id))) {
    return respErr('CHAT_NOT_FOUND');
  }
  if (
    projectId &&
    (await countProjectFiles(user.id, projectId)) + files.length > 50
  ) {
    return respErr('PROJECT_FILE_LIMIT');
  }

  for (const file of files) {
    if (!MIME_TYPES.has(file.type) || file.size > MAX_FILE_BYTES) {
      return respErr(
        file.size > MAX_FILE_BYTES
          ? 'FILE_TOO_LARGE'
          : 'FILE_TYPE_NOT_SUPPORTED'
      );
    }
  }

  const storage = await getStorageService();
  const uploaded = [];
  const cleanupRecords: AiFile[] = [];
  try {
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const objectKey = `private/${user.id}/${randomUUID()}`;
      const record = await createAiFile({
        id: generateId().toLowerCase(),
        userId: user.id,
        projectId,
        chatId,
        originalName: file.name,
        objectKey,
        mimeType: file.type,
        sizeBytes: file.size,
        contentHash: createHash('sha256').update(bytes).digest('hex'),
        parseStatus: 'pending',
        parseError: null,
        status: 'uploading',
        deletedAt: null,
      });
      cleanupRecords.push(record);
      const storageResult = await storage.uploadFile({
        body: bytes,
        key: objectKey,
        contentType: file.type,
        disposition: 'attachment',
      });
      if (!storageResult.success)
        throw new Error(storageResult.error || 'UPLOAD_FAILED');

      const parseStatus = file.type.startsWith('image/') ? 'visual' : 'pending';
      const activeRecord = await activateAiFile(record.id, user.id, {
        parseStatus,
        parseError: null,
      });
      uploaded.push(activeRecord);
    }
  } catch (error) {
    const cleanup = await cleanupFileObjects(cleanupRecords, {
      context: 'upload_rollback',
    });
    for (const fileId of cleanup.cleanedFileIds) {
      await deleteAiFile(fileId, user.id);
    }
    if (cleanup.failedFileIds.length) {
      console.error('File upload rollback requires retry', {
        userId: user.id,
        fileIds: cleanup.failedFileIds,
      });
    }
    throw error;
  }
  return respData(uploaded);
}
