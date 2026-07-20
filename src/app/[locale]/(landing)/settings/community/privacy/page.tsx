import { setRequestLocale } from 'next-intl/server';

import { CommunityPrivacySettings } from '@/shared/blocks/community/community-settings';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div>
      <h1 className="text-3xl font-semibold">
        {locale === 'zh' ? '隐私设置' : 'Privacy'}
      </h1>
      <p className="text-muted-foreground mt-2">
        {locale === 'zh'
          ? '数量仍可公开，名单和记录可分别隐藏；你本人和管理员始终可查看完整数据。'
          : 'Counts remain visible while lists and activity can be hidden independently. You and administrators retain full access.'}
      </p>
      <div className="mt-8">
        <CommunityPrivacySettings locale={locale} />
      </div>
    </div>
  );
}
