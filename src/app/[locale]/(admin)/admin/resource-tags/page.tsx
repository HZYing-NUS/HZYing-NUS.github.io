import { setRequestLocale } from 'next-intl/server';

import { ResourceTaxonomyListPage } from '@/shared/pages/resource-taxonomy';

export default async function ResourceTagsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ResourceTaxonomyListPage locale={locale} kind="tag" />;
}
