import { setRequestLocale } from 'next-intl/server';

import { legacyPosts } from '@/config/seed/legacy-content';
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
  const posts = legacyPosts.filter((post) => {
    if (!keyword) return post.locale === locale;
    return (
      post.locale === locale &&
      `${pickLegacyText(post.title, locale)} ${pickLegacyText(post.summary, locale)}`
        .toLowerCase()
        .includes(keyword)
    );
  });

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
            ? 'V1 搜索将覆盖资源、专题、文章和关于我。当前先展示旧博客种子数据的搜索结果。'
            : 'V1 search will cover resources, collections, articles, and profile content. For now it searches the legacy post seed.'}
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

      <section className="mt-10 space-y-4">
        {posts.map((post) => (
          <article key={post.slug} className="rounded-3xl border p-6">
            <p className="text-muted-foreground text-sm">{post.publishedAt}</p>
            <h2 className="mt-2 text-xl font-semibold">
              {pickLegacyText(post.title, locale)}
            </h2>
            <p className="text-muted-foreground mt-3 text-sm">
              {pickLegacyText(post.summary, locale)}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
