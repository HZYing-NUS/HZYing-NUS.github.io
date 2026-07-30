import {
  Bookmark,
  ChevronRight,
  Heart,
  MessageCircle,
  PenLine,
  Search,
  Sparkles,
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { PublicProfileCard } from '@/shared/blocks/community/public-profile-card';
import { getMetadata } from '@/shared/lib/seo';
import {
  listCommunityBlogFacets,
  listPublicCommunityProfiles,
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
  searchParams: Promise<{
    filter?: string;
    view?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const { locale } = await params;
  const {
    filter = 'all',
    view = 'articles',
    q = '',
    page: pageParam = '1',
  } = await searchParams;
  setRequestLocale(locale);

  const showingAuthors = view === 'authors';
  const authorPage = Math.max(1, Math.floor(Number(pageParam)) || 1);
  const authorPageSize = 24;

  const [t, user, facets] = await Promise.all([
    getTranslations('pages.blog'),
    getSignUser(),
    listCommunityBlogFacets(),
  ]);
  const followed = filter === 'following';
  const feedFilters = user
    ? ['all', 'featured', 'following']
    : ['all', 'featured'];
  const taxonomyItems = [
    ...facets.categories.map((label) => ({
      label,
      href: `/blog/category/${label}`,
    })),
    ...facets.tags
      .slice(0, Math.max(0, 10 - facets.categories.length))
      .map((label) => ({ label, href: `/blog/tag/${label}` })),
  ];
  const community =
    showingAuthors || (followed && !user)
      ? []
      : await listPublishedCommunityArticles({
          featured: filter === 'featured',
          followedBy: followed ? user?.id : undefined,
        });
  let legacy: Awaited<ReturnType<typeof getPostsAndCategories>>['posts'] = [];
  if (!showingAuthors && filter === 'all') {
    try {
      legacy = (
        await getPostsAndCategories({ locale, page: 1, limit: 50 })
      ).posts.filter((post) => post.slug !== 'what-is-xxx');
    } catch {}
  }
  const authorRows = showingAuthors
    ? await listPublicCommunityProfiles({
        query: q,
        limit: authorPageSize + 1,
        offset: (authorPage - 1) * authorPageSize,
      })
    : [];
  const hasNextAuthorPage = authorRows.length > authorPageSize;
  const authors = authorRows.slice(0, authorPageSize);

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
    <main className="min-h-screen border-t bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--muted)_22%,transparent),transparent_34rem)]">
      <div className="mx-auto max-w-7xl px-5 pt-28 pb-12 md:px-10 md:pt-40 lg:pb-20">
        <header className="mb-10 grid gap-8 border-b pb-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
              {t('messages.eyebrow')}
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl leading-[1.02] font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
              {t('page.title')}
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-8 md:text-lg">
              {t('page.sections.blog.description')}
            </p>
          </div>
          {user ? (
            <Link
              href="/settings/community/articles"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold shadow-sm transition duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <PenLine className="size-4" />
              {t('messages.write')}
            </Link>
          ) : (
            <p className="text-muted-foreground max-w-sm text-sm leading-6 lg:text-right">
              {t('messages.publicReadingHint')}
            </p>
          )}
        </header>

        <nav
          className="bg-background mb-5 inline-flex rounded-xl border p-1 shadow-sm"
          aria-label={t('messages.contentType')}
        >
          <Link
            href="/blog"
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
              !showingAuthors
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {t('messages.articles')}
          </Link>
          <Link
            href="/blog?view=authors"
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
              showingAuthors
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {t('messages.authors')}
          </Link>
        </nav>

        {showingAuthors ? (
          <section>
            <div className="bg-card rounded-xl border p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    {t('messages.authorDirectory')}
                  </h2>
                  <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
                    {t('messages.authorDirectoryDescription')}
                  </p>
                </div>
                <form
                  action={`/${locale}/blog`}
                  className="flex w-full gap-2 sm:max-w-md"
                >
                  <input type="hidden" name="view" value="authors" />
                  <label className="relative min-w-0 flex-1">
                    <span className="sr-only">
                      {t('messages.searchAuthors')}
                    </span>
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <input
                      name="q"
                      defaultValue={q}
                      placeholder={t('messages.searchAuthors')}
                      className="border-input bg-background h-10 w-full rounded-lg border pr-3 pl-9 text-sm outline-none focus-visible:ring-2"
                    />
                  </label>
                  <button className="bg-primary text-primary-foreground h-10 rounded-lg px-4 text-sm font-medium">
                    {t('messages.search')}
                  </button>
                </form>
              </div>
            </div>

            {authors.length ? (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {authors.map((profile) => (
                    <PublicProfileCard
                      key={profile.id}
                      profile={profile}
                      locale={locale}
                      viewProfileLabel={t('messages.viewProfile')}
                      articleCountLabel={(count) =>
                        t('messages.articleCount', { count })
                      }
                    />
                  ))}
                </div>
                {(authorPage > 1 || hasNextAuthorPage) && (
                  <nav className="mt-6 flex items-center justify-center gap-3">
                    {authorPage > 1 && (
                      <Link
                        href={buildAuthorDirectoryHref(q, authorPage - 1)}
                        className="bg-card rounded-lg border px-4 py-2 text-sm font-medium"
                      >
                        {t('messages.previousPage')}
                      </Link>
                    )}
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {authorPage}
                    </span>
                    {hasNextAuthorPage && (
                      <Link
                        href={buildAuthorDirectoryHref(q, authorPage + 1)}
                        className="bg-card rounded-lg border px-4 py-2 text-sm font-medium"
                      >
                        {t('messages.nextPage')}
                      </Link>
                    )}
                  </nav>
                )}
              </>
            ) : (
              <div className="bg-card text-muted-foreground mt-4 rounded-xl border px-6 py-20 text-center shadow-sm">
                {q
                  ? t('messages.noAuthorsFound')
                  : t('messages.noPublishedAuthors')}
              </div>
            )}
          </section>
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="bg-background overflow-hidden rounded-2xl border shadow-sm">
              <nav
                className="flex items-center gap-1 overflow-x-auto border-b px-4 py-3"
                aria-label={t('messages.feedFilter')}
              >
                {feedFilters.map((item) => (
                  <Link
                    key={item}
                    href={item === 'all' ? '/blog' : `/blog?filter=${item}`}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      filter === item
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {t(`messages.${item}`)}
                  </Link>
                ))}
              </nav>
              {taxonomyItems.length > 0 && (
                <nav
                  className="flex items-center gap-2 overflow-x-auto border-b px-5 py-3"
                  aria-label={t('messages.categories')}
                >
                  <span className="text-muted-foreground mr-1 text-xs font-medium">
                    {t('messages.categories')}
                  </span>
                  {taxonomyItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              )}

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
                      viewProfileLabel={t('messages.viewProfile')}
                    />
                  ))}
                  {legacy.map((post) => (
                    <LegacyArticle
                      key={`legacy:${post.id}`}
                      post={post}
                      fallbackAuthor={t('messages.webtoolsEditorial')}
                      viewProfileLabel={t('messages.viewProfile')}
                      authorProfileHref="/about"
                    />
                  ))}
                </div>
              )}
            </section>

            <aside className="space-y-4 lg:sticky lg:top-24">
              <div className="bg-foreground text-background overflow-hidden rounded-2xl p-6 shadow-sm">
                <div className="bg-background/10 flex size-10 items-center justify-center rounded-xl">
                  <Sparkles className="size-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">
                  {t('messages.contributeTitle')}
                </h2>
                <p className="text-background/60 mt-2 text-sm leading-6">
                  {t('messages.contributeDescription')}
                </p>
                {user ? (
                  <Link
                    href="/settings/community/articles"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                  >
                    {t('messages.startWriting')}
                    <ChevronRight className="size-4" />
                  </Link>
                ) : (
                  <p className="text-background/55 mt-4 text-xs leading-5">
                    {t('messages.signInToWrite')}
                  </p>
                )}
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
        )}
      </div>
    </main>
  );
}

