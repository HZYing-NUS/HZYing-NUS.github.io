import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { listPublishedCommunityArticles } from '@/shared/models/community';
import {
  getLocalPostsAndCategories,
  getPosts,
  PostStatus,
  PostType,
} from '@/shared/models/post';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const prefix = locale === envConfigs.locale ? '' : `/${locale}`;
  return {
    title: `#${slug}`,
    alternates: {
      canonical: `${envConfigs.app_url}${prefix}/blog/tag/${slug}`,
      languages: {
        zh: `${envConfigs.app_url}/zh/blog/tag/${slug}`,
        en: `${envConfigs.app_url}/blog/tag/${slug}`,
      },
    },
  };
}

export default async function TagBlogPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [community, legacyLocal, legacyRemote] = await Promise.all([
    listPublishedCommunityArticles({ tag: slug }),
    getLocalPostsAndCategories({ locale }),
    getPosts({
      tag: [slug],
      type: PostType.ARTICLE,
      status: PostStatus.PUBLISHED,
      limit: 100,
    }),
  ]);
  const local = legacyLocal.posts.filter((post) =>
    post.tags?.map(String).includes(slug)
  );
  const legacy = [
    ...local,
    ...legacyRemote
      .filter((post) => !local.some((item) => item.slug === post.slug))
      .map((post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        description: post.description,
      })),
  ];
  if (community.length === 0 && legacy.length === 0) notFound();
  return (
    <main className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <Link href="/blog" className="text-muted-foreground text-sm">
        {locale === 'zh' ? '全部文章' : 'All articles'}
      </Link>
      <h1 className="mt-4 text-4xl font-semibold">#{slug}</h1>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {community.map(({ article, revision, profile }) => {
          const author =
            profile?.displayName ||
            profile?.username ||
            (locale === 'zh' ? '社区作者' : 'Community author');
          return (
            <article key={article.id} className="rounded-2xl border p-5">
              <Link href={`/blog/${article.slug}`}>
                <h2 className="text-xl font-semibold">
                  {locale === 'zh' ? revision.titleZh : revision.titleEn}
                </h2>
                <p className="text-muted-foreground mt-3 line-clamp-3 text-sm">
                  {locale === 'zh' ? revision.summaryZh : revision.summaryEn}
                </p>
              </Link>
              {profile?.username ? (
                <Link
                  href={`/u/${profile.username}`}
                  className="text-primary mt-5 inline-flex text-xs font-medium hover:underline"
                >
                  {author} · {locale === 'zh' ? '查看主页' : 'View profile'}
                </Link>
              ) : (
                <p className="text-muted-foreground mt-5 text-xs">{author}</p>
              )}
            </article>
          );
        })}
        {legacy.map((post) => (
          <article key={`legacy:${post.id}`} className="rounded-2xl border p-5">
            <Link href={`/blog/${post.slug}`}>
              <h2 className="text-xl font-semibold">{post.title}</h2>
              <p className="text-muted-foreground mt-3 line-clamp-3 text-sm">
                {post.description}
              </p>
            </Link>
            <Link
              href={
                envConfigs.community_about_username
                  ? `/u/${envConfigs.community_about_username}`
                  : '/about'
              }
              className="text-primary mt-5 inline-flex text-xs font-medium hover:underline"
            >
              {locale === 'zh' ? '查看作者主页' : 'View author profile'}
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
