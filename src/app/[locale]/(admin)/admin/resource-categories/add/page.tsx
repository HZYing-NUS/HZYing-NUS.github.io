import { setRequestLocale } from 'next-intl/server';

import { ResourceTaxonomyAddPage } from '@/shared/pages/resource-taxonomy';

export default async function AddResourceCategoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ResourceTaxonomyAddPage locale={locale} kind="category" />;
}
