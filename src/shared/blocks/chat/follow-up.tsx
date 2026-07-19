'use client';

import { UIMessage, UseChatHelpers } from '@ai-sdk/react';
import { useLocale } from 'next-intl';

import { useChatContext } from '@/shared/contexts/chat';

import { ChatInput } from './input';
import { uploadChatAttachments } from './upload-attachments';

export function FollowUp({
  chatInstance,
}: {
  chatInstance: Pick<
    UseChatHelpers<UIMessage>,
    'sendMessage' | 'status' | 'error'
  >;
}) {
  const { chat } = useChatContext();
  const locale = useLocale();

  return (
    <ChatInput
      handleSubmit={async (message, body) => {
        if (!chat?.id) throw new Error('CHAT_REQUIRED_FOR_UPLOAD');
        const fileIds = message.files?.length
          ? await uploadChatAttachments(chat.id, message.files)
          : [];
        await chatInstance.sendMessage(
          {
            text:
              message.text?.trim() ||
              (fileIds.length
                ? locale === 'zh'
                  ? '请分析我上传的文件'
                  : 'Please analyze the uploaded file(s).'
                : ''),
          },
          { body: { chatId: chat.id, fileIds, locale, ...body } }
        );
      }}
      status={chatInstance.status}
      error={chatInstance.error?.message ?? null}
      lockedModel={chat?.model}
      lockedSkill={chat?.skill?.slug || 'general'}
      lockedSkillLabel={chat?.skill?.name}
      skillInitiallyDisabled={Boolean(chat?.skillDisabledAt)}
      lockedWebSearch={Boolean(chat?.webSearchEnabled)}
      estimateLocale={locale}
      estimateChatId={chat?.id}
      estimateProjectId={chat?.projectId}
      estimateSkillVersionId={chat?.skillVersionId}
    />
  );
}
