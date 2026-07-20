import { setRequestLocale } from 'next-intl/server';

import { CommunityEmailPreferencesSettings } from '@/shared/blocks/community/community-settings';

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
        {locale === 'zh' ? '邮件提醒' : 'Email notifications'}
      </h1>
      <p className="text-muted-foreground mt-2">
        {locale === 'zh'
          ? '分别管理评论待办、文章审核结果和产品营销邮件。'
          : 'Manage comment tasks, article review results, and product marketing separately.'}
      </p>
      <div className="mt-8">
        <CommunityEmailPreferencesSettings locale={locale} />
      </div>
    </div>
  );
}
