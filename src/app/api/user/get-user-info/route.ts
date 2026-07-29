import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import {
  claimAndGrantNewUserCredits,
  getRemainingCredits,
} from '@/shared/models/credit';
import {
  getTrustedCreditIdentity,
  getUserInfo,
  getUserPublicUsername,
} from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

export async function POST() {
  try {
    // get sign user info
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    // check if user is admin
    const isAdmin = await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS);

    const [identityHash, publicUsername] = await Promise.all([
      getTrustedCreditIdentity(user.id),
      getUserPublicUsername(user.id),
    ]);
    if (identityHash) {
      await claimAndGrantNewUserCredits({ user, identityHash });
    }

    // get remaining credits
    const remainingCredits = await getRemainingCredits(user.id);

    return respData({
      ...user,
      isAdmin,
      publicUsername,
      credits: { remainingCredits },
    });
  } catch (e) {
    console.log('get user info failed:', e);
    return respErr('get user info failed');
  }
}
