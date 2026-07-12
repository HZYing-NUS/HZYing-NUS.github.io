import { getPublishedCollections } from '@/shared/models/collection';
import { getPublishedProfile } from '@/shared/models/profile';
import { getPublishedResources } from '@/shared/models/resource';

export type AssistantSource = {
  type: 'resource' | 'collection' | 'profile';
  title: string;
  url: string;
  excerpt: string;
};

export async function retrieveAssistantSources(question: string, locale: string) {
  const [resources, collections, profile] = await Promise.all([
    getPublishedResources({ locale, allowAiCitation: true }),
    getPublishedCollections(locale, true),
    getPublishedProfile(locale),
  ]);
  const terms = question.toLowerCase().match(/[a-z0-9]+|[一-鿿]{1,4}/g) || [];
  const score = (text: string) => terms.reduce((total, term) => total + (text.toLowerCase().includes(term) ? 1 : 0), 0);
  const rankedResources = resources
    .map((item) => ({ item, score: score(`${item.name} ${item.summary} ${item.reason} ${item.useCase} ${item.resourceType} ${item.stage} ${item.category}`) }))
    .sort((a, b) => b.score - a.score || Number(b.item.featured) - Number(a.item.featured));
  const rankedCollections = collections
    .map((item) => ({ item, score: score(`${item.title} ${item.summary} ${item.content}`) }))
    .sort((a, b) => b.score - a.score || Number(b.item.featured) - Number(a.item.featured));
  const sources: AssistantSource[] = [
    ...rankedResources.slice(0, 8).map(({ item }) => ({ type: 'resource' as const, title: item.name, url: `/${locale}/resources/${item.slug}`, excerpt: `${item.summary}\n${item.reason}\n${item.useCase}` })),
    ...rankedCollections.slice(0, 5).map(({ item }) => ({ type: 'collection' as const, title: item.title, url: `/${locale}/collections/${item.slug}`, excerpt: `${item.summary}\n${item.content}` })),
  ];
  if (profile && score(JSON.stringify(profile)) > 0) {
    sources.push({ type: 'profile', title: locale === 'zh' ? '关于我' : 'About', url: `/${locale}/about`, excerpt: JSON.stringify(profile).slice(0, 4000) });
  }
  return sources;
}
