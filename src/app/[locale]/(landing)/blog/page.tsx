import {
  Bookmark,
  ChevronRight,
  Heart,
  MessageCircle,
  PenLine,
  Sparkles,
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { getMetadata } from '@/shared/lib/seo';
import {
  listCommunityBlogFacets,
  listPublishedCommunityArticles,
  type PublicCommunityArticleRow,
} from '@/shared/models/community';
import { getPostsAndCategories } from '@/shared/models/post';
import { getSignUser } from '@/shared/models/user';
import type { Post } from '@/shared/types/blocks/blog';

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

  const rankedArticles = community
    .slice()
    .sort((left, right) => {
      if (left.article.featured !== right.article.featured) {
        return Number(right.article.featured) - Number(left.article.featured);
      }
      const leftScore =
        left.metrics.likes + left.metrics.comments + left.metrics.bookmarks;
      const rightScore =
        right.metrics.likes + right.metrics.comments + right.metrics.bookmarks;
      return rightScore - leftScore;
    })
    .slice(0, 7);

  return (
    <main className="bg-muted/35 min-h-screen border-t">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-primary mb-2 text-sm font-medium">
              {t('messages.eyebrow')}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('page.title')}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
              {t('page.sections.blog.description')}
            </p>
          </div>
          <Link
            href="/settings/community/articles"
            className="bg-primary text-primary-foreground inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition hover:opacity-90 active:scale-[0.98]"
          >
            <PenLine className="size-4" />
            {t('messages.write')}
          </Link>
        </header>

        <div className="bg-card mb-4 overflow-x-auto rounded-xl border px-2 shadow-sm">
          <nav
            className="flex min-w-max items-center gap-1"
            aria-label={t('messages.categories')}
          >
            <Link
              href="/blog"
              className="text-primary relative px-4 py-4 text-sm font-semibold after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-current"
            >
              {t('messages.all')}
            </Link>
            {facets.categories.map((category) => (
              <Link
                key={category}
                href={`/blog/category/${category}`}
                className="text-muted-foreground hover:text-foreground px-4 py-4 text-sm font-medium transition-colors"
              >
                {category}
              </Link>
            ))}
            {facets.tags
              .slice(0, Math.max(0, 10 - facets.categories.length))
              .map((tag) => (
                <Link
                  key={tag}
                  href={`/blog/tag/${tag}`}
                  className="text-muted-foreground hover:text-foreground px-4 py-4 text-sm font-medium transition-colors"
                >
                  {tag}
                </Link>
              ))}
          </nav>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="bg-card overflow-hidden rounded-xl border shadow-sm">
            <nav
              className="flex items-center gap-1 border-b px-4 py-3"
              aria-label={t('messages.feedFilter')}
            >
              {['all', 'featured', 'following'].map((item) => (
                <Link
                  key={item}
                  href={item === 'all' ? '/blog' : `/blog?filter=${item}`}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    filter === item
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {t(`messages.${item}`)}
                </Link>
              ))}
            </nav>

            {followed && !user ? (
              <div className="px-6 py-20 text-center">
                <p className="font-medium">{t('messages.followingSignIn')}</p>
                <Link
                  href="/sign-in"
                  className="text-primary mt-3 inline-block text-sm font-medium hover:underline"
                >
                  {t('messages.signIn')}
                </Link>
              </div>
            ) : community.length === 0 && legacy.length === 0 ? (
              <div className="text-muted-foreground px-6 py-20 text-center">
                {t('messages.no_content')}
              </div>
            ) : (
              <div className="divide-y">
                {community.map((row) => (
                  <CommunityArticle
                    key={row.article.id}
                    row={row}
                    locale={locale}
                    fallbackAuthor={t('messages.communityAuthor')}
                    featuredLabel={t('messages.featured')}
                  />
                ))}
                {legacy.map((post) => (
                  <LegacyArticle
                    key={`legacy:${post.id}`}
                    post={post}
                    fallbackAuthor={t('messages.webtoolsEditorial')}
                  />
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="from-primary/12 via-primary/7 border-primary/15 overflow-hidden rounded-xl border bg-gradient-to-br to-transparent p-5">
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                <Sparkles className="size-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">
                {t('messages.contributeTitle')}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {t('messages.contributeDescription')}
              </p>
              <Link
                href="/settings/community/articles"
                className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
              >
                {t('messages.startWriting')}
                <ChevronRight className="size-4" />
              </Link>
            </div>

            {rankedArticles.length > 0 && (
              <div className="bg-card rounded-xl border p-5 shadow-sm">
                <div className="flex items-center justify-between border-b pb-4">
                  <h2 className="font-semibold">{t('messages.ranking')}</h2>
                  <span className="text-muted-foreground text-xs">
                    {t('messages.rankingHint')}
                  </span>
                </div>
                <ol className="mt-2">
                  {rankedArticles.map(({ article, revision }, index) => {
                    const title = getLocalizedText(
                      locale,
                      revision.titleZh,
                      revision.titleEn
                    );
                    return (
                      <li key={article.id} className="border-b last:border-0">
                        <Link
                          href={`/blog/${article.slug}`}
                          className="group flex gap-3 py-3.5"
                        >
                          <span
                            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded text-xs font-semibold tabular-nums ${
                              index < 3
                                ? 'bg-primary/12 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="group-hover:text-primary line-clamp-2 text-sm leading-5 font-medium transition-colors">
                            {title}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function CommunityArticle({
  row,
  locale,
  fallbackAuthor,
  featuredLabel,
}: {
  row: PublicCommunityArticleRow;
  locale: string;
  fallbackAuthor: string;
  featuredLabel: string;
}) {
  const { article, revision, profile, metrics } = row;
  const title = getLocalizedText(locale, revision.titleZh, revision.titleEn);
  const summary = getLocalizedText(
    locale,
    revision.summaryZh,
    revision.summaryEn
  );
  const author = profile?.displayName || profile?.username || fallbackAuthor;
  const coverImage = revision.coverImageUrl || article.coverImageUrl;
  const publishedAt = revision.publishedAt || article.firstPublishedAt;
  const tags = Array.isArray(revision.tags)
    ? revision.tags.map(String).slice(0, 3)
    : [];

  return (
    <article className="group px-5 py-6 sm:px-7">
      <div className="flex items-center gap-2 text-sm">
        <AuthorAvatar src={profile?.avatarUrl} name={author} />
        <span className="font-medium">{author}</span>
        {publishedAt && (
          <>
            <span className="text-muted-foreground">·</span>
            <time
              className="text-muted-foreground text-xs"
              dateTime={publishedAt.toISOString()}
            >
              {formatDate(publishedAt, locale)}
            </time>
          </>
        )}
        {article.featured && (
          <span className="bg-primary/10 text-primary ml-auto rounded px-2 py-1 text-xs font-medium">
            {featuredLabel}
          </span>
        )}
      </div>

      <div className="mt-4 flex gap-5">
        <div className="min-w-0 flex-1">
          <Link href={`/blog/${article.slug}`}>
            <h2 className="group-hover:text-primary text-xl leading-8 font-semibold tracking-tight text-pretty transition-colors sm:text-[22px]">
              {title}
            </h2>
          </Link>
          {summary && (
            <p className="text-muted-foreground mt-2 line-clamp-2 text-[15px] leading-7">
              {summary}
            </p>
          )}
        </div>
        {coverImage && (
          <Link
            href={`/blog/${article.slug}`}
            className="hidden shrink-0 sm:block"
          >
            <img
              src={coverImage}
              alt={title || ''}
              className="h-28 w-44 rounded-lg object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          </Link>
        )}
      </div>

      <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <Metric icon={Heart} value={metrics.likes} />
        <Metric icon={MessageCircle} value={metrics.comments} />
        <Metric icon={Bookmark} value={metrics.bookmarks} />
        <div className="ml-auto flex flex-wrap justify-end gap-2">
          {revision.categorySlug && (
            <Link
              href={`/blog/category/${revision.categorySlug}`}
              className="bg-muted hover:text-foreground rounded px-2 py-1 transition-colors"
            >
              {revision.categorySlug}
            </Link>
          )}
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/blog/tag/${tag}`}
              className="bg-muted hover:text-foreground rounded px-2 py-1 transition-colors"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}

function LegacyArticle({
  post,
  fallbackAuthor,
}: {
  post: Post;
  fallbackAuthor: string;
}) {
  const author = post.author_name || fallbackAuthor;
  return (
    <article className="group px-5 py-6 sm:px-7">
      <div className="flex items-center gap-2 text-sm">
        <AuthorAvatar src={post.author_image} name={author} />
        <span className="font-medium">{author}</span>
        {post.created_at && (
          <>
            <span className="text-muted-foreground">·</span>
            <time className="text-muted-foreground text-xs">
              {post.created_at}
            </time>
          </>
        )}
      </div>
      <div className="mt-4 flex gap-5">
        <div className="min-w-0 flex-1">
          <Link href={post.url || `/blog/${post.slug}`}>
            <h2 className="group-hover:text-primary text-xl leading-8 font-semibold tracking-tight text-pretty transition-colors sm:text-[22px]">
              {post.title}
            </h2>
          </Link>
          {post.description && (
            <p className="text-muted-foreground mt-2 line-clamp-2 text-[15px] leading-7">
              {post.description}
            </p>
          )}
        </div>
        {post.image && (
          <Link
            href={post.url || `/blog/${post.slug}`}
            className="hidden shrink-0 sm:block"
          >
            <img
              src={post.image}
              alt={post.title || ''}
              className="h-28 w-44 rounded-lg object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          </Link>
        )}
      </div>
    </article>
  );
}

function AuthorAvatar({ src, name }: { src?: string | null; name: string }) {
  if (src) {
    return (
      <img src={src} alt={name} className="size-7 rounded-md object-cover" />
    );
  }
  return (
    <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-md text-xs font-semibold">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function Metric({ icon: Icon, value }: { icon: typeof Heart; value: number }) {
  return (
    <span className="flex items-center gap-1.5 tabular-nums">
      <Icon className="size-4" />
      {value}
    </span>
  );
}

function getLocalizedText(
  locale: string,
  zh?: string | null,
  en?: string | null
) {
  return locale === 'zh' ? zh || en || '' : en || zh || '';
}

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
