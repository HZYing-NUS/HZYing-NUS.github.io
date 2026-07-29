import { setRequestLocale } from 'next-intl/server';

import { CommunityAdminProfileList } from '@/shared/blocks/community/profile-admin-list';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ username?: string }>;
}) {
  const [{ locale }, search] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  await requireCommunityAdmin();
  return (
    <CommunityAdminProfileList
      isZh={locale === 'zh'}
      initialQuery={search.username || ''}
    />
  );
}
