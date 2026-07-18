'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { UIMessage, UseChatHelpers } from '@ai-sdk/react';
import { LockKeyholeIcon, SparklesIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useRouter } from '@/core/i18n/navigation';
import { LocaleSelector } from '@/shared/blocks/common';
import { PromptInputMessage } from '@/shared/components/ai-elements/prompt-input';
import { SidebarTrigger } from '@/shared/components/ui/sidebar';
import { useAppContext } from '@/shared/contexts/app';
import { useChatContext } from '@/shared/contexts/chat';

import { ChatInput } from './input';
import { uploadChatAttachments } from './upload-attachments';

export function ChatGenerator() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();

  const t = useTranslations('ai.chat.generator');

  const { user, isCheckSign, setIsShowSignModal } = useAppContext();
  const { chats, setChats, setChat } = useChatContext();

  const [status, setStatus] = useState<UseChatHelpers<UIMessage>['status']>();
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="dark:bg-background dark:text-foreground relative flex h-screen flex-col overflow-hidden bg-[#f5f1e8] text-[#24231f]">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-40 left-[12%] size-[28rem] rounded-full bg-[#d9bfa6]/25 blur-3xl dark:bg-[#7c5a43]/10" />
        <div className="absolute right-[5%] bottom-[-16rem] size-[34rem] rounded-full bg-[#c9c4a7]/30 blur-3xl dark:bg-[#77725e]/10" />
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,#9a8d7a18_1px,transparent_1px),linear-gradient(to_bottom,#9a8d7a18_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.22]" />
      </div>
      <header className="dark:border-border dark:bg-background/95 sticky top-0 z-10 flex w-full items-center gap-2 border-b border-black/10 bg-[#f5f1e8]/95 px-4 py-3 backdrop-blur">
        <SidebarTrigger className="size-7" />
        <div className="flex-1"></div>
        <LocaleSelector />
      </header>
      <main className="relative z-[1] mx-auto flex h-screen w-full flex-1 flex-col justify-center px-5 pb-8 md:max-w-4xl md:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="mb-4 flex items-center gap-2 font-mono text-[10px] tracking-[.24em] text-[#a34e32] uppercase">
            <SparklesIcon className="size-3" />
            {t('eyebrow')}
          </p>
          <h2 className="text-4xl leading-[0.98] font-semibold tracking-[-.055em] text-balance sm:text-6xl">
            {t('title')}
          </h2>
          <p className="dark:text-muted-foreground mt-5 max-w-2xl text-sm leading-6 text-[#6d685f] sm:text-base sm:leading-7">
            {t('description')}
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
          />
        </div>
      </main>
      {!isCheckSign && !user ? (
        <section
          aria-modal="true"
          aria-labelledby="chat-auth-gate-title"
          role="dialog"
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#ede8de]/55 px-5 backdrop-blur-md md:left-[var(--sidebar-width)] dark:bg-black/55"
        >
          <div className="dark:bg-card w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#fffdf8] shadow-[0_30px_90px_-35px_rgba(70,55,38,0.55)] dark:border-white/10">
            <div className="border-b border-[#ded6c9] bg-[#f4eee4] px-7 py-5 dark:border-white/10 dark:bg-white/5">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#292721] text-[#fffaf0] shadow-sm">
                <LockKeyholeIcon className="size-5" />
              </div>
            </div>
            <div className="px-7 pt-7 pb-8">
              <p className="mb-3 font-mono text-[10px] tracking-[.22em] text-[#a34e32] uppercase">
                WebTools AI
              </p>
              <h3
                id="chat-auth-gate-title"
                className="text-2xl font-semibold tracking-[-.035em]"
              >
                {t('signin_gate_title')}
              </h3>
              <p className="text-muted-foreground mt-3 text-sm leading-6">
                {t('signin_gate_description')}
              </p>
              <button
                type="button"
                onClick={() => setIsShowSignModal(true)}
                className="mt-7 flex w-full items-center justify-center rounded-xl bg-[#292721] px-5 py-3 text-sm font-medium text-[#fffaf0] transition duration-200 hover:-translate-y-0.5 hover:bg-[#3a3730] focus-visible:ring-2 focus-visible:ring-[#a34e32] focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0 dark:bg-[#f0eadf] dark:text-[#292721]"
              >
                {t('signin_gate_action')}
              </button>
            </div>
          </div>
        </section>
      ) : null}
      {isCheckSign ? (
        <div className="fixed inset-0 z-40 bg-[#ede8de]/45 backdrop-blur-sm md:left-[var(--sidebar-width)] dark:bg-black/45" />
      ) : null}
    </div>
  );
}