function CommunityArticle({
  row,
  locale,
  fallbackAuthor,
  featuredLabel,
  viewProfileLabel,
}: {
  row: PublicCommunityArticleRow;
  locale: string;
  fallbackAuthor: string;
  featuredLabel: string;
  viewProfileLabel: string;
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
        {profile?.username ? (
          <Link
            href={`/u/${profile.username}`}
            aria-label={`${viewProfileLabel} ${author}`}
            className="group/author hover:bg-muted -m-1 inline-flex items-center gap-2 rounded-md p-1 transition-colors"
          >
            <AuthorAvatar src={profile.avatarUrl} name={author} />
            <span className="group-hover/author:text-primary font-medium transition-colors">
              {author}
            </span>
            <span className="text-muted-foreground group-hover/author:text-primary hidden text-xs transition-colors sm:inline">
              {viewProfileLabel}
            </span>
            <ChevronRight className="text-muted-foreground group-hover/author:text-primary size-3.5 transition-colors" />
          </Link>
        ) : (
          <>
            <AuthorAvatar src={profile?.avatarUrl} name={author} />
            <span className="font-medium">{author}</span>
          </>
        )}
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
              className="h-28 w-44 rounded-lg object-cover transition duration-200 group-hover:scale-[1.015]"
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
  viewProfileLabel,
  authorProfileHref,
}: {
  post: Post;
  fallbackAuthor: string;
  viewProfileLabel: string;
  authorProfileHref: string;
}) {
  const author = post.author_name || fallbackAuthor;
  return (
    <article className="group px-5 py-6 sm:px-7">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={authorProfileHref}
          aria-label={`${viewProfileLabel} ${author}`}
          className="group/author hover:bg-muted -m-1 inline-flex items-center gap-2 rounded-md p-1 transition-colors"
        >
          <AuthorAvatar src={post.author_image} name={author} />
          <span className="group-hover/author:text-primary font-medium transition-colors">
            {author}
          </span>
          <span className="text-muted-foreground group-hover/author:text-primary hidden text-xs transition-colors sm:inline">
            {viewProfileLabel}
          </span>
          <ChevronRight className="text-muted-foreground group-hover/author:text-primary size-3.5 transition-colors" />
        </Link>
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
              className="h-28 w-44 rounded-lg object-cover transition duration-200 group-hover:scale-[1.015]"
            />
          </Link>
        )}
      </div>
    </article>
  );
}

function buildAuthorDirectoryHref(query: string, page: number) {
  const search = new URLSearchParams({ view: 'authors' });
  if (query.trim()) search.set('q', query);
  if (page > 1) search.set('page', String(page));
  return `/blog?${search.toString()}`;
}

function AuthorAvatar({ src, name }: { src?: string | null; name: string }) {
  if (src) {
    return <img src={src} alt="" className="size-7 rounded-md object-cover" />;
  }
  return (
    <span
      aria-hidden="true"
      className="bg-foreground/8 text-foreground flex size-7 items-center justify-center rounded-md text-xs font-semibold"
    >
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
