import { setRequestLocale } from 'next-intl/server';

import {
  CommunityBookmarksManager,
  CommunityListsManager,
} from '@/shared/blocks/community/community-settings';

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
        {locale === 'zh' ? '我的内容' : 'My content'}
      </h1>
      <p className="text-muted-foreground mt-2">
        {locale === 'zh'
          ? '管理默认公开或私密的内容夹。资源、行动专题、文章和内容夹收藏通过各内容页操作。'
          : 'Manage public-by-default or private lists. Bookmark resources, collections, articles, and public lists from their pages.'}
      </p>
      <div className="mt-8">
        <CommunityListsManager locale={locale} />
      </div>
      <div className="mt-12 border-t pt-10">
        <CommunityBookmarksManager locale={locale} />
      </div>
    </div>
  );
}
