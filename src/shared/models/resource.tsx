import { cache } from 'react';
import { and, asc, count, eq, ilike, inArray, or } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  category,
  collection,
  collectionResource,
  postResource,
  resource,
  resourceStage,
  resourceTag,
  stage,
  tag,
} from '@/config/db/schema';
import { TableColumn } from '@/shared/types/blocks/table';

function getResourcesWhere(query = '') {
  const keyword = query.trim();

  return keyword
    ? or(
        ilike(resource.nameZh, `%${keyword}%`),
        ilike(resource.nameEn, `%${keyword}%`),
        ilike(resource.slug, `%${keyword}%`),
        ilike(resource.resourceType, `%${keyword}%`),
        ilike(resource.stageId, `%${keyword}%`)
      )
    : undefined;
}

export async function getResources({
  page = 1,
  limit = 20,
  query = '',
}: {
  page?: number;
  limit?: number;
  query?: string;
} = {}) {
  const offset = (page - 1) * limit;
  const where = getResourcesWhere(query);

  const rows = await db()
    .select()
    .from(resource)
    .where(where)
    .limit(limit)
    .offset(offset)
    .orderBy(resource.sortOrder, resource.createdAt);

  return rows;
}

export async function getResourcesForCollectionEditor() {
  return db()
    .select()
    .from(resource)
    .orderBy(asc(resource.nameZh), asc(resource.nameEn), asc(resource.slug));
}

export type ResourceListItem = typeof resource.$inferSelect & {
  stageIds: string[];
};

export async function getResourcesWithStages({
  page = 1,
  limit = 20,
  query = '',
}: {
  page?: number;
  limit?: number;
  query?: string;
} = {}): Promise<ResourceListItem[]> {
  const resources = await getResources({ page, limit, query });
  if (!resources.length) return [];

  const stageRows = await db()
    .select({
      resourceId: resourceStage.resourceId,
      stageId: resourceStage.stageId,
    })
    .from(resourceStage)
    .where(
      inArray(
        resourceStage.resourceId,
        (resources as (typeof resource.$inferSelect)[]).map((item) => item.id)
      )
    );
  const stageIdsByResource = new Map<string, string[]>();
  for (const row of stageRows as { resourceId: string; stageId: string }[]) {
    const stageIds = stageIdsByResource.get(row.resourceId) || [];
    stageIds.push(row.stageId);
    stageIdsByResource.set(row.resourceId, stageIds);
  }

  return (resources as (typeof resource.$inferSelect)[]).map((item) => ({
    ...item,
    stageIds:
      stageIdsByResource.get(item.id) || (item.stageId ? [item.stageId] : []),
  }));
}

export async function getResourcesCount({
  query = '',
}: {
  query?: string;
} = {}) {
  const [result] = await db()
    .select({ count: count() })
    .from(resource)
    .where(getResourcesWhere(query))
    .limit(1);

  return result?.count || 0;
}

export async function getResourceById(id: string) {
  const [item] = await db()
    .select()
    .from(resource)
    .where(eq(resource.id, id))
    .limit(1);

  return item;
}

export async function getResourceTagIds(resourceId: string) {
  const rows = await db()
    .select({ tagId: resourceTag.tagId })
    .from(resourceTag)
    .where(eq(resourceTag.resourceId, resourceId));

  return (rows as { tagId: string }[]).map((row) => row.tagId);
}

export async function getResourceStageIds(resourceId: string) {
  const rows = await db()
    .select({ stageId: resourceStage.stageId })
    .from(resourceStage)
    .where(eq(resourceStage.resourceId, resourceId));

  if (rows.length)
    return (rows as { stageId: string }[]).map((row) => row.stageId);

  const item = await getResourceById(resourceId);
  return item?.stageId ? [item.stageId] : [];
}

