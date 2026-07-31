'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { useLocale, useTranslations } from 'next-intl';

import { useAppContext } from '@/shared/contexts/app';
import { useChatContext } from '@/shared/contexts/chat';
import { Chat } from '@/shared/types/chat';

import { FollowUp } from './follow-up';
import { ChatMessages } from './messages';

export function ChatBox({
  initialChat,
  initialMessages,
}: {
  initialChat?: Chat;
  initialMessages?: UIMessage[];
}) {
  const t = useTranslations('ai.chat.generator');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const pendingSent = useRef(false);
  const { fetchUserCredits } = useAppContext();
  const { chat, setChat } = useChatContext();

  const chatInstance = useChat({
    id: initialChat?.id,
    messages: initialMessages,
    onFinish: () => {
      void fetchUserCredits();
    },
    onError: () => {
      void fetchUserCredits();
    },
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest({ messages, id, body }) {
        const extraBody = body ?? {};
        return {
          body: {
            chatId: id,
            message: messages[messages.length - 1],
            ...extraBody,
          },
        };
      },
    }),
  });

  useEffect(() => {
    if (initialChat) {
      setChat(initialChat);
    }
  }, [initialChat, setChat]);

  useEffect(() => {
    const pendingMessageId = searchParams.get('messageId');
    const fileIds = (searchParams.get('fileIds') || '')
      .split(',')
      .filter(Boolean);
    const pendingText =
      initialChat?.content?.text?.trim() ||
      (fileIds.length
        ? locale === 'zh'
          ? '请分析我上传的文件'
          : 'Please analyze the uploaded file(s).'
        : '');
    if (
      pendingSent.current ||
      searchParams.get('send') !== '1' ||
      !pendingText ||
      !pendingMessageId ||
      !initialChat ||
      initialMessages?.length
    ) {
      return;
    }
    pendingSent.current = true;
    void chatInstance
      .sendMessage(
        {
          id: pendingMessageId,
          role: 'user',
          parts: [{ type: 'text', text: pendingText }],
        },
        {
          body: {
            model: initialChat.model,
            skill: initialChat.skill?.slug || 'general',
            webSearch: Boolean(initialChat.webSearchEnabled),
            reasoning: Boolean(initialChat.metadata?.pendingReasoning),
            locale,
            fileIds,
          },
        }
      )
      .catch(() => {
        pendingSent.current = false;
      });
  }, [chatInstance, initialChat, initialMessages, locale, searchParams]);

  const showIntroduction = !initialMessages?.length;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
          {showIntroduction ? (
            <div className="mb-8 max-w-2xl">
              {initialChat?.projectSummary ? (
                <div className="bg-card border-border mb-8 rounded-xl border p-5 text-sm shadow-none">
                  <p className="text-primary text-[13px] font-medium tracking-[0.4px]">
                    {locale === 'zh' ? '免费项目摘要' : 'Free project summary'}
                  </p>
                  <h2 className="mt-2 text-xl font-medium">
                    {initialChat.projectSummary.name}
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    {initialChat.projectSummary.description || '—'}
                  </p>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="font-medium">
                        {locale === 'zh' ? '当前阶段' : 'Current stage'}
                      </dt>
                      <dd className="text-muted-foreground">
                        {initialChat.projectSummary.stage || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium">
                        {locale === 'zh' ? '已完成' : 'Completed'}
                      </dt>
                      <dd className="text-muted-foreground">
                        {initialChat.projectSummary.completedItems || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium">
                        {locale === 'zh' ? '当前问题' : 'Current problem'}
                      </dt>
                      <dd className="text-muted-foreground">
                        {initialChat.projectSummary.currentProblem || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium">
                        {locale === 'zh' ? '建议下一步' : 'Suggested next step'}
                      </dt>
                      <dd className="text-muted-foreground">
                        {initialChat.projectSummary.nextSteps || '—'}
                      </dd>
                    </div>
                  </dl>
                  {initialChat.projectSummary.recentMemories?.length ? (
                    <div className="border-border mt-5 border-t pt-4">
                      <p className="font-medium">
                        {locale === 'zh'
                          ? '最近项目进展'
                          : 'Recent project progress'}
                      </p>
                      <ul className="text-muted-foreground mt-2 space-y-2">
                        {initialChat.projectSummary.recentMemories.map(
                          (memory) => (
                            <li key={memory.id} className="whitespace-pre-wrap">
                              {memory.content}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <p className="text-primary mb-2 text-[13px] font-medium tracking-[0.4px]">
                {locale === 'zh' ? 'AI 工作台' : 'AI workspace'}
              </p>
              <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
                {t('title')}
              </h1>
              <p className="text-muted-foreground mt-3 text-base leading-7">
                {locale === 'zh'
                  ? '选择模型与 Skill，用 Credit 完成每一次高价值对话。'
                  : 'Choose a model and Skill, then use Credit for each valuable conversation.'}
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="bg-card border-border rounded-xl border p-4">
                  <p className="text-sm font-medium">
                    {locale === 'zh' ? '多模型' : 'Multiple models'}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {locale === 'zh'
                      ? '为不同问题选择合适的推理能力。'
                      : 'Choose the right reasoning capability for each problem.'}
                  </p>
                </div>
                <div className="bg-card border-border rounded-xl border p-4">
                  <p className="text-sm font-medium">Skills</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {locale === 'zh'
                      ? '通过 Skill 将成熟的方法带入对话。'
                      : 'Bring a structured method into the conversation.'}
                  </p>
                </div>
                <div className="bg-card border-border rounded-xl border p-4">
                  <p className="text-sm font-medium">
                    {locale === 'zh' ? '可追溯会话' : 'Traceable chats'}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {locale === 'zh'
                      ? '持续保留重要的讨论、来源和结论。'
                      : 'Keep important discussions, sources, and conclusions.'}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          <ChatMessages chatInstance={chatInstance} />
        </div>
      </div>
      <div className="mx-auto w-full max-w-4xl px-4 pb-4 sm:px-8">
        <FollowUp chatInstance={chatInstance} />
      </div>
    </div>
  );
}
