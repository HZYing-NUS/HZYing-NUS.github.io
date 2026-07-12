import { permanentRedirect } from 'next/navigation';

export default async function DocsContentPage({
  params,
}: {
  params: Promise<{ locale?: string }>;
}) {
  const { locale = 'zh' } = await params;
  permanentRedirect(`/${locale}/resources`);
}
