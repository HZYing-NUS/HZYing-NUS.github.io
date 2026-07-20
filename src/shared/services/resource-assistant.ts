import { getPublishedCollections } from '@/shared/models/collection';
import { searchPublishedPosts } from '@/shared/models/post';
import { getPublishedProfile } from '@/shared/models/profile';
import { getPublishedResources } from '@/shared/models/resource';

export type AssistantSource = {
  type: 'resource' | 'collection' | 'article' | 'profile';
  title: string;
  url: string;
  excerpt: string;
};

export async function retrieveAssistantSources(
  question: string,
  locale: string
) {
  const [resources, collections, articles, profile] = await Promise.all([
    getPublishedResources({ locale, allowAiCitation: true }),
    getPublishedCollections(locale, true),
    searchPublishedPosts({ locale, limit: 50 }),
    Promise.resolve(null),
  ]);
  const terms = Array.from(
    new Set(
      question.toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fff]{2,4}/g) || []
    )
  );
  const score = (text: string) => {
    const haystack = text.toLowerCase();
    return terms.reduce(
      (total, term) =>
        total + (haystack.includes(term) ? Math.min(term.length, 4) : 0),
      0
    );
  };
  const rankedResources = resources
    .map((item) => ({
      item,
      score: score(
        `${item.name} ${item.summary} ${item.reason} ${item.useCase} ${item.resourceType} ${item.stages.map((stage) => stage.name).join(' ')} ${item.category}`
      ),
    }))
    .sort(
      (a, b) =>
        b.score - a.score || Number(b.item.featured) - Number(a.item.featured)
    );
  const rankedCollections = collections
    .map((item) => ({
      item,
      score: score(`${item.title} ${item.summary} ${item.content}`),
    }))
    .sort(
      (a, b) =>
        b.score - a.score || Number(b.item.featured) - Number(a.item.featured)
    );
  const rankedArticles = articles
    .map((item) => ({ item, score: score(`${item.title} ${item.summary}`) }))
    .sort((a, b) => b.score - a.score);
  const minimumScore = 2;
  const sources: AssistantSource[] = [
    ...rankedResources
      .filter(({ score }) => score >= minimumScore)
      .slice(0, 8)
      .map(({ item }) => ({
        type: 'resource' as const,
        title: item.name,
        url: `/${locale}/resources/${item.slug}`,
        excerpt: `${item.summary}\n${item.reason}\n${item.useCase}`,
      })),
    ...rankedCollections
      .filter(({ score }) => score >= minimumScore)
      .slice(0, 5)
      .map(({ item }) => ({
        type: 'collection' as const,
        title: item.title,
        url: `/${locale}/collections/${item.slug}`,
        excerpt: `${item.summary}\n${item.content}`,
      })),
    ...rankedArticles
      .filter(({ score }) => score >= minimumScore)
      .slice(0, 5)
      .map(({ item }) => ({
        type: 'article' as const,
        title: item.title || item.slug,
        url: `/${locale}/blog/${item.slug}`,
        excerpt: item.summary,
      })),
  ];
  if (profile && score(JSON.stringify(profile)) >= minimumScore) {
    sources.push({
      type: 'profile',
      title: locale === 'zh' ? '关于我' : 'About',
      url: `/${locale}/about`,
      excerpt: JSON.stringify(profile).slice(0, 4000),
    });
  }
  return sources;
}
