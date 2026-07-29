import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';

import { PublicProfileCard } from '@/shared/blocks/community/public-profile-card';
import { getMetadata } from '@/shared/lib/seo';
import { getPublishedCollections } from '@/shared/models/collection';
import { listPublicCommunityProfiles } from '@/shared/models/community';
import { searchPublishedPosts } from '@/shared/models/post';
import { getPublishedResources } from '@/shared/models/resource';

export const generateMetadata = getMetadata({
  title: '搜索',
  description: '搜索资源、专题、文章和公开作者。',
  canonicalUrl: '/search',
});

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
  const [resources, allCollections, posts, profiles] = await Promise.all([
    getPublishedResources({ locale, query: keyword }),
    getPublishedCollections(locale),
    searchPublishedPosts({ locale, query: keyword }),
    listPublicCommunityProfiles({ query: q, limit: 24 }),
  ]);
  const collections = allCollections.filter(
    (collection) =>
      !keyword ||
      `${collection.title} ${collection.summary}`
        .toLowerCase()
        .includes(keyword)
  );
  const resultCount =
    resources.length + collections.length + posts.length + profiles.length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-muted-foreground text-sm font-medium tracking-[0.3em] uppercase">
          Search
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {isZh ? '站内搜索' : 'Site search'}
        </h1>
        <p className="text-muted-foreground mt-6 text-lg">
          {isZh
            ? '搜索已发布的资源、专题、文章和公开作者。'
            : 'Search published resources, collections, articles, and public authors.'}
        </p>
      </section>
      <form className="mt-10 flex gap-3" action={`/${locale}/search`}>
        <input
          name="q"
          defaultValue={q}
          placeholder={isZh ? '输入关键词' : 'Search keyword'}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex-1 rounded-2xl border px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
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
            <h2 className="text-2xl font-semibold">
              {isZh ? '资源' : 'Resources'}
            </h2>
            <div className="mt-4 space-y-4">
              {resources.map((resource) => (
                <article key={resource.slug} className="rounded-3xl border p-6">
                  <p className="text-muted-foreground text-sm">
                    {[
                      resource.resourceType,
                      resource.stage,
                      ...resource.stages
                        .filter((stage) => !stage.isPrimary)
                        .map((stage) => stage.name),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">
                    {resource.name}
                  </h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-6">
                    {resource.summary}
                  </p>
                  <Link
                    href={`/${locale}/resources/${resource.slug}`}
                    className="text-primary mt-4 inline-flex text-sm font-medium"
                  >
                    {isZh ? '查看资源详情' : 'View resource details'}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        ) : null}
        {collections.length ? (
          <div>
            <h2 className="text-2xl font-semibold">
              {isZh ? '专题' : 'Collections'}
            </h2>
            <div className="mt-4 space-y-4">
              {collections.map((collection) => (
                <article
                  key={collection.slug}
                  className="rounded-3xl border p-6"
                >
                  <h3 className="text-xl font-semibold">{collection.title}</h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-6">
                    {collection.summary}
                  </p>
                  <Link
                    href={`/${locale}/collections/${collection.slug}`}
                    className="text-primary mt-4 inline-flex text-sm font-medium"
                  >
                    {isZh ? '查看专题详情' : 'View collection details'}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        ) : null}
        {posts.length ? (
          <div>
            <h2 className="text-2xl font-semibold">
              {isZh ? '文章' : 'Articles'}
            </h2>
            <div className="mt-4 space-y-4">
              {posts.map((post) => (
                <article key={post.slug} className="rounded-3xl border p-6">
                  <p className="text-muted-foreground text-sm">
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString(locale)
                      : ''}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">{post.title}</h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-6">
                    {post.summary}
                  </p>
                  <Link
                    href={`/${locale}/blog/${post.slug}`}
                    className="text-primary mt-4 inline-flex text-sm font-medium"
                  >
                    {isZh ? '阅读文章' : 'Read article'}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        ) : null}
        {profiles.length ? (
          <div>
            <h2 className="text-2xl font-semibold">
              {isZh ? '作者' : 'Authors'}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {profiles.map((profile) => (
                <PublicProfileCard
                  key={profile.id}
                  profile={profile}
                  locale={locale}
                  viewProfileLabel={isZh ? '查看主页' : 'View profile'}
                  articleCountLabel={(count) =>
                    isZh
                      ? `${count} 篇文章`
                      : `${count} ${count === 1 ? 'article' : 'articles'}`
                  }
                />
              ))}
            </div>
          </div>
        ) : null}
        {!resultCount ? (
          <div className="bg-muted/40 rounded-3xl border p-8 text-center">
            <h2 className="text-xl font-semibold">
              {isZh ? '没有找到结果' : 'No results found'}
            </h2>
            <p className="text-muted-foreground mt-3 text-sm">
              {isZh
                ? '换一个关键词试试，例如 Vercel、SEO、Claude Code。'
                : 'Try another keyword, such as Vercel, SEO, or Claude Code.'}
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
