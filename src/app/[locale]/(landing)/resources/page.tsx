import Link from 'next/link';
import {
  ArrowUpRight,
  BarChart3,
  Blocks,
  Compass,
  Lightbulb,
  Megaphone,
  Palette,
  Rocket,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';

import { getMetadata } from '@/shared/lib/seo';
import {
  getPublicResourceFilters,
  getPublishedResources,
} from '@/shared/models/resource';

export const generateMetadata = getMetadata({
  title: '资源库',
  description: '按真实建站阶段整理的 AI Web 产品工具与网站。',
  canonicalUrl: '/resources',
});

const stageStyle = [
  { icon: Compass },
  { icon: Lightbulb },
  { icon: Palette },
  { icon: Blocks },
  { icon: Rocket },
  { icon: BarChart3 },
  { icon: Megaphone },
];

export default async function ResourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    type?: string;
    stage?: string;
    category?: string;
    tag?: string;
    pricing?: string;
    usage?: string;
  }>;
}) {
  const { locale } = await params;
  const {
    q = '',
    type = '',
    stage = '',
    category = '',
    tag = '',
    pricing = '',
    usage = '',
  } = await searchParams;
  setRequestLocale(locale);
  const isZh = locale === 'zh';
  const [resources, filters] = await Promise.all([
    getPublishedResources({
      locale,
      query: q,
      resourceType: type,
      stageId: stage,
      categoryId: category,
      pricingType: pricing,
    }),
    getPublicResourceFilters(locale),
  ]);
  const visibleResources = resources.filter(
    (resource) =>
      (!tag || resource.tags.some((item) => item.id === tag)) &&
      (!usage || resource.usageStatus === usage)
  );
  const priceTypes = Array.from(
    new Set(resources.map((resource) => resource.pricingType).filter(Boolean))
  ) as string[];
  const queryFor = (overrides: Record<string, string>) => {
    const next = new URLSearchParams({
      q,
      type,
      stage,
      category,
      tag,
      pricing,
      usage,
      ...overrides,
    });
    Array.from(next.entries()).forEach(
      ([key, value]) => !value && next.delete(key)
    );
    const value = next.toString();
    return `/${locale}/resources${value ? `?${value}` : ''}`;
  };
  const hasAdvancedFilters = Boolean(category || pricing || usage);

  return (
    <main className="overflow-hidden pb-24">
      <section className="relative border-b bg-[radial-gradient(circle_at_20%_10%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_34%),linear-gradient(to_bottom,color-mix(in_oklab,var(--muted)_25%,transparent),transparent)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_22%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_22%,transparent)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_85%)] bg-[size:48px_48px]" />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-10 md:py-24">
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="flex items-center gap-3 text-xs font-semibold tracking-[0.24em] uppercase">
                <span className="bg-primary size-2 rounded-full" />
                {isZh ? '真实建站资源库' : 'A field-tested resource library'}
              </div>
              <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-[1.05] tracking-tight md:text-7xl">
                {isZh ? '你现在做到哪一步，' : 'Start with the step'}
                <span className="text-muted-foreground block italic">
                  {isZh ? '就从哪一步找工具。' : 'you are actually on.'}
                </span>
              </h1>
              <p className="text-muted-foreground mt-7 max-w-2xl text-base leading-8 md:text-lg">
                {isZh
                  ? '这些不是批量收录的链接。我在找需求、做原型、开发、上线和运营时真实使用或持续关注，并按任务重新整理。'
                  : 'This is not a bulk directory. These are tools I use or actively follow while researching, prototyping, building, launching, and operating web products.'}
              </p>
            </div>
            <aside className="bg-background/75 rounded-3xl border p-6 shadow-sm backdrop-blur">
              <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
                {isZh ? '收录原则' : 'Editorial standard'}
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <Stat
                  value={filters.totalResources}
                  label={isZh ? '已核验' : 'Verified'}
                />
                <Stat
                  value={filters.stages.length}
                  label={isZh ? '阶段' : 'Stages'}
                />
                <Stat
                  value={filters.categories.length}
                  label={isZh ? '分类' : 'Categories'}
                />
              </div>
              <p className="text-muted-foreground mt-5 border-t pt-5 text-sm leading-6">
                {isZh
                  ? '每条资源都说明它解决什么问题、什么时候使用，以及需要注意什么。'
                  : 'Every entry explains the problem it solves, when to use it, and what to watch for.'}
              </p>
            </aside>
          </div>

          <form
            className="mt-12 flex flex-col gap-3 sm:flex-row"
            action={`/${locale}/resources`}
          >
            <label className="bg-background focus-within:ring-primary flex min-w-0 flex-1 items-center gap-3 rounded-2xl border px-4 shadow-sm focus-within:ring-2">
              <Search
                className="text-muted-foreground size-5 shrink-0"
                aria-hidden="true"
              />
              <input
                name="q"
                defaultValue={q}
                placeholder={
                  isZh
                    ? '例如：找域名、做 MVP、看竞品流量……'
                    : 'Try: find a domain, build an MVP, research competitor traffic...'
                }
                className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <button className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 rounded-xl px-7 text-sm font-semibold shadow-sm transition duration-200">
              {isZh ? '搜索资源' : 'Search resources'}
            </button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 md:px-10">
        <section className="relative z-10 -mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-7">
          {filters.stages.map((item, index) => {
            const stageVisual = stageStyle[index] || stageStyle.at(-1)!;
            const Icon = stageVisual.icon;
            return (
              <Link
                key={item.id}
                href={queryFor({ stage: stage === item.id ? '' : item.id })}
                className={`group rounded-2xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${stage === item.id ? 'bg-foreground text-background' : 'bg-background'}`}
              >
                <Icon
                  className={`size-5 ${stage === item.id ? 'text-background' : 'text-primary'}`}
                  aria-hidden="true"
                />
                <p className="mt-5 text-sm leading-5 font-semibold">
                  {item.name}
                </p>
              </Link>
            );
          })}
        </section>

        <details
          className="bg-muted/20 mt-8 rounded-2xl border"
          open={hasAdvancedFilters}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              {isZh ? '更多筛选' : 'More filters'}
            </span>
            {hasAdvancedFilters ? (
              <Link
                href={`/${locale}/resources${q ? `?q=${encodeURIComponent(q)}` : ''}`}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                {isZh ? '清除筛选' : 'Clear filters'}
              </Link>
            ) : null}
          </summary>
          <div className="border-t px-5 py-4">
            <FilterLinks
              label={isZh ? '分类' : 'Category'}
              items={filters.categories}
              value={category}
              allLabel={isZh ? '全部分类' : 'All categories'}
              allHref={queryFor({ category: '' })}
              hrefFor={(item) => queryFor({ category: item.id })}
            />
            <FilterLinks
              label={isZh ? '使用状态' : 'Usage'}
              items={usageOptions(isZh)}
              value={usage}
              allLabel={isZh ? '全部状态' : 'All usage'}
              allHref={queryFor({ usage: '' })}
              hrefFor={(item) => queryFor({ usage: item.id })}
            />
            <FilterLinks
              label={isZh ? '价格' : 'Pricing'}
              items={priceTypes.map((item) => ({
                id: item,
                name: priceLabel(item, isZh),
              }))}
              value={pricing}
              allLabel={isZh ? '全部价格' : 'All pricing'}
              allHref={queryFor({ pricing: '' })}
              hrefFor={(item) => queryFor({ pricing: item.id })}
            />
          </div>
        </details>

        <section className="mt-12 flex items-end justify-between gap-6 border-b pb-5">
          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
              {stage
                ? isZh
                  ? '当前阶段'
                  : 'Current stage'
                : isZh
                  ? '全部资源'
                  : 'All resources'}
            </p>
            <h2 className="mt-2 font-serif text-3xl tracking-tight">
              {stage
                ? filters.stages.find((item) => item.id === stage)?.name
                : isZh
                  ? '从真实任务出发选择'
                  : 'Choose by the task at hand'}
            </h2>
          </div>
          <p className="text-muted-foreground shrink-0 text-sm">
            {isZh
              ? `${visibleResources.length} 个结果`
              : `${visibleResources.length} results`}
          </p>
        </section>

        {visibleResources.length ? (
          <section className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleResources.map((resource, index) => (
              <article
                key={resource.slug}
                className="group bg-background relative flex min-h-[390px] flex-col overflow-hidden rounded-3xl border p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="text-muted-foreground/35 absolute top-3 right-5 font-serif text-5xl italic">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="relative flex items-center gap-2">
                  <UsageBadge status={resource.usageStatus} isZh={isZh} />
                  {resource.featured ? (
                    <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-[11px] font-semibold">
                      {isZh ? '重点推荐' : 'Featured'}
                    </span>
                  ) : null}
                </div>
                <div className="relative mt-8">
                  <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
                    {resource.category}
                  </p>
                  <h3 className="mt-3 text-2xl leading-tight font-semibold tracking-tight">
                    {resource.name}
                  </h3>
                  <p className="text-muted-foreground mt-4 text-sm leading-6">
                    {resource.summary}
                  </p>
                </div>
                <div className="mt-5 border-l-2 pl-4 text-sm leading-6">
                  <p className="font-semibold">
                    {isZh ? '它解决什么问题' : 'What it helps with'}
                  </p>
                  <p className="text-muted-foreground mt-1 line-clamp-3">
                    {resource.useCase}
                  </p>
                </div>
                <div className="mt-auto pt-7">
                  <div className="flex flex-wrap gap-2">
                    {resource.tags.slice(0, 3).map((item) => (
                      <span
                        key={item.id}
                        className="bg-muted rounded-full px-2.5 py-1 text-[11px] font-medium"
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/${locale}/resources/${resource.slug}`}
                    className="mt-6 flex items-center justify-between border-t pt-4 text-sm font-semibold"
                  >
                    {isZh ? '查看实际用法' : 'View practical guidance'}
                    <ArrowUpRight
                      className="size-4 transition group-hover:translate-x-1 group-hover:-translate-y-1"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="text-muted-foreground mt-8 rounded-3xl border border-dashed px-6 py-20 text-center">
            <Sparkles className="mx-auto size-7" aria-hidden="true" />
            <p className="mt-4">
              {isZh
                ? '暂时没有符合当前条件的资源。试试清除部分筛选。'
                : 'No resources match these filters. Try clearing some selections.'}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-serif text-3xl">{value}</p>
      <p className="text-muted-foreground mt-1 text-[11px]">{label}</p>
    </div>
  );
}

function UsageBadge({ status, isZh }: { status: string; isZh: boolean }) {
  const labels: Record<string, string> = {
    daily: isZh ? '每天关注' : 'Daily',
    used: isZh ? '实际使用' : 'Used',
    occasional: isZh ? '按需使用' : 'As needed',
  };
  return (
    <span className="bg-foreground text-background rounded-full px-2.5 py-1 text-[11px] font-semibold">
      {labels[status] || labels.used}
    </span>
  );
}

function usageOptions(isZh: boolean) {
  return [
    { id: 'daily', name: isZh ? '每天关注' : 'Daily' },
    { id: 'used', name: isZh ? '实际使用' : 'Used' },
    { id: 'occasional', name: isZh ? '按需使用' : 'As needed' },
  ];
}

function priceLabel(value: string, isZh: boolean) {
  const labels: Record<string, [string, string]> = {
    free: ['免费', 'Free'],
    freemium: ['免费增值', 'Freemium'],
    paid: ['付费', 'Paid'],
    'open-source': ['开源', 'Open source'],
    'pay-per-project-or-item': ['按项目或商品付费', 'Pay per item'],
  };
  return labels[value]?.[isZh ? 0 : 1] || value;
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
      <span className="text-muted-foreground mr-1 w-16 text-xs font-semibold">
        {label}
      </span>
      <Link
        href={allHref}
        className={`rounded-full px-3 py-1.5 text-xs font-medium ${!value ? 'bg-foreground text-background' : 'bg-background border'}`}
      >
        {allLabel}
      </Link>
      {items.map((item) => (
        <Link
          key={item.id}
          href={hrefFor(item)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${value === item.id ? 'bg-foreground text-background' : 'bg-background border'}`}
        >
          {item.name}
        </Link>
      ))}
    </div>
  );
}
