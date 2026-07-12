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
  resourceTag,
  stage,
  tag,
} from '../src/config/db/schema.postgres';
import {
  pickLocaleText,
  platformCollections,
  platformResources,
} from '../src/config/seed/platform-content';

const args = new Set(process.argv.slice(2));
const envArgument = [...args].find((arg) => arg.startsWith('--env='));
const envFile = envArgument?.replace('--env=', '');
const apply = args.has('--apply');
const dryRun = args.has('--dry-run') || !apply;

if (!envFile) {
  throw new Error('Missing --env=<file>. Example: pnpm seed:platform -- --env=.env.local --dry-run');
}

config({ path: envFile, override: true });

if (process.env.DATABASE_PROVIDER && process.env.DATABASE_PROVIDER !== 'postgresql') {
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
  collectionTags: { created: 0, skipped: 0 },
  collectionResources: { created: 0, skipped: 0 },
};

function stableId(kind: string, slug: string) {
  return `platform:${kind}:${slug}`;
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}

function slugForLocaleText(value: { zh: string; en: string }) {
  return toSlug(value.en || value.zh);
}

function createIdMap(rows: { id: string; slug: string }[]) {
  return new Map(rows.map((row) => [row.slug, row.id]));
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
  const [existingStages, existingCategories, existingTags, existingResources, existingCollections] = await Promise.all([
    db.select({ id: stage.id, slug: stage.slug }).from(stage),
    db.select({ id: category.id, slug: category.slug }).from(category),
    db.select({ id: tag.id, slug: tag.slug }).from(tag),
    db.select({ id: resource.id, slug: resource.slug }).from(resource),
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

  for (const item of [...platformResources, ...platformCollections]) {
    allStages.set(slugForLocaleText(item.stage), item.stage);
    allCategories.set(slugForLocaleText(item.category), item.category);
    for (const itemTag of item.tags) allTags.set(slugForLocaleText(itemTag), itemTag);
  }

  for (const [slug, item] of allStages) {
    if (stageBySlug.has(slug)) {
      counts.stages.skipped += 1;
      continue;
    }

    const id = stableId('stage', slug);
    counts.stages.created += 1;
    if (!dryRun) {
      await db.insert(stage).values({ id, slug, nameZh: item.zh, nameEn: item.en, sortOrder: stageBySlug.size + 1 });
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
    if (!dryRun) await db.insert(category).values({ id, slug, nameZh: item.zh, nameEn: item.en });
    categoryBySlug.set(slug, id);
  }

  for (const [slug, item] of allTags) {
    if (tagBySlug.has(slug)) {
      counts.tags.skipped += 1;
      continue;
    }

    const id = stableId('tag', slug);
    counts.tags.created += 1;
    if (!dryRun) await db.insert(tag).values({ id, slug, nameZh: item.zh, nameEn: item.en });
    tagBySlug.set(slug, id);
  }

  for (const item of platformResources) {
    let resourceId = resourceBySlug.get(item.slug);
    if (resourceId) {
      counts.resources.skipped += 1;
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
          pricingType: toSlug(pickLocaleText(item.priceType, 'en')),
          featured: item.featured,
          allowAiCitation: item.allowAiCitation,
          status: 'published',
        });
      }
      resourceBySlug.set(item.slug, resourceId);
    }

    for (const itemTag of item.tags) {
      const tagId = tagBySlug.get(slugForLocaleText(itemTag));
      if (!tagId) continue;
      await insertRelation({
        exists: async () => Boolean((await db.select().from(resourceTag).where(and(eq(resourceTag.resourceId, resourceId), eq(resourceTag.tagId, tagId))).limit(1))[0]),
        insert: () => db.insert(resourceTag).values({ resourceId, tagId }),
        statistic: counts.resourceTags,
      });
    }
  }

  for (const item of platformCollections) {
    let collectionId = collectionBySlug.get(item.slug);
    if (collectionId) {
      counts.collections.skipped += 1;
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
          stageId: stageBySlug.get(slugForLocaleText(item.stage)),
          categoryId: categoryBySlug.get(slugForLocaleText(item.category)),
          featured: item.featured,
          allowAiCitation: item.allowAiCitation,
          status: 'published',
        });
      }
      collectionBySlug.set(item.slug, collectionId);
    }

    for (const itemTag of item.tags) {
      const tagId = tagBySlug.get(slugForLocaleText(itemTag));
      if (!tagId) continue;
      await insertRelation({
        exists: async () => Boolean((await db.select().from(collectionTag).where(and(eq(collectionTag.collectionId, collectionId), eq(collectionTag.tagId, tagId))).limit(1))[0]),
        insert: () => db.insert(collectionTag).values({ collectionId, tagId }),
        statistic: counts.collectionTags,
      });
    }

    for (const [sortOrder, resourceSlug] of item.resourceSlugs.entries()) {
      const resourceId = resourceBySlug.get(resourceSlug);
      if (!resourceId) continue;
      await insertRelation({
        exists: async () => Boolean((await db.select().from(collectionResource).where(and(eq(collectionResource.collectionId, collectionId), eq(collectionResource.resourceId, resourceId))).limit(1))[0]),
        insert: () => db.insert(collectionResource).values({ collectionId, resourceId, sortOrder }),
        statistic: counts.collectionResources,
      });
    }
  }

  console.table(counts);
  console.log(dryRun ? 'Dry run completed. No database rows were written.' : 'Platform seed applied.');
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
