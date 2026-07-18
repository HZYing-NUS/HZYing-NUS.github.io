import { and, asc, count, eq, ilike, inArray, or } from 'drizzle-orm';

import { TableColumn } from '@/shared/types/blocks/table';

import { db } from '@/core/db';
import { category, resource, resourceTag, stage, tag } from '@/config/db/schema';

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

async function validateResourceTagIds(tx: any, tagIds: string[]) {
  if (!tagIds.length) return;

  const tags = await tx.select({ id: tag.id }).from(tag).where(inArray(tag.id, tagIds));
  if (tags.length !== tagIds.length) {
    throw new Error('One or more resource tags do not exist');
  }
}

async function replaceResourceTags(tx: any, resourceId: string, tagIds: string[]) {
  await tx.delete(resourceTag).where(eq(resourceTag.resourceId, resourceId));
  if (!tagIds.length) return;

  await tx.insert(resourceTag).values(
    tagIds.map((tagId) => ({ resourceId, tagId }))
  );
}

export async function createResource(
  values: Omit<typeof resource.$inferInsert, 'createdAt' | 'updatedAt'>,
  tagIds: string[] = []
) {
  const uniqueTagIds = Array.from(new Set(tagIds));

  return db().transaction(async (tx: any) => {
    await validateResourceTagIds(tx, uniqueTagIds);
    const [item] = await tx.insert(resource).values(values).returning();
    await replaceResourceTags(tx, item.id, uniqueTagIds);

    return item;
  });
}

export async function updateResource(
  id: string,
  values: Partial<typeof resource.$inferInsert>,
  tagIds?: string[]
) {
  const uniqueTagIds = tagIds ? Array.from(new Set(tagIds)) : undefined;

  return db().transaction(async (tx: any) => {
    if (uniqueTagIds) {
      await validateResourceTagIds(tx, uniqueTagIds);
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

    return item;
  });
}

export async function deleteResource(id: string) {
  const [item] = await db()
    .delete(resource)
    .where(eq(resource.id, id))
    .returning();

  return item;
}

function publicResourceWhere(filters: {
  query?: string;
  resourceType?: string;
  stageId?: string;
  categoryId?: string;
  pricingType?: string;
  allowAiCitation?: boolean;
}) {
  const clauses = [eq(resource.status, 'published')];
  const query = filters.query?.trim();
  if (query) {
    clauses.push(or(
      ilike(resource.nameZh, `%${query}%`),
      ilike(resource.nameEn, `%${query}%`),
      ilike(resource.summaryZh, `%${query}%`),
      ilike(resource.summaryEn, `%${query}%`),
      ilike(resource.slug, `%${query}%`)
    )!);
  }
  if (filters.resourceType) clauses.push(eq(resource.resourceType, filters.resourceType));
  if (filters.stageId) clauses.push(eq(resource.stageId, filters.stageId));
  if (filters.categoryId) clauses.push(eq(resource.categoryId, filters.categoryId));
  if (filters.pricingType) clauses.push(eq(resource.pricingType, filters.pricingType));
  if (filters.allowAiCitation) clauses.push(eq(resource.allowAiCitation, true));
  return and(...clauses);
}

function localeText(locale: string, zh: string | null, en: string | null) {
  return locale === 'en' ? en || zh || '' : zh || en || '';
}

export async function getPublishedResources({
  locale,
  query,
  resourceType,
  stageId,
  categoryId,
  pricingType,
  allowAiCitation,
}: {
  locale: string;
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
        query,
        resourceType,
        stageId,
        categoryId,
        pricingType,
        allowAiCitation,
      })
    )
    .orderBy(asc(resource.sortOrder), asc(resource.createdAt));

  const resourceIds = (rows as { resource: typeof resource.$inferSelect }[]).map((row) => row.resource.id);
  const tagRows = resourceIds.length
    ? await db()
        .select({ resourceId: resourceTag.resourceId, id: tag.id, nameZh: tag.nameZh, nameEn: tag.nameEn })
        .from(resourceTag)
        .innerJoin(tag, eq(resourceTag.tagId, tag.id))
        .where(inArray(resourceTag.resourceId, resourceIds))
    : [];
  const tagsByResource = new Map<string, { id: string; name: string }[]>();
  for (const row of tagRows as { resourceId: string; id: string; nameZh: string; nameEn: string | null }[]) {
    const items = tagsByResource.get(row.resourceId) || [];
    items.push({ id: row.id, name: localeText(locale, row.nameZh, row.nameEn) });
    tagsByResource.set(row.resourceId, items);
  }

  return (rows as { resource: typeof resource.$inferSelect; stage: typeof stage.$inferSelect | null; category: typeof category.$inferSelect | null }[]).map((row) => ({
    id: row.resource.id,
    slug: row.resource.slug,
    name: localeText(locale, row.resource.nameZh, row.resource.nameEn),
    summary: localeText(locale, row.resource.summaryZh, row.resource.summaryEn),
    reason: localeText(locale, row.resource.reasonZh, row.resource.reasonEn),
    useCase: localeText(locale, row.resource.useCaseZh, row.resource.useCaseEn),
    websiteUrl: row.resource.websiteUrl,
    iconUrl: row.resource.iconUrl,
    screenshotUrl: row.resource.screenshotUrl,
    resourceType: row.resource.resourceType,
    pricingType: row.resource.pricingType,
    stage: row.stage ? localeText(locale, row.stage.nameZh, row.stage.nameEn) : '',
    category: row.category ? localeText(locale, row.category.nameZh, row.category.nameEn) : '',
    featured: row.resource.featured,
    tags: tagsByResource.get(row.resource.id) || [],
  }));
}

