import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { chat, chatMessage } from '@/config/db/schema';

import { Chat } from './chat';
import { appendUserToResult, User } from './user';

export enum ChatMessageStatus {
  PROCESSING = 'processing',
  CREATED = 'created',
  FAILED = 'failed',
  DELETED = 'deleted',
}

export type ChatMessage = typeof chatMessage.$inferSelect & {
  user?: User;
  chat?: Chat;
};
export type NewChatMessage = typeof chatMessage.$inferInsert;
export type UpdateChatMessage = Partial<
  Pick<
    NewChatMessage,
    | 'status'
    | 'parts'
    | 'metadata'
    | 'content'
    | 'model'
    | 'provider'
    | 'skillVersionId'
    | 'webSearchEnabled'
    | 'inputTokens'
    | 'outputTokens'
    | 'cacheReadTokens'
    | 'cacheWriteTokens'
    | 'estimatedCredits'
    | 'reservedCredits'
    | 'settledCredits'
    | 'refundedCredits'
    | 'reservationId'
    | 'sourceDetails'
    | 'fileIds'
    | 'errorReason'
    | 'fallbackConfirmedAt'
  >
>;

export function toPublicChatMessage(message: ChatMessage) {
  return {
    id: message.id,
    status: message.status,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    role: message.role,
    parts: message.parts,
    content: message.content,
    metadata: null,
    model: message.model,
    skillVersionId: message.skillVersionId,
    webSearchEnabled: message.webSearchEnabled,
    inputTokens: message.inputTokens,
    outputTokens: message.outputTokens,
    cacheReadTokens: message.cacheReadTokens,
    cacheWriteTokens: message.cacheWriteTokens,
    estimatedCredits: message.estimatedCredits,
    reservedCredits: message.reservedCredits,
    settledCredits: message.settledCredits,
    refundedCredits: message.refundedCredits,
    sourceDetails: message.sourceDetails,
    fileIds: message.fileIds,
    errorReason: message.errorReason ? 'AI_RESPONSE_INTERRUPTED' : null,
    fallbackConfirmedAt: message.fallbackConfirmedAt,
    fallbackOffer:
      message.metadata && typeof message.metadata === 'string'
        ? (() => {
            try {
              return (
                JSON.parse(message.metadata) as {
                  fallbackOffer?: unknown;
                }
              ).fallbackOffer;
            } catch {
              return undefined;
            }
          })()
        : undefined,
  };
}

export async function createChatMessage(
  newChatMessage: NewChatMessage
): Promise<ChatMessage> {
  return db().transaction(async (tx: any) => {
    const [ownedChat] = await tx
      .select({ id: chat.id })
      .from(chat)
      .where(
        and(
          eq(chat.id, newChatMessage.chatId),
          eq(chat.userId, newChatMessage.userId)
        )
      );
    if (!ownedChat) throw new Error('Chat not found');
    const [result] = await tx
      .insert(chatMessage)
      .values(newChatMessage)
      .returning();
    return result;
  });
}

export async function claimChatMessageRequest(
  message: NewChatMessage
): Promise<boolean> {
  const [claimed] = await db()
    .insert(chatMessage)
    .values(message)
    .onConflictDoNothing({ target: chatMessage.id })
    .returning({ id: chatMessage.id });
  return Boolean(claimed);
}

export async function failChatMessageRequest(
  id: string,
  userId: string,
  errorReason: string
) {
  const [failed] = await db()
    .update(chatMessage)
    .set({
      status: sql`case when ${chatMessage.status} = ${ChatMessageStatus.PROCESSING} then ${ChatMessageStatus.FAILED} else ${ChatMessageStatus.CREATED} end`,
      errorReason,
      metadata: JSON.stringify({ requestState: 'failed' }),
    })
    .where(
      and(
        eq(chatMessage.id, id),
        eq(chatMessage.userId, userId),
        inArray(chatMessage.status, [
          ChatMessageStatus.PROCESSING,
          ChatMessageStatus.CREATED,
        ])
      )
    )
    .returning();
  return failed;
}

export async function getChatMessages({
  userId,
  chatId,
  status,
  page = 1,
  limit = 30,
  getUser = false,
  newestFirst = false,
}: {
  userId?: string;
  chatId: string;
  status?: ChatMessageStatus;
  page?: number;
  limit?: number;
  getUser?: boolean;
  newestFirst?: boolean;
}): Promise<ChatMessage[]> {
  if (!userId) {
    throw new Error('userId is required for chat message queries');
  }
  const result = await db()
    .select()
    .from(chatMessage)
    .where(
      and(
        userId ? eq(chatMessage.userId, userId) : undefined,
        chatId ? eq(chatMessage.chatId, chatId) : undefined,
        status ? eq(chatMessage.status, status) : undefined
      )
    )
    .orderBy(
      newestFirst ? desc(chatMessage.createdAt) : asc(chatMessage.createdAt),
      newestFirst ? desc(chatMessage.id) : asc(chatMessage.id)
    )
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}

export async function getChatMessagesCount({
  userId,
  chatId,
  status,
}: {
  userId?: string;
  chatId: string;
  status?: ChatMessageStatus;
}): Promise<number> {
  if (!userId) {
    throw new Error('userId is required for chat message count queries');
  }
  const [result] = await db()
    .select({ count: count() })
    .from(chatMessage)
    .where(
      and(
        userId ? eq(chatMessage.userId, userId) : undefined,
        chatId ? eq(chatMessage.chatId, chatId) : undefined,
        status ? eq(chatMessage.status, status) : undefined
      )
    );

  return result?.count || 0;
}

export async function findChatMessageById(
  id: string,
  userId: string
): Promise<ChatMessage | undefined> {
  const [result] = await db()
    .select()
    .from(chatMessage)
    .where(and(eq(chatMessage.id, id), eq(chatMessage.userId, userId)));

  return result;
}

export async function updateChatMessage(
  id: string,
  updateChatMessage: UpdateChatMessage,
  userId: string
): Promise<ChatMessage | undefined> {
  const [result] = await db()
    .update(chatMessage)
    .set(updateChatMessage)
    .where(and(eq(chatMessage.id, id), eq(chatMessage.userId, userId)))
    .returning();

  return result;
}

export async function claimChatMessageFallback(
  id: string,
  userId: string
): Promise<boolean> {
  const [claimed] = await db()
    .update(chatMessage)
    .set({ fallbackConfirmedAt: new Date() })
    .where(
      and(
        eq(chatMessage.id, id),
        eq(chatMessage.userId, userId),
        isNull(chatMessage.fallbackConfirmedAt)
      )
    )
    .returning({ id: chatMessage.id });
  return Boolean(claimed);
}
