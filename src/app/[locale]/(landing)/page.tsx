import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { ChatGenerator } from '@/shared/blocks/chat/generator';
import { getPublishedCollections } from '@/shared/models/collection';
import { getIncompleteCollectionProgress } from '@/shared/models/collection-progress';
import { searchPublishedPosts } from '@/shared/models/post';
import { getProjects, type Project } from '@/shared/models/project';
import { getPublishedResources } from '@/shared/models/resource';
import { getSignUser } from '@/shared/models/user';
import {
  rankWorkspaceRecommendationCandidates,
  resolveWorkspaceStage,
  type WorkspaceRecommendations,
} from '@/shared/services/workspace/recommendations';
import { DynamicPage } from '@/shared/types/blocks/landing';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const hasSession = (await headers()).get('x-session-present') === '1';
  if (hasSession) noStore();
  const user = hasSession ? await getSignUser() : null;
  if (user) {
    const recentProjectsResult = await getProjects(user.id);
    const recentProjects: Project[] = recentProjectsResult.slice(0, 3);
    const projectStage = resolveWorkspaceStage(
      recentProjects.map((project) => project.stage)
    );
    const [resources, collections, articles, collectionProgress] =
      await Promise.all([
        getPublishedResources({ locale }),
        getPublishedCollections(locale),
        searchPublishedPosts({ locale, limit: 20 }),
        getIncompleteCollectionProgress(user.id, locale, 3),
      ]);
    const recommendations: WorkspaceRecommendations = {
      stageLabel: projectStage
        ? locale === 'zh'
          ? projectStage.labelZh
          : projectStage.labelEn
        : null,
      resources: rankWorkspaceRecommendationCandidates(
        resources.map((resource) => ({
          ...resource,
          stageValues: [
            resource.stage,
            ...resource.stages.map((stage) => stage.name),
          ],
          searchText: [
            resource.name,
            resource.summary,
            resource.reason,
            resource.useCase,
            resource.category,
            ...resource.tags.map((tag) => tag.name),
          ].join(' '),
        })),
        projectStage,
        2
      ).map((resource) => ({
        slug: resource.slug,
        title: resource.name,
        summary: resource.reason || resource.summary,
        href: `/resources/${resource.slug}`,
        meta: resource.stage,
      })),
      collections: rankWorkspaceRecommendationCandidates(
        collections.map((collection) => ({
          ...collection,
          stageValues: [collection.stageId],
          searchText: [
            collection.title,
            collection.summary,
            ...collection.tags.map((tag) => tag.name),
          ].join(' '),
        })),
        projectStage,
        2
      ).map((collection) => ({
        slug: collection.slug,
        title: collection.title,
        summary: collection.summary,
        href: `/collections/${collection.slug}`,
        meta: collection.duration,
      })),
      articles: rankWorkspaceRecommendationCandidates(
        articles.map((article) => ({
          ...article,
          searchText: `${article.title} ${article.summary}`,
        })),
        projectStage,
        2
      ).map((article) => ({
        slug: article.slug,
        title: article.title || article.slug,
        summary: article.summary,
        href: `/blog/${article.slug}`,
      })),
    };
    return (
      <ChatGenerator
        recentProjects={recentProjects}
        recommendations={recommendations}
        collectionProgress={collectionProgress}
        workspaceHome
      />
    );
  }

  const t = await getTranslations('pages.index');
  const page: DynamicPage = t.raw('page');
  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
