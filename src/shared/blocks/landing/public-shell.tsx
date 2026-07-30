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
    <div className="webtools-public">
      <a
        href="#webtools-public-content"
        className="bg-background text-foreground focus:ring-ring sr-only fixed top-3 left-3 z-[60] rounded-lg px-4 py-2 shadow-md focus:not-sr-only focus:ring-2 focus:outline-none"
      >
        {t('header.skip_to_content')}
      </a>
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
        <div id="webtools-public-content" tabIndex={-1}>
          {children}
        </div>
      </Layout>
    </div>
  );
}
