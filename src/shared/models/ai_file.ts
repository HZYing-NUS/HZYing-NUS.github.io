import { and, asc, count, desc, eq, inArray, lte, ne, or } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiFile, chat, fileChunk, project } from '@/config/db/schema';

export type NewAiFile = typeof aiFile.$inferInsert;
export type AiFile = typeof aiFile.$inferSelect;
export type NewFileChunk = typeof fileChunk.$inferInsert;
export type CreateAiFile = Omit<NewAiFile, 'projectId' | 'chatId'> & {
  projectId?: string;
  chatId?: string;
};
export type CreateFileChunk = Omit<NewFileChunk, 'userId' | 'fileId'>;
export type AiFileCleanupStatus =
  | 'cleanup_pending'
  | 'cleanup_failed'
  | 'cleanup_complete';

export async function createAiFile(file: CreateAiFile) {
  if (Boolean(file.projectId) === Boolean(file.chatId)) {
    throw new Error('File must belong to exactly one project or chat');
  }

  return db().transaction(async (tx: any) => {
    if (file.projectId) {
      const [ownedProject] = await tx
        .select({ id: project.id })
        .from(project)
        .where(
          and(eq(project.id, file.projectId), eq(project.userId, file.userId))
        );
      if (!ownedProject) throw new Error('Project not found');
    }
    if (file.chatId) {
      const [ownedChat] = await tx
        .select({ id: chat.id })
        .from(chat)
        .where(and(eq(chat.id, file.chatId), eq(chat.userId, file.userId)));
      if (!ownedChat) throw new Error('Chat not found');
    }
    const [created] = await tx.insert(aiFile).values(file).returning();
    return created;
  });
}

export async function findAiFile(id: string, userId: string) {
  const [result] = await db()
    .select()
    .from(aiFile)
    .where(
      and(
        eq(aiFile.id, id),
        eq(aiFile.userId, userId),
        eq(aiFile.status, 'active')
      )
    );
  return result;
}

export async function getAiFilesByIds(ids: string[], userId: string) {
  if (!ids.length) return [];
  return db()
    .select()
    .from(aiFile)
    .where(
      and(
        eq(aiFile.userId, userId),
        eq(aiFile.status, 'active'),
        inArray(aiFile.id, ids)
      )
    );
}

export async function claimAiFileParsing(
  id: string,
  userId: string,
  claimId: string,
  claimTtlMs: number
) {
  const expiredBefore = new Date(Date.now() - claimTtlMs);
  const [claimed] = await db()
    .update(aiFile)
    .set({
      parseStatus: 'parsing',
      parseClaimId: claimId,
      parseAttemptId: claimId,
      parseClaimedAt: new Date(),
      parseError: null,
    })
    .where(
      and(
        eq(aiFile.id, id),
        eq(aiFile.userId, userId),
        eq(aiFile.status, 'active'),
        or(
          inArray(aiFile.parseStatus, ['pending', 'failed']),
          and(
            eq(aiFile.parseStatus, 'parsing'),
            lte(aiFile.parseClaimedAt, expiredBefore)
          )
        )
      )
    )
    .returning();
  return claimed;
}

export async function completeAiFileParsing({
  id,
  userId,
  claimId,
  parseStatus,
  parseError,
  parseCostUsd,
  chargeable,
}: {
  id: string;
  userId: string;
  claimId: string;
  parseStatus: 'parsed' | 'failed';
  parseError: string | null;
  parseCostUsd: string;
  chargeable: boolean;
}) {
  const [updated] = await db()
    .update(aiFile)
    .set({
      parseStatus,
      parseError,
      parseCostUsd,
      parseChargedAt: chargeable ? new Date() : undefined,
      parseClaimId: null,
      parseClaimedAt: null,
    })
    .where(
      and(
        eq(aiFile.id, id),
        eq(aiFile.userId, userId),
        eq(aiFile.parseClaimId, claimId)
      )
    )
    .returning();
  return updated;
}

