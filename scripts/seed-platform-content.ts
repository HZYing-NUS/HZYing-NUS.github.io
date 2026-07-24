import { config } from 'dotenv';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  category,
  collection,
  collectionResource,
  collectionTag,
  resource,
  resourceStage,
  resourceTag,
  stage,
  tag,
} from '../src/config/db/schema.postgres';
import {
  pickLocaleText,
  platformCollections,
  platformResources,
  platformStageOrder,
  retiredPlatformCollectionSlugs,
} from '../src/config/seed/platform-content';

const args = new Set(process.argv.slice(2));
const envArgument = [...args].find((arg) => arg.startsWith('--env='));
const envFile = envArgument?.replace('--env=', '');
const apply = args.has('--apply');
const dryRun = args.has('--dry-run') || !apply;

if (!envFile) {
  throw new Error(
    'Missing --env=<file>. Example: pnpm seed:platform -- --env=.env.local --dry-run'
  );
}

config({ path: envFile, override: true });

if (
  process.env.DATABASE_PROVIDER &&
  process.env.DATABASE_PROVIDER !== 'postgresql'
) {
  throw new Error('Platform seed supports DATABASE_PROVIDER=postgresql only.');
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required.');
}

if (apply && process.env.CONFIRM_PLATFORM_SEED !== '1') {
  throw new Error('Writing requires CONFIRM_PLATFORM_SEED=1 and --apply.');
}

const client = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(client);
const counts = {
  stages: { created: 0, skipped: 0 },
  categories: { created: 0, skipped: 0 },
  tags: { created: 0, skipped: 0 },
  resources: { created: 0, skipped: 0 },
  collections: { created: 0, skipped: 0 },
  resourceTags: { created: 0, skipped: 0 },
  resourceStages: { created: 0, skipped: 0 },
  collectionTags: { created: 0, skipped: 0 },
  collectionResources: { created: 0, skipped: 0 },
};

function stableId(kind: string, slug: string) {
  return `platform:${kind}:${slug}`;
}

function toSlug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  );
}

function slugForLocaleText(value: { zh: string; en: string }) {
  return toSlug(value.en || value.zh);
}

function createIdMap(rows: { id: string; slug: string }[]) {
  return new Map(rows.map((row) => [row.slug, row.id]));
}

function createSourceNote(item: (typeof platformResources)[number]) {
  return JSON.stringify({
    usageStatus: item.usageStatus,
    verifiedAt: item.verifiedAt,
    caution: item.caution || null,
    notFor: item.notFor || null,
  });
}

async function insertRelation({
  exists,
  insert,
  statistic,
}: {
  exists: () => Promise<boolean>;
  insert: () => Promise<unknown>;
  statistic: { created: number; skipped: number };
}) {
  if (await exists()) {
    statistic.skipped += 1;
    return;
  }

  statistic.created += 1;
  if (!dryRun) await insert();
}

