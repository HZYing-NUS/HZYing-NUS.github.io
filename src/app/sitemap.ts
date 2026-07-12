import { MetadataRoute } from 'next';

import { envConfigs } from '@/config';
import { getPublishedCollections } from '@/shared/models/collection';
import { getPublishedResources } from '@/shared/models/resource';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = ['zh', 'en'];
  const routes = ['', '/resources', '/collections', '/blog', '/about', '/submit'];
  const now = new Date();
  const [resources, collections] = await Promise.all([
    getPublishedResources({ locale: envConfigs.locale }),
    getPublishedCollections(envConfigs.locale),
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
    return [...staticEntries, ...resourceEntries, ...collectionEntries];
  });
}
