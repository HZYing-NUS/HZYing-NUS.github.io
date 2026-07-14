'use client';

import { useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { useTranslations } from 'next-intl';

import { useChatContext } from '@/shared/contexts/chat';
import { Chat } from '@/shared/types/chat';

import { FollowUp } from './follow-up';
import { ChatHeader } from './header';
import { ChatMessages } from './messages';

export function ChatBox({
  initialChat,
  initialMessages,
}: {
  initialChat?: Chat;
  initialMessages?: UIMessage[];
}) {
  const t = useTranslations('ai.chat.generator');
  const { chat, setChat } = useChatContext();

  const chatInstance = useChat({
    id: initialChat?.id,
    messages: initialMessages,
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

  const showIntroduction = !initialMessages?.length;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          {showIntroduction ? (
            <div className="mb-8 max-w-2xl">
              <p className="text-primary mb-2 text-xs font-medium tracking-[0.16em] uppercase">
                Your AI workspace
              </p>
              <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
                {t('title')}
              </h1>
              <p className="text-muted-foreground mt-3 text-base leading-7">
                选择模型与专家，用 Credit 完成每一次高价值对话。
              </p>
              <div className="border-border bg-muted/20 mt-8 grid gap-px border sm:grid-cols-3">
                <div className="bg-background p-4">
                  <p className="text-sm font-medium">多模型</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    为不同问题选择合适的推理能力。
                  </p>
                </div>
                <div className="bg-background p-4">
                  <p className="text-sm font-medium">专家系统</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    通过 Skill 将成熟的方法带入对话。
                  </p>
                </div>
                <div className="bg-background p-4">
                  <p className="text-sm font-medium">可追溯会话</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    登录后持续保留重要的讨论与结论。
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          <ChatMessages chatInstance={chatInstance} />
        </div>
      </div>
      <div className="mx-auto w-full max-w-5xl px-4 pb-4 sm:px-6">
        <FollowUp chatInstance={chatInstance} />
      </div>
    </div>
  );
}
