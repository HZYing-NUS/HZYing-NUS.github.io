import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { CommunityContentActions } from '@/shared/blocks/community/content-actions';
import { getPublishedCollections } from '@/shared/models/collection';
import { getPublishedResourceBySlug } from '@/shared/models/resource';
import { getSignUser } from '@/shared/models/user';
import { getCommunityInteractionState } from '@/shared/services/community/interactions';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const resource = await getPublishedResourceBySlug(slug, locale);
  if (!resource) return {};
  const canonical = `${envConfigs.app_url}${locale === envConfigs.locale ? '' : `/${locale}`}/resources/${slug}`;
  return {
    title: `${resource.name} | ${envConfigs.app_name}`,
    description: resource.summary,
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
  const [resource, collections, currentUser] = await Promise.all([
    getPublishedResourceBySlug(slug, locale),
    getPublishedCollections(locale),
    getSignUser(),
  ]);
  if (!resource) notFound();
  const interactionState = currentUser
    ? await getCommunityInteractionState({
        userId: currentUser.id,
        targetType: 'resource',
        targetId: resource.id,
      })
    : { liked: false, bookmarked: false };

  const isZh = locale === 'zh';
  const relatedCollections = collections.filter((collection) =>
    collection.resources.some((item) => item.slug === resource.slug)
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: resource.name,
    description: resource.summary,
    url: `${envConfigs.app_url}/${locale}/resources/${resource.slug}`,
    applicationCategory: resource.resourceType,
    offers: resource.pricingType
      ? {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          category: resource.pricingType,
        }
      : undefined,
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href={`/${locale}/resources`}
        className="text-muted-foreground hover:text-foreground text-sm font-medium"
      >
        {isZh ? '返回资源库' : 'Back to resources'}
      </Link>
      <article className="mt-8">
        <div className="flex flex-wrap gap-2">
          {[
            resource.resourceType,
            resource.stage,
            ...resource.stages
              .filter((item) => !item.isPrimary)
              .map((item) => item.name),
            resource.category,
            resource.pricingType,
          ]
            .filter(Boolean)
            .map((item) => (
              <span
                key={item}
                className="bg-muted rounded-full px-3 py-1 text-xs font-medium"
              >
                {item}
              </span>
            ))}
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
          {resource.name}
        </h1>
        <p className="text-muted-foreground mt-6 max-w-3xl text-lg leading-8">
          {resource.summary}
        </p>
        <div className="mt-7 flex flex-wrap gap-2">
          {resource.tags.map((tag) => (
            <span
              key={tag.id}
              className="text-muted-foreground rounded-full border px-3 py-1 text-sm"
            >
              {tag.name}
            </span>
          ))}
        </div>
        {resource.websiteUrl ? (
          <Link
            href={resource.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-primary text-primary-foreground mt-8 inline-flex rounded-xl px-5 py-3 text-sm font-medium"
          >
            {isZh ? '访问官网' : 'Visit website'}
          </Link>
        ) : null}
        {currentUser && (
          <CommunityContentActions
            targetId={resource.id}
            targetType="resource"
            initialBookmarked={interactionState.bookmarked}
            locale={locale}
          />
        )}
      </article>
      <section className="mt-16 grid gap-6 md:grid-cols-2">
        {resource.reason ? (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold">
              {isZh ? '推荐理由' : 'Why it is included'}
            </h2>
            <p className="text-muted-foreground mt-3 leading-7">
              {resource.reason}
            </p>
          </div>
        ) : null}
        {resource.useCase ? (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold">
              {isZh ? '使用场景' : 'When to use it'}
            </h2>
            <p className="text-muted-foreground mt-3 leading-7">
              {resource.useCase}
            </p>
          </div>
        ) : null}
      </section>
      {relatedCollections.length ? (
        <section className="mt-16 border-t pt-8">
          <h2 className="text-2xl font-semibold">
            {isZh ? '相关专题' : 'Related collections'}
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {relatedCollections.map((collection) => (
              <Link
                key={collection.slug}
                href={`/${locale}/collections/${collection.slug}`}
                className="hover:border-primary rounded-2xl border p-5 transition"
              >
                <p className="text-sm font-medium">{collection.title}</p>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {collection.summary}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
