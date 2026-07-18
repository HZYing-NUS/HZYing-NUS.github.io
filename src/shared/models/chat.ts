import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  isNull,
  lte,
  or,
} from 'drizzle-orm';

import { db } from '@/core/db';
import { chat, chatMessage, project } from '@/config/db/schema';

import { appendUserToResult, User } from './user';

export type Chat = typeof chat.$inferSelect & {
  user?: User;
};
export type NewChat = typeof chat.$inferInsert;
export type UpdateChat = Partial<
  Pick<
    NewChat,
    | 'status'
    | 'model'
    | 'provider'
    | 'title'
    | 'parts'
    | 'metadata'
    | 'content'
    | 'skillDisabledAt'
    | 'webSearchEnabled'
    | 'deletedAt'
    | 'purgeAt'
  >
>;

export function toPublicChat(chatRecord: Chat) {
  const {
    provider: _provider,
    metadata: _metadata,
    ...publicChat
  } = chatRecord;
  return publicChat;
}

export async function getProjectChats(userId: string, projectId: string) {
  return db()
    .select()
    .from(chat)
    .where(
      and(
        eq(chat.userId, userId),
        eq(chat.projectId, projectId),
        eq(chat.status, ChatStatus.CREATED)
      )
    )
    .orderBy(desc(chat.updatedAt));
}

export async function moveChatToTrash(id: string, userId: string) {
  const deletedAt = new Date();
  return updateChat(
    id,
    {
      status: ChatStatus.DELETED,
      deletedAt,
      purgeAt: new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
    userId
  );
}

export async function getExpiredStandaloneChats(limit = 50) {
  return db()
    .select()
    .from(chat)
    .where(
      and(
        eq(chat.status, ChatStatus.DELETED),
        isNull(chat.projectId),
        lte(chat.purgeAt, new Date())
      )
    )
    .orderBy(asc(chat.purgeAt))
    .limit(limit);
}

export async function permanentlyDeleteChat(id: string, userId: string) {
  const [deleted] = await db()
    .delete(chat)
    .where(and(eq(chat.id, id), eq(chat.userId, userId)))
    .returning();
  return deleted;
}

export enum ChatStatus {
  PENDING = 'pending',
  CREATED = 'created',
  DELETED = 'deleted',
}

export async function createChat(newChat: NewChat): Promise<Chat> {
  return db().transaction(async (tx: any) => {
    if (newChat.projectId) {
      const [ownedProject] = await tx
        .select({ id: project.id })
        .from(project)
        .where(
          and(
            eq(project.id, newChat.projectId),
            eq(project.userId, newChat.userId)
          )
        );
      if (!ownedProject) throw new Error('Project not found');
    }
    const [result] = await tx.insert(chat).values(newChat).returning();
    return result;
  });
}

export async function getChats({
  userId,
  status,
  page = 1,
  limit = 30,
  getUser = false,
  query,
}: {
  userId?: string;
  status?: ChatStatus;
  page?: number;
  limit?: number;
  getUser?: boolean;
  query?: string;
}): Promise<Chat[]> {
  if (!userId && !getUser) {
    throw new Error('userId is required for user-scoped chat queries');
  }
  const result = await db()
    .select()
    .from(chat)
    .where(
      and(
        userId ? eq(chat.userId, userId) : undefined,
        status ? eq(chat.status, status) : undefined,
        query
          ? or(
              ilike(chat.title, `%${query}%`),
              exists(
                db()
                  .select({ id: chatMessage.id })
                  .from(chatMessage)
                  .where(
                    and(
                      eq(chatMessage.chatId, chat.id),
                      eq(chatMessage.userId, chat.userId),
                      or(
                        ilike(chatMessage.content, `%${query}%`),
                        ilike(chatMessage.parts, `%${query}%`)
                      )
                    )
                  )
              )
            )
          : undefined
      )
    )
    .orderBy(desc(chat.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}

export async function getChatsCount({
  userId,
  status,
  query,
}: {
  userId?: string;
  status?: ChatStatus;
  query?: string;
}): Promise<number> {
  if (!userId) {
    throw new Error('userId is required for chat count queries');
  }
  const [result] = await db()
    .select({ count: count() })
    .from(chat)
    .where(
      and(
        userId ? eq(chat.userId, userId) : undefined,
        status ? eq(chat.status, status) : undefined,
        query
          ? or(
              ilike(chat.title, `%${query}%`),
              exists(
                db()
                  .select({ id: chatMessage.id })
                  .from(chatMessage)
                  .where(
                    and(
                      eq(chatMessage.chatId, chat.id),
                      eq(chatMessage.userId, chat.userId),
                      or(
                        ilike(chatMessage.content, `%${query}%`),
                        ilike(chatMessage.parts, `%${query}%`)
                      )
                    )
                  )
              )
            )
          : undefined
      )
    );

  return result?.count || 0;
}

export async function getAllChatsCount(): Promise<number> {
  const [result] = await db().select({ count: count() }).from(chat);
  return result?.count || 0;
}

export async function findChatById(
  id: string,
  userId: string
): Promise<Chat | undefined> {
  const [result] = await db()
    .select({ chat })
    .from(chat)
    .leftJoin(project, eq(chat.projectId, project.id))
    .where(
      and(
        eq(chat.id, id),
        eq(chat.userId, userId),
        eq(chat.status, ChatStatus.CREATED),
        or(eq(project.status, 'active'), isNull(chat.projectId))
      )
    );

  return result?.chat;
}

export async function updateChat(
  id: string,
  updateChat: UpdateChat,
  userId: string
): Promise<Chat | undefined> {
  const [result] = await db()
    .update(chat)
    .set(updateChat)
    .where(and(eq(chat.id, id), eq(chat.userId, userId)))
    .returning();

  return result;
}

export async function assignChatToProject(
  id: string,
  userId: string,
  projectId: string | null
): Promise<Chat | undefined> {
  return db().transaction(async (tx: any) => {
    if (projectId) {
      const [ownedProject] = await tx
        .select({ id: project.id })
        .from(project)
        .where(and(eq(project.id, projectId), eq(project.userId, userId)));
      if (!ownedProject) throw new Error('Project not found');
    }
    const [updated] = await tx
      .update(chat)
      .set({ projectId })
      .where(and(eq(chat.id, id), eq(chat.userId, userId)))
      .returning();
    return updated;
  });
}
