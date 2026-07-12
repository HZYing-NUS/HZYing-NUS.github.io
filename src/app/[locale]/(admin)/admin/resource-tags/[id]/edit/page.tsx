import { setRequestLocale } from 'next-intl/server';

import { ResourceTaxonomyEditPage } from '@/shared/pages/resource-taxonomy';

export default async function EditResourceTagPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <ResourceTaxonomyEditPage locale={locale} kind="tag" id={id} />;
}