async function validateResourceRelationIds(
  tx: any,
  tagIds: string[],
  stageIds: string[]
) {
  if (tagIds.length) {
    const tags = await tx
      .select({ id: tag.id })
      .from(tag)
      .where(inArray(tag.id, tagIds));
    if (tags.length !== tagIds.length) {
      throw new Error('One or more resource tags do not exist');
    }
  }

  if (stageIds.length) {
    const stages = await tx
      .select({ id: stage.id })
      .from(stage)
      .where(inArray(stage.id, stageIds));
    if (stages.length !== stageIds.length) {
      throw new Error('One or more resource stages do not exist');
    }
  }
}

async function replaceResourceTags(
  tx: any,
  resourceId: string,
  tagIds: string[]
) {
  await tx.delete(resourceTag).where(eq(resourceTag.resourceId, resourceId));
  if (!tagIds.length) return;

  await tx
    .insert(resourceTag)
    .values(tagIds.map((tagId) => ({ resourceId, tagId })));
}

async function replaceResourceStages(
  tx: any,
  resourceId: string,
  stageIds: string[]
) {
  await tx
    .delete(resourceStage)
    .where(eq(resourceStage.resourceId, resourceId));
  if (!stageIds.length) return;

  await tx
    .insert(resourceStage)
    .values(stageIds.map((stageId) => ({ resourceId, stageId })));
}

function normalizeResourceStageIds(
  primaryStageId: string | null | undefined,
  stageIds: string[]
) {
  const uniqueStageIds = Array.from(new Set(stageIds));
  if (uniqueStageIds.length && !primaryStageId) {
    throw new Error('A primary stage is required when stages are selected');
  }
  if (
    uniqueStageIds.length &&
    primaryStageId &&
    !uniqueStageIds.includes(primaryStageId)
  ) {
    throw new Error('The primary stage must be included in applicable stages');
  }
  if (!uniqueStageIds.length && primaryStageId) return [primaryStageId];
  return uniqueStageIds;
}

export async function createResource(
  values: Omit<typeof resource.$inferInsert, 'createdAt' | 'updatedAt'>,
  tagIds: string[] = [],
  stageIds: string[] = []
) {
  const uniqueTagIds = Array.from(new Set(tagIds));
  const uniqueStageIds = normalizeResourceStageIds(values.stageId, stageIds);

  return db().transaction(async (tx: any) => {
    await validateResourceRelationIds(tx, uniqueTagIds, uniqueStageIds);
    const [item] = await tx.insert(resource).values(values).returning();
    await replaceResourceTags(tx, item.id, uniqueTagIds);
    await replaceResourceStages(tx, item.id, uniqueStageIds);

    return item;
  });
}

export async function updateResource(
  id: string,
  values: Partial<typeof resource.$inferInsert>,
  tagIds?: string[],
  stageIds?: string[]
) {
  const uniqueTagIds = tagIds ? Array.from(new Set(tagIds)) : undefined;
  const uniqueStageIds =
    stageIds !== undefined || 'stageId' in values
      ? normalizeResourceStageIds(values.stageId, stageIds || [])
      : undefined;

  return db().transaction(async (tx: any) => {
    if (uniqueTagIds || uniqueStageIds) {
      await validateResourceRelationIds(
        tx,
        uniqueTagIds || [],
        uniqueStageIds || []
      );
    }

    const [item] = await tx
      .update(resource)
      .set(values)
      .where(eq(resource.id, id))
      .returning();

    if (!item) return item;
    if (uniqueTagIds) {
      await replaceResourceTags(tx, id, uniqueTagIds);
    }
    if (uniqueStageIds) {
      await replaceResourceStages(tx, id, uniqueStageIds);
    }

    return item;
  });
}

export async function deleteResource(id: string) {
  return db().transaction(async (tx: any) => {
    const [item] = await tx
      .select()
      .from(resource)
      .where(eq(resource.id, id))
      .limit(1)
      .for('update');
    if (!item) throw new Error('Resource not found');
    if (item.status !== 'draft')
      throw new Error('Only draft resources can be permanently deleted');

    const [collectionReferences, postReferences] = await Promise.all([
      tx
        .select({ count: count() })
        .from(collectionResource)
        .where(eq(collectionResource.resourceId, id)),
      tx
        .select({ count: count() })
        .from(postResource)
        .where(eq(postResource.resourceId, id)),
    ]);
    const references =
      (collectionReferences[0]?.count || 0) + (postReferences[0]?.count || 0);
    if (references > 0) {
      throw new Error(
        'Cannot delete a resource referenced by a collection or post'
      );
    }

    const [deleted] = await tx
      .delete(resource)
      .where(and(eq(resource.id, id), eq(resource.status, 'draft')))
      .returning();
    if (!deleted)
      throw new Error('Only draft resources can be permanently deleted');
    return deleted;
  });
}

