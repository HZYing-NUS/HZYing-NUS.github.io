import { getTranslations } from 'next-intl/server';

import { Empty } from '@/shared/blocks/common';
import { ArticleAuthorWorkspace } from '@/shared/blocks/community/article-author-workspace';
import { getUserInfo } from '@/shared/models/user';

export default async function CommunityArticlesPage() {
  const [user, t] = await Promise.all([
    getUserInfo(),
    getTranslations('community.author'),
  ]);
  if (!user) return <Empty message={t('authRequired')} />;
  return <ArticleAuthorWorkspace />;
}
