import { respData, respErr } from '@/shared/lib/resp';
import { deleteAiFile, getChatFilesForCleanup } from '@/shared/models/ai_file';
import { findChatById, moveChatToTrash } from '@/shared/models/chat';
import { deleteProjectMemoriesBySourceChat } from '@/shared/models/memory';
import { getUserInfo } from '@/shared/models/user';
import { cleanupFileObjects } from '@/shared/services/file-cleanup';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');
  const { id } = await params;
  if (!(await findChatById(id, user.id))) return respErr('CHAT_NOT_FOUND');

  const files = await getChatFilesForCleanup(user.id, id);
  const cleanup = await cleanupFileObjects(files);
  if (!cleanup.complete) {
    return respErr('CHAT_FILE_CLEANUP_FAILED_RETRYABLE');
  }
  for (const file of files) await deleteAiFile(file.id, user.id);
  await deleteProjectMemoriesBySourceChat(user.id, id);
  const deleted = await moveChatToTrash(id, user.id);
  return respData(deleted);
}