export async function commitAiFileParsingForClaim({
  id,
  userId,
  claimId,
  chunks,
}: {
  id: string;
  userId: string;
  claimId: string;
  chunks: CreateFileChunk[];
}) {
  return db().transaction(async (tx: any) => {
    const [ownedClaim] = await tx
      .select({ id: aiFile.id })
      .from(aiFile)
      .where(
        and(
          eq(aiFile.id, id),
          eq(aiFile.userId, userId),
          eq(aiFile.parseStatus, 'parsing'),
          eq(aiFile.parseClaimId, claimId)
        )
      )
      .for('update');
    if (!ownedClaim) return undefined;
    await tx
      .delete(fileChunk)
      .where(and(eq(fileChunk.fileId, id), eq(fileChunk.userId, userId)));
    if (chunks.length) {
      await tx
        .insert(fileChunk)
        .values(chunks.map((chunk) => ({ ...chunk, userId, fileId: id })));
    }
    const [updated] = await tx
      .update(aiFile)
      .set({
        parseStatus: 'parsed',
        parseError: null,
        parseClaimId: null,
        parseClaimedAt: null,
      })
      .where(
        and(
          eq(aiFile.id, id),
          eq(aiFile.userId, userId),
          eq(aiFile.parseClaimId, claimId)
        )
      )
      .returning();
    return updated;
  });
}

export async function markAiFileParseCharged({
  id,
  userId,
  actualCostUsd,
}: {
  id: string;
  userId: string;
  actualCostUsd: string;
}) {
  const [updated] = await db()
    .update(aiFile)
    .set({ parseCostUsd: actualCostUsd, parseChargedAt: new Date() })
    .where(and(eq(aiFile.id, id), eq(aiFile.userId, userId)))
    .returning();
  return updated;
}

export async function findAiFileForCleanup(id: string, userId: string) {
  const [result] = await db()
    .select()
    .from(aiFile)
    .where(and(eq(aiFile.id, id), eq(aiFile.userId, userId)));
  return result;
}

export async function getProjectFiles(userId: string, projectId: string) {
  return db()
    .select()
    .from(aiFile)
    .where(
      and(
        eq(aiFile.userId, userId),
        eq(aiFile.projectId, projectId),
        eq(aiFile.status, 'active')
      )
    )
    .orderBy(desc(aiFile.createdAt));
}

export async function getProjectFilesForCleanup(
  userId: string,
  projectId: string
) {
  return db()
    .select()
    .from(aiFile)
    .where(and(eq(aiFile.userId, userId), eq(aiFile.projectId, projectId)))
    .orderBy(asc(aiFile.createdAt));
}

function scoreFilename(name: string, query: string) {
  const terms =
    query.toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fff]{2,4}/g) || [];
  const filename = name.toLowerCase();
  return terms.reduce(
    (score, term) => score + Number(filename.includes(term)),
    0
  );
}

export async function getRelevantProjectFiles(
  userId: string,
  projectId: string,
  query: string,
  limit = 5
) {
  const files = await db()
    .select({
      id: aiFile.id,
      originalName: aiFile.originalName,
      chunkContent: fileChunk.content,
    })
    .from(aiFile)
    .leftJoin(fileChunk, eq(fileChunk.fileId, aiFile.id))
    .where(
      and(
        eq(aiFile.userId, userId),
        eq(aiFile.projectId, projectId),
        eq(aiFile.status, 'active')
      )
    )
    .orderBy(desc(aiFile.updatedAt));
  const scores = new Map<
    string,
    { id: string; originalName: string; score: number }
  >();
  for (const file of files) {
    const current = scores.get(file.id) || {
      id: file.id,
      originalName: file.originalName,
      score: scoreFilename(file.originalName, query),
    };
    current.score += file.chunkContent
      ? scoreFilename(file.chunkContent, query)
      : 0;
    scores.set(file.id, current);
  }
  return [...scores.values()]
    .filter((file: { score: number }) => file.score > 0)
    .sort(
      (left: { score: number }, right: { score: number }) =>
        right.score - left.score
    )
    .slice(0, limit);
}

