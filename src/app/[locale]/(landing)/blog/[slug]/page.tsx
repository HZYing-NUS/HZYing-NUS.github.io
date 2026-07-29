import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { CommunityArticleInteractions } from '@/shared/blocks/community/article-interactions';
import { CommunityContentActions } from '@/shared/blocks/community/content-actions';
import { CommunitySafeMarkdown } from '@/shared/blocks/community/safe-markdown';
import { findPublishedCommunityArticle } from '@/shared/models/community';
import { getPost } from '@/shared/models/post';
import { getSignUser } from '@/shared/models/user';
import { getCommunityInteractionState } from '@/shared/services/community/interactions';
import { getCommunityArticleHttpStatus } from '@/shared/services/community/public-visibility';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const row = await findPublishedCommunityArticle(slug);
  const legacy = row ? null : await getPost({ slug, locale });
  const prefix = locale === envConfigs.locale ? '' : `/${locale}`;
  const canonical = `${envConfigs.app_url}${prefix}/blog/${slug}`;
  if (row && getCommunityArticleHttpStatus(row.article) !== 200) return {};
  if (!row)
    return legacy
      ? {
          title: legacy.title,
          description: legacy.description,
          alternates: { canonical },
        }
      : {};
  return {
    title: locale === 'zh' ? row.revision.titleZh : row.revision.titleEn,
    description:
      locale === 'zh' ? row.revision.summaryZh : row.revision.summaryEn,
    alternates: {
      canonical,
      languages: {
        zh: `${envConfigs.app_url}/zh/blog/${slug}`,
        en: `${envConfigs.app_url}/blog/${slug}`,
      },
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [row, currentUser] = await Promise.all([
    findPublishedCommunityArticle(slug),
    getSignUser(),
  ]);
  if (!row) {
    const legacy = await getPost({ slug, locale });
    if (!legacy) notFound();
    const legacyAuthorProfileHref = envConfigs.community_about_username
      ? `/u/${envConfigs.community_about_username}`
      : '/about';
    return (
      <main className="mx-auto max-w-4xl px-5 py-16">
        <h1 className="text-4xl font-semibold">{legacy.title}</h1>
        <Link
          href={legacyAuthorProfileHref}
          className="text-primary mt-6 inline-flex text-sm font-medium hover:underline"
        >
          {legacy.author_name ||
            (locale === 'zh' ? 'WebTools 编辑部' : 'WebTools editorial')}
          {' · '}
          {locale === 'zh' ? '查看主页' : 'View profile'}
        </Link>
        <div className="mt-10">{legacy.body}</div>
      </main>
    );
  }
  if (row.article.deletedAt) {
    if (
      row.article.restoreDeadlineAt &&
      row.article.restoreDeadlineAt < new Date()
    )
      return (
        <main className="mx-auto max-w-3xl px-5 py-24">
          <h1 className="text-3xl font-semibold">410 Gone</h1>
        </main>
      );
    notFound();
  }
  if (getCommunityArticleHttpStatus(row.article) !== 200) notFound();
  const interactionState = currentUser
    ? await getCommunityInteractionState({
        userId: currentUser.id,
        targetType: 'article',
        targetId: row.article.id,
      })
    : { liked: false, bookmarked: false };
  const title = locale === 'zh' ? row.revision.titleZh : row.revision.titleEn;
  const summary =
    locale === 'zh' ? row.revision.summaryZh : row.revision.summaryEn;
  const content =
    locale === 'zh' ? row.revision.contentZh : row.revision.contentEn;
  return (
    <main className="mx-auto max-w-4xl px-5 py-16 md:py-24">
      <p className="text-muted-foreground text-sm">
        {row.revision.categorySlug ? (
          <Link href={`/blog/category/${row.revision.categorySlug}`}>
            {row.revision.categorySlug}
          </Link>
        ) : (
          'WebTools'
        )}
      </p>
      <h1 className="mt-3 text-4xl leading-tight font-semibold md:text-5xl">
        {title}
      </h1>
      <p className="text-muted-foreground mt-5 text-lg leading-8">{summary}</p>
      {row.profile?.username && (
        <Link
          href={`/u/${row.profile.username}`}
          className="hover:bg-muted mt-7 inline-flex items-center gap-3 rounded-lg p-2 transition-colors"
        >
          {row.profile.avatarUrl ? (
            <img
              src={row.profile.avatarUrl}
              alt={row.profile.displayName || row.profile.username}
              className="size-9 rounded-lg object-cover"
            />
          ) : (
            <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg text-sm font-semibold">
              {(row.profile.displayName || row.profile.username)
                .charAt(0)
                .toUpperCase()}
            </span>
          )}
          <span>
            <span className="block text-sm font-medium">
              {row.profile.displayName || row.profile.username}
            </span>
            <span className="text-primary block text-xs font-medium">
              {locale === 'zh' ? '查看主页' : 'View profile'}
            </span>
          </span>
        </Link>
      )}
      {Array.isArray(row.revision.tags) && row.revision.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          {(row.revision.tags as unknown[]).map((tag: unknown) => (
            <Link
              key={String(tag)}
              href={`/blog/tag/${String(tag)}`}
              className="text-muted-foreground rounded-full border px-3 py-1"
            >
              #{String(tag)}
            </Link>
          ))}
        </div>
      )}
      {!row.profile && (
        <p className="text-muted-foreground mt-7 text-sm">
          {locale === 'zh' ? '社区作者' : 'Community author'}
        </p>
      )}
      {row.revision.coverImageUrl && (
        <img
          src={row.revision.coverImageUrl}
          alt=""
          className="mt-10 aspect-video w-full rounded-2xl object-cover"
        />
      )}
      <article className="mt-12">
        <CommunitySafeMarkdown content={content || ''} />
      </article>
      <CommunityContentActions
        targetId={row.article.id}
        targetType="article"
        canInteract={Boolean(currentUser)}
        canLike
        initialLiked={interactionState.liked}
        initialBookmarked={interactionState.bookmarked}
        locale={locale}
      />
      <CommunityArticleInteractions
        articleId={row.article.id}
        currentUserIsAuthor={currentUser?.id === row.article.authorId}
        currentUserId={currentUser?.id}
        allowComments={row.article.allowComments}
        allowReplies={row.article.allowReplies}
        locale={locale}
      />
    </main>
  );
}