export async function getPublishedResourceBySlug(slug: string, locale: string) {
  const items = await getPublishedResources({ locale });
  return items.find((item) => item.slug === slug) || null;
}

export async function getPublicResourceFilters(locale: string) {
  const publishedRows = (await db()
    .select({ stageId: resource.stageId, categoryId: resource.categoryId, id: resource.id })
    .from(resource)
    .where(eq(resource.status, 'published'))) as { stageId: string | null; categoryId: string | null; id: string }[];
  const resourceIds = publishedRows.map((row) => row.id);
  const stageIds: string[] = Array.from(new Set(publishedRows.map((row) => row.stageId).filter((id): id is string => Boolean(id))));
  const categoryIds: string[] = Array.from(new Set(publishedRows.map((row) => row.categoryId).filter((id): id is string => Boolean(id))));
  const [stages, categories, tagRows] = await Promise.all([
    stageIds.length ? db().select().from(stage).where(inArray(stage.id, stageIds)).orderBy(asc(stage.sortOrder), asc(stage.nameZh)) : [],
    categoryIds.length ? db().select().from(category).where(inArray(category.id, categoryIds)).orderBy(asc(category.nameZh)) : [],
    resourceIds.length ? db().select({ id: tag.id, nameZh: tag.nameZh, nameEn: tag.nameEn }).from(resourceTag).innerJoin(tag, eq(resourceTag.tagId, tag.id)).where(inArray(resourceTag.resourceId, resourceIds)) : [],
  ]);
  const uniqueTags = new Map((tagRows as { id: string; nameZh: string; nameEn: string | null }[]).map((item) => [item.id, item]));
  return {
    stages: (stages as (typeof stage.$inferSelect)[]).map((item) => ({ id: item.id, name: localeText(locale, item.nameZh, item.nameEn) })),
    categories: (categories as (typeof category.$inferSelect)[]).map((item) => ({ id: item.id, name: localeText(locale, item.nameZh, item.nameEn) })),
    tags: Array.from(uniqueTags.values()).sort((a, b) => a.nameZh.localeCompare(b.nameZh)).map((item) => ({ id: item.id, name: localeText(locale, item.nameZh, item.nameEn) })),
  };
}

export function getResourceTableColumns(locale: string): TableColumn[] {
  const isZh = locale === 'zh';

  return [
    {
      name: 'name',
      title: isZh ? '资源' : 'Resource',
      callback: (row: typeof resource.$inferSelect) => (
        <div className="space-y-1">
          <div className="font-medium">{isZh ? row.nameZh : row.nameEn || row.nameZh}</div>
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
      title: isZh ? '阶段' : 'Stage',
      callback: (row: typeof resource.$inferSelect) => row.stageId || '-',
    },
    {
      name: 'status',
      title: isZh ? '状态' : 'Status',
      callback: (row: typeof resource.$inferSelect) => row.status,
    },
    {
      name: 'featured',
      title: isZh ? '精选' : 'Featured',
      callback: (row: typeof resource.$inferSelect) => (row.featured ? (isZh ? '是' : 'Yes') : (isZh ? '否' : 'No')),
    },
    {
      name: 'allowAiCitation',
      title: isZh ? 'AI 引用' : 'AI citation',
      callback: (row: typeof resource.$inferSelect) => (row.allowAiCitation ? (isZh ? '允许' : 'Allowed') : (isZh ? '禁用' : 'Disabled')),
    },
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
      ],
    },
  ];
}
