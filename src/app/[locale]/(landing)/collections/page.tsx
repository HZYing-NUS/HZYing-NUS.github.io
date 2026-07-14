import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';

import { CheckCircle2, ListChecks, Target } from 'lucide-react';

import { getPublishedCollections } from '@/shared/models/collection';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: '行动专题',
  description: '围绕任务目标组织 AI Web SaaS 资源和文章。',
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
  const collections = await getPublishedCollections(locale);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-[0.3em]">
          {isZh ? 'Action guides' : 'Action guides'}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {isZh ? '行动专题' : 'Action guides'}
        </h1>
        <p className="text-muted-foreground mt-6 text-lg">
          {isZh
            ? '围绕一个明确目标，按步骤组合资源与文章，把任务真正完成。'
            : 'Follow a goal-oriented sequence of resources and articles to complete a real task.'}
        </p>
      </section>

      {collections.length ? (
        <section className="mt-14 space-y-6">
          {collections.map((collection) => {
            const firstResource = collection.resources.at(0);
            const resourceCount = collection.resources.length;

            return (
              <article
                key={collection.slug}
                className="rounded-2xl border bg-background p-6 shadow-sm md:p-8"
              >
                <div className="flex flex-wrap gap-2">
                  {collection.tags.map((item) => (
                    <span key={item.id} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                      {item.name}
                    </span>
                  ))}
                </div>

                <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Target className="size-4" aria-hidden="true" />
                      {isZh ? '任务目标' : 'Task goal'}
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight">{collection.title}</h2>
                    <p className="text-muted-foreground mt-4 leading-7">{collection.summary}</p>
                    <Link
                      href={`/${locale}/collections/${collection.slug}`}
                      className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary"
                    >
                      <ListChecks className="size-4" aria-hidden="true" />
                      {isZh ? '开始此专题' : 'Start this guide'}
                    </Link>
                  </div>

                  <div className="border-l-0 border-muted pt-1 lg:border-l lg:pl-7">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                      {isZh ? '完成后你会得到' : 'What you will get'}
                    </div>
                    <p className="text-muted-foreground mt-3 text-sm leading-6">
                      {isZh
                        ? `完成这条路线中 ${resourceCount} 项关键资源的配置与验证。`
                        : `A verified setup across ${resourceCount} essential resources in this guide.`}
                    </p>
                    <div className="mt-6 border-t pt-4">
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.16em]">
                        {isZh ? '从这里开始' : 'Start here'}
                      </p>
                      {firstResource ? (
                        <Link
                          href={`/${locale}/resources/${firstResource.slug}`}
                          className="mt-2 block text-sm font-medium transition hover:text-primary"
                        >
                          1. {firstResource.name}
                        </Link>
                      ) : (
                        <p className="text-muted-foreground mt-2 text-sm">
                          {isZh ? '资源正在整理中。' : 'Resources are being prepared.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="text-muted-foreground mt-14 rounded-2xl border border-dashed px-6 py-16 text-center">
          {isZh ? '暂时没有已发布行动专题。' : 'No published action guides yet.'}
        </section>
      )}
    </main>
  );
}
