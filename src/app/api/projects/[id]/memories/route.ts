import { generateId } from 'ai';

import { respData, respErr } from '@/shared/lib/resp';
import {
  createProjectMemory,
  deleteProjectMemory,
  getProjectMemories,
  updateProjectMemory,
} from '@/shared/models/memory';
import { findProjectById } from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');
  const { id } = await params;
  if (!(await findProjectById(id, user.id)))
    return respErr('PROJECT_NOT_FOUND');
  return respData(await getProjectMemories(user.id, id));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');
  const { id } = await params;
  const body = await req.json();
  const content = String(body.content || '').trim();
  if (!content) return respErr('MEMORY_CONTENT_REQUIRED');
  return respData(
    await createProjectMemory({
      id: generateId().toLowerCase(),
      userId: user.id,
      projectId: id,
      type: ['fixed', 'progress', 'related'].includes(body.type)
        ? body.type
        : 'related',
      content,
      importance: Number(body.importance || 0),
      sourceChatId: body.sourceChatId || null,
      sourceMessageId: body.sourceMessageId || null,
      status: 'active',
    })
  );
}

export async function PATCH(req: Request) {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');
  const body = await req.json();
  const projectId = new URL(req.url).pathname.split('/').at(-2);
  if (!body.memoryId) return respErr('MEMORY_ID_REQUIRED');
  const memories = projectId
    ? await getProjectMemories(user.id, projectId)
    : [];
  if (!memories.some((memory: { id: string }) => memory.id === body.memoryId)) {
    return respErr('MEMORY_NOT_FOUND');
  }
  const updated = await updateProjectMemory(body.memoryId, user.id, {
    content: body.content,
    type: body.type,
    importance: body.importance,
  });
  return updated ? respData(updated) : respErr('MEMORY_NOT_FOUND');
}

export async function DELETE(req: Request) {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');
  const memoryId = new URL(req.url).searchParams.get('memoryId');
  if (!memoryId) return respErr('MEMORY_ID_REQUIRED');
  const projectId = new URL(req.url).pathname.split('/').at(-2);
  const memories = projectId
    ? await getProjectMemories(user.id, projectId)
    : [];
  if (!memories.some((memory: { id: string }) => memory.id === memoryId)) {
    return respErr('MEMORY_NOT_FOUND');
  }
  const deleted = await deleteProjectMemory(memoryId, user.id);
  return deleted ? respData(deleted) : respErr('MEMORY_NOT_FOUND');
}
