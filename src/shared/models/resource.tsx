import { and, count, eq, ilike, inArray, or } from 'drizzle-orm';

import { TableColumn } from '@/shared/types/blocks/table';

import { db } from '@/core/db';
import { resource, resourceTag, tag } from '@/config/db/schema';

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
