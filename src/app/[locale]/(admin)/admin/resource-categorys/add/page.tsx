import { redirect } from 'next/navigation';

export default async function LegacyAddResourceCategoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/admin/resource-categories/add`);
}
