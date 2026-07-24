import { and, asc, count, eq, ilike, inArray, or } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  collection,
  collectionResource,
  collectionTag,
  resource,
  resourceTag,
  tag,
} from '@/config/db/schema';
import type { CollectionStepInput } from '@/shared/forms/collection';
import { TableColumn } from '@/shared/types/blocks/table';

type CollectionValues = Omit<
  typeof collection.$inferInsert,
  'createdAt' | 'updatedAt'
>;

type PublicResource = {
  slug: string;
  nameZh: string;
  nameEn: string | null;
  websiteUrl: string | null;
  resourceType: string;
  summaryZh: string | null;
  summaryEn: string | null;
  reasonZh: string | null;
  reasonEn: string | null;
  useCaseZh: string | null;
  useCaseEn: string | null;
  pricingType: string | null;
  featured: boolean;
};

function pickLocale(locale: string, zh: string | null, en: string | null) {
  return locale === 'en' ? en || zh || '' : zh || en || '';
}

function readJsonStringArray(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

async function validateCollectionRelationIds(
  tx: any,
  tagIds: string[],
  collectionSteps: CollectionStepInput[],
  existingResourceIds: ReadonlySet<string>,
  status?: string
) {
  if (status === 'published' && collectionSteps.length === 0) {
    throw new Error('Published collections need at least one step');
  }
  if (tagIds.length) {
    const rows = await tx
      .select({ id: tag.id })
      .from(tag)
      .where(inArray(tag.id, tagIds));
    if (rows.length !== tagIds.length)
      throw new Error('One or more collection tags do not exist');
  }

  const resourceIds = collectionSteps.map((step) => step.resourceId);
  if (new Set(resourceIds).size !== resourceIds.length) {
    throw new Error('A resource can only appear once in a collection');
  }
  for (const step of collectionSteps) {
    if (!step.resourceId)
      throw new Error('Collection step resource is required');
    if (!['required', 'alternative'].includes(step.relationType)) {
      throw new Error('Invalid collection step relation type');
    }
    if (
      !existingResourceIds.has(step.resourceId) &&
      !step.stepDescriptionZh &&
      !step.stepDescriptionEn
    ) {
      throw new Error('Collection step description is required');
    }
  }

  if (resourceIds.length) {
    const rows = await tx
      .select({ id: resource.id, status: resource.status })
      .from(resource)
      .where(inArray(resource.id, resourceIds));
    if (rows.length !== resourceIds.length)
      throw new Error('One or more collection resources do not exist');
    if (
      status === 'published' &&
      rows.some((row: { status: string }) => row.status !== 'published')
    ) {
      throw new Error(
        'Published collections can only use published resources / 已发布专题只能关联已发布资源'
      );
    }
  }
}

async function replaceCollectionRelations(
  tx: any,
  collectionId: string,
  tagIds: string[],
  collectionSteps: CollectionStepInput[]
) {
  await tx
    .delete(collectionTag)
    .where(eq(collectionTag.collectionId, collectionId));
  await tx
    .delete(collectionResource)
    .where(eq(collectionResource.collectionId, collectionId));

  if (tagIds.length) {
    await tx
      .insert(collectionTag)
      .values(tagIds.map((tagId) => ({ collectionId, tagId })));
  }

  if (collectionSteps.length) {
    await tx.insert(collectionResource).values(
      collectionSteps.map(({ existing, ...step }, sortOrder) => ({
        collectionId,
        ...step,
        sortOrder,
      }))
    );
  }
}

export async function getCollections({
  page = 1,
  limit = 20,
  query = '',
}: {
  page?: number;
  limit?: number;
  query?: string;
} = {}) {
  const keyword = query.trim();
  const where = keyword
    ? or(
        ilike(collection.titleZh, `%${keyword}%`),
        ilike(collection.titleEn, `%${keyword}%`),
        ilike(collection.slug, `%${keyword}%`)
      )
    : undefined;

  return db()
    .select()
    .from(collection)
    .where(where)
    .orderBy(asc(collection.sortOrder), asc(collection.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

export async function getCollectionsCount({
  query = '',
}: { query?: string } = {}) {
  const keyword = query.trim();
  const where = keyword
    ? or(
        ilike(collection.titleZh, `%${keyword}%`),
        ilike(collection.titleEn, `%${keyword}%`),
        ilike(collection.slug, `%${keyword}%`)
      )
    : undefined;
  const [result] = await db()
    .select({ count: count() })
    .from(collection)
    .where(where);
  return result?.count || 0;
}

export async function getCollectionById(id: string) {
  const [item] = await db()
    .select()
    .from(collection)
    .where(eq(collection.id, id))
    .limit(1);
  return item;
}

export async function getCollectionTagIds(collectionId: string) {
  const rows = await db()
    .select({ tagId: collectionTag.tagId })
    .from(collectionTag)
    .where(eq(collectionTag.collectionId, collectionId));
  return (rows as { tagId: string }[]).map((row) => row.tagId);
}

export async function getCollectionSteps(collectionId: string) {
  const rows = await db()
    .select({
      resourceId: collectionResource.resourceId,
      stepTitleZh: collectionResource.stepTitleZh,
      stepTitleEn: collectionResource.stepTitleEn,
      stepDescriptionZh: collectionResource.stepDescriptionZh,
      stepDescriptionEn: collectionResource.stepDescriptionEn,
      relationType: collectionResource.relationType,
    })
    .from(collectionResource)
    .where(eq(collectionResource.collectionId, collectionId))
    .orderBy(asc(collectionResource.sortOrder));
  type CollectionStepRow = Omit<CollectionStepInput, 'existing'> & {
    relationType: string;
  };
  return (rows as CollectionStepRow[]).map((row) => ({
    ...row,
    existing: true,
    relationType:
      row.relationType === 'alternative' ? 'alternative' : 'required',
  })) satisfies CollectionStepInput[];
}

export async function createCollection(
  values: CollectionValues,
  tagIds: string[],
  collectionSteps: CollectionStepInput[]
) {
  const uniqueTagIds = Array.from(new Set(tagIds));

  return db().transaction(async (tx: any) => {
    await validateCollectionRelationIds(
      tx,
      uniqueTagIds,
      collectionSteps,
      new Set(),
      values.status
    );
    const [item] = await tx.insert(collection).values(values).returning();
    await replaceCollectionRelations(
      tx,
      item.id,
      uniqueTagIds,
      collectionSteps
    );
    return item;
  });
}

export async function updateCollection(
  id: string,
  values: Partial<CollectionValues>,
  tagIds: string[],
  collectionSteps: CollectionStepInput[]
) {
  const uniqueTagIds = Array.from(new Set(tagIds));

  return db().transaction(async (tx: any) => {
    const [currentCollection, currentSteps] = await Promise.all([
      tx
        .select({ status: collection.status })
        .from(collection)
        .where(eq(collection.id, id))
        .limit(1),
      tx
        .select({ resourceId: collectionResource.resourceId })
        .from(collectionResource)
        .where(eq(collectionResource.collectionId, id)),
    ]);
    if (!currentCollection[0]) return undefined;

    await validateCollectionRelationIds(
      tx,
      uniqueTagIds,
      collectionSteps,
      new Set(
        (currentSteps as { resourceId: string }[]).map(
          (step) => step.resourceId
        )
      ),
      values.status ?? currentCollection[0].status
    );
    const [item] = await tx
      .update(collection)
      .set(values)
      .where(eq(collection.id, id))
      .returning();
    if (!item) return item;
    await replaceCollectionRelations(tx, id, uniqueTagIds, collectionSteps);
    return item;
  });
}

export async function deleteCollection(id: string) {
  return db().transaction(async (tx: any) => {
    const [item] = await tx
      .select()
      .from(collection)
      .where(eq(collection.id, id))
      .limit(1)
      .for('update');
    if (!item) throw new Error('Collection not found');
    if (item.status !== 'draft')
      throw new Error('Only draft collections can be permanently deleted');

    const [deleted] = await tx
      .delete(collection)
      .where(and(eq(collection.id, id), eq(collection.status, 'draft')))
      .returning();
    if (!deleted)
      throw new Error('Only draft collections can be permanently deleted');
    return deleted;
  });
}

export async function archiveCollection(id: string) {
  const [item] = await db()
    .update(collection)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(and(eq(collection.id, id), eq(collection.status, 'published')))
    .returning();

  if (!item) throw new Error('Only published collections can be archived');
  return item;
}

export async function getPublishedCollections(
  locale: string,
  allowAiCitation = false
) {
  const rows = await db()
    .select()
    .from(collection)
    .where(
      and(
        eq(collection.status, 'published'),
        ...(allowAiCitation ? [eq(collection.allowAiCitation, true)] : [])
      )
    )
    .orderBy(asc(collection.sortOrder), asc(collection.createdAt));

  const typedRows = rows as (typeof collection.$inferSelect)[];
  if (!typedRows.length) return [];

  const collectionIds = typedRows.map((item) => item.id);
  const [tagRows, resourceRows] = await Promise.all([
    db()
      .select({
        collectionId: collectionTag.collectionId,
        id: tag.id,
        nameZh: tag.nameZh,
        nameEn: tag.nameEn,
      })
      .from(collectionTag)
      .innerJoin(tag, eq(collectionTag.tagId, tag.id))
      .where(inArray(collectionTag.collectionId, collectionIds)),
    db()
      .select({
        collectionId: collectionResource.collectionId,
        resource,
        sortOrder: collectionResource.sortOrder,
        stepTitleZh: collectionResource.stepTitleZh,
        stepTitleEn: collectionResource.stepTitleEn,
        stepDescriptionZh: collectionResource.stepDescriptionZh,
        stepDescriptionEn: collectionResource.stepDescriptionEn,
        relationType: collectionResource.relationType,
      })
      .from(collectionResource)
      .innerJoin(resource, eq(collectionResource.resourceId, resource.id))
      .where(
        and(
          inArray(collectionResource.collectionId, collectionIds),
          eq(resource.status, 'published')
        )
      )
      .orderBy(
        asc(collectionResource.collectionId),
        asc(collectionResource.sortOrder)
      ),
  ]);
  const tagsByCollection = new Map<string, typeof tagRows>();
  for (const row of tagRows) {
    const items = tagsByCollection.get(row.collectionId) || [];
    items.push(row);
    tagsByCollection.set(row.collectionId, items);
  }
  const resourcesByCollection = new Map<string, typeof resourceRows>();
  for (const row of resourceRows) {
    const items = resourcesByCollection.get(row.collectionId) || [];
    items.push(row);
    resourcesByCollection.set(row.collectionId, items);
  }

  return typedRows.map((item) =>
    buildPublishedCollectionView(
      item,
      locale,
      tagsByCollection.get(item.id) || [],
      resourcesByCollection.get(item.id) || []
    )
  );
}

export async function getPublishedCollectionBySlug(
  slug: string,
  locale: string
) {
  const [item] = await db()
    .select()
    .from(collection)
    .where(and(eq(collection.slug, slug), eq(collection.status, 'published')))
    .limit(1);
  if (!item) return null;
  return getPublishedCollectionView(item, locale);
}

export async function getCollectionTableColumns(
  locale: string,
  canWrite = true
): Promise<TableColumn[]> {
  const isZh = locale === 'zh';
  return [
    {
      name: 'title',
      title: isZh ? '专题' : 'Collection',
      callback: (row: typeof collection.$inferSelect) => (
        <div className="space-y-1">
          <div className="font-medium">
            {isZh ? row.titleZh : row.titleEn || row.titleZh}
          </div>
          <div className="text-muted-foreground text-xs">{row.slug}</div>
        </div>
      ),
    },
    {
      name: 'status',
      title: isZh ? '状态' : 'Status',
      callback: (row: typeof collection.$inferSelect) => row.status,
    },
    {
      name: 'featured',
      title: isZh ? '精选' : 'Featured',
      callback: (row: typeof collection.$inferSelect) =>
        row.featured ? (isZh ? '是' : 'Yes') : isZh ? '否' : 'No',
    },
    ...(canWrite
      ? [
          {
            name: 'action',
            title: '',
            type: 'dropdown',
            callback: (row: typeof collection.$inferSelect) => [
              {
                id: 'edit',
                title: isZh ? '编辑' : 'Edit',
                icon: 'RiEditLine',
                url: `/admin/collections/${row.id}/edit`,
              },
              ...(row.status === 'published'
                ? [
                    {
                      id: 'archive',
                      title: isZh ? '归档' : 'Archive',
                      icon: 'RiArchiveLine',
                      url: `/admin/collections/${row.id}/delete`,
                    },
                  ]
                : row.status === 'draft'
                  ? [
                      {
                        id: 'delete',
                        title: isZh ? '永久删除' : 'Delete permanently',
                        icon: 'RiDeleteBinLine',
                        url: `/admin/collections/${row.id}/delete`,
                      },
                    ]
                  : []),
            ],
          } satisfies TableColumn,
        ]
      : []),
  ];
}

async function getPublishedCollectionView(
  item: typeof collection.$inferSelect,
  locale: string
) {
  const [tagRows, resourceRows] = await Promise.all([
    db()
      .select({ id: tag.id, nameZh: tag.nameZh, nameEn: tag.nameEn })
      .from(collectionTag)
      .innerJoin(tag, eq(collectionTag.tagId, tag.id))
      .where(eq(collectionTag.collectionId, item.id)),
    db()
      .select({
        resource: resource,
        sortOrder: collectionResource.sortOrder,
        stepTitleZh: collectionResource.stepTitleZh,
        stepTitleEn: collectionResource.stepTitleEn,
        stepDescriptionZh: collectionResource.stepDescriptionZh,
        stepDescriptionEn: collectionResource.stepDescriptionEn,
        relationType: collectionResource.relationType,
      })
      .from(collectionResource)
      .innerJoin(resource, eq(collectionResource.resourceId, resource.id))
      .where(
        and(
          eq(collectionResource.collectionId, item.id),
          eq(resource.status, 'published')
        )
      )
      .orderBy(asc(collectionResource.sortOrder)),
  ]);

  return buildPublishedCollectionView(item, locale, tagRows, resourceRows);
}

function buildPublishedCollectionView(
  item: typeof collection.$inferSelect,
  locale: string,
  tagRows: {
    id: string;
    nameZh: string;
    nameEn: string | null;
  }[],
  resourceRows: {
    resource: typeof resource.$inferSelect;
    sortOrder: number;
    stepTitleZh: string | null;
    stepTitleEn: string | null;
    stepDescriptionZh: string | null;
    stepDescriptionEn: string | null;
    relationType: string;
  }[]
) {
  const typedTagRows = tagRows as {
    id: string;
    nameZh: string;
    nameEn: string | null;
  }[];
  const typedResourceRows = resourceRows as {
    resource: typeof resource.$inferSelect;
    sortOrder: number;
    stepTitleZh: string | null;
    stepTitleEn: string | null;
    stepDescriptionZh: string | null;
    stepDescriptionEn: string | null;
    relationType: string;
  }[];

  return {
    id: item.id,
    slug: item.slug,
    title: pickLocale(locale, item.titleZh, item.titleEn),
    summary: pickLocale(locale, item.summaryZh, item.summaryEn),
    content: pickLocale(locale, item.contentZh, item.contentEn),
    stageId: item.stageId,
    categoryId: item.categoryId,
    featured: item.featured,
    tags: typedTagRows.map((tagItem) => ({
      id: tagItem.id,
      name: pickLocale(locale, tagItem.nameZh, tagItem.nameEn),
    })),
    resources: typedResourceRows.map((resourceItem) => ({
      ...toPublicResource(resourceItem.resource, locale),
      stepTitle: pickLocale(
        locale,
        resourceItem.stepTitleZh,
        resourceItem.stepTitleEn
      ),
      stepDescription: pickLocale(
        locale,
        resourceItem.stepDescriptionZh,
        resourceItem.stepDescriptionEn
      ),
      relationType:
        resourceItem.relationType === 'alternative'
          ? 'alternative'
          : 'required',
    })),
  };
}

function toPublicResource(
  item: typeof resource.$inferSelect,
  locale: string
): PublicResource & {
  name: string;
  summary: string;
  reason: string;
  useCase: string;
} {
  return {
    slug: item.slug,
    nameZh: item.nameZh,
    nameEn: item.nameEn,
    name: pickLocale(locale, item.nameZh, item.nameEn),
    websiteUrl: item.websiteUrl,
    resourceType: item.resourceType,
    summaryZh: item.summaryZh,
    summaryEn: item.summaryEn,
    summary: pickLocale(locale, item.summaryZh, item.summaryEn),
    reasonZh: item.reasonZh,
    reasonEn: item.reasonEn,
    reason: pickLocale(locale, item.reasonZh, item.reasonEn),
    useCaseZh: item.useCaseZh,
    useCaseEn: item.useCaseEn,
    useCase: pickLocale(locale, item.useCaseZh, item.useCaseEn),
    pricingType: item.pricingType,
    featured: item.featured,
  };
}
