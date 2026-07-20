import { setRequestLocale } from 'next-intl/server';

import { CommunityModerationAdmin } from '@/shared/blocks/community/moderation-admin';
import { requireCommunityAdmin } from '@/shared/services/community/permissions';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireCommunityAdmin();
  return <CommunityModerationAdmin isZh={locale === 'zh'} />;
}
