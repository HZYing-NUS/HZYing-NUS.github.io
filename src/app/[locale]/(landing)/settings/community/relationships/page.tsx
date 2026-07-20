import { setRequestLocale } from 'next-intl/server';

import { CommunityRelationshipsManager } from '@/shared/blocks/community/community-settings';

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
        {locale === 'zh' ? '我的关系' : 'Relationships'}
      </h1>
      <div className="mt-8">
        <CommunityRelationshipsManager locale={locale} />
      </div>
    </div>
  );
}
