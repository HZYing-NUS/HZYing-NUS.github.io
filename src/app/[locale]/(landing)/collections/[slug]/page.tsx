import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { ArrowRight, CheckCircle2, Circle, ListChecks, Target } from 'lucide-react';

import { envConfigs } from '@/config';
import { getPublishedCollectionBySlug } from '@/shared/models/collection';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const collection = await getPublishedCollectionBySlug(slug, locale);

  if (!collection) return {};

  const canonical = `${envConfigs.app_url}${locale === envConfigs.locale ? '' : `/${locale}`}/collections/${slug}`;
  return {
    title: `${collection.title} | ${envConfigs.app_name}`,
    description: collection.summary,
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

  const isZh = locale === 'zh';
  const collection = await getPublishedCollectionBySlug(slug, locale);

  if (!collection) notFound();

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
      <Link href={`/${locale}/collections`} className="text-muted-foreground text-sm transition hover:text-primary">
        {isZh ? '返回行动专题' : 'Back to action guides'}
      </Link>

      <section className="mt-8 max-w-3xl">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-[0.3em]">
          {isZh ? 'Action guide' : 'Action guide'}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">{collection.title}</h1>
        <p className="text-muted-foreground mt-6 text-lg leading-8">{collection.summary}</p>
        {collection.content ? (
          <div className="prose prose-neutral dark:prose-invert mt-10 max-w-none whitespace-pre-wrap">
            {collection.content}
          </div>
        ) : null}
      </section>

      <section className="mt-12 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border bg-muted/30 p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Target className="size-4" aria-hidden="true" />
            {isZh ? '任务目标' : 'Task goal'}
          </div>
          <p className="mt-3 leading-7">{collection.summary}</p>
        </div>
        <div className="rounded-2xl border bg-muted/30 p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {isZh ? '完成标准' : 'Completion criteria'}
          </div>
          <p className="mt-3 leading-7">
            {isZh
              ? `完成以下 ${collection.resources.length} 项资源的配置、连接与验证。`
              : `Configure, connect, and verify the ${collection.resources.length} resources listed below.`}
          </p>
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-center gap-3">
          <ListChecks className="size-5 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{isZh ? '执行清单' : 'Execution checklist'}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {isZh ? '按顺序完成。资源是步骤中的工具，不是这条专题本身。' : 'Complete in order. Resources are tools within the steps, not the guide itself.'}
            </p>
          </div>
        </div>

        <ol className="mt-8 space-y-4">
          {collection.resources.map((resource, index) => (
            <li key={resource.slug} className="rounded-2xl border bg-background p-5 md:p-6">
              <div className="flex items-start gap-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{resource.name}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {isZh
                      ? `使用 ${resource.name} 推进此专题中的第 ${index + 1} 个关键环节。`
                      : `Use ${resource.name} to complete step ${index + 1} of this guide.`}
                  </p>
                  <Link
                    href={`/${locale}/resources/${resource.slug}`}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary"
                  >
                    {isZh ? '查看资源与配置建议' : 'View resource and setup guidance'}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
                <Circle className="text-muted-foreground size-5 shrink-0" aria-label={isZh ? '未完成' : 'Incomplete'} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      {collection.resources.length === 0 ? (
        <section className="text-muted-foreground mt-10 rounded-2xl border border-dashed px-6 py-12 text-center">
          {isZh ? '这个专题正在补充执行资源。' : 'This guide is being prepared.'}
        </section>
      ) : null}

    </main>
  );
}
