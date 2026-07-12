import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';

import { pickLocaleText, platformResources } from '@/config/seed/platform-content';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: '资源库',
  description: 'AI Web SaaS 建站与出海资源库。',
  canonicalUrl: '/resources',
});

export default async function ResourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; stage?: string }>;
}) {
  const { locale } = await params;
  const { type = '', stage = '' } = await searchParams;
  setRequestLocale(locale);
  const isZh = locale === 'zh';
  const resourceTypes = Array.from(new Set(platformResources.map((resource) => pickLocaleText(resource.type, locale))));
  const stages = Array.from(new Set(platformResources.map((resource) => pickLocaleText(resource.stage, locale))));
  const visibleResources = platformResources.filter((resource) => {
    const resourceType = pickLocaleText(resource.type, locale);
    const resourceStage = pickLocaleText(resource.stage, locale);
    return (!type || resourceType === type) && (!stage || resourceStage === stage);
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-[0.3em]">
          Resources
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {isZh ? 'AI Web SaaS 出海资源库' : 'AI Web SaaS Resource Library'}
        </h1>
        <p className="text-muted-foreground mt-6 text-lg">
          {isZh
            ? '按建站流程整理参考网站、工具、插件、Skill、MCP、Starter、组件库、模型榜单和服务商。'
            : 'A workflow-based library for websites, tools, plugins, Skills, MCPs, Starters, UI kits, model rankings, and services.'}
        </p>
      </section>

      <section className="mt-10 rounded-3xl border bg-muted/30 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/resources`}
            className={`rounded-full px-4 py-2 text-sm font-medium ${!type && !stage ? 'bg-primary text-primary-foreground' : 'border bg-background'}`}
          >
            {isZh ? '全部资源' : 'All resources'}
          </Link>
          {resourceTypes.map((item) => (
            <Link
              key={item}
              href={`/${locale}/resources?type=${encodeURIComponent(item)}`}
              className={`rounded-full px-4 py-2 text-sm font-medium ${type === item ? 'bg-primary text-primary-foreground' : 'border bg-background'}`}
            >
              {item}
            </Link>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {stages.map((item) => (
            <Link
              key={item}
              href={`/${locale}/resources?stage=${encodeURIComponent(item)}`}
              className={`rounded-full px-4 py-2 text-sm font-medium ${stage === item ? 'bg-primary text-primary-foreground' : 'border bg-background'}`}
            >
              {item}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {visibleResources.map((resource) => (
          <article key={resource.slug} className="flex flex-col rounded-3xl border bg-background p-6 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {[pickLocaleText(resource.type, locale), pickLocaleText(resource.stage, locale), pickLocaleText(resource.priceType, locale)].map((item) => (
                <span key={item} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {item}
                </span>
              ))}
            </div>
            <h2 className="mt-4 text-xl font-semibold leading-snug">
              {pickLocaleText(resource.name, locale)}
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              {pickLocaleText(resource.summary, locale)}
            </p>
            <div className="mt-5 space-y-3 text-sm leading-6">
              <p>
                <span className="font-medium">{isZh ? '推荐理由：' : 'Why: '}</span>
                <span className="text-muted-foreground">{pickLocaleText(resource.reason, locale)}</span>
              </p>
              <p>
                <span className="font-medium">{isZh ? '使用场景：' : 'Use case: '}</span>
                <span className="text-muted-foreground">{pickLocaleText(resource.useCase, locale)}</span>
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {resource.tags.map((tag) => (
                <span key={pickLocaleText(tag, locale)} className="text-muted-foreground rounded-full border px-3 py-1 text-xs">
                  {pickLocaleText(tag, locale)}
                </span>
              ))}
            </div>
            <Link href={`/${locale}/resources/${resource.slug}`} className="text-primary mt-6 inline-flex text-sm font-medium">
              {isZh ? '查看资源详情' : 'View resource details'}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
