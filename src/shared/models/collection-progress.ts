import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  collection,
  collectionResource,
  collectionStepProgress,
  resource,
} from '@/config/db/schema';
import { buildIncompleteCollectionProgress } from '@/shared/services/collection-progress-policy';

export async function getCollectionProgress(
  userId: string,
  collectionId: string
) {
  const rows = await db()
    .select({ resourceId: collectionStepProgress.resourceId })
    .from(collectionStepProgress)
    .innerJoin(
      collection,
      eq(collectionStepProgress.collectionId, collection.id)
    )
    .where(
      and(
        eq(collectionStepProgress.userId, userId),
        eq(collectionStepProgress.collectionId, collectionId),
        eq(collection.status, 'published')
      )
    );
  return rows.map((row: { resourceId: string }) => row.resourceId);
}

export async function setCollectionStepProgress({
  userId,
  collectionId,
  resourceId,
  completed,
}: {
  userId: string;
  collectionId: string;
  resourceId: string;
  completed: boolean;
}) {
  const [step] = await db()
    .select({ resourceId: collectionResource.resourceId })
    .from(collectionResource)
    .innerJoin(collection, eq(collectionResource.collectionId, collection.id))
    .innerJoin(resource, eq(collectionResource.resourceId, resource.id))
    .where(
      and(
        eq(collectionResource.collectionId, collectionId),
        eq(collectionResource.resourceId, resourceId),
        eq(collection.status, 'published'),
        eq(resource.status, 'published')
      )
    )
    .limit(1);
  if (!step) return null;

  if (!completed) {
    await db()
      .delete(collectionStepProgress)
      .where(
        and(
          eq(collectionStepProgress.userId, userId),
          eq(collectionStepProgress.collectionId, collectionId),
          eq(collectionStepProgress.resourceId, resourceId)
        )
      );
  } else {
    const now = new Date();
    await db()
      .insert(collectionStepProgress)
      .values({
        userId,
        collectionId,
        resourceId,
        completedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          collectionStepProgress.userId,
          collectionStepProgress.collectionId,
          collectionStepProgress.resourceId,
        ],
        set: { completedAt: now, updatedAt: now },
      });
  }

  return getCollectionProgress(userId, collectionId);
}

export async function getIncompleteCollectionProgress(
  userId: string,
  locale: string,
  limit = 3
) {
  const completedRows = await db()
    .select({
      collectionId: collectionStepProgress.collectionId,
      resourceId: collectionStepProgress.resourceId,
      updatedAt: collectionStepProgress.updatedAt,
      slug: collection.slug,
      titleZh: collection.titleZh,
      titleEn: collection.titleEn,
    })
    .from(collectionStepProgress)
    .innerJoin(
      collection,
      eq(collectionStepProgress.collectionId, collection.id)
    )
    .where(
      and(
        eq(collectionStepProgress.userId, userId),
        eq(collection.status, 'published')
      )
    )
    .orderBy(desc(collectionStepProgress.updatedAt));
  if (!completedRows.length) return [];

  const collectionIds: string[] = Array.from(
    new Set<string>(
      completedRows.map((row: { collectionId: string }) => row.collectionId)
    )
  );
  const stepRows = await db()
    .select({ collectionId: collectionResource.collectionId })
    .from(collectionResource)
    .innerJoin(resource, eq(collectionResource.resourceId, resource.id))
    .where(
      and(
        inArray(collectionResource.collectionId, collectionIds),
        eq(resource.status, 'published')
      )
    );
  const totalByCollection = new Map<string, number>();
  for (const row of stepRows as { collectionId: string }[]) {
    totalByCollection.set(
      row.collectionId,
      (totalByCollection.get(row.collectionId) || 0) + 1
    );
  }

  return buildIncompleteCollectionProgress(
    completedRows.map(
      (row: {
        collectionId: string;
        resourceId: string;
        slug: string;
        titleZh: string;
        titleEn: string | null;
        updatedAt: Date;
      }) => ({
        collectionId: row.collectionId,
        resourceId: row.resourceId,
        slug: row.slug,
        title: locale === 'en' ? row.titleEn || row.titleZh : row.titleZh,
        updatedAt: row.updatedAt,
      })
    ),
    totalByCollection,
    limit
  );
}
