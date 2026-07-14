'use client';

import { UseChatHelpers } from '@ai-sdk/react';

import { useChatContext } from '@/shared/contexts/chat';

import { ChatInput } from './input';

export function FollowUp({
  chatInstance,
}: {
  chatInstance: Pick<UseChatHelpers, 'sendMessage' | 'status' | 'error'>;
}) {
  const { chat } = useChatContext();

  return (
    <ChatInput
      handleSubmit={async (message, body) => {
        await chatInstance.sendMessage(
          { text: message.text },
          { body: { chatId: chat?.id, ...body } }
        );
      }}
      status={chatInstance.status}
      error={chatInstance.error?.message ?? null}
    />
  );
}