async function seed() {
  const [
    existingStages,
    existingCategories,
    existingTags,
    existingResources,
    existingCollections,
  ] = await Promise.all([
    db.select({ id: stage.id, slug: stage.slug }).from(stage),
    db.select({ id: category.id, slug: category.slug }).from(category),
    db.select({ id: tag.id, slug: tag.slug }).from(tag),
    db
      .select({
        id: resource.id,
        slug: resource.slug,
        stageId: resource.stageId,
      })
      .from(resource),
    db.select({ id: collection.id, slug: collection.slug }).from(collection),
  ]);

  const stageBySlug = createIdMap(existingStages);
  const categoryBySlug = createIdMap(existingCategories);
  const tagBySlug = createIdMap(existingTags);
  const resourceBySlug = createIdMap(existingResources);
  const collectionBySlug = createIdMap(existingCollections);
  const allStages = new Map<string, { zh: string; en: string }>();
  const allCategories = new Map<string, { zh: string; en: string }>();
  const allTags = new Map<string, { zh: string; en: string }>();

  for (const item of existingResources) {
    if (!item.stageId) continue;
    const primaryStageId = item.stageId;
    const existingResourceStages = await db
      .select({ stageId: resourceStage.stageId })
      .from(resourceStage)
      .where(eq(resourceStage.resourceId, item.id))
      .limit(1);
    if (existingResourceStages.length) {
      counts.resourceStages.skipped += 1;
      continue;
    }

    counts.resourceStages.created += 1;
    if (!dryRun) {
      await db
        .insert(resourceStage)
        .values({ resourceId: item.id, stageId: primaryStageId });
    }
  }

  for (const itemStage of platformStageOrder) {
    allStages.set(slugForLocaleText(itemStage), itemStage);
  }

  for (const item of [...platformResources, ...platformCollections]) {
    allStages.set(slugForLocaleText(item.stage), item.stage);
    if ('stages' in item) {
      for (const itemStage of item.stages || []) {
        allStages.set(slugForLocaleText(itemStage), itemStage);
      }
    }
    allCategories.set(slugForLocaleText(item.category), item.category);
    for (const itemTag of item.tags)
      allTags.set(slugForLocaleText(itemTag), itemTag);
  }

  const stageOrderBySlug = new Map(
    platformStageOrder.map((item, index) => [
      slugForLocaleText(item),
      index + 1,
    ])
  );

  for (const [slug, item] of allStages) {
    const sortOrder = stageOrderBySlug.get(slug) || allStages.size + 1;
    if (stageBySlug.has(slug)) {
      counts.stages.skipped += 1;
      if (!dryRun) {
        await db.update(stage).set({ sortOrder }).where(eq(stage.slug, slug));
      }
      continue;
    }

    const id = stableId('stage', slug);
    counts.stages.created += 1;
    if (!dryRun) {
      await db.insert(stage).values({
        id,
        slug,
        nameZh: item.zh,
        nameEn: item.en,
        sortOrder,
      });
    }
    stageBySlug.set(slug, id);
  }

  for (const [slug, item] of allCategories) {
    if (categoryBySlug.has(slug)) {
      counts.categories.skipped += 1;
      continue;
    }

    const id = stableId('category', slug);
    counts.categories.created += 1;
    if (!dryRun)
      await db
        .insert(category)
        .values({ id, slug, nameZh: item.zh, nameEn: item.en });
    categoryBySlug.set(slug, id);
  }

  for (const [slug, item] of allTags) {
    if (tagBySlug.has(slug)) {
      counts.tags.skipped += 1;
      continue;
    }

    const id = stableId('tag', slug);
    counts.tags.created += 1;
    if (!dryRun)
      await db
        .insert(tag)
        .values({ id, slug, nameZh: item.zh, nameEn: item.en });
    tagBySlug.set(slug, id);
  }

  for (const item of platformResources) {
    let resourceId = resourceBySlug.get(item.slug);
    const resourceCreated = !resourceId;
    if (resourceId) {
      counts.resources.skipped += 1;
      if (!dryRun) {
        await db
          .update(resource)
          .set({
            nameZh: item.name.zh,
            nameEn: item.name.en,
            websiteUrl: item.website,
            resourceType: toSlug(pickLocaleText(item.type, 'en')),
            stageId: stageBySlug.get(slugForLocaleText(item.stage)),
            categoryId: categoryBySlug.get(slugForLocaleText(item.category)),
            summaryZh: item.summary.zh,
            summaryEn: item.summary.en,
            reasonZh: item.reason.zh,
            reasonEn: item.reason.en,
            useCaseZh: item.useCase.zh,
            useCaseEn: item.useCase.en,
            sourceNote: createSourceNote(item),
            pricingType: toSlug(pickLocaleText(item.priceType, 'en')),
            featured: item.featured,
            allowAiCitation: item.allowAiCitation,
            sortOrder: item.sortOrder,
            status: 'published',
            updatedAt: new Date(),
          })
          .where(eq(resource.id, resourceId));
      }
    } else {
      resourceId = stableId('resource', item.slug);
      counts.resources.created += 1;
      if (!dryRun) {
        await db.insert(resource).values({
          id: resourceId,
          slug: item.slug,
          nameZh: item.name.zh,
          nameEn: item.name.en,
          websiteUrl: item.website,
          resourceType: toSlug(pickLocaleText(item.type, 'en')),
          stageId: stageBySlug.get(slugForLocaleText(item.stage)),
          categoryId: categoryBySlug.get(slugForLocaleText(item.category)),
          summaryZh: item.summary.zh,
          summaryEn: item.summary.en,
          reasonZh: item.reason.zh,
          reasonEn: item.reason.en,
          useCaseZh: item.useCase.zh,
          useCaseEn: item.useCase.en,
          sourceNote: createSourceNote(item),
          pricingType: toSlug(pickLocaleText(item.priceType, 'en')),
          featured: item.featured,
          allowAiCitation: item.allowAiCitation,
          sortOrder: item.sortOrder,
          status: 'published',
        });
      }
      resourceBySlug.set(item.slug, resourceId);
    }

    for (const itemTag of item.tags) {
      const tagId = tagBySlug.get(slugForLocaleText(itemTag));
      if (!tagId) continue;
      await insertRelation({
        exists: async () =>
          Boolean(
            (
              await db
                .select()
                .from(resourceTag)
                .where(
                  and(
                    eq(resourceTag.resourceId, resourceId),
                    eq(resourceTag.tagId, tagId)
                  )
                )
                .limit(1)
            )[0]
          ),
        insert: () => db.insert(resourceTag).values({ resourceId, tagId }),
        statistic: counts.resourceTags,
      });
    }

    if (resourceCreated) {
      for (const itemStage of item.stages?.length
        ? item.stages
        : [item.stage]) {
        const stageId = stageBySlug.get(slugForLocaleText(itemStage));
        if (!stageId) continue;
        counts.resourceStages.created += 1;
        if (!dryRun) {
          await db.insert(resourceStage).values({ resourceId, stageId });
        }
      }
    }
  }

  for (const item of platformCollections) {
    let collectionId = collectionBySlug.get(item.slug);
    if (collectionId) {
      counts.collections.skipped += 1;
      if (!dryRun) {
        await db
          .update(collection)
          .set({
            titleZh: item.title.zh,
            titleEn: item.title.en,
            summaryZh: item.summary.zh,
            summaryEn: item.summary.en,
            contentZh: item.content.zh,
            contentEn: item.content.en,
            stageId: stageBySlug.get(slugForLocaleText(item.stage)),
            categoryId: categoryBySlug.get(slugForLocaleText(item.category)),
            featured: item.featured,
            allowAiCitation: item.allowAiCitation,
            sortOrder: item.sortOrder,
            status: 'published',
            updatedAt: new Date(),
          })
          .where(eq(collection.id, collectionId));
      }
    } else {
      collectionId = stableId('collection', item.slug);
      counts.collections.created += 1;
      if (!dryRun) {
        await db.insert(collection).values({
          id: collectionId,
          slug: item.slug,
          titleZh: item.title.zh,
          titleEn: item.title.en,
          summaryZh: item.summary.zh,
          summaryEn: item.summary.en,
          contentZh: item.content.zh,
          contentEn: item.content.en,
          stageId: stageBySlug.get(slugForLocaleText(item.stage)),
          categoryId: categoryBySlug.get(slugForLocaleText(item.category)),
          featured: item.featured,
          allowAiCitation: item.allowAiCitation,
          sortOrder: item.sortOrder,
          status: 'published',
        });
      }
      collectionBySlug.set(item.slug, collectionId);
    }

    const tagRelations = item.tags.flatMap((itemTag) => {
      const tagId = tagBySlug.get(slugForLocaleText(itemTag));
      return tagId ? [{ collectionId, tagId }] : [];
    });
    const resourceRelations = item.steps.flatMap((step, sortOrder) => {
      const resourceId = resourceBySlug.get(step.resourceSlug);
      return resourceId
        ? [
            {
              collectionId,
              resourceId,
              stepTitleZh: step.title.zh,
              stepTitleEn: step.title.en,
              stepDescriptionZh: step.description.zh,
              stepDescriptionEn: step.description.en,
              relationType: step.relationType || 'required',
              sortOrder,
            },
          ]
        : [];
    });

    counts.collectionTags.created += tagRelations.length;
    counts.collectionResources.created += resourceRelations.length;

    if (!dryRun) {
      await db.transaction(async (tx) => {
        await tx
          .delete(collectionTag)
          .where(eq(collectionTag.collectionId, collectionId));
        await tx
          .delete(collectionResource)
          .where(eq(collectionResource.collectionId, collectionId));
        if (tagRelations.length)
          await tx.insert(collectionTag).values(tagRelations);
        if (resourceRelations.length)
          await tx.insert(collectionResource).values(resourceRelations);
      });
    }
  }

  if (!dryRun && retiredPlatformCollectionSlugs.length) {
    for (const slug of retiredPlatformCollectionSlugs) {
      await db
        .update(collection)
        .set({ status: 'archived', updatedAt: new Date() })
        .where(eq(collection.slug, slug));
    }
  }

  console.table(counts);
  console.log(
    dryRun
      ? 'Dry run completed. No database rows were written.'
      : 'Platform seed applied.'
  );
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
