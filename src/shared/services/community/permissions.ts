import { canAccessAdmin } from '@/core/rbac';
import { getSignUser } from '@/shared/models/user';

export class CommunityPermissionError extends Error {}

export async function requireCommunityUser() {
  const user = await getSignUser();
  if (!user) throw new CommunityPermissionError('User not authenticated');
  return user;
}

export async function requireCommunityOwner(ownerId: string) {
  const user = await requireCommunityUser();
  if (user.id !== ownerId && !(await canAccessAdmin(user.id))) {
    throw new CommunityPermissionError('Resource ownership required');
  }
  return user;
}

export async function requireCommunityAdmin() {
  const user = await requireCommunityUser();
  if (!(await canAccessAdmin(user.id))) {
    throw new CommunityPermissionError('Administrator access required');
  }
  return user;
}
