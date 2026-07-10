import { setRequestLocale } from 'next-intl/server';

import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: '专题',
  description: '按任务目标组织 AI Web SaaS 资源和文章。',
  canonicalUrl: '/collections',
});

const examples = [
  '从 0 做一个 AI SaaS Landing Page',
  'Claude Code 开发资源',
  'SEO 工具清单',
  'AI 模型榜单合集',
  '需求发现网站合集',
  'Vercel + Neon 上线清单',
];

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

      <section className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {examples.map((title) => (
          <article key={title} className="rounded-3xl border p-6">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-muted-foreground mt-3 text-sm">
              {isZh
                ? '示例专题，后续将从数据库读取并关联资源与文章。'
                : 'Example collection. Later this will load from the database and link resources with articles.'}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
