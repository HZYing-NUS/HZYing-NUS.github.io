import { setRequestLocale } from 'next-intl/server';

import { CommunityAdminProfileDetail } from '@/shared/blocks/community/profile-admin-detail';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireCommunityAdmin();
  return <CommunityAdminProfileDetail profileId={id} isZh={locale === 'zh'} />;
}
