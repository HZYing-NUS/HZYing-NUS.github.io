import { generateId } from 'ai';

import { respData, respErr } from '@/shared/lib/resp';
import { createProject, getProjects } from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';

export async function GET(req: Request) {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');

  const status = new URL(req.url).searchParams.get('status') || 'active';
  if (!['active', 'deleted'].includes(status)) return respErr('INVALID_STATUS');
  return respData(await getProjects(user.id, status));
}

export async function POST(req: Request) {
  const user = await getUserInfo();
  if (!user) return respErr('UNAUTHORIZED');

  const body = await req.json();
  const name = String(body.name || '').trim();
  if (!name) return respErr('PROJECT_NAME_REQUIRED');

  return respData(
    await createProject({
      id: generateId().toLowerCase(),
      userId: user.id,
      name: name.slice(0, 100),
      description: String(body.description || '').trim() || null,
      targetAudience: String(body.targetAudience || '').trim() || null,
      stage: String(body.stage || '').trim() || null,
      technology: String(body.technology || '').trim() || null,
      currentProblem: String(body.currentProblem || '').trim() || null,
      nextSteps: String(body.nextSteps || '').trim() || null,
    })
  );
}
