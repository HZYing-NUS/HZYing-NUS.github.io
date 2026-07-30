import Link from 'next/link';
import {
  IconArrowUpRight,
  IconChecklist,
  IconClock,
  IconRoute,
  IconTargetArrow,
} from '@tabler/icons-react';
import { setRequestLocale } from 'next-intl/server';

import { getMetadata } from '@/shared/lib/seo';
import { getPublishedCollections } from '@/shared/models/collection';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isZh = locale === 'zh';

  return getMetadata({
    title: isZh ? '行动专题' : 'Action guides',
    description: isZh
      ? '围绕真实建站任务组织资源、产出和完成标准。'
      : 'Follow focused web product tasks with clear resources, outputs, and completion criteria.',
    canonicalUrl: '/collections',
  })({ params: Promise.resolve({ locale }) });
}

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
    <main className="overflow-hidden pb-24">
      <section className="relative border-b bg-[radial-gradient(circle_at_82%_18%,color-mix(in_oklab,var(--primary)_13%,transparent),transparent_30%),linear-gradient(to_bottom,color-mix(in_oklab,var(--muted)_30%,transparent),transparent)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_20%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_20%,transparent)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_88%)] bg-[size:52px_52px]" />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-10 md:py-24">
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
                {isZh ? '从任务开始' : 'Start from the task'}
              </p>
              <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[1.05] tracking-tight md:text-7xl">
                {isZh ? '少选工具，' : 'Choose fewer tools.'}
                <span className="text-muted-foreground block italic">
                  {isZh ? '多完成一步。' : 'Finish the next step.'}
                </span>
              </h1>
              <p className="text-muted-foreground mt-7 max-w-2xl text-base leading-8 md:text-lg">
                {isZh
                  ? '每条专题围绕一个明确结果，告诉你先做什么、留下什么证据，以及做到什么程度可以进入下一步。'
                  : 'Each guide focuses on one result: what to do first, what evidence to keep, and when you are ready to move on.'}
              </p>
            </div>

            <aside className="bg-background/80 rounded-3xl border p-6 shadow-sm backdrop-blur">
              <IconRoute className="text-primary size-6" aria-hidden="true" />
              <p className="mt-5 font-serif text-3xl tabular-nums">
                {collections.length}
              </p>
              <p className="mt-1 font-semibold">
                {isZh ? '条首批核心路线' : 'core starting guides'}
              </p>
              <p className="text-muted-foreground mt-4 border-t pt-4 text-sm leading-6">
                {isZh
                  ? '当前先覆盖问题发现、想法验证和可测试原型，不为了数量提前扩展。'
                  : 'The first release covers problem discovery, idea validation, and a testable prototype. More guides come after these are proven useful.'}
              </p>
            </aside>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 md:px-10">
        {collections.length ? (
          <section className="mt-14 space-y-7">
            {collections.map((collection, index) => {
              const firstStep = collection.resources.at(0);
              const deliverable = collection.deliverables.at(0);

              return (
                <article
                  key={collection.slug}
                  className="group bg-background relative overflow-hidden rounded-3xl border p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md md:p-9"
                >
                  <span className="text-muted-foreground/25 absolute top-3 right-6 font-serif text-7xl italic tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="relative grid gap-9 lg:grid-cols-[minmax(0,1fr)_310px]">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        {collection.tags.map((item) => (
                          <span
                            key={item.id}
                            className="bg-muted rounded-full px-3 py-1 text-xs font-medium"
                          >
                            {item.name}
                          </span>
                        ))}
                      </div>

                      <div className="text-primary mt-7 flex items-center gap-2 text-sm font-semibold">
                        <IconTargetArrow
                          className="size-5"
                          aria-hidden="true"
                        />
                        {isZh ? '任务目标' : 'Task goal'}
                      </div>
                      <h2 className="mt-3 max-w-2xl font-serif text-3xl leading-tight tracking-tight md:text-4xl">
                        {collection.title}
                      </h2>
                      <p className="text-muted-foreground mt-5 max-w-2xl leading-7">
                        {collection.summary}
                      </p>

                      <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                        <span className="flex items-center gap-2">
                          <IconClock
                            className="text-muted-foreground size-4"
                            aria-hidden="true"
                          />
                          {collection.duration}
                        </span>
                        <span className="flex items-center gap-2">
                          <IconChecklist
                            className="text-muted-foreground size-4"
                            aria-hidden="true"
                          />
                          {isZh
                            ? `${collection.resources.length} 个执行环节`
                            : `${collection.resources.length} execution steps`}
                        </span>
                      </div>

                      <Link
                        href={`/${locale}/collections/${collection.slug}`}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-8 inline-flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-semibold shadow-sm transition duration-200 hover:-translate-y-0.5 active:translate-y-0"
                      >
                        {isZh ? '开始执行这条路线' : 'Start this guide'}
                        <IconArrowUpRight
                          className="size-4"
                          aria-hidden="true"
                        />
                      </Link>
                    </div>

                    <aside className="bg-muted/30 rounded-2xl p-5 md:p-6">
                      <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
                        {isZh ? '完成后留下' : 'What you keep'}
                      </p>
                      <p className="mt-3 leading-7 font-medium">
                        {deliverable ||
                          (isZh
                            ? '一份可以进入下一步的明确产出。'
                            : 'A concrete output that supports the next step.')}
                      </p>

                      <div className="mt-7 border-t pt-5">
                        <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
                          {isZh ? '第一步' : 'First move'}
                        </p>
                        <p className="mt-3 text-sm font-semibold">
                          {firstStep?.stepTitle || firstStep?.name}
                        </p>
                        <p className="text-muted-foreground mt-2 text-sm leading-6">
                          {firstStep
                            ? `${isZh ? '使用' : 'Use'} ${firstStep.name}`
                            : isZh
                              ? '执行步骤正在整理。'
                              : 'Execution steps are being prepared.'}
                        </p>
                      </div>
                    </aside>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="mt-14 rounded-3xl border border-dashed px-6 py-20 text-center">
            <IconRoute
              className="text-muted-foreground mx-auto size-8"
              aria-hidden="true"
            />
            <h2 className="mt-5 font-serif text-3xl">
              {isZh ? '新的行动路线正在核验' : 'New guides are being verified'}
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-xl leading-7">
              {isZh
                ? '我们会先确认工具和步骤仍然有效，再把专题重新发布。你仍然可以从资源库按建站阶段查找工具。'
                : 'Guides return only after their tools and steps are checked. You can still browse the resource library by product stage.'}
            </p>
            <Link
              href={`/${locale}/resources`}
              className="text-primary mt-6 inline-flex items-center gap-2 font-semibold"
            >
              {isZh ? '先查看资源库' : 'Browse resources'}
              <IconArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