export async function getChatFiles(userId: string, chatId: string) {
  return db()
    .select()
    .from(aiFile)
    .where(
      and(
        eq(aiFile.userId, userId),
        eq(aiFile.chatId, chatId),
        eq(aiFile.status, 'active')
      )
    )
    .orderBy(desc(aiFile.createdAt));
}

export async function getChatFilesForCleanup(userId: string, chatId: string) {
  return db()
    .select()
    .from(aiFile)
    .where(and(eq(aiFile.userId, userId), eq(aiFile.chatId, chatId)))
    .orderBy(asc(aiFile.createdAt));
}

export async function getRetryableFileCleanups(limit = 100) {
  const abandonedUploadBefore = new Date(Date.now() - 60 * 60 * 1000);
  return db()
    .select()
    .from(aiFile)
    .where(
      or(
        eq(aiFile.status, 'cleanup_failed'),
        and(
          eq(aiFile.status, 'uploading'),
          lte(aiFile.createdAt, abandonedUploadBefore)
        )
      )
    )
    .orderBy(asc(aiFile.updatedAt))
    .limit(limit);
}

export async function hasProjectFileCleanupStarted(
  userId: string,
  projectId: string
) {
  const [result] = await db()
    .select({ id: aiFile.id })
    .from(aiFile)
    .where(
      and(
        eq(aiFile.userId, userId),
        eq(aiFile.projectId, projectId),
        ne(aiFile.status, 'active')
      )
    )
    .limit(1);
  return Boolean(result);
}

export async function countProjectFiles(userId: string, projectId: string) {
  const [result] = await db()
    .select({ count: count() })
    .from(aiFile)
    .where(
      and(
        eq(aiFile.userId, userId),
        eq(aiFile.projectId, projectId),
        eq(aiFile.status, 'active')
      )
    );
  return result?.count || 0;
}

export async function deleteAiFile(id: string, userId: string) {
  const [deleted] = await db()
    .delete(aiFile)
    .where(and(eq(aiFile.id, id), eq(aiFile.userId, userId)))
    .returning();
  return deleted;
}

export async function updateAiFileCleanup(
  id: string,
  userId: string,
  status: AiFileCleanupStatus,
  parseError: string | null
) {
  const [updated] = await db()
    .update(aiFile)
    .set({
      status,
      parseError,
      deletedAt: new Date(),
    })
    .where(and(eq(aiFile.id, id), eq(aiFile.userId, userId)))
    .returning();
  return updated;
}

export async function activateAiFile(
  id: string,
  userId: string,
  parsing: { parseStatus: string; parseError: string | null }
) {
  const [updated] = await db()
    .update(aiFile)
    .set({
      ...parsing,
      status: 'active',
      deletedAt: null,
    })
    .where(and(eq(aiFile.id, id), eq(aiFile.userId, userId)))
    .returning();
  return updated;
}

export async function replaceFileChunks(
  userId: string,
  fileId: string,
  chunks: CreateFileChunk[]
) {
  return db().transaction(async (tx: any) => {
    const [ownedFile] = await tx
      .select({ id: aiFile.id })
      .from(aiFile)
      .where(and(eq(aiFile.id, fileId), eq(aiFile.userId, userId)))
      .for('update');
    if (!ownedFile) throw new Error('File not found');
    await tx
      .delete(fileChunk)
      .where(and(eq(fileChunk.fileId, fileId), eq(fileChunk.userId, userId)));
    const ownedChunks = chunks.map((chunk) => ({
      ...chunk,
      userId,
      fileId,
    }));
    return ownedChunks.length
      ? tx.insert(fileChunk).values(ownedChunks).returning()
      : [];
  });
}

export async function getFileChunks(userId: string, fileId: string) {
  return db()
    .select()
    .from(fileChunk)
    .where(and(eq(fileChunk.userId, userId), eq(fileChunk.fileId, fileId)))
    .orderBy(asc(fileChunk.chunkIndex));
}
