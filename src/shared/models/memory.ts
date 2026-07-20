import { generateId } from 'ai';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  chat,
  chatMessage,
  globalMemory,
  project,
  projectMemory,
} from '@/config/db/schema';
import {
  createMemoryDedupeKey,
  normalizeMemoryContent,
  type ProjectMemoryCandidate,
} from '@/shared/services/ai/memory-extraction';

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

export async function saveProjectMemoryCandidates({
  userId,
  projectId,
  sourceChatId,
  sourceMessageId,
  userSourceMessageId,
  candidates,
}: {
  userId: string;
  projectId: string;
  sourceChatId: string;
  sourceMessageId: string;
  userSourceMessageId: string;
  candidates: ProjectMemoryCandidate[];
}) {
  if (!candidates.length) return [];
  return db().transaction(async (tx: any) => {
    const [ownedProject] = await tx
      .select({ id: project.id })
      .from(project)
      .where(and(eq(project.id, projectId), eq(project.userId, userId)));
    if (!ownedProject) throw new Error('Project not found');
    await assertOwnedSources(tx, userId, sourceChatId, sourceMessageId);
    await assertOwnedSources(tx, userId, sourceChatId, userSourceMessageId);
    const [projectChat] = await tx
      .select({ id: chat.id })
      .from(chat)
      .where(
        and(
          eq(chat.id, sourceChatId),
          eq(chat.userId, userId),
          eq(chat.projectId, projectId)
        )
      );
    if (!projectChat) throw new Error('Source chat does not belong to project');
    const existing = await tx
      .select()
      .from(projectMemory)
      .where(
        and(
          eq(projectMemory.userId, userId),
          eq(projectMemory.projectId, projectId),
          eq(projectMemory.status, 'active')
        )
      );
    const saved = [];
    for (const candidate of candidates) {
      const normalized = normalizeMemoryContent(candidate.content);
      const candidateSourceMessageId =
        candidate.sourceRole === 'user' ? userSourceMessageId : sourceMessageId;
      const exact = existing.find(
        (memory: typeof projectMemory.$inferSelect) =>
          normalizeMemoryContent(memory.content) === normalized
      );
      if (exact) continue;
      const categoryPrefix = candidate.content.match(/^\[[^\]]+\]/u)?.[0];
      const categoryKey = candidate.replaceCategory ? candidate.category : null;
      const replaceable = candidate.replaceCategory
        ? existing.find(
            (memory: typeof projectMemory.$inferSelect) =>
              categoryPrefix && memory.content.startsWith(categoryPrefix)
          )
        : undefined;
      if (replaceable) {
        const [updated] = await tx
          .update(projectMemory)
          .set({
            type: candidate.type,
            content: candidate.content,
            categoryKey,
            importance: candidate.importance,
            sourceChatId,
            sourceMessageId: candidateSourceMessageId,
            dedupeKey: createMemoryDedupeKey({
              userId,
              scopeId: projectId,
              content: candidate.content,
            }),
          })
          .where(eq(projectMemory.id, replaceable.id))
          .returning();
        saved.push(updated);
        Object.assign(replaceable, updated);
      } else {
        const dedupeKey = createMemoryDedupeKey({
          userId,
          scopeId: projectId,
          content: candidate.content,
        });
        const [created] = await tx
          .insert(projectMemory)
          .values({
            id: generateId().toLowerCase(),
            userId,
            projectId,
            type: candidate.type,
            content: candidate.content,
            dedupeKey,
            categoryKey,
            importance: candidate.importance,
            sourceChatId,
            sourceMessageId: candidateSourceMessageId,
            status: 'active',
          })
          .onConflictDoNothing({
            target: categoryKey
              ? [
                  projectMemory.userId,
                  projectMemory.projectId,
                  projectMemory.categoryKey,
                ]
              : [
                  projectMemory.userId,
                  projectMemory.projectId,
                  projectMemory.dedupeKey,
                ],
          })
          .returning();
        if (!created) continue;
        saved.push(created);
        existing.push(created);
      }
    }
    return saved;
  });
}

export async function saveGlobalMemoryCandidates({
  userId,
  sourceChatId,
  sourceMessageId,
  contents,
}: {
  userId: string;
  sourceChatId: string;
  sourceMessageId: string;
  contents: string[];
}) {
  if (!contents.length) return [];
  return db().transaction(async (tx: any) => {
    await assertOwnedSources(tx, userId, sourceChatId, sourceMessageId);
    const existing = await tx
      .select()
      .from(globalMemory)
      .where(eq(globalMemory.userId, userId));
    const normalizedExisting = new Set(
      existing.map((memory: typeof globalMemory.$inferSelect) =>
        normalizeMemoryContent(memory.content)
      )
    );
    const saved = [];
    for (const content of contents) {
      const normalized = normalizeMemoryContent(content);
      if (normalizedExisting.has(normalized)) continue;
      const dedupeKey = createMemoryDedupeKey({
        userId,
        scopeId: 'global',
        content,
      });
      const [created] = await tx
        .insert(globalMemory)
        .values({
          id: generateId().toLowerCase(),
          userId,
          content,
          dedupeKey,
          sourceChatId,
          sourceMessageId,
          confirmedAt: null,
          status: 'pending',
        })
        .onConflictDoNothing({
          target: [globalMemory.userId, globalMemory.dedupeKey],
        })
        .returning();
      if (!created) continue;
      saved.push(created);
      normalizedExisting.add(normalized);
    }
    return saved;
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
