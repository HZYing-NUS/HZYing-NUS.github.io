import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { getThemeLayout } from '@/core/theme';
import { LocaleDetector } from '@/shared/blocks/common';
import type {
  Footer as FooterType,
  Header as HeaderType,
} from '@/shared/types/blocks/landing';

export async function PublicLandingShell({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations('landing');
  const Layout = await getThemeLayout('landing');
  const header: HeaderType = t.raw('header');
  const footer: FooterType = t.raw('footer');

  if (header.nav?.items) {
    header.nav.items = header.nav.items.filter((item) =>
      ['/', '/resources', '/collections', '/blog'].includes(item.url || '')
    );
  }
  if (footer.nav?.items) {
    footer.nav.items = footer.nav.items.map((group) => ({
      ...group,
      children: group.children?.filter((item) => item.url !== '/about'),
    }));
  }

  return (
    <Layout header={header} footer={footer}>
      <LocaleDetector />
      {children}
    </Layout>
  );
}
