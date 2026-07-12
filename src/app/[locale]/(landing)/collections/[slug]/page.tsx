import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { getPublishedCollectionBySlug } from '@/shared/models/collection';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const collection = await getPublishedCollectionBySlug(slug, locale);
  if (!collection) return {};
  const canonical = `${envConfigs.app_url}${locale === envConfigs.locale ? '' : `/${locale}`}/collections/${slug}`;
  return { title: `${collection.title} | ${envConfigs.app_name}`, description: collection.summary, alternates: { canonical } };
}

export default async function CollectionDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const collection = await getPublishedCollectionBySlug(slug, locale);
  if (!collection) notFound();
  const isZh = locale === 'zh';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.title,
    description: collection.summary,
    url: `${envConfigs.app_url}/${locale}/collections/${collection.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: collection.resources.length,
      itemListElement: collection.resources.map((resource, position) => ({
        '@type': 'ListItem',
        position: position + 1,
        url: `${envConfigs.app_url}/${locale}/resources/${resource.slug}`,
        name: resource.name,
      })),
    },
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href={`/${locale}/collections`} className="text-muted-foreground text-sm font-medium hover:text-foreground">{isZh ? '返回专题' : 'Back to collections'}</Link>
      <article className="mt-8"><div className="flex flex-wrap gap-2">{collection.tags.map((tag) => <span key={tag.id} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{tag.name}</span>)}</div><h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">{collection.title}</h1><p className="text-muted-foreground mt-6 max-w-3xl text-lg leading-8">{collection.summary}</p>{collection.content ? <div className="prose prose-neutral dark:prose-invert mt-10 max-w-none whitespace-pre-wrap">{collection.content}</div> : null}</article>
      <section className="mt-16 border-t pt-8"><div className="flex items-baseline justify-between gap-4"><h2 className="text-2xl font-semibold">{isZh ? '资源清单' : 'Resource checklist'}</h2><span className="text-muted-foreground text-sm">{collection.resources.length}</span></div><ol className="mt-6 space-y-4">{collection.resources.map((resource, index) => <li key={resource.slug} className="flex gap-4 rounded-2xl border p-5"><span className="text-muted-foreground mt-0.5 text-sm font-medium">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Link href={`/${locale}/resources/${resource.slug}`} className="font-semibold hover:text-primary">{resource.name}</Link><span className="text-muted-foreground text-xs">{resource.resourceType}</span></div>{resource.useCase ? <p className="text-muted-foreground mt-2 text-sm leading-6">{resource.useCase}</p> : null}</div>{resource.websiteUrl ? <Link href={resource.websiteUrl} target="_blank" rel="noreferrer" className="text-primary text-sm font-medium">{isZh ? '官网' : 'Site'}</Link> : null}</li>)}</ol></section>
    </main>
  );
}
