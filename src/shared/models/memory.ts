import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  chat,
  chatMessage,
  globalMemory,
  project,
  projectMemory,
} from '@/config/db/schema';

export type NewProjectMemory = typeof projectMemory.$inferInsert;
export type NewGlobalMemory = typeof globalMemory.$inferInsert;
export type CreateProjectMemory = Pick<
  NewProjectMemory,
  | 'id'
  | 'userId'
  | 'projectId'
  | 'type'
  | 'content'
  | 'importance'
  | 'sourceChatId'
  | 'sourceMessageId'
  | 'status'
>;
export type UpdateProjectMemory = Partial<
  Pick<NewProjectMemory, 'type' | 'content' | 'importance' | 'status'>
>;
export type CreateGlobalMemory = Pick<
  NewGlobalMemory,
  | 'id'
  | 'userId'
  | 'content'
  | 'sourceChatId'
  | 'sourceMessageId'
  | 'confirmedAt'
  | 'status'
>;
export type UpdateGlobalMemory = Partial<
  Pick<NewGlobalMemory, 'content' | 'confirmedAt' | 'status'>
>;

async function assertOwnedSources(
  tx: any,
  userId: string,
  sourceChatId?: string | null,
  sourceMessageId?: string | null
) {
  if (sourceChatId) {
    const [ownedChat] = await tx
      .select({ id: chat.id })
      .from(chat)
      .where(and(eq(chat.id, sourceChatId), eq(chat.userId, userId)));
    if (!ownedChat) throw new Error('Source chat not found');
  }
  if (sourceMessageId) {
    const [ownedMessage] = await tx
      .select({ id: chatMessage.id, chatId: chatMessage.chatId })
      .from(chatMessage)
      .where(
        and(eq(chatMessage.id, sourceMessageId), eq(chatMessage.userId, userId))
      );
    if (!ownedMessage) throw new Error('Source message not found');
    if (sourceChatId && ownedMessage.chatId !== sourceChatId) {
      throw new Error('Source message does not belong to source chat');
    }
  }
}

export async function createProjectMemory(memory: CreateProjectMemory) {
  return db().transaction(async (tx: any) => {
    const [ownedProject] = await tx
      .select({ id: project.id })
      .from(project)
      .where(
        and(eq(project.id, memory.projectId), eq(project.userId, memory.userId))
      );
    if (!ownedProject) throw new Error('Project not found');
    await assertOwnedSources(
      tx,
      memory.userId,
      memory.sourceChatId,
      memory.sourceMessageId
    );
    const [created] = await tx.insert(projectMemory).values(memory).returning();
    return created;
  });
}

export async function getProjectMemories(userId: string, projectId: string) {
  return db()
    .select()
    .from(projectMemory)
    .where(
      and(
        eq(projectMemory.userId, userId),
        eq(projectMemory.projectId, projectId),
        eq(projectMemory.status, 'active')
      )
    )
    .orderBy(desc(projectMemory.importance), desc(projectMemory.updatedAt));
}

export async function updateProjectMemory(
  id: string,
  userId: string,
  updates: UpdateProjectMemory
) {
  const [updated] = await db()
    .update(projectMemory)
    .set(updates)
    .where(and(eq(projectMemory.id, id), eq(projectMemory.userId, userId)))
    .returning();
  return updated;
}

export async function deleteProjectMemoriesBySourceChat(
  userId: string,
  sourceChatId: string
) {
  return db()
    .delete(projectMemory)
    .where(
      and(
        eq(projectMemory.userId, userId),
        eq(projectMemory.sourceChatId, sourceChatId)
      )
    )
    .returning();
}

export async function createGlobalMemory(memory: CreateGlobalMemory) {
  return db().transaction(async (tx: any) => {
    await assertOwnedSources(
      tx,
      memory.userId,
      memory.sourceChatId,
      memory.sourceMessageId
    );
    const [created] = await tx.insert(globalMemory).values(memory).returning();
    return created;
  });
}

export async function getGlobalMemories(
  userId: string,
  includePending = false
) {
  return db()
    .select()
    .from(globalMemory)
    .where(
      and(
        eq(globalMemory.userId, userId),
        includePending ? undefined : eq(globalMemory.status, 'confirmed')
      )
    )
    .orderBy(desc(globalMemory.updatedAt));
}

export async function deleteProjectMemory(id: string, userId: string) {
  const [deleted] = await db()
    .delete(projectMemory)
    .where(and(eq(projectMemory.id, id), eq(projectMemory.userId, userId)))
    .returning();
  return deleted;
}

export async function updateGlobalMemory(
  id: string,
  userId: string,
  updates: UpdateGlobalMemory
) {
  const [updated] = await db()
    .update(globalMemory)
    .set(updates)
    .where(and(eq(globalMemory.id, id), eq(globalMemory.userId, userId)))
    .returning();
  return updated;
}

export async function deleteGlobalMemory(id: string, userId: string) {
  const [deleted] = await db()
    .delete(globalMemory)
    .where(and(eq(globalMemory.id, id), eq(globalMemory.userId, userId)))
    .returning();
  return deleted;
}