export async function archiveResource(id: string) {
  return db().transaction(async (tx: any) => {
    const [lockedItem] = await tx
      .select({ id: resource.id })
      .from(resource)
      .where(and(eq(resource.id, id), eq(resource.status, 'published')))
      .limit(1)
      .for('update');
    if (!lockedItem)
      throw new Error('Only published resources can be archived');

    const [referenceResult] = await tx
      .select({ count: count() })
      .from(collectionResource)
      .innerJoin(collection, eq(collectionResource.collectionId, collection.id))
      .where(
        and(
          eq(collectionResource.resourceId, id),
          eq(collection.status, 'published')
        )
      );
    if ((referenceResult?.count || 0) > 0) {
      throw new Error(
        'Cannot archive a resource referenced by a published collection'
      );
    }

    const [item] = await tx
      .update(resource)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(and(eq(resource.id, id), eq(resource.status, 'published')))
      .returning();
    if (!item) throw new Error('Only published resources can be archived');
    return item;
  });
}

export async function getPublishedCollectionResourceReferences(id: string) {
  const [result] = await db()
    .select({ count: count() })
    .from(collectionResource)
    .innerJoin(collection, eq(collectionResource.collectionId, collection.id))
    .where(
      and(
        eq(collectionResource.resourceId, id),
        eq(collection.status, 'published')
      )
    );

  return result?.count || 0;
}

export async function getResourceReferences(id: string) {
  const [collectionReferences, postReferences] = await Promise.all([
    db()
      .select({ count: count() })
      .from(collectionResource)
      .where(eq(collectionResource.resourceId, id)),
    db()
      .select({ count: count() })
      .from(postResource)
      .where(eq(postResource.resourceId, id)),
  ]);

  return (
    (collectionReferences[0]?.count || 0) + (postReferences[0]?.count || 0)
  );
}

function publicResourceWhere(filters: {
  slug?: string;
  query?: string;
  resourceType?: string;
  stageId?: string;
  categoryId?: string;
  pricingType?: string;
  allowAiCitation?: boolean;
}) {
  const clauses = [eq(resource.status, 'published')];
  if (filters.slug) clauses.push(eq(resource.slug, filters.slug));
  const query = filters.query?.trim();
  if (query) {
    clauses.push(
      or(
        ilike(resource.nameZh, `%${query}%`),
        ilike(resource.nameEn, `%${query}%`),
        ilike(resource.summaryZh, `%${query}%`),
        ilike(resource.summaryEn, `%${query}%`),
        ilike(resource.slug, `%${query}%`)
      )!
    );
  }
  if (filters.resourceType)
    clauses.push(eq(resource.resourceType, filters.resourceType));
  if (filters.stageId) {
    clauses.push(
      or(
        eq(resource.stageId, filters.stageId),
        inArray(
          resource.id,
          db()
            .select({ resourceId: resourceStage.resourceId })
            .from(resourceStage)
            .where(eq(resourceStage.stageId, filters.stageId))
        )
      )!
    );
  }
  if (filters.categoryId)
    clauses.push(eq(resource.categoryId, filters.categoryId));
  if (filters.pricingType)
    clauses.push(eq(resource.pricingType, filters.pricingType));
  if (filters.allowAiCitation) clauses.push(eq(resource.allowAiCitation, true));
  return and(...clauses);
}

function localeText(locale: string, zh: string | null, en: string | null) {
  return locale === 'en' ? en || zh || '' : zh || en || '';
}

