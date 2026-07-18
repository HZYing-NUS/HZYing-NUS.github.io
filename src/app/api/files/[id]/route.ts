import { respData, respErr } from '@/shared/lib/resp';
import { findAiFileForCleanup } from '@/shared/models/ai_file';
import { getUserInfo } from '@/shared/models/user';
import { cleanupAndDeleteFile } from '@/shared/services/file-cleanup';
import { getStorageService } from '@/shared/services/storage';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');
  const file = await findAiFileForCleanup((await params).id, user.id);
  if (!file) return respErr('FILE_NOT_FOUND');
  const object = await (
    await getStorageService()
  ).getObject({ key: file.objectKey });
  return new Response(object.body as BodyInit, {
    headers: {
      'Content-Type': object.contentType || file.mimeType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');
  const file = await findAiFileForCleanup((await params).id, user.id);
  if (!file) return respErr('FILE_NOT_FOUND');
  const cleanup = await cleanupAndDeleteFile(file);
  if (!cleanup.complete) return respErr('FILE_CLEANUP_FAILED_RETRYABLE');
  return respData({ id: file.id });
}
