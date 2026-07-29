import { setRequestLocale } from 'next-intl/server';

import { CommunityModerationAdmin } from '@/shared/blocks/community/moderation-admin';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ review?: string }>;
}) {
  const [{ locale }, search] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireCommunityAdmin();
  return (
    <CommunityModerationAdmin
      isZh={locale === 'zh'}
      initialReviewId={search.review || ''}
    />
  );
}
