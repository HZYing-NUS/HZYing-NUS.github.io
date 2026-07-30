import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarCheck2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Compass,
  ExternalLink,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
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
  const usageLabels: Record<string, string> = {
    daily: isZh ? '每天关注' : 'Followed daily',
    used: isZh ? '实际使用' : 'Actually used',
    occasional: isZh ? '按需使用' : 'Used as needed',
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: resource.name,
    description: resource.summary,
    url: `${envConfigs.app_url}/${locale}/resources/${resource.slug}`,
    applicationCategory: resource.resourceType,
  };

  return (
    <main className="overflow-hidden pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="relative border-b bg-[radial-gradient(circle_at_75%_15%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_32%),linear-gradient(to_bottom,color-mix(in_oklab,var(--muted)_35%,transparent),transparent)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_24%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_24%,transparent)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent)] bg-[size:54px_54px]" />
        <div className="relative mx-auto max-w-6xl px-5 py-14 md:px-10 md:py-20">
          <Link
            href={`/${locale}/resources`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {isZh ? '返回资源库' : 'Back to resources'}
          </Link>

          <div className="mt-10 grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-foreground text-background rounded-full px-3 py-1.5 text-xs font-semibold">
                  {usageLabels[resource.usageStatus] || usageLabels.used}
                </span>
                <span className="bg-background rounded-full border px-3 py-1.5 text-xs font-semibold">
                  {resource.stage}
                </span>
                <span className="bg-background rounded-full border px-3 py-1.5 text-xs font-semibold">
                  {priceLabel(resource.pricingType, isZh)}
                </span>
              </div>
              <p className="text-muted-foreground mt-7 text-xs font-semibold tracking-[0.2em] uppercase">
                {resource.category}
              </p>
              <h1 className="mt-3 font-serif text-5xl leading-none tracking-tight md:text-7xl">
                {resource.name}
              </h1>
              <p className="text-muted-foreground mt-7 max-w-3xl text-lg leading-8">
                {resource.summary}
              </p>
            </div>

            <aside className="bg-background/80 rounded-3xl border p-6 shadow-sm backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CalendarCheck2
                  className="text-primary size-4"
                  aria-hidden="true"
                />
                {isZh ? '内容核验' : 'Content verification'}
              </div>
              <p className="mt-3 font-serif text-2xl">
                {resource.verifiedAt ||
                  (isZh ? '已人工核验' : 'Manually verified')}
              </p>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {isZh
                  ? '用途基于官网实际页面核对，不仅依据网站名称或第三方介绍。'
                  : 'Purpose checked against the live official site, not inferred only from its name or third-party descriptions.'}
              </p>
              {resource.websiteUrl ? (
                <Link
                  href={resource.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-primary text-primary-foreground mt-6 flex items-center justify-between rounded-2xl px-5 py-3 text-sm font-semibold"
                >
                  {isZh ? '访问官网' : 'Visit official site'}
                  <ExternalLink className="size-4" aria-hidden="true" />
                </Link>
              ) : null}
            </aside>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 md:px-10">
        <CommunityContentActions
          targetId={resource.id}
          targetType="resource"
          canInteract={Boolean(currentUser)}
          initialBookmarked={interactionState.bookmarked}
          locale={locale}
          callbackUrl={`/${locale}/resources/${resource.slug}`}
          projectHref="/chat/projects"
          aiHref={`/chat?question=${encodeURIComponent(
            isZh
              ? `我正在评估 ${resource.name}，请结合这个资源告诉我下一步应该怎么用。`
              : `I am evaluating ${resource.name}. Based on this resource, tell me what I should do next.`
          )}`}
          restrictedActionDescription={
            isZh
              ? '资源说明可以直接阅读。登录后可以收藏资源、进入项目工作区，或让 AI 结合当前资源继续回答。'
              : 'You can read the resource guidance now. Sign in to bookmark it, continue in a project, or ask AI about it.'
          }
        />

        <section className="bg-border mt-14 grid gap-px overflow-hidden rounded-3xl border lg:grid-cols-3">
          <EditorialBlock
            icon={Lightbulb}
            eyebrow={isZh ? '为什么收录' : 'Why it is here'}
            title={isZh ? '推荐理由' : 'Editorial reason'}
            body={resource.reason}
          />
          <EditorialBlock
            icon={Compass}
            eyebrow={isZh ? '什么时候用' : 'When to use it'}
            title={isZh ? '实际使用场景' : 'Practical use case'}
            body={resource.useCase}
          />
          <EditorialBlock
            icon={CheckCircle2}
            eyebrow={isZh ? '适用阶段' : 'Applicable stages'}
            title={resource.stage}
            body={resource.stages
              .map((item) => item.name)
              .join(isZh ? '、' : ', ')}
          />
        </section>

        {resource.caution || resource.notFor ? (
          <section className="mt-10 grid gap-5 md:grid-cols-2">
            {resource.caution ? (
              <div className="bg-accent/65 rounded-3xl border p-6">
                <div className="text-accent-foreground flex items-center gap-2 font-semibold">
                  <CircleAlert className="size-5" aria-hidden="true" />
                  {isZh ? '使用前注意' : 'Watch before using'}
                </div>
                <p className="text-muted-foreground mt-4 text-sm leading-7">
                  {resource.caution}
                </p>
              </div>
            ) : null}
            {resource.notFor ? (
              <div className="bg-muted/30 rounded-3xl border p-6">
                <div className="flex items-center gap-2 font-semibold">
                  <Clock3 className="size-5" aria-hidden="true" />
                  {isZh ? '不适合什么情况' : 'When it is not a fit'}
                </div>
                <p className="text-muted-foreground mt-4 text-sm leading-7">
                  {resource.notFor}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="mt-14 border-t pt-9">
          <div className="grid gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
                {isZh ? '资源属性' : 'Resource profile'}
              </p>
              <h2 className="mt-3 font-serif text-3xl">
                {isZh ? '快速判断是否适合' : 'Decide if it fits'}
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Fact
                label={isZh ? '资源类型' : 'Resource type'}
                value={resource.resourceType}
              />
              <Fact
                label={isZh ? '主要分类' : 'Primary category'}
                value={resource.category}
              />
              <Fact
                label={isZh ? '价格方式' : 'Pricing'}
                value={priceLabel(resource.pricingType, isZh)}
              />
              <Fact
                label={isZh ? '使用状态' : 'Usage status'}
                value={usageLabels[resource.usageStatus] || usageLabels.used}
              />
            </div>
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            {resource.tags.map((tag) => (
              <span
                key={tag.id}
                className="bg-muted rounded-full px-3 py-1.5 text-xs font-medium"
              >
                {tag.name}
              </span>
            ))}
          </div>
        </section>

        {relatedCollections.length ? (
          <section className="mt-16 border-t pt-9">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
                  {isZh ? '下一步' : 'Next step'}
                </p>
                <h2 className="mt-3 font-serif text-3xl">
                  {isZh ? '把工具放进行动路线' : 'Put the tool into a workflow'}
                </h2>
              </div>
              <Sparkles className="text-primary size-7" aria-hidden="true" />
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {relatedCollections.map((collection) => (
                <Link
                  key={collection.slug}
                  href={`/${locale}/collections/${collection.slug}`}
                  className="group rounded-3xl border p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
                    {isZh
                      ? `${collection.resources.length} 步行动专题`
                      : `${collection.resources.length}-step guide`}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold">
                    {collection.title}
                  </h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-6">
                    {collection.summary}
                  </p>
                  <span className="mt-6 flex items-center justify-between border-t pt-4 text-sm font-semibold">
                    {isZh ? '查看执行路线' : 'Open the workflow'}
                    <ArrowUpRight className="size-4 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function EditorialBlock({
  icon: Icon,
  eyebrow,
  title,
  body,
}: {
  icon: typeof Lightbulb;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-background p-7">
      <Icon className="text-primary size-5" aria-hidden="true" />
      <p className="text-muted-foreground mt-6 text-xs font-semibold tracking-[0.16em] uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-4 text-sm leading-7">{body}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/25 rounded-2xl border p-5">
      <p className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
        {label}
      </p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
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
