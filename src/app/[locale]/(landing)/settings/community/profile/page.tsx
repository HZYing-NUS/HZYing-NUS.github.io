import { permanentRedirect } from 'next/navigation';

export default async function CommunityProfileSettingsRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  permanentRedirect(`/${locale}/settings/profile`);
}
