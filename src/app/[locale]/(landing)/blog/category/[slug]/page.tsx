import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { listPublishedCommunityArticles } from '@/shared/models/community';
import { getPosts, PostStatus, PostType } from '@/shared/models/post';
import { findTaxonomy, TaxonomyStatus } from '@/shared/models/taxonomy';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const prefix = locale === envConfigs.locale ? '' : `/${locale}`;
  return {
    title: slug,
    alternates: {
      canonical: `${envConfigs.app_url}${prefix}/blog/category/${slug}`,
      languages: {
        zh: `${envConfigs.app_url}/zh/blog/category/${slug}`,
        en: `${envConfigs.app_url}/blog/category/${slug}`,
      },
    },
  };
}

export default async function CategoryBlogPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [t, community, legacyCategory] = await Promise.all([
    getTranslations('pages.blog'),
    listPublishedCommunityArticles({ categorySlug: slug }),
    findTaxonomy({ slug, status: TaxonomyStatus.PUBLISHED }),
  ]);
  const legacy = legacyCategory
    ? await getPosts({
        category: legacyCategory.id,
        type: PostType.ARTICLE,
        status: PostStatus.PUBLISHED,
      })
    : [];
  if (community.length === 0 && legacy.length === 0) notFound();
  return (
    <main className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <Link href="/blog" className="text-muted-foreground text-sm">
        {t('messages.all')}
      </Link>
      <h1 className="mt-4 text-4xl font-semibold">{slug}</h1>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {community.map(({ article, revision, profile }) => (
          <ArticleCard
            key={article.id}
            href={`/blog/${article.slug}`}
            title={locale === 'zh' ? revision.titleZh : revision.titleEn}
            summary={locale === 'zh' ? revision.summaryZh : revision.summaryEn}
            author={
              profile?.displayName ||
              profile?.username ||
              (locale === 'zh' ? '社区作者' : 'Community author')
            }
          />
        ))}
        {legacy.map((post) => (
          <ArticleCard
            key={`legacy:${post.id}`}
            href={`/blog/${post.slug}`}
            title={post.title}
            summary={post.description}
            author={post.authorName}
          />
        ))}
      </div>
    </main>
  );
}

function ArticleCard({
  href,
  title,
  summary,
  author,
}: {
  href: string;
  title?: string | null;
  summary?: string | null;
  author?: string | null;
}) {
  return (
    <Link href={href} className="rounded-2xl border p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-3 line-clamp-3 text-sm">
        {summary}
      </p>
      {author && <p className="text-muted-foreground mt-5 text-xs">{author}</p>}
    </Link>
  );
}
