import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import {
  pickLocaleText,
  platformCollections,
  platformResources,
} from '@/config/seed/platform-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const resource = platformResources.find((item) => item.slug === slug);
  const title = resource ? pickLocaleText(resource.name, locale) : 'Resource';
  const description = resource ? pickLocaleText(resource.summary, locale) : '';
  const canonical = `${envConfigs.app_url}${locale === envConfigs.locale ? '' : `/${locale}`}/resources/${slug}`;

  return {
    title: `${title} | ${envConfigs.app_name}`,
    description,
    alternates: { canonical },
  };
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const resource = platformResources.find((item) => item.slug === slug);
  if (!resource) notFound();

  const isZh = locale === 'zh';
  const relatedCollections = platformCollections.filter((collection) =>
    collection.resourceSlugs.includes(resource.slug)
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <Link href={`/${locale}/resources`} className="text-muted-foreground text-sm font-medium hover:text-foreground">
        {isZh ? '返回资源库' : 'Back to resources'}
      </Link>

      <article className="mt-8">
        <div className="flex flex-wrap gap-2">
          {[pickLocaleText(resource.type, locale), pickLocaleText(resource.stage, locale), pickLocaleText(resource.priceType, locale)].map((item) => (
            <span key={item} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
              {item}
            </span>
          ))}
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
          {pickLocaleText(resource.name, locale)}
        </h1>
        <p className="text-muted-foreground mt-6 max-w-3xl text-lg leading-8">
          {pickLocaleText(resource.summary, locale)}
        </p>
        <div className="mt-7 flex flex-wrap gap-2">
          {resource.tags.map((tag) => (
            <span key={pickLocaleText(tag, locale)} className="text-muted-foreground rounded-full border px-3 py-1 text-sm">
              {pickLocaleText(tag, locale)}
            </span>
          ))}
        </div>
        <Link
          href={resource.website}
          target="_blank"
          rel="noreferrer"
          className="bg-primary text-primary-foreground mt-8 inline-flex rounded-xl px-5 py-3 text-sm font-medium"
        >
          {isZh ? '访问官网' : 'Visit website'}
        </Link>
      </article>

      <section className="mt-16 grid gap-6 md:grid-cols-2">
        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold">{isZh ? '推荐理由' : 'Why it is included'}</h2>
          <p className="text-muted-foreground mt-3 leading-7">
            {pickLocaleText(resource.reason, locale)}
          </p>
        </div>
        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold">{isZh ? '使用场景' : 'When to use it'}</h2>
          <p className="text-muted-foreground mt-3 leading-7">
            {pickLocaleText(resource.useCase, locale)}
          </p>
        </div>
      </section>

      {relatedCollections.length ? (
        <section className="mt-16 border-t pt-8">
          <h2 className="text-2xl font-semibold">{isZh ? '相关专题' : 'Related collections'}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {relatedCollections.map((collection) => (
              <Link
                key={collection.slug}
                href={`/${locale}/collections/${collection.slug}`}
                className="rounded-2xl border p-5 transition hover:border-primary"
              >
                <p className="text-sm font-medium">{pickLocaleText(collection.title, locale)}</p>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {pickLocaleText(collection.summary, locale)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
