import { permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { legacyPosts } from '@/config/seed/legacy-content';

import { getThemePage } from '@/core/theme';
import { envConfigs } from '@/config';
import { Empty } from '@/shared/blocks/common';
import { getPost } from '@/shared/models/post';
import { DynamicPage } from '@/shared/types/blocks/landing';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations('pages.blog.metadata');

  const canonicalUrl =
    locale !== envConfigs.locale
      ? `${envConfigs.app_url}/${locale}/blog/${slug}`
      : `${envConfigs.app_url}/blog/${slug}`;

  const legacyPost = legacyPosts.find((item) => item.locale === locale && (item.slug === slug || item.legacyFileName.replace(/\.md$/, '') === slug));
  const post = await getPost({ slug, locale });
  if (!post && legacyPost && legacyPost.slug !== slug) {
    return { alternates: { canonical: `${envConfigs.app_url}/${locale}/blog/${legacyPost.slug}` } };
  }
  if (!post) {
    return {
      title: `${slug} | ${t('title')}`,
      description: t('description'),
      alternates: {
        canonical: canonicalUrl,
      },
    };
  }

  return {
    title: `${post.title} | ${t('title')}`,
    description: post.description,
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = await getPost({ slug, locale });

  if (!post) {
    const legacyPost = legacyPosts.find((item) => item.locale === locale && item.legacyFileName.replace(/\.md$/, '') === slug);
    if (legacyPost) permanentRedirect(`/${locale}/blog/${legacyPost.slug}`);
    return <Empty message={`Post not found`} />;
  }

  // build page sections
  const page: DynamicPage = {
    sections: {
      blogDetail: {
        block: 'blog-detail',
        data: {
          post,
        },
      },
    },
  };

  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
