import { MetadataRoute } from 'next';

import { envConfigs } from '@/config';
import { getPublishedCollections } from '@/shared/models/collection';
import {
  listIndexableCommunityProfiles,
  listPublishedCommunityArticles,
} from '@/shared/models/community';
import { searchPublishedPosts } from '@/shared/models/post';
import { getPublishedResources } from '@/shared/models/resource';
import { getCommunitySitemapStaticRoutes } from '@/shared/services/community/sitemap-policy';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = ['zh', 'en'];
  const routes = getCommunitySitemapStaticRoutes(
    Boolean(envConfigs.community_about_username)
  );
  const now = new Date();
  const [resources, collections, posts, communityArticles, communityProfiles] =
    await Promise.all([
      getPublishedResources({ locale: envConfigs.locale }),
      getPublishedCollections(envConfigs.locale),
      searchPublishedPosts({ locale: envConfigs.locale, limit: 500 }),
      listPublishedCommunityArticles({ limit: 500 }),
      listIndexableCommunityProfiles(500),
    ]);

  return locales.flatMap((locale) => {
    const prefix = locale === envConfigs.locale ? '' : `/${locale}`;
    const staticEntries = routes.map((route) => ({
      url: `${envConfigs.app_url}${prefix}${route}`,
      lastModified: now,
      changeFrequency:
        route === '' ? ('weekly' as const) : ('monthly' as const),
      priority: route === '' ? 1 : 0.8,
    }));
    const resourceEntries = resources.map((resource) => ({
      url: `${envConfigs.app_url}${prefix}/resources/${resource.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
    const collectionEntries = collections.map((collection) => ({
      url: `${envConfigs.app_url}${prefix}/collections/${collection.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
    const postEntries = posts.map((post) => ({
      url: `${envConfigs.app_url}${prefix}/blog/${post.slug}`,
      lastModified: post.publishedAt || now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
    const communityEntries = communityArticles.map(({ article }) => ({
      url: `${envConfigs.app_url}${prefix}/blog/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
    const profileEntries = communityProfiles.map(
      (profile: { username: string; updatedAt: Date }) => ({
        url: `${envConfigs.app_url}${prefix}/u/${profile.username}`,
        lastModified: profile.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
        alternates: {
          languages: {
            zh: `${envConfigs.app_url}/zh/u/${profile.username}`,
            en: `${envConfigs.app_url}/u/${profile.username}`,
          },
        },
      })
    );
    return [
      ...staticEntries,
      ...resourceEntries,
      ...collectionEntries,
      ...postEntries,
      ...communityEntries,
      ...profileEntries,
    ];
  });
}
