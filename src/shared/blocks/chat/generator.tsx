'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { UIMessage, UseChatHelpers } from '@ai-sdk/react';
import {
  ArrowUpRight,
  Boxes,
  FolderKanban,
  ListChecks,
  Newspaper,
  SparklesIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link, useRouter } from '@/core/i18n/navigation';
import { PromptInputMessage } from '@/shared/components/ai-elements/prompt-input';
import { useAppContext } from '@/shared/contexts/app';
import { useChatContext } from '@/shared/contexts/chat';
import type {
  WorkspaceRecommendationItem,
  WorkspaceRecommendations,
} from '@/shared/services/workspace/recommendations';

import { ChatInput } from './input';
import { uploadChatAttachments } from './upload-attachments';

export function ChatGenerator({
  recentProjects = [],
  recommendations,
  collectionProgress = [],
  workspaceHome = false,
  publicLanding = false,
}: {
  recentProjects?: Array<{
    id: string;
    name: string;
    description?: string | null;
    stage?: string | null;
  }>;
  recommendations?: WorkspaceRecommendations;
  collectionProgress?: Array<{
    collectionId: string;
    slug: string;
    title: string;
    completedCount: number;
    totalCount: number;
    percentage: number;
  }>;
  workspaceHome?: boolean;
  publicLanding?: boolean;
}) {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();

  const t = useTranslations('ai.chat.generator');

  const { user, setIsShowSignModal, setSignCallbackUrl } = useAppContext();
  const { chats, setChats, setChat } = useChatContext();

  const [status, setStatus] = useState<UseChatHelpers<UIMessage>['status']>();
  const [error, setError] = useState<string | null>(null);
  const [suggestedQuestion, setSuggestedQuestion] = useState<string>();

  const fetchNewChat = async (
    msg: PromptInputMessage,
    body: Record<string, any>
  ) => {
    setStatus('submitted');
    setError(null);

    try {
      const resp: Response = await fetch('/api/chat/new', {
        method: 'POST',
        body: JSON.stringify({
          message: msg,
          body: { ...body, hasAttachments: Boolean(msg.files?.length) },
        }),
      });
      if (!resp.ok) {
        throw new Error(`request failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      const { id, pendingMessageId } = data;
      if (!id) {
        throw new Error('failed to create chat');
      }

      setChats([data, ...chats]);

      const fileIds = msg.files?.length
        ? await uploadChatAttachments(id, msg.files)
        : [];

      const path = `/chat/${id}?send=1&messageId=${encodeURIComponent(pendingMessageId)}${fileIds.length ? `&fileIds=${encodeURIComponent(fileIds.join(','))}` : ''}`;
      router.push(path, {
        locale,
      });
      // setStatus(undefined);
      // setError(null);
    } catch (e: any) {
      const message =
        e instanceof Error ? e.message : 'request failed, please try again';
      setStatus('error');
      setError(message);
      toast.error(message);
      throw e instanceof Error ? e : new Error(message);
    }
  };

  const handleSubmit = async (
    message: PromptInputMessage,
    body: Record<string, any>
  ) => {
    // check user sign
    if (!user) {
      setSignCallbackUrl('/');
      setIsShowSignModal(true);
      return;
    }

    // check user input
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) {
      return;
    }

    if (!body.model) {
      toast.error('please select a model');
      return;
    }

    await fetchNewChat(message, body);
  };

  useEffect(() => {
    setChat(null);
  }, [setChat]);

  const quickTasks = [
    t('quick_validate'),
    t('quick_mvp'),
    t('quick_launch'),
    t('quick_growth'),
  ];

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-[#f7f7f8] text-[#1d1d1f] dark:bg-[#101114] dark:text-[#f5f5f7]">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-64 left-[8%] h-[34rem] w-[60rem] rounded-full bg-[#dce7fb]/55 blur-[110px] dark:bg-[#20304d]/25" />
        <div className="absolute top-[18rem] right-[-12rem] size-[30rem] rounded-full bg-white/90 blur-[100px] dark:bg-[#23262d]/35" />
      </div>
      <main className="relative z-[1] mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-9 md:px-10 md:py-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col justify-center">
          <div className="mb-7 max-w-3xl">
            <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[.11em] text-[#5474a8] uppercase dark:text-[#8faee0]">
              <SparklesIcon className="size-3" />
              {t(publicLanding ? 'public_eyebrow' : 'eyebrow')}
            </p>
            <h2 className="max-w-3xl text-[2.6rem] leading-[1.04] font-semibold tracking-[-.045em] text-balance sm:text-[3.1rem]">
              {t(publicLanding ? 'public_title' : 'title')}
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-[#6e6e73] sm:text-base sm:leading-7 dark:text-[#a1a1a6]">
              {t(publicLanding ? 'public_description' : 'description')}
            </p>
          </div>
          <div className="relative">
            <ChatInput
              initialSkill={searchParams.get('skill') || undefined}
              estimateLocale={locale}
              error={error}
              handleSubmit={handleSubmit}
              onInputChange={() => {
                if (status === 'error') {
                  setStatus(undefined);
                }
                if (error) {
                  setError(null);
                }
              }}
              status={status}
              suggestedQuestion={suggestedQuestion}
              onSuggestedQuestionApplied={() => setSuggestedQuestion(undefined)}
              compact={publicLanding}
            />
          </div>
          {workspaceHome ? (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {quickTasks.map((task) => (
                <button
                  type="button"
                  key={task}
                  onClick={() => setSuggestedQuestion(task)}
                  className="group flex w-full items-center justify-between gap-4 rounded-xl border border-black/[0.07] bg-white/65 px-4 py-3 text-left text-sm shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-200 hover:-translate-y-0.5 hover:border-[#91a8ca]/60 hover:bg-white active:translate-y-0 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
                >
                  <span>{task}</span>
                  <ArrowUpRight className="size-4 shrink-0 text-[#5474a8] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-[#8faee0]" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {publicLanding ? (
          <section className="mx-auto mt-14 w-full max-w-5xl">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  href: '/resources',
                  icon: Boxes,
                  title: t('public_resources_title'),
                  description: t('public_resources_description'),
                },
                {
                  href: '/collections',
                  icon: ListChecks,
                  title: t('public_collections_title'),
                  description: t('public_collections_description'),
                },
                {
                  href: '/blog',
                  icon: Newspaper,
                  title: t('public_articles_title'),
                  description: t('public_articles_description'),
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-2xl border border-black/[0.07] bg-white/70 p-5 transition duration-200 hover:-translate-y-1 hover:border-[#91a8ca]/60 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-[#e8eef8] text-[#5474a8] dark:bg-[#28344a] dark:text-[#9bb7e2]">
                        <Icon className="size-5" />
                      </span>
                      <ArrowUpRight className="size-4 text-[#5474a8] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-[#8faee0]" />
                    </div>
                    <h2 className="mt-6 text-lg font-semibold tracking-tight">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#6e6e73] dark:text-[#a1a1a6]">
                      {item.description}
                    </p>
                  </Link>
                );
              })}
            </div>
            <div className="mt-12 border-t border-black/10 pt-8 dark:border-white/10">
              <p className="text-xs font-semibold tracking-[.1em] text-[#5474a8] uppercase dark:text-[#8faee0]">
                {t('public_flow_eyebrow')}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  t('public_flow_validate'),
                  t('public_flow_build'),
                  t('public_flow_launch'),
                  t('public_flow_grow'),
                ].map((stage, index) => (
                  <div
                    key={stage}
                    className="flex items-center gap-3 border-l border-black/15 py-2 pl-4 dark:border-white/15"
                  >
                    <span className="font-mono text-xs text-[#5474a8] dark:text-[#8faee0]">
                      0{index + 1}
                    </span>
                    <span className="text-sm font-medium">{stage}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
        {workspaceHome ? (
          <section className="mx-auto mt-14 w-full max-w-4xl border-t border-black/[0.07] pt-8 dark:border-white/10">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[.1em] text-[#5474a8] uppercase dark:text-[#8faee0]">
                  {t('recent_projects_eyebrow')}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                  {t('recent_projects')}
                </h2>
              </div>
              <Link
                href="/chat/projects"
                className="text-sm underline-offset-4 hover:underline"
              >
                {t('view_projects')}
              </Link>
            </div>
            {recentProjects.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/chat/projects/${project.id}`}
                    className="rounded-2xl border border-black/[0.07] bg-white/70 p-5 shadow-[0_8px_30px_-24px_rgba(31,45,70,0.35)] transition duration-200 hover:-translate-y-0.5 hover:border-[#91a8ca]/60 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
                  >
                    <FolderKanban className="size-4 text-[#5474a8] dark:text-[#8faee0]" />
                    <h3 className="mt-4 font-medium">{project.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6e6e73] dark:text-[#a1a1a6]">
                      {project.description ||
                        project.stage ||
                        t('project_no_description')}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-black/15 bg-white/55 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/15 dark:bg-white/[0.03]">
                <div>
                  <p className="font-medium">{t('projects_empty_title')}</p>
                  <p className="mt-1 text-sm text-[#6e6e73] dark:text-[#a1a1a6]">
                    {t('projects_empty_description')}
                  </p>
                </div>
                <Link
                  href="/chat/projects"
                  className="shrink-0 text-sm font-medium text-[#5474a8] dark:text-[#8faee0]"
                >
                  {t('create_project')}
                </Link>
              </div>
            )}
          </section>
        ) : null}
        {workspaceHome && collectionProgress.length ? (
          <section className="mx-auto mt-10 w-full max-w-4xl border-t border-black/[0.07] pt-8 dark:border-white/10">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[.1em] text-[#5474a8] uppercase dark:text-[#8faee0]">
                  {locale === 'zh' ? '继续推进' : 'Continue guides'}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                  {locale === 'zh'
                    ? '未完成的行动专题'
                    : 'Action guides in progress'}
                </h2>
              </div>
              <Link
                href="/collections"
                className="text-sm underline-offset-4 hover:underline"
              >
                {locale === 'zh' ? '查看全部专题' : 'View all guides'}
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {collectionProgress.map((item) => (
                <Link
                  key={item.collectionId}
                  href={`/collections/${item.slug}`}
                  className="rounded-2xl border border-black/[0.07] bg-white/70 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#91a8ca]/60 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-[#5474a8] dark:text-[#8faee0]">
                      {locale === 'zh'
                        ? `${item.completedCount}／${item.totalCount} 步`
                        : `${item.completedCount}/${item.totalCount} steps`}
                    </span>
                    <span className="font-mono tabular-nums">
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#6f8fbe]"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <h3 className="mt-4 leading-6 font-medium">{item.title}</h3>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        {workspaceHome && recommendations ? (
          <WorkspaceRecommendationsSection
            recommendations={recommendations}
            t={t}
          />
        ) : null}
      </main>
    </div>
  );
}

function WorkspaceRecommendationsSection({
  recommendations,
  t,
}: {
  recommendations: WorkspaceRecommendations;
  t: ReturnType<typeof useTranslations<'ai.chat.generator'>>;
}) {
  const groups = [
    {
      key: 'resources',
      title: t('recommended_resources'),
      href: '/resources',
      icon: Boxes,
      items: recommendations.resources,
    },
    {
      key: 'collections',
      title: t('recommended_collections'),
      href: '/collections',
      icon: ListChecks,
      items: recommendations.collections,
    },
    {
      key: 'articles',
      title: t('recommended_articles'),
      href: '/blog',
      icon: Newspaper,
      items: recommendations.articles,
    },
  ].filter((group) => group.items.length > 0);

  if (!groups.length) return null;

  return (
    <section className="mx-auto mt-12 w-full max-w-4xl border-t border-black/[0.07] pt-8 dark:border-white/10">
      <div className="mb-6 max-w-2xl">
        <p className="text-xs font-semibold tracking-[.1em] text-[#5474a8] uppercase dark:text-[#8faee0]">
          {t('recommended_eyebrow')}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">
          {recommendations.stageLabel
            ? t('recommended_for_stage', {
                stage: recommendations.stageLabel,
              })
            : t('recommended_default_title')}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6e6e73] dark:text-[#a1a1a6]">
          {recommendations.stageLabel
            ? t('recommended_for_stage_description')
            : t('recommended_default_description')}
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.key} className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-3 border-b border-black/10 pb-3 dark:border-white/10">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="size-4 text-[#5474a8] dark:text-[#8faee0]" />
                  {group.title}
                </h3>
                <Link
                  href={group.href}
                  className="text-xs underline-offset-4 hover:underline"
                >
                  {t('recommended_view_all')}
                </Link>
              </div>
              <div className="divide-y divide-black/10 dark:divide-white/10">
                {group.items.map((item) => (
                  <WorkspaceRecommendationLink key={item.slug} item={item} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WorkspaceRecommendationLink({
  item,
}: {
  item: WorkspaceRecommendationItem;
}) {
  return (
    <Link href={item.href} className="group block py-4 first:pt-3 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <h4 className="line-clamp-2 text-sm leading-5 font-medium transition-colors group-hover:text-[#5474a8] dark:group-hover:text-[#8faee0]">
          {item.title}
        </h4>
        <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-[#5474a8] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-[#8faee0]" />
      </div>
      {item.summary ? (
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#6e6e73] dark:text-[#a1a1a6]">
          {item.summary}
        </p>
      ) : null}
      {item.meta ? (
        <p className="mt-2 font-mono text-[10px] tracking-wide text-[#8a8175] uppercase">
          {item.meta}
        </p>
      ) : null}
    </Link>
  );
}
