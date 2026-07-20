import { setRequestLocale } from 'next-intl/server';

import { CommunityProfileEditor } from '@/shared/blocks/community/profile-editor';

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
        {locale === 'zh' ? '公开资料与 About' : 'Public profile and About'}
      </h1>
      <p className="text-muted-foreground mt-2">
        {locale === 'zh'
          ? '保存修改稿并提交内容审核。审核期间旧公开版本继续展示。'
          : 'Save a revision and submit it for moderation. The previous public version stays visible during review.'}
      </p>
      <div className="mt-8">
        <CommunityProfileEditor locale={locale} />
      </div>
    </div>
  );
}
