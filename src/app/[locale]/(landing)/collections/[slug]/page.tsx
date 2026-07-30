import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  IconArrowLeft,
  IconArrowUpRight,
  IconCheck,
  IconChecklist,
  IconClock,
  IconExternalLink,
  IconRoute,
  IconTargetArrow,
  IconUsers,
} from '@tabler/icons-react';
import { setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { CollectionProgress } from '@/shared/blocks/community/collection-progress';
import { CommunityContentActions } from '@/shared/blocks/community/content-actions';
import { getPublishedCollectionBySlug } from '@/shared/models/collection';
import { getCollectionProgress } from '@/shared/models/collection-progress';
import { getSignUser } from '@/shared/models/user';
import { getCommunityInteractionState } from '@/shared/services/community/interactions';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const collection = await getPublishedCollectionBySlug(slug, locale);

  if (!collection) return {};

  const localePrefix = locale === envConfigs.locale ? '' : `/${locale}`;
  const canonical = `${envConfigs.app_url}${localePrefix}/collections/${slug}`;
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
  const localePrefix = locale === envConfigs.locale ? '' : `/${locale}`;
  const [collection, currentUser] = await Promise.all([
    getPublishedCollectionBySlug(slug, locale),
    getSignUser(),
  ]);

  if (!collection) notFound();

  const interactionState = currentUser
    ? await getCommunityInteractionState({
        userId: currentUser.id,
        targetType: 'collection',
        targetId: collection.id,
      })
    : { liked: false, bookmarked: false };
  const completedResourceIds = currentUser
    ? await getCollectionProgress(currentUser.id, collection.id)
    : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: collection.title,
    description: collection.summary,
    url: `${envConfigs.app_url}${localePrefix}/collections/${collection.slug}`,
    step: collection.resources.map((resource, position) => ({
      '@type': 'HowToStep',
      position: position + 1,
      name: resource.stepTitle || resource.name,
      ...(currentUser
        ? {
            text: resource.stepDescription,
            url: `${envConfigs.app_url}${localePrefix}/resources/${resource.slug}`,
          }
        : {}),
    })),
  };

  return (
    <main className="overflow-hidden pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="relative border-b bg-[radial-gradient(circle_at_78%_18%,color-mix(in_oklab,var(--primary)_13%,transparent),transparent_30%),linear-gradient(to_bottom,color-mix(in_oklab,var(--muted)_30%,transparent),transparent)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_20%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_20%,transparent)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent)] bg-[size:52px_52px]" />
        <div className="relative mx-auto max-w-6xl px-5 py-14 md:px-10 md:py-20">
          <Link
            href={`/${locale}/collections`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition"
          >
            <IconArrowLeft className="size-4" aria-hidden="true" />
            {isZh ? '返回行动专题' : 'Back to action guides'}
          </Link>

          <div className="mt-10 grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div>
              <div className="flex flex-wrap gap-2">
                {collection.tags.map((item) => (
                  <span
                    key={item.id}
                    className="bg-background rounded-full border px-3 py-1.5 text-xs font-semibold"
                  >
                    {item.name}
                  </span>
                ))}
              </div>
              <h1 className="mt-7 max-w-4xl font-serif text-5xl leading-[1.05] tracking-tight md:text-7xl">
                {collection.title}
              </h1>
              <p className="text-muted-foreground mt-7 max-w-3xl text-lg leading-8">
                {collection.summary}
              </p>
            </div>

            <aside className="bg-background/80 rounded-3xl border p-6 shadow-sm backdrop-blur">
              <div className="flex items-center gap-2 font-semibold">
                <IconClock className="text-primary size-5" aria-hidden="true" />
                {isZh ? '预计用时' : 'Estimated time'}
              </div>
              <p className="mt-3 font-serif text-3xl">
                {collection.duration ||
                  (isZh ? '按步骤完成' : 'Follow the steps')}
              </p>
              <p className="text-muted-foreground mt-4 border-t pt-4 text-sm leading-6">
                {isZh
                  ? `共 ${collection.resources.length} 个执行环节。最近核验：${collection.verifiedAt || '需确认'}。`
                  : `${collection.resources.length} execution steps. Last checked: ${collection.verifiedAt || 'needs verification'}.`}
              </p>
            </aside>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 md:px-10">
        <CommunityContentActions
          targetId={collection.id}
          targetType="collection"
          canInteract={Boolean(currentUser)}
          initialBookmarked={interactionState.bookmarked}
          locale={locale}
          callbackUrl={`/${locale}/collections/${collection.slug}`}
          projectHref="/chat/projects"
          aiHref={`/chat?question=${encodeURIComponent(
            isZh
              ? `我想执行行动专题「${collection.title}」，请结合专题内容帮我从第一步开始。`
              : `I want to follow the action guide “${collection.title}”. Help me start with the first step.`
          )}`}
          restrictedActionLabel={
            isZh ? '登录后收藏专题' : 'Sign in to bookmark'
          }
          restrictedActionDescription={
            isZh
              ? '专题介绍、目标和步骤目录可以直接查看。登录后可查看完整执行说明，并在项目或 AI 工作区中继续。'
              : 'The overview, goals, and step directory are public. Sign in to see the full instructions and continue in a project or the AI workspace.'
          }
        />

        <CollectionProgress
          collectionId={collection.id}
          callbackUrl={`/${locale}/collections/${collection.slug}`}
          locale={locale}
          initialCompletedResourceIds={completedResourceIds}
          steps={collection.resources.map((resource) => ({
            resourceId: resource.id,
            title: resource.stepTitle || resource.name,
            name: resource.name,
          }))}
        />

        <section className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="bg-muted/25 rounded-3xl border p-6 md:p-8">
            <div className="text-primary flex items-center gap-2 font-semibold">
              <IconTargetArrow className="size-5" aria-hidden="true" />
              {isZh ? '为什么现在做' : 'Why this comes now'}
            </div>
            <div className="mt-5 space-y-4 leading-7 whitespace-pre-line">
              {collection.content}
            </div>
          </div>

          <div className="rounded-3xl border p-6 md:p-8">
            <div className="flex items-center gap-2 font-semibold">
              <IconUsers className="text-primary size-5" aria-hidden="true" />
              {isZh ? '适合谁' : 'Who this is for'}
            </div>
            <InfoList items={collection.audience} checked />

            <div className="mt-7 border-t pt-6">
              <div className="flex items-center gap-2 font-semibold">
                <IconChecklist
                  className="text-primary size-5"
                  aria-hidden="true"
                />
                {isZh ? '开始前准备' : 'Before you start'}
              </div>
              <InfoList items={collection.prerequisites} checked />
            </div>
          </div>
        </section>

        <section className="mt-14">
          <div className="max-w-3xl">
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
              {isZh ? '执行路线' : 'Execution route'}
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight">
              {isZh ? '每一步都留下可检查的产出' : 'Every step leaves evidence'}
            </h2>
            <p className="text-muted-foreground mt-4 leading-7">
              {isZh
                ? '按顺序推进。替代方案只在满足对应条件时使用，不需要把同类工具全部做一遍。'
                : 'Move in order. Use an alternative only when its condition fits; you do not need to use every similar tool.'}
            </p>
          </div>

          <ol className="mt-9 space-y-6">
            {collection.resources.map((resource, index) => {
              const stepParts = parseStepDescription(
                resource.stepDescription,
                isZh
              );

              return (
                <li
                  key={resource.slug}
                  className="bg-background relative overflow-hidden rounded-3xl border p-6 shadow-sm md:p-8"
                >
                  <span className="text-muted-foreground/20 absolute top-2 right-6 font-serif text-7xl italic tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div
                    className={`relative grid gap-8 ${currentUser ? 'lg:grid-cols-[230px_minmax(0,1fr)]' : ''}`}
                  >
                    <div>
                      <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
                        {resource.relationType === 'alternative'
                          ? isZh
                            ? '条件式替代方案'
                            : 'Conditional alternative'
                          : isZh
                            ? '主要步骤'
                            : 'Primary step'}
                      </p>
                      <h3 className="mt-3 font-serif text-2xl leading-tight">
                        {resource.stepTitle || resource.name}
                      </h3>
                      <p className="text-muted-foreground mt-3 text-sm leading-6">
                        {resource.name}
                      </p>
                      {currentUser ? (
                        <Link
                          href={`/${locale}/resources/${resource.slug}`}
                          className="text-primary mt-5 inline-flex items-center gap-2 text-sm font-semibold"
                        >
                          {isZh ? '查看资源说明' : 'View resource guidance'}
                          <IconExternalLink
                            className="size-4"
                            aria-hidden="true"
                          />
                        </Link>
                      ) : null}
                    </div>

                    {currentUser ? (
                      <dl className="grid gap-5 sm:grid-cols-2">
                        {stepParts.map((part) => (
                          <div
                            key={part.label}
                            className="bg-muted/25 rounded-2xl p-5"
                          >
                            <dt className="text-sm font-semibold">
                              {part.label}
                            </dt>
                            <dd className="text-muted-foreground mt-2 text-sm leading-6">
                              {part.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
          {!currentUser ? (
            <div className="bg-muted/30 mt-6 rounded-3xl border border-dashed p-7 text-center">
              <p className="font-semibold">
                {isZh
                  ? '登录后查看每一步的动作、产出与通过标准'
                  : 'Sign in to see the action, output, and pass criteria for every step'}
              </p>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {isZh
                  ? '登录不会离开当前专题，完成后会返回这里。'
                  : 'After signing in, you will return to this guide.'}
              </p>
            </div>
          ) : null}
        </section>

        {currentUser ? (
          <section className="mt-14 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border p-6 md:p-8">
              <div className="flex items-center gap-2 font-semibold">
                <IconRoute className="text-primary size-5" aria-hidden="true" />
                {isZh ? '你会得到' : 'What you will have'}
              </div>
              <InfoList items={collection.deliverables} checked />
            </div>

            <div className="bg-foreground text-background rounded-3xl p-6 md:p-8">
              <div className="flex items-center gap-2 font-semibold">
                <IconCheck className="size-5" aria-hidden="true" />
                {isZh ? '完成标准' : 'Completion criteria'}
              </div>
              <InfoList
                items={collection.completionCriteria}
                checked
                inverted
              />
            </div>
          </section>
        ) : null}

        {collection.nextSlug && collection.nextTitle ? (
          <section className="mt-14 border-t pt-10">
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
              {isZh ? '下一步' : 'Next guide'}
            </p>
            <Link
              href={`/${locale}/collections/${collection.nextSlug}`}
              className="group mt-4 flex items-center justify-between gap-6 rounded-3xl border p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-md md:p-8"
            >
              <div>
                <p className="font-serif text-3xl tracking-tight">
                  {collection.nextTitle}
                </p>
                <p className="text-muted-foreground mt-3 text-sm">
                  {isZh
                    ? '带着这次产出继续，不要重新从空白开始。'
                    : 'Carry the evidence forward instead of starting from a blank page.'}
                </p>
              </div>
              <IconArrowUpRight
                className="size-6 shrink-0 transition group-hover:translate-x-1 group-hover:-translate-y-1"
                aria-hidden="true"
              />
            </Link>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function InfoList({
  items,
  checked = false,
  inverted = false,
}: {
  items: string[];
  checked?: boolean;
  inverted?: boolean;
}) {
  if (!items.length) return null;

  return (
    <ul className="mt-5 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm leading-6">
          {checked ? (
            <IconCheck
              className={`mt-0.5 size-4 shrink-0 ${inverted ? 'text-background' : 'text-primary'}`}
              aria-hidden="true"
            />
          ) : null}
          <span
            className={
              inverted ? 'text-background/80' : 'text-muted-foreground'
            }
          >
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

function parseStepDescription(value: string, isZh: boolean) {
  const labels = isZh
    ? ['动作', '产出', '通过标准', '避免']
    : ['Action', 'Output', 'Pass', 'Avoid'];
  const fallbackLabel = isZh ? '执行说明' : 'Guidance';
  const parts = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(':') >= 0 ? ':' : '：';
      const separatorIndex = line.indexOf(separator);
      if (separatorIndex < 0) return null;
      const label = line.slice(0, separatorIndex).trim();
      const content = line.slice(separatorIndex + 1).trim();
      return labels.includes(label) && content
        ? { label, value: content }
        : null;
    })
    .filter((item): item is { label: string; value: string } => Boolean(item));

  return parts.length ? parts : [{ label: fallbackLabel, value }];
}
