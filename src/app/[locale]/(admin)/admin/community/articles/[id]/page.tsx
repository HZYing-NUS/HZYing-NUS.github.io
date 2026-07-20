import { setRequestLocale } from 'next-intl/server';

import { CommunityAdminArticleReview } from '@/shared/blocks/community/article-admin-review';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireCommunityAdmin();
  return <CommunityAdminArticleReview articleId={id} />;
}