function readResourceEditorialMeta(sourceNote: string | null, locale: string) {
  const fallback = {
    usageStatus: 'used',
    verifiedAt: '',
    caution: '',
    notFor: '',
  };
  if (!sourceNote) return fallback;

  try {
    const parsed = JSON.parse(sourceNote) as {
      usageStatus?: string;
      verifiedAt?: string;
      caution?: { zh?: string; en?: string } | null;
      notFor?: { zh?: string; en?: string } | null;
    };
    return {
      usageStatus: ['daily', 'used', 'occasional'].includes(
        parsed.usageStatus || ''
      )
        ? parsed.usageStatus!
        : fallback.usageStatus,
      verifiedAt: parsed.verifiedAt || '',
      caution: localeText(
        locale,
        parsed.caution?.zh || null,
        parsed.caution?.en || null
      ),
      notFor: localeText(
        locale,
        parsed.notFor?.zh || null,
        parsed.notFor?.en || null
      ),
    };
  } catch {
    return fallback;
  }
}

export async function getPublishedResources({
  locale,
  slug,
  query,
  resourceType,
  stageId,
  categoryId,
  pricingType,
  allowAiCitation,
}: {
  locale: string;
  slug?: string;
  query?: string;
  resourceType?: string;
  stageId?: string;
  categoryId?: string;
  pricingType?: string;
  allowAiCitation?: boolean;
}) {
  const rows = await db()
    .select({ resource, stage, category })
    .from(resource)
    .leftJoin(stage, eq(resource.stageId, stage.id))
    .leftJoin(category, eq(resource.categoryId, category.id))
    .where(
      publicResourceWhere({
        slug,
        query,
        resourceType,
        stageId,
        categoryId,
        pricingType,
        allowAiCitation,
      })
    )
    .orderBy(asc(resource.sortOrder), asc(resource.createdAt));

  const resourceIds = (
    rows as { resource: typeof resource.$inferSelect }[]
  ).map((row) => row.resource.id);
  const [tagRows, stageRows] = resourceIds.length
    ? await Promise.all([
        db()
          .select({
            resourceId: resourceTag.resourceId,
            id: tag.id,
            nameZh: tag.nameZh,
            nameEn: tag.nameEn,
          })
          .from(resourceTag)
          .innerJoin(tag, eq(resourceTag.tagId, tag.id))
          .where(inArray(resourceTag.resourceId, resourceIds)),
        db()
          .select({
            resourceId: resourceStage.resourceId,
            id: stage.id,
            nameZh: stage.nameZh,
            nameEn: stage.nameEn,
            sortOrder: stage.sortOrder,
          })
          .from(resourceStage)
          .innerJoin(stage, eq(resourceStage.stageId, stage.id))
          .where(inArray(resourceStage.resourceId, resourceIds))
          .orderBy(asc(stage.sortOrder), asc(stage.nameZh)),
      ])
    : [[], []];
  const tagsByResource = new Map<string, { id: string; name: string }[]>();
  for (const row of tagRows as {
    resourceId: string;
    id: string;
    nameZh: string;
    nameEn: string | null;
  }[]) {
    const items = tagsByResource.get(row.resourceId) || [];
    items.push({
      id: row.id,
      name: localeText(locale, row.nameZh, row.nameEn),
    });
    tagsByResource.set(row.resourceId, items);
  }
  const stagesByResource = new Map<
    string,
    { id: string; name: string; isPrimary: boolean }[]
  >();
  const primaryStageByResource = new Map(
    (rows as { resource: typeof resource.$inferSelect }[]).map((row) => [
      row.resource.id,
      row.resource.stageId,
    ])
  );
  for (const row of stageRows as {
    resourceId: string;
    id: string;
    nameZh: string;
    nameEn: string | null;
  }[]) {
    const items = stagesByResource.get(row.resourceId) || [];
    items.push({
      id: row.id,
      name: localeText(locale, row.nameZh, row.nameEn),
      isPrimary: primaryStageByResource.get(row.resourceId) === row.id,
    });
    stagesByResource.set(row.resourceId, items);
  }

  return (
    rows as {
      resource: typeof resource.$inferSelect;
      stage: typeof stage.$inferSelect | null;
      category: typeof category.$inferSelect | null;
    }[]
  ).map((row) => {
    const applicableStages = stagesByResource.get(row.resource.id) || [];
    const editorialMeta = readResourceEditorialMeta(
      row.resource.sourceNote,
      locale
    );
    if (
      row.stage &&
      !applicableStages.some((item) => item.id === row.stage!.id)
    ) {
      applicableStages.unshift({
        id: row.stage.id,
        name: localeText(locale, row.stage.nameZh, row.stage.nameEn),
        isPrimary: true,
      });
    }

    return {
      id: row.resource.id,
      slug: row.resource.slug,
      name: localeText(locale, row.resource.nameZh, row.resource.nameEn),
      summary: localeText(
        locale,
        row.resource.summaryZh,
        row.resource.summaryEn
      ),
      reason: localeText(locale, row.resource.reasonZh, row.resource.reasonEn),
      useCase: localeText(
        locale,
        row.resource.useCaseZh,
        row.resource.useCaseEn
      ),
      websiteUrl: row.resource.websiteUrl,
      iconUrl: row.resource.iconUrl,
      screenshotUrl: row.resource.screenshotUrl,
      resourceType: row.resource.resourceType,
      pricingType: row.resource.pricingType,
      stage: row.stage
        ? localeText(locale, row.stage.nameZh, row.stage.nameEn)
        : '',
      stages: applicableStages,
      category: row.category
        ? localeText(locale, row.category.nameZh, row.category.nameEn)
        : '',
      featured: row.resource.featured,
      usageStatus: editorialMeta.usageStatus,
      verifiedAt: editorialMeta.verifiedAt,
      caution: editorialMeta.caution,
      notFor: editorialMeta.notFor,
      tags: tagsByResource.get(row.resource.id) || [],
    };
  });
}

