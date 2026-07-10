import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';

import { getResourcesBySlugs, pickLocaleText, platformCollections } from '@/config/seed/platform-content';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: '专题',
  description: '按任务目标组织 AI Web SaaS 资源和文章。',
  canonicalUrl: '/collections',
});

export default async function CollectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isZh = locale === 'zh';

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-[0.3em]">
          Collections
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {isZh ? '专题 / 合集' : 'Collections'}
        </h1>
        <p className="text-muted-foreground mt-6 text-lg">
          {isZh
            ? '专题把资源和文章按任务目标组织成可直接使用的清单，避免资源库变成散乱链接列表。'
            : 'Collections organize resources and articles by task, turning scattered links into usable playbooks.'}
        </p>
      </section>

      <section className="mt-14 space-y-6">
        {platformCollections.map((collection) => {
          const resources = getResourcesBySlugs(collection.resourceSlugs);

          return (
            <article key={collection.slug} className="rounded-3xl border bg-background p-6 shadow-sm md:p-8">
              <div className="flex flex-wrap gap-2">
                {[pickLocaleText(collection.stage, locale), pickLocaleText(collection.category, locale)].map((item) => (
                  <span key={item} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_340px]">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {pickLocaleText(collection.title, locale)}
                  </h2>
                  <p className="text-muted-foreground mt-4 leading-7">
                    {pickLocaleText(collection.summary, locale)}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {collection.tags.map((tag) => (
                      <span key={pickLocaleText(tag, locale)} className="text-muted-foreground rounded-full border px-3 py-1 text-xs">
                        {pickLocaleText(tag, locale)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="text-sm font-medium">{isZh ? '关联资源' : 'Linked resources'}</p>
                  <div className="mt-3 space-y-2">
                    {resources.map((resource) => (
                      <Link
                        key={resource.slug}
                        href={resource.website}
                        target="_blank"
                        className="block rounded-xl border bg-background px-4 py-3 text-sm font-medium transition hover:border-primary"
                      >
                        {pickLocaleText(resource.name, locale)}
                        <span className="text-muted-foreground ml-2 font-normal">
                          {pickLocaleText(resource.type, locale)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
