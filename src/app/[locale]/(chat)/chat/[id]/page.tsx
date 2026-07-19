'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { UIMessage } from 'ai';
import { useLocale } from 'next-intl';

import { ChatBox } from '@/shared/blocks/chat/box';
import { Loader } from '@/shared/components/ai-elements/loader';
import { Chat } from '@/shared/types/chat';

export default function ChatPage() {
  const params = useParams();
  const locale = useLocale();

  const [initialChat, setInitialChat] = useState<Chat | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(
    null
  );

  const fetchChat = useCallback(
    async (chatId: string) => {
      try {
        const resp = await fetch('/api/chat/info', {
          method: 'POST',
          body: JSON.stringify({ chatId, locale }),
        });
        if (!resp.ok) {
          throw new Error(`request failed with status: ${resp.status}`);
        }
        const { code, message, data } = (await resp.json()) as any;
        if (code !== 0) {
          throw new Error(message);
        }

        setInitialChat({
          id: data.id,
          title: data.title,
          createdAt: data.createdAt,
          model: data.model,
          parts: data.parts ? JSON.parse(data.parts) : [],
          metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
          content: data.content ? JSON.parse(data.content) : undefined,
          skillVersionId: data.skillVersionId,
          skill: data.skill,
          skillDisabledAt: data.skillDisabledAt,
          webSearchEnabled: data.webSearchEnabled,
          projectId: data.projectId,
          projectSummary: data.projectSummary,
        } as Chat);

        if (data.id) {
          fetchMessages(data.id);
        }
      } catch (e: any) {
        console.log('fetch chat failed:', e);
      }
    },
    [locale]
  );

  const fetchMessages = async (chatId: string) => {
    try {
      const resp = await fetch('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({ chatId, page: 1, limit: 100 }),
      });
      if (!resp.ok) {
        throw new Error(`request failed with status: ${resp.status}`);
      }
      const { code, message, data } = (await resp.json()) as any;
      if (code !== 0) {
        throw new Error(message);
      }

      const { list } = data;
      setInitialMessages(
        list.map((item: any) => ({
          id: item.id,
          role: item.role,
          metadata: {
            sourceDetails: item.sourceDetails,
            inputTokens: item.inputTokens,
            outputTokens: item.outputTokens,
            settledCredits: item.settledCredits,
            errorReason: item.errorReason,
            fallbackOffer: item.fallbackOffer,
            fallbackConfirmedAt: item.fallbackConfirmedAt,
          },
          parts:
            item.fallbackOffer &&
            !item.fallbackConfirmedAt &&
            !(item.parts ? JSON.parse(item.parts) : []).some(
              (part: { type?: string }) =>
                part.type === 'data-provider-fallback'
            )
              ? [
                  ...(item.parts ? JSON.parse(item.parts) : []),
                  {
                    type: 'data-provider-fallback',
                    id: `provider-fallback:${item.fallbackOffer.sourceMessageId}`,
                    data: item.fallbackOffer,
                  },
                ]
              : item.parts
                ? JSON.parse(item.parts)
                : [],
        })) as UIMessage[]
      );
    } catch (e: any) {
      console.log('fetch messages failed:', e);
    }
  };

  useEffect(() => {
    fetchChat(params.id as string);
  }, [fetchChat, params.id]);

  return initialChat && initialMessages ? (
    <ChatBox initialChat={initialChat} initialMessages={initialMessages} />
  ) : (
    <div className="flex h-screen items-center justify-center p-8">
      <Loader />
    </div>
  );
}
