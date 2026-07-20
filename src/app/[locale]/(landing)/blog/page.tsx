import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { getMetadata } from '@/shared/lib/seo';
import {
  listCommunityBlogFacets,
  listPublishedCommunityArticles,
} from '@/shared/models/community';
import { getPostsAndCategories } from '@/shared/models/post';
import { getSignUser } from '@/shared/models/user';

export const dynamic = 'force-dynamic';
export const generateMetadata = getMetadata({
  metadataKey: 'pages.blog.metadata',
  canonicalUrl: '/blog',
});

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { locale } = await params;
  const { filter = 'all' } = await searchParams;
  setRequestLocale(locale);
  const [t, user, facets] = await Promise.all([
    getTranslations('pages.blog'),
    getSignUser(),
    listCommunityBlogFacets(),
  ]);
  const followed = filter === 'following';
  const community =
    followed && !user
      ? []
      : await listPublishedCommunityArticles({
          featured: filter === 'featured',
          followedBy: followed ? user?.id : undefined,
        });
  let legacy: Awaited<ReturnType<typeof getPostsAndCategories>>['posts'] = [];
  if (filter === 'all') {
    try {
      legacy = (await getPostsAndCategories({ locale, page: 1, limit: 50 }))
        .posts;
    } catch {}
  }
  return (
    <main className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-4xl font-semibold">{t('page.title')}</h1>
          <p className="text-muted-foreground mt-3">
            {t('page.sections.blog.description')}
          </p>
        </div>
        <Link
          href="/settings/community/articles"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          {t('messages.write')}
        </Link>
      </div>
      <nav className="mt-8 flex gap-2">
        {['all', 'featured', 'following'].map((item) => (
          <Link
            key={item}
            href={item === 'all' ? '/blog' : `/blog?filter=${item}`}
            className={`rounded-full border px-4 py-2 text-sm ${filter === item ? 'bg-foreground text-background' : ''}`}
          >
            {t(`messages.${item}`)}
          </Link>
        ))}
      </nav>
      {(facets.categories.length > 0 || facets.tags.length > 0) && (
        <div className="mt-5 space-y-3 text-sm">
          {facets.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {facets.categories.map((category) => (
                <Link
                  key={category}
                  href={`/blog/category/${category}`}
                  className="rounded-full border px-3 py-1"
                >
                  {category}
                </Link>
              ))}
            </div>
          )}
          {facets.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {facets.tags.map((tag: string) => (
                <Link
                  key={tag}
                  href={`/blog/tag/${tag}`}
                  className="text-muted-foreground rounded-full border px-3 py-1"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
      {followed && !user ? (
        <div className="mt-12 rounded-xl border border-dashed p-10 text-center">
          <p>{t('messages.followingSignIn')}</p>
          <Link href="/sign-in" className="text-primary mt-3 inline-block">
            {t('messages.signIn')}
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {community.map(({ article, revision, profile }) => {
            const title = locale === 'zh' ? revision.titleZh : revision.titleEn;
            const summary =
              locale === 'zh' ? revision.summaryZh : revision.summaryEn;
            return (
              <Link
                key={article.id}
                href={`/blog/${article.slug}`}
                className="bg-card overflow-hidden rounded-2xl border transition hover:-translate-y-1 hover:shadow-lg"
              >
                {revision.coverImageUrl && (
                  <img
                    src={revision.coverImageUrl}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                )}
                <div className="p-5">
                  {article.featured && (
                    <span className="text-primary text-xs font-medium">
                      {t('messages.featured')}
                    </span>
                  )}
                  <h2 className="mt-2 text-xl font-semibold">{title}</h2>
                  <p className="text-muted-foreground mt-3 line-clamp-3 text-sm leading-6">
                    {summary}
                  </p>
                  <p className="text-muted-foreground mt-5 text-xs">
                    {profile?.displayName ||
                      profile?.username ||
                      t('messages.communityAuthor')}
                  </p>
                </div>
              </Link>
            );
          })}
          {legacy.map((post) => (
            <Link
              key={`legacy:${post.id}`}
              href={post.url || `/blog/${post.slug}`}
              className="rounded-2xl border p-5"
            >
              <h2 className="text-xl font-semibold">{post.title}</h2>
              <p className="text-muted-foreground mt-3 line-clamp-3 text-sm">
                {post.description}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