const getPublishedResourceBySlugCached = cache(
  async (slug: string, locale: string) => {
    const items = await getPublishedResources({ locale, slug });
    return items[0] || null;
  }
);

export async function getPublishedResourceBySlug(slug: string, locale: string) {
  const items = await getPublishedResourceBySlugCached(slug, locale);
  return items;
}

export async function getPublicResourceFilters(locale: string) {
  const publishedRows = (await db()
    .select({
      stageId: resource.stageId,
      categoryId: resource.categoryId,
      id: resource.id,
    })
    .from(resource)
    .where(eq(resource.status, 'published'))) as {
    stageId: string | null;
    categoryId: string | null;
    id: string;
  }[];
  const resourceIds = publishedRows.map((row) => row.id);
  const stageIds: string[] = Array.from(
    new Set(
      publishedRows
        .map((row) => row.stageId)
        .filter((id): id is string => Boolean(id))
    )
  );
  const categoryIds: string[] = Array.from(
    new Set(
      publishedRows
        .map((row) => row.categoryId)
        .filter((id): id is string => Boolean(id))
    )
  );
  const relatedStageRows = resourceIds.length
    ? await db()
        .select({ stageId: resourceStage.stageId })
        .from(resourceStage)
        .where(inArray(resourceStage.resourceId, resourceIds))
    : [];
  for (const row of relatedStageRows) stageIds.push(row.stageId);
  const uniqueStageIds = Array.from(new Set(stageIds));
  const [stages, categories, tagRows] = await Promise.all([
    uniqueStageIds.length
      ? db()
          .select()
          .from(stage)
          .where(inArray(stage.id, uniqueStageIds))
          .orderBy(asc(stage.sortOrder), asc(stage.nameZh))
      : [],
    categoryIds.length
      ? db()
          .select()
          .from(category)
          .where(inArray(category.id, categoryIds))
          .orderBy(asc(category.nameZh))
      : [],
    resourceIds.length
      ? db()
          .select({ id: tag.id, nameZh: tag.nameZh, nameEn: tag.nameEn })
          .from(resourceTag)
          .innerJoin(tag, eq(resourceTag.tagId, tag.id))
          .where(inArray(resourceTag.resourceId, resourceIds))
      : [],
  ]);
  const uniqueTags = new Map(
    (tagRows as { id: string; nameZh: string; nameEn: string | null }[]).map(
      (item) => [item.id, item]
    )
  );
  return {
    totalResources: publishedRows.length,
    stages: (stages as (typeof stage.$inferSelect)[]).map((item) => ({
      id: item.id,
      name: localeText(locale, item.nameZh, item.nameEn),
    })),
    categories: (categories as (typeof category.$inferSelect)[]).map(
      (item) => ({
        id: item.id,
        name: localeText(locale, item.nameZh, item.nameEn),
      })
    ),
    tags: Array.from(uniqueTags.values())
      .sort((a, b) => a.nameZh.localeCompare(b.nameZh))
      .map((item) => ({
        id: item.id,
        name: localeText(locale, item.nameZh, item.nameEn),
      })),
  };
}

