import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { getThemeLayout } from '@/core/theme';
import { LocaleDetector, TopBanner } from '@/shared/blocks/common';
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
      {header.topbanner?.text ? (
        <TopBanner
          id="topbanner"
          text={header.topbanner.text}
          buttonText={header.topbanner.buttonText}
          href={header.topbanner.href}
          target={header.topbanner.target}
          closable
          rememberDismiss
          dismissedExpiryDays={header.topbanner.dismissedExpiryDays ?? 1}
        />
      ) : null}
      {children}
    </Layout>
  );
}
