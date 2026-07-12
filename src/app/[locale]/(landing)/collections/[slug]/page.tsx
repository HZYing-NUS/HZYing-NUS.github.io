import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import {
  getResourcesBySlugs,
  pickLocaleText,
  platformCollections,
} from '@/config/seed/platform-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const collection = platformCollections.find((item) => item.slug === slug);
  const title = collection ? pickLocaleText(collection.title, locale) : 'Collection';
  const description = collection ? pickLocaleText(collection.summary, locale) : '';
  const canonical = `${envConfigs.app_url}${locale === envConfigs.locale ? '' : `/${locale}`}/collections/${slug}`;

  return {
    title: `${title} | ${envConfigs.app_name}`,
    description,
    alternates: { canonical },
  };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const collection = platformCollections.find((item) => item.slug === slug);
  if (!collection) notFound();

  const isZh = locale === 'zh';
  const resources = getResourcesBySlugs(collection.resourceSlugs);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <Link href={`/${locale}/collections`} className="text-muted-foreground text-sm font-medium hover:text-foreground">
        {isZh ? '返回专题' : 'Back to collections'}
      </Link>

      <article className="mt-8">
        <div className="flex flex-wrap gap-2">
          {[pickLocaleText(collection.stage, locale), pickLocaleText(collection.category, locale)].map((item) => (
            <span key={item} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
              {item}
            </span>
          ))}
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
          {pickLocaleText(collection.title, locale)}
        </h1>
        <p className="text-muted-foreground mt-6 max-w-3xl text-lg leading-8">
          {pickLocaleText(collection.summary, locale)}
        </p>
        <div className="mt-7 flex flex-wrap gap-2">
          {collection.tags.map((tag) => (
            <span key={pickLocaleText(tag, locale)} className="text-muted-foreground rounded-full border px-3 py-1 text-sm">
              {pickLocaleText(tag, locale)}
            </span>
          ))}
        </div>
      </article>

      <section className="mt-16 border-t pt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-semibold">{isZh ? '资源清单' : 'Resource checklist'}</h2>
          <span className="text-muted-foreground text-sm">{resources.length}</span>
        </div>
        <ol className="mt-6 space-y-4">
          {resources.map((resource, index) => (
            <li key={resource.slug} className="flex gap-4 rounded-2xl border p-5">
              <span className="text-muted-foreground mt-0.5 text-sm font-medium">{String(index + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/${locale}/resources/${resource.slug}`} className="font-semibold hover:text-primary">
                    {pickLocaleText(resource.name, locale)}
                  </Link>
                  <span className="text-muted-foreground text-xs">{pickLocaleText(resource.type, locale)}</span>
                </div>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {pickLocaleText(resource.useCase, locale)}
                </p>
              </div>
              <Link
                href={resource.website}
                target="_blank"
                rel="noreferrer"
                className="text-primary text-sm font-medium"
              >
                {isZh ? '官网' : 'Site'}
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
