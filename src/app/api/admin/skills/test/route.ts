import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { getRuntimeSkillContext } from '@/shared/services/ai/skill-context';
import { hasAllPermissions } from '@/shared/services/rbac';

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (
      !user ||
      !(await hasAllPermissions(user.id, [
        PERMISSIONS.SETTINGS_READ,
        PERMISSIONS.SETTINGS_WRITE,
      ]))
    ) {
      return respErr('UNAUTHORIZED');
    }
    const body = (await req.json()) as {
      skillVersionId?: string;
      locale?: string;
    };
    if (!body.skillVersionId) return respErr('SKILL_VERSION_REQUIRED');
    const result = await getRuntimeSkillContext(
      body.skillVersionId,
      body.locale === 'en' ? 'en' : 'zh'
    );
    return respData(result);
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'SKILL_TEST_FAILED'
    );
  }
}
