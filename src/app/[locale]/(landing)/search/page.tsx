import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';

import { legacyPosts } from '@/config/seed/legacy-content';
import { pickLocaleText, searchPlatformContent } from '@/config/seed/platform-content';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: '搜索',
  description: '搜索资源、专题、文章和关于我。',
  canonicalUrl: '/search',
});

function pickLegacyText(value: unknown, locale: string) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'zh' in value) {
    const record = value as { zh?: string; en?: string };
    return locale === 'en' ? record.en || record.zh || '' : record.zh || record.en || '';
  }
  return '';
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q = '' } = await searchParams;
  setRequestLocale(locale);
  const isZh = locale === 'zh';
  const keyword = q.trim().toLowerCase();
  const { resources, collections } = searchPlatformContent(keyword, locale);
  const posts = legacyPosts.filter((post) => {
    if (!keyword) return post.locale === locale;
    return (
      post.locale === locale &&
      `${pickLegacyText(post.title, locale)} ${pickLegacyText(post.summary, locale)}`
        .toLowerCase()
        .includes(keyword)
    );
  });
  const resultCount = resources.length + collections.length + posts.length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-[0.3em]">
          Search
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {isZh ? '站内搜索' : 'Site search'}
        </h1>
        <p className="text-muted-foreground mt-6 text-lg">
          {isZh
            ? '当前已覆盖第一批资源、专题和旧博客种子数据；后续会替换为 PostgreSQL 全站搜索。'
            : 'Currently covers the initial resource, collection, and legacy post seed data; later this will move to PostgreSQL site search.'}
        </p>
      </section>

      <form className="mt-10 flex gap-3" action={`/${locale}/search`}>
        <input
          name="q"
          defaultValue={q}
          placeholder={isZh ? '输入关键词' : 'Search keyword'}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex-1 rounded-2xl border px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        />
        <button className="bg-primary text-primary-foreground rounded-2xl px-6 py-3 text-sm font-medium">
          {isZh ? '搜索' : 'Search'}
        </button>
      </form>

      <p className="text-muted-foreground mt-6 text-sm">
        {isZh ? `找到 ${resultCount} 条结果` : `${resultCount} results found`}
      </p>

      <section className="mt-8 space-y-10">
        {resources.length ? (
          <div>
            <h2 className="text-2xl font-semibold">{isZh ? '资源' : 'Resources'}</h2>
            <div className="mt-4 space-y-4">
              {resources.map((resource) => (
                <article key={resource.slug} className="rounded-3xl border p-6">
                  <p className="text-muted-foreground text-sm">
                    {pickLocaleText(resource.type, locale)} · {pickLocaleText(resource.stage, locale)}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">{pickLocaleText(resource.name, locale)}</h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-6">
                    {pickLocaleText(resource.summary, locale)}
                  </p>
                  <Link href={resource.website} target="_blank" className="text-primary mt-4 inline-flex text-sm font-medium">
                    {isZh ? '访问官网' : 'Visit website'}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {collections.length ? (
          <div>
            <h2 className="text-2xl font-semibold">{isZh ? '专题' : 'Collections'}</h2>
            <div className="mt-4 space-y-4">
              {collections.map((collection) => (
                <article key={collection.slug} className="rounded-3xl border p-6">
                  <p className="text-muted-foreground text-sm">
                    {pickLocaleText(collection.stage, locale)} · {pickLocaleText(collection.category, locale)}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">{pickLocaleText(collection.title, locale)}</h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-6">
                    {pickLocaleText(collection.summary, locale)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {posts.length ? (
          <div>
            <h2 className="text-2xl font-semibold">{isZh ? '文章' : 'Articles'}</h2>
            <div className="mt-4 space-y-4">
              {posts.map((post) => (
                <article key={post.slug} className="rounded-3xl border p-6">
                  <p className="text-muted-foreground text-sm">{post.publishedAt}</p>
                  <h3 className="mt-2 text-xl font-semibold">
                    {pickLegacyText(post.title, locale)}
                  </h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-6">
                    {pickLegacyText(post.summary, locale)}
                  </p>
                  <Link href={`/${locale}/blog/${post.slug}`} className="text-primary mt-4 inline-flex text-sm font-medium">
                    {isZh ? '阅读文章' : 'Read article'}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {!resultCount ? (
          <div className="rounded-3xl border bg-muted/40 p-8 text-center">
            <h2 className="text-xl font-semibold">{isZh ? '没有找到结果' : 'No results found'}</h2>
            <p className="text-muted-foreground mt-3 text-sm">
              {isZh ? '换一个关键词试试，例如 Vercel、SEO、Claude Code。' : 'Try another keyword, such as Vercel, SEO, or Claude Code.'}
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
