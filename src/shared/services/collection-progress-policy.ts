export function calculateCollectionProgress(
  completedCount: number,
  totalCount: number
) {
  const safeTotal = Math.max(0, Math.trunc(totalCount));
  const safeCompleted = Math.min(
    safeTotal,
    Math.max(0, Math.trunc(completedCount))
  );
  return {
    completedCount: safeCompleted,
    totalCount: safeTotal,
    percentage: safeTotal ? Math.round((safeCompleted / safeTotal) * 100) : 0,
    complete: safeTotal > 0 && safeCompleted === safeTotal,
  };
}

export function parseCollectionProgressUpdate(body: unknown) {
  if (!body || typeof body !== 'object') return null;
  const value = body as Record<string, unknown>;
  const resourceId = String(value.resourceId || '').trim();
  if (!resourceId || typeof value.completed !== 'boolean') return null;
  return { resourceId, completed: value.completed };
}

export function buildIncompleteCollectionProgress<
  T extends {
    collectionId: string;
    slug: string;
    title: string;
    resourceId: string;
    updatedAt: Date;
  },
>(rows: T[], totalByCollection: Map<string, number>, limit = 3) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const collectionRows = grouped.get(row.collectionId) || [];
    collectionRows.push(row);
    grouped.set(row.collectionId, collectionRows);
  }

  return Array.from(grouped.values())
    .map((collectionRows) => {
      const first = collectionRows[0];
      const progress = calculateCollectionProgress(
        new Set(collectionRows.map((row) => row.resourceId)).size,
        totalByCollection.get(first.collectionId) || 0
      );
      return {
        collectionId: first.collectionId,
        slug: first.slug,
        title: first.title,
        updatedAt: first.updatedAt,
        ...progress,
      };
    })
    .filter((item) => item.totalCount > 0 && !item.complete)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit);
}
