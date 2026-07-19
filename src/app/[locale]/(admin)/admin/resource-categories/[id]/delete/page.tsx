import { setRequestLocale } from 'next-intl/server';

import { ResourceTaxonomyDeletePage } from '@/shared/pages/resource-taxonomy';

export default async function DeleteResourceCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <ResourceTaxonomyDeletePage locale={locale} kind="category" id={id} />;
}
