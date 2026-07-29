import { permanentRedirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

export default async function AdminProfileCompatibilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireCommunityAdmin();

  if (envConfigs.community_about_username) {
    permanentRedirect(
      `/${locale}/admin/community/profiles?username=${encodeURIComponent(envConfigs.community_about_username)}`
    );
  }

  return (
    <main className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold">
        {locale === 'zh' ? '旧版“关于我”管理入口' : 'Legacy About admin entry'}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
        {locale === 'zh'
          ? '旧版结构化“关于我”编辑器已经停用。配置 COMMUNITY_ABOUT_USERNAME 后，此地址会自动进入对应作者主页的后台管理列表；当前未配置实际公开用户名，因此不会猜测或硬编码。'
          : 'The legacy structured About editor is retired. After COMMUNITY_ABOUT_USERNAME is configured, this URL opens the matching creator profile in the admin list. No production username is configured, so this page does not guess or hard-code one.'}
      </p>
      <Link
        href="/admin/community/profiles"
        className="text-primary mt-6 inline-flex font-medium"
      >
        {locale === 'zh'
          ? '进入作者主页管理'
          : 'Open creator profile management'}
      </Link>
    </main>
  );
}
