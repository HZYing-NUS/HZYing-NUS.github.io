import { generateId } from 'ai';

import { respData, respErr } from '@/shared/lib/resp';
import {
  ChatStatus,
  createChat,
  findChatById,
  toPublicChat,
} from '@/shared/models/chat';
import { findChatMessageById } from '@/shared/models/chat_message';
import { findPublishedSkill } from '@/shared/models/skill';
import { getUserInfo } from '@/shared/models/user';

export async function POST(req: Request) {
  try {
    const { sourceChatId, sourceMessageId, skill } = (await req.json()) as {
      sourceChatId?: string;
      sourceMessageId?: string;
      skill?: string;
    };
    if (!sourceChatId || !sourceMessageId || !skill) {
      return respErr('INVALID_REQUEST');
    }
    const user = await getUserInfo();
    if (!user) return respErr('UNAUTHORIZED');
    const [sourceChat, sourceMessage, publishedSkill] = await Promise.all([
      findChatById(sourceChatId, user.id),
      findChatMessageById(sourceMessageId, user.id),
      findPublishedSkill(skill),
    ]);
    if (!sourceChat || sourceMessage?.chatId !== sourceChat.id) {
      return respErr('SOURCE_NOT_FOUND');
    }
    if (!publishedSkill) return respErr('SKILL_NOT_AVAILABLE');
    const sourceParts = JSON.parse(sourceMessage.parts);
    const text = sourceParts
      .filter((part: { type: string }) => part.type === 'text')
      .map((part: { text?: string }) => part.text || '')
      .join('\n')
      .trim();
    const pendingMessageId = generateId().toLowerCase();

    const chat = await createChat({
      id: generateId().toLowerCase(),
      userId: user.id,
      status: ChatStatus.CREATED,
      model: sourceChat.model,
      provider: sourceChat.provider,
      title: sourceChat.title,
      parts: '',
      metadata: JSON.stringify({
        pendingMessageId,
        sourceChatId,
        sourceMessageId,
      }),
      content: JSON.stringify({ text }),
      projectId: sourceChat.projectId,
      skillVersionId: publishedSkill.version.id,
      webSearchEnabled: false,
    });
    return respData({ ...toPublicChat(chat), pendingMessageId });
  } catch (error) {
    return respErr(
      error instanceof Error ? error.message : 'CREATE_SKILL_CHAT_FAILED'
    );
  }
}
