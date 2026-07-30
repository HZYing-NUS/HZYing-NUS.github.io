import { headers } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { ChatGenerator } from '@/shared/blocks/chat/generator';
import { DynamicPage } from '@/shared/types/blocks/landing';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const hasSession = (await headers()).get('x-session-present') === '1';
  if (hasSession) return <ChatGenerator workspaceHome />;

  const t = await getTranslations('pages.index');
  const page: DynamicPage = t.raw('page');
  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
