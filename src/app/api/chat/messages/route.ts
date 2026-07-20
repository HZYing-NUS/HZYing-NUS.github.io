import { respData, respErr } from '@/shared/lib/resp';
import { ChatStatus, getChats, getChatsCount } from '@/shared/models/chat';
import {
  ChatMessageStatus,
  getChatMessages,
  getChatMessagesCount,
  toPublicChatMessage,
} from '@/shared/models/chat_message';
import { getUserInfo } from '@/shared/models/user';

export async function POST(req: Request) {
  try {
    let { chatId, page, limit } = await req.json();
    if (!chatId) {
      return respErr('chatId is required');
    }

    if (!page) {
      page = 1;
    }
    if (!limit) {
      limit = 30;
    }

    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const messages = await getChatMessages({
      userId: user.id,
      chatId,
      status: ChatMessageStatus.CREATED,
      page,
      limit,
    });
    const total = await getChatMessagesCount({
      userId: user.id,
      chatId,
      status: ChatMessageStatus.CREATED,
    });

    return respData({
      list: messages.map(toPublicChatMessage),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  } catch (e: any) {
    console.log('get chat messages failed:', e);
    return respErr(`get chat messages failed: ${e.message}`);
  }
}
