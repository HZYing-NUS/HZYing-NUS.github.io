import { setRequestLocale } from 'next-intl/server';

import { CommunityCommentsManager } from '@/shared/blocks/community/community-settings';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <CommunitySettingsPage title={locale === 'zh' ? '评论管理' : 'Comments'}>
      <CommunityCommentsManager locale={locale} />
    </CommunitySettingsPage>
  );
}

function CommunitySettingsPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-3xl font-semibold">{title}</h1>
      <div className="mt-8">{children}</div>
    </div>
  );
}