export function getResourceTableColumns(
  locale: string,
  canWrite = true,
  stages: (typeof stage.$inferSelect)[] = []
): TableColumn[] {
  const isZh = locale === 'zh';
  const stageNames = new Map(
    stages.map((item) => [
      item.id,
      isZh ? item.nameZh : item.nameEn || item.nameZh,
    ])
  );

  return [
    {
      name: 'name',
      title: isZh ? '资源' : 'Resource',
      callback: (row: typeof resource.$inferSelect) => (
        <div className="space-y-1">
          <div className="font-medium">
            {isZh ? row.nameZh : row.nameEn || row.nameZh}
          </div>
          <div className="text-muted-foreground text-xs">{row.slug}</div>
        </div>
      ),
    },
    {
      name: 'resourceType',
      title: isZh ? '类型' : 'Type',
      callback: (row: typeof resource.$inferSelect) => row.resourceType,
    },
    {
      name: 'stageId',
      title: isZh ? '阶段' : 'Stages',
      callback: (row: ResourceListItem) => {
        const primaryStage = row.stageId
          ? stageNames.get(row.stageId) || row.stageId
          : '';
        const otherStages = row.stageIds
          .filter((stageId) => stageId !== row.stageId)
          .map((stageId) => stageNames.get(stageId) || stageId);
        return [primaryStage, ...otherStages].filter(Boolean).join('、') || '-';
      },
    },
    {
      name: 'status',
      title: isZh ? '状态' : 'Status',
      callback: (row: typeof resource.$inferSelect) => row.status,
    },
    {
      name: 'featured',
      title: isZh ? '精选' : 'Featured',
      callback: (row: typeof resource.$inferSelect) =>
        row.featured ? (isZh ? '是' : 'Yes') : isZh ? '否' : 'No',
    },
    {
      name: 'allowAiCitation',
      title: isZh ? 'AI 引用' : 'AI citation',
      callback: (row: typeof resource.$inferSelect) =>
        row.allowAiCitation
          ? isZh
            ? '允许'
            : 'Allowed'
          : isZh
            ? '禁用'
            : 'Disabled',
    },
    ...(canWrite
      ? [
          {
            name: 'action',
            title: '',
            type: 'dropdown',
            callback: (row: typeof resource.$inferSelect) => [
              {
                id: 'edit',
                title: isZh ? '编辑' : 'Edit',
                icon: 'RiEditLine',
                url: `/admin/resources/${row.id}/edit`,
              },
              ...(row.status === 'published'
                ? [
                    {
                      id: 'archive',
                      title: isZh ? '归档' : 'Archive',
                      icon: 'RiArchiveLine',
                      url: `/admin/resources/${row.id}/delete`,
                    },
                  ]
                : row.status === 'draft'
                  ? [
                      {
                        id: 'delete',
                        title: isZh ? '永久删除' : 'Delete permanently',
                        icon: 'RiDeleteBinLine',
                        url: `/admin/resources/${row.id}/delete`,
                      },
                    ]
                  : []),
            ],
          } satisfies TableColumn,
        ]
      : []),
  ];
}
