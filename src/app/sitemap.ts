import { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

import { envConfigs } from '@/config';
import { searchPublishedPosts } from '@/shared/models/post';
import { getPublishedCollections } from '@/shared/models/collection';
import { getPublishedResources } from '@/shared/models/resource';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = ['zh', 'en'];
  const routes = ['', '/resources', '/collections', '/blog', '/about', '/submit'];
  const now = new Date();
  const [resources, collections, posts] = await Promise.all([
    getPublishedResources({ locale: envConfigs.locale }),
    getPublishedCollections(envConfigs.locale),
    searchPublishedPosts({ locale: envConfigs.locale, limit: 500 }),
  ]);

  return locales.flatMap((locale) => {
    const prefix = locale === envConfigs.locale ? '' : `/${locale}`;
    const staticEntries = routes.map((route) => ({
      url: `${envConfigs.app_url}${prefix}${route}`,
      lastModified: now,
      changeFrequency: route === '' ? ('weekly' as const) : ('monthly' as const),
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
    return [...staticEntries, ...resourceEntries, ...collectionEntries, ...postEntries];
  });
}
