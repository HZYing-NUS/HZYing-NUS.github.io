import { respData, respErr } from '@/shared/lib/resp';
import {
  getCollectionProgress,
  setCollectionStepProgress,
} from '@/shared/models/collection-progress';
import { getSignUser } from '@/shared/models/user';
import { parseCollectionProgressUpdate } from '@/shared/services/collection-progress-policy';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSignUser();
  if (!user) return respErr('UNAUTHORIZED');
  const { id } = await params;
  return respData(await getCollectionProgress(user.id, id));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSignUser();
  if (!user) return respErr('UNAUTHORIZED');
  const update = parseCollectionProgressUpdate(
    await request.json().catch(() => null)
  );
  if (!update) return respErr('INVALID_PROGRESS_UPDATE');
  const { id } = await params;
  const completedResourceIds = await setCollectionStepProgress({
    userId: user.id,
    collectionId: id,
    ...update,
  });
  return completedResourceIds
    ? respData({ completedResourceIds })
    : respErr('COLLECTION_STEP_NOT_FOUND');
}
