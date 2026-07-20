import { envConfigs } from '@/config';
import { respData, respErr } from '@/shared/lib/resp';
import { getReferralDashboard } from '@/shared/models/referral';
import { getUserInfo } from '@/shared/models/user';

export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');
    const dashboard = await getReferralDashboard(user.id);
    return respData({
      ...dashboard,
      inviteUrl: `${envConfigs.app_url}/api/referrals/invite/${dashboard.inviteCode}`,
    });
  } catch (error) {
    console.error('get referral dashboard failed', error);
    return respErr('get referral dashboard failed');
  }
}
