import { generateId } from 'ai';

import { respData, respErr } from '@/shared/lib/resp';
import {
  createGlobalMemory,
  deleteGlobalMemory,
  getGlobalMemories,
  updateGlobalMemory,
} from '@/shared/models/memory';
import { findUserById, getUserInfo, updateUser } from '@/shared/models/user';

export async function GET() {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');
  const owner = await findUserById(user.id);
  return respData({
    enabled: owner?.globalMemoryEnabled !== false,
    items: await getGlobalMemories(user.id, true),
  });
}

export async function POST(req: Request) {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');
  const body = await req.json();
  if (typeof body.enabled === 'boolean' && !body.id) {
    const updated = await updateUser(user.id, {
      globalMemoryEnabled: body.enabled,
    });
    return respData({ enabled: updated.globalMemoryEnabled });
  }
  const content = String(body.content || '').trim();
  if (!content) return respErr('MEMORY_CONTENT_REQUIRED');
  const confirmed = body.confirmed === true;
  return respData(
    await createGlobalMemory({
      id: generateId().toLowerCase(),
      userId: user.id,
      content,
      sourceChatId: body.sourceChatId || null,
      sourceMessageId: body.sourceMessageId || null,
      confirmedAt: confirmed ? new Date() : null,
      status: confirmed ? 'confirmed' : 'pending',
    })
  );
}

export async function PATCH(req: Request) {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');
  const body = await req.json();
  if (!body.id) return respErr('MEMORY_ID_REQUIRED');
  const confirmed = body.confirmed === true;
  const updated = await updateGlobalMemory(body.id, user.id, {
    content: body.content,
    ...(body.confirmed === undefined
      ? {}
      : {
          status: confirmed ? 'confirmed' : 'pending',
          confirmedAt: confirmed ? new Date() : null,
        }),
  });
  return updated ? respData(updated) : respErr('MEMORY_NOT_FOUND');
}

export async function DELETE(req: Request) {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return respErr('MEMORY_ID_REQUIRED');
  const deleted = await deleteGlobalMemory(id, user.id);
  return deleted ? respData(deleted) : respErr('MEMORY_NOT_FOUND');
}
