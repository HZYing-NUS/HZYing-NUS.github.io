import { setRequestLocale } from 'next-intl/server';

import { CommunityAdminArticleList } from '@/shared/blocks/community/article-admin-list';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireCommunityAdmin();
  return <CommunityAdminArticleList />;
}
