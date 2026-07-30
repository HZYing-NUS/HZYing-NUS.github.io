'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { UIMessage, UseChatHelpers } from '@ai-sdk/react';
import {
  ArrowUpRight,
  Boxes,
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

import { ChatInput } from './input';
import { uploadChatAttachments } from './upload-attachments';

export function ChatGenerator({
  workspaceHome = false,
  publicLanding = false,
}: {
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

  if (workspaceHome) {
    return (
      <div className="relative flex min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-[#f7f7f8] text-[#1d1d1f] dark:bg-[#101114] dark:text-[#f5f5f7]">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute top-[18%] left-1/2 h-80 w-[44rem] -translate-x-1/2 rounded-full bg-white/75 blur-[100px] dark:bg-white/[0.035]" />
        </div>
        <main className="relative z-[1] mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-5 pb-[14vh] sm:px-8">
          <h1 className="text-center text-[2rem] leading-tight font-semibold tracking-[-0.045em] text-balance sm:text-[2.55rem]">
            {t('home_title')}
          </h1>
          <div className="mx-auto mt-8 w-full max-w-3xl">
            <ChatInput
              initialSkill={searchParams.get('skill') || undefined}
              estimateLocale={locale}
              error={error}
              handleSubmit={handleSubmit}
              onInputChange={() => {
                if (status === 'error') setStatus(undefined);
                if (error) setError(null);
              }}
              status={status}
              suggestedQuestion={suggestedQuestion}
              onSuggestedQuestionApplied={() => setSuggestedQuestion(undefined)}
              compact
              home
            />
          </div>
        </main>
      </div>
    );
  }

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
      </main>
    </div>
  );
}
