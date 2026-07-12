import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';

import { getPublicResourceFilters, getPublishedResources } from '@/shared/models/resource';
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
  searchParams: Promise<{
    type?: string;
    stage?: string;
    category?: string;
    tag?: string;
    pricing?: string;
  }>;
}) {
  const { locale } = await params;
  const { type = '', stage = '', category = '', tag = '', pricing = '' } = await searchParams;
  setRequestLocale(locale);
  const isZh = locale === 'zh';
  const [resources, filters] = await Promise.all([
    getPublishedResources({
      locale,
      resourceType: type,
      stageId: stage,
      categoryId: category,
      pricingType: pricing,
    }),
    getPublicResourceFilters(locale),
  ]);
  const visibleResources = tag ? resources.filter((resource) => resource.tags.some((item) => item.id === tag)) : resources;
  const resourceTypes = Array.from(new Set(resources.map((resource) => resource.resourceType).filter(Boolean)));
  const priceTypes = Array.from(new Set(resources.map((resource) => resource.pricingType).filter(Boolean))) as string[];
  const queryFor = (overrides: Record<string, string>) => {
    const next = new URLSearchParams({ type, stage, category, tag, pricing, ...overrides });
    Array.from(next.entries()).forEach(([key, value]) => !value && next.delete(key));
    const value = next.toString();
    return `/${locale}/resources${value ? `?${value}` : ''}`;
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-[0.3em]">Resources</p>
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
        <FilterLinks label={isZh ? '类型' : 'Type'} items={resourceTypes.map((item) => ({ id: item, name: item }))} value={type} allLabel={isZh ? '全部资源' : 'All resources'} allHref={queryFor({ type: '' })} hrefFor={(item) => queryFor({ type: item.id })} />
        <FilterLinks label={isZh ? '阶段' : 'Stage'} items={filters.stages} value={stage} allLabel={isZh ? '全部阶段' : 'All stages'} allHref={queryFor({ stage: '' })} hrefFor={(item) => queryFor({ stage: item.id })} />
        <FilterLinks label={isZh ? '分类' : 'Category'} items={filters.categories} value={category} allLabel={isZh ? '全部分类' : 'All categories'} allHref={queryFor({ category: '' })} hrefFor={(item) => queryFor({ category: item.id })} />
        <FilterLinks label={isZh ? '标签' : 'Tag'} items={filters.tags} value={tag} allLabel={isZh ? '全部标签' : 'All tags'} allHref={queryFor({ tag: '' })} hrefFor={(item) => queryFor({ tag: item.id })} />
        <FilterLinks label={isZh ? '价格' : 'Pricing'} items={priceTypes.map((item) => ({ id: item, name: item }))} value={pricing} allLabel={isZh ? '全部价格' : 'All pricing'} allHref={queryFor({ pricing: '' })} hrefFor={(item) => queryFor({ pricing: item.id })} />
      </section>

      {visibleResources.length ? (
        <section className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleResources.map((resource) => (
            <article key={resource.slug} className="flex flex-col rounded-3xl border bg-background p-6 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {[resource.resourceType, resource.stage, resource.category, resource.pricingType].filter(Boolean).map((item) => (
                  <span key={item} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{item}</span>
                ))}
              </div>
              <h2 className="mt-4 text-xl font-semibold leading-snug">{resource.name}</h2>
              <p className="text-muted-foreground mt-3 text-sm leading-6">{resource.summary}</p>
              <div className="mt-5 space-y-3 text-sm leading-6">
                {resource.reason ? <p><span className="font-medium">{isZh ? '推荐理由：' : 'Why: '}</span><span className="text-muted-foreground">{resource.reason}</span></p> : null}
                {resource.useCase ? <p><span className="font-medium">{isZh ? '使用场景：' : 'Use case: '}</span><span className="text-muted-foreground">{resource.useCase}</span></p> : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {resource.tags.map((item) => <span key={item.id} className="text-muted-foreground rounded-full border px-3 py-1 text-xs">{item.name}</span>)}
              </div>
              <Link href={`/${locale}/resources/${resource.slug}`} className="text-primary mt-6 inline-flex text-sm font-medium">{isZh ? '查看资源详情' : 'View resource details'}</Link>
            </article>
          ))}
        </section>
      ) : (
        <section className="text-muted-foreground mt-10 rounded-3xl border border-dashed px-6 py-16 text-center">
          {isZh ? '暂时没有符合当前筛选条件的已发布资源。' : 'No published resources match the current filters.'}
        </section>
      )}
    </main>
  );
}

function FilterLinks({
  label,
  items,
  value,
  allLabel,
  allHref,
  hrefFor,
}: {
  label: string;
  items: { id: string; name: string }[];
  value: string;
  allLabel: string;
  allHref: string;
  hrefFor: (item: { id: string; name: string }) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-muted-foreground mr-1 text-xs font-medium">{label}</span>
      <Link href={allHref} className={`rounded-full px-3 py-1.5 text-xs font-medium ${!value ? 'bg-primary text-primary-foreground' : 'border bg-background'}`}>{allLabel}</Link>
      {items.map((item) => <Link key={item.id} href={hrefFor(item)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${value === item.id ? 'bg-primary text-primary-foreground' : 'border bg-background'}`}>{item.name}</Link>)}
    </div>
  );
}
