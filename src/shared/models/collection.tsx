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
import { TableColumn } from '@/shared/types/blocks/table';

type CollectionValues = Omit<typeof collection.$inferInsert, 'createdAt' | 'updatedAt'>;

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
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

async function validateCollectionRelationIds(tx: any, tagIds: string[], resourceIds: string[]) {
  if (tagIds.length) {
    const rows = await tx.select({ id: tag.id }).from(tag).where(inArray(tag.id, tagIds));
    if (rows.length !== tagIds.length) throw new Error('One or more collection tags do not exist');
  }

  if (resourceIds.length) {
    const rows = await tx.select({ id: resource.id }).from(resource).where(inArray(resource.id, resourceIds));
    if (rows.length !== resourceIds.length) throw new Error('One or more collection resources do not exist');
  }
}

async function replaceCollectionRelations(tx: any, collectionId: string, tagIds: string[], resourceIds: string[]) {
  await tx.delete(collectionTag).where(eq(collectionTag.collectionId, collectionId));
  await tx.delete(collectionResource).where(eq(collectionResource.collectionId, collectionId));

  if (tagIds.length) {
    await tx.insert(collectionTag).values(tagIds.map((tagId) => ({ collectionId, tagId })));
  }

  if (resourceIds.length) {
    await tx.insert(collectionResource).values(
      resourceIds.map((resourceId, sortOrder) => ({ collectionId, resourceId, sortOrder }))
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

export async function getCollectionsCount({ query = '' }: { query?: string } = {}) {
  const keyword = query.trim();
  const where = keyword
    ? or(
        ilike(collection.titleZh, `%${keyword}%`),
        ilike(collection.titleEn, `%${keyword}%`),
        ilike(collection.slug, `%${keyword}%`)
      )
    : undefined;
  const [result] = await db().select({ count: count() }).from(collection).where(where);
  return result?.count || 0;
}

export async function getCollectionById(id: string) {
  const [item] = await db().select().from(collection).where(eq(collection.id, id)).limit(1);
  return item;
}

export async function getCollectionTagIds(collectionId: string) {
  const rows = await db().select({ tagId: collectionTag.tagId }).from(collectionTag).where(eq(collectionTag.collectionId, collectionId));
  return (rows as { tagId: string }[]).map((row) => row.tagId);
}

export async function getCollectionResourceIds(collectionId: string) {
  const rows = await db()
    .select({ resourceId: collectionResource.resourceId })
    .from(collectionResource)
    .where(eq(collectionResource.collectionId, collectionId))
    .orderBy(asc(collectionResource.sortOrder));
  return (rows as { resourceId: string }[]).map((row) => row.resourceId);
}

export async function createCollection(values: CollectionValues, tagIds: string[], resourceIds: string[]) {
  const uniqueTagIds = Array.from(new Set(tagIds));
  const uniqueResourceIds = Array.from(new Set(resourceIds));

  return db().transaction(async (tx: any) => {
    await validateCollectionRelationIds(tx, uniqueTagIds, uniqueResourceIds);
    const [item] = await tx.insert(collection).values(values).returning();
    await replaceCollectionRelations(tx, item.id, uniqueTagIds, uniqueResourceIds);
    return item;
  });
}

export async function updateCollection(
  id: string,
  values: Partial<CollectionValues>,
  tagIds: string[],
  resourceIds: string[]
) {
  const uniqueTagIds = Array.from(new Set(tagIds));
  const uniqueResourceIds = Array.from(new Set(resourceIds));

  return db().transaction(async (tx: any) => {
    await validateCollectionRelationIds(tx, uniqueTagIds, uniqueResourceIds);
    const [item] = await tx.update(collection).set(values).where(eq(collection.id, id)).returning();
    if (!item) return item;
    await replaceCollectionRelations(tx, id, uniqueTagIds, uniqueResourceIds);
    return item;
  });
}

export async function getPublishedCollections(locale: string, allowAiCitation = false) {
  const rows = await db()
    .select()
    .from(collection)
    .where(and(eq(collection.status, 'published'), ...(allowAiCitation ? [eq(collection.allowAiCitation, true)] : [])))
    .orderBy(asc(collection.sortOrder), asc(collection.createdAt));

  return Promise.all((rows as (typeof collection.$inferSelect)[]).map((item) => getPublishedCollectionView(item, locale)));
}

export async function getPublishedCollectionBySlug(slug: string, locale: string) {
  const [item] = await db()
    .select()
    .from(collection)
    .where(and(eq(collection.slug, slug), eq(collection.status, 'published')))
    .limit(1);
  if (!item) return null;
  return getPublishedCollectionView(item, locale);
}

export async function getCollectionTableColumns(locale: string): Promise<TableColumn[]> {
  const isZh = locale === 'zh';
  return [
    {
      name: 'title',
      title: isZh ? '专题' : 'Collection',
      callback: (row: typeof collection.$inferSelect) => (
        <div className="space-y-1">
          <div className="font-medium">{isZh ? row.titleZh : row.titleEn || row.titleZh}</div>
          <div className="text-muted-foreground text-xs">{row.slug}</div>
        </div>
      ),
    },
    { name: 'status', title: isZh ? '状态' : 'Status', callback: (row: typeof collection.$inferSelect) => row.status },
    { name: 'featured', title: isZh ? '精选' : 'Featured', callback: (row: typeof collection.$inferSelect) => (row.featured ? (isZh ? '是' : 'Yes') : (isZh ? '否' : 'No')) },
    {
      name: 'action',
      title: '',
      type: 'dropdown',
      callback: (row: typeof collection.$inferSelect) => [
        { id: 'edit', title: isZh ? '编辑' : 'Edit', icon: 'RiEditLine', url: `/admin/collections/${row.id}/edit` },
      ],
    },
  ];
}

async function getPublishedCollectionView(item: typeof collection.$inferSelect, locale: string) {
  const [tagRows, resourceRows] = await Promise.all([
    db().select({ id: tag.id, nameZh: tag.nameZh, nameEn: tag.nameEn }).from(collectionTag).innerJoin(tag, eq(collectionTag.tagId, tag.id)).where(eq(collectionTag.collectionId, item.id)),
    db()
      .select({
        resource: resource,
        sortOrder: collectionResource.sortOrder,
      })
      .from(collectionResource)
      .innerJoin(resource, eq(collectionResource.resourceId, resource.id))
      .where(and(eq(collectionResource.collectionId, item.id), eq(resource.status, 'published')))
      .orderBy(asc(collectionResource.sortOrder)),
  ]);

  const typedTagRows = tagRows as { id: string; nameZh: string; nameEn: string | null }[];
  const typedResourceRows = resourceRows as { resource: typeof resource.$inferSelect; sortOrder: number }[];

  return {
    id: item.id,
    slug: item.slug,
    title: pickLocale(locale, item.titleZh, item.titleEn),
    summary: pickLocale(locale, item.summaryZh, item.summaryEn),
    content: pickLocale(locale, item.contentZh, item.contentEn),
    stageId: item.stageId,
    categoryId: item.categoryId,
    featured: item.featured,
    tags: typedTagRows.map((tagItem) => ({ id: tagItem.id, name: pickLocale(locale, tagItem.nameZh, tagItem.nameEn) })),
    resources: typedResourceRows.map((resourceItem) => toPublicResource(resourceItem.resource, locale)),
  };
}

function toPublicResource(item: typeof resource.$inferSelect, locale: string): PublicResource & { name: string; summary: string; reason: string; useCase: string } {
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
