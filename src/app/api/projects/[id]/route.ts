import { respData, respErr } from '@/shared/lib/resp';
import {
  getProjectFiles,
  hasProjectFileCleanupStarted,
} from '@/shared/models/ai_file';
import { getProjectChats, toPublicChat } from '@/shared/models/chat';
import { getProjectMemories } from '@/shared/models/memory';
import {
  findProjectById,
  moveProjectToTrash,
  restoreProject,
  updateProject,
} from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';
import { purgeProjectContent } from '@/shared/services/content-cleanup';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');
  const { id } = await params;
  const project = await findProjectById(id, user.id);
  if (!project) return respErr('PROJECT_NOT_FOUND');

  const [chats, memories, files] = await Promise.all([
    getProjectChats(user.id, id),
    getProjectMemories(user.id, id),
    getProjectFiles(user.id, id),
  ]);
  return respData({
    project,
    chats: chats.map(toPublicChat),
    memories,
    files,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');
  const { id } = await params;
  const body = await req.json();
  const allowed = [
    'name',
    'description',
    'targetAudience',
    'stage',
    'technology',
    'confirmedDecisions',
    'completedItems',
    'currentProblem',
    'nextSteps',
    'importantConclusions',
    'recentProgress',
    'autoMemoryEnabled',
  ] as const;
  const updates = Object.fromEntries(
    allowed.filter((key) => key in body).map((key) => [key, body[key]])
  );
  if ('name' in updates && !String(updates.name || '').trim()) {
    return respErr('PROJECT_NAME_REQUIRED');
  }
  const project = await updateProject(id, user.id, updates);
  return project ? respData(project) : respErr('PROJECT_NOT_FOUND');
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');
  const { id } = await params;
  const action = new URL(req.url).searchParams.get('action') || 'trash';
  if (
    action === 'restore' &&
    (await hasProjectFileCleanupStarted(user.id, id))
  ) {
    return respErr('PROJECT_CLEANUP_ALREADY_STARTED');
  }
  const project =
    action === 'restore'
      ? await restoreProject(id, user.id)
      : action === 'purge'
        ? await purgeProjectContent(id, user.id)
        : await moveProjectToTrash(id, user.id);
  return project ? respData(project) : respErr('PROJECT_NOT_FOUND');
}
