import { asc, count, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  category,
  collection,
  collectionTag,
  postTag,
  resource,
  resourceStage,
  resourceTag,
  stage,
  tag,
} from '@/config/db/schema';
import { TableColumn } from '@/shared/types/blocks/table';

export type ResourceTaxonomyKind = 'stage' | 'category' | 'tag';

type ResourceTaxonomyItem =
  | typeof stage.$inferSelect
  | typeof category.$inferSelect
  | typeof tag.$inferSelect;

export async function getStages() {
  return db()
    .select()
    .from(stage)
    .orderBy(asc(stage.sortOrder), asc(stage.nameZh));
}

export async function getCategories() {
  return db().select().from(category).orderBy(asc(category.nameZh));
}

export async function getTags() {
  return db().select().from(tag).orderBy(asc(tag.nameZh));
}

export async function getResourceTaxonomyItem(
  kind: ResourceTaxonomyKind,
  id: string
) {
  const table = getResourceTaxonomyTable(kind);
  const [item] = await db()
    .select()
    .from(table)
    .where(eq(table.id, id))
    .limit(1);

  return item;
}

export async function createResourceTaxonomyItem(
  kind: ResourceTaxonomyKind,
  values: Omit<typeof stage.$inferInsert, 'createdAt' | 'updatedAt'>
) {
  const table = getResourceTaxonomyTable(kind);
  const [item] = await db().insert(table).values(values).returning();

  return item;
}

export async function updateResourceTaxonomyItem(
  kind: ResourceTaxonomyKind,
  id: string,
  values: Partial<typeof stage.$inferInsert>
) {
  const table = getResourceTaxonomyTable(kind);
  const [item] = await db()
    .update(table)
    .set(values)
    .where(eq(table.id, id))
    .returning();

  return item;
}

export async function getResourceTaxonomyReferences(
  kind: ResourceTaxonomyKind,
  id: string
) {
  return getResourceTaxonomyReferencesWithDb(db(), kind, id);
}

async function getResourceTaxonomyReferencesWithDb(
  executor: any,
  kind: ResourceTaxonomyKind,
  id: string
) {
  if (kind === 'stage') {
    const [primaryResourceRows, relatedResourceRows, collectionResult] =
      await Promise.all([
        executor
          .select({ id: resource.id })
          .from(resource)
          .where(eq(resource.stageId, id)),
        executor
          .select({ id: resourceStage.resourceId })
          .from(resourceStage)
          .where(eq(resourceStage.stageId, id)),
        executor
          .select({ count: count() })
          .from(collection)
          .where(eq(collection.stageId, id)),
      ]);

    const resourceReferences = new Set([
      ...primaryResourceRows.map((row: { id: string }) => row.id),
      ...relatedResourceRows.map((row: { id: string }) => row.id),
    ]).size;

    return resourceReferences + (collectionResult[0]?.count || 0);
  }

  if (kind === 'category') {
    const [resourceResult, collectionResult] = await Promise.all([
      executor
        .select({ count: count() })
        .from(resource)
        .where(eq(resource.categoryId, id)),
      executor
        .select({ count: count() })
        .from(collection)
        .where(eq(collection.categoryId, id)),
    ]);

    return (resourceResult[0]?.count || 0) + (collectionResult[0]?.count || 0);
  }

  const [resourceResult, collectionResult, postResult] = await Promise.all([
    executor
      .select({ count: count() })
      .from(resourceTag)
      .where(eq(resourceTag.tagId, id)),
    executor
      .select({ count: count() })
      .from(collectionTag)
      .where(eq(collectionTag.tagId, id)),
    executor
      .select({ count: count() })
      .from(postTag)
      .where(eq(postTag.tagId, id)),
  ]);

  return (
    (resourceResult[0]?.count || 0) +
    (collectionResult[0]?.count || 0) +
    (postResult[0]?.count || 0)
  );
}

export async function deleteResourceTaxonomyItem(
  kind: ResourceTaxonomyKind,
  id: string
) {
  const table = getResourceTaxonomyTable(kind);
  return db().transaction(async (tx: any) => {
    const [lockedItem] = await tx
      .select({ id: table.id })
      .from(table)
      .where(eq(table.id, id))
      .limit(1)
      .for('update');
    if (!lockedItem) return undefined;

    const references = await getResourceTaxonomyReferencesWithDb(tx, kind, id);
    if (references > 0) {
      throw new Error(
        `Cannot delete taxonomy item with ${references} references`
      );
    }

    const [item] = await tx.delete(table).where(eq(table.id, id)).returning();
    return item;
  });
}

export function getResourceTaxonomyTableColumns(
  locale: string,
  kind: ResourceTaxonomyKind,
  canWrite = true
): TableColumn[] {
  const isZh = locale === 'zh';
  const basePath = getResourceTaxonomyPath(kind);

  const columns: TableColumn[] = [
    {
      name: 'name',
      title: isZh ? '名称' : 'Name',
      callback: (row: ResourceTaxonomyItem) => (
        <div className="space-y-1">
          <div className="font-medium">
            {isZh ? row.nameZh : row.nameEn || row.nameZh}
          </div>
          <div className="text-muted-foreground text-xs">{row.slug}</div>
        </div>
      ),
    },
  ];

  if (kind === 'stage') {
    columns.push({
      name: 'sortOrder',
      title: isZh ? '排序' : 'Sort order',
      callback: (row: ResourceTaxonomyItem) =>
        (row as typeof stage.$inferSelect).sortOrder,
    });
  }

  if (canWrite) {
    columns.push({
      name: 'action',
      title: '',
      type: 'dropdown',
      callback: (row: ResourceTaxonomyItem) => [
        {
          id: 'edit',
          title: isZh ? '编辑' : 'Edit',
          icon: 'RiEditLine',
          url: `${basePath}/${row.id}/edit`,
        },
        {
          id: 'delete',
          title: isZh ? '删除' : 'Delete',
          icon: 'RiDeleteBinLine',
          url: `${basePath}/${row.id}/delete`,
        },
      ],
    });
  }

  return columns;
}

export function getResourceTaxonomyPath(kind: ResourceTaxonomyKind) {
  return `/admin/resource-${kind}s`;
}

function getResourceTaxonomyTable(kind: ResourceTaxonomyKind) {
  if (kind === 'stage') return stage;
  if (kind === 'category') return category;
  return tag;
}
