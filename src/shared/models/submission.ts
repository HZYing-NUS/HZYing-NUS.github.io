import { and, asc, count, desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { collection, post, resource, submission } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

export const submissionTypes = [
  'resource',
  'article',
  'collection',
  'correction',
  'supplement',
] as const;

export type SubmissionType = (typeof submissionTypes)[number];

export async function createSubmission({
  type,
  title,
  url,
  description,
  suggestedTags,
  relatedContentType,
  relatedContentId,
  submitterUserId,
}: {
  type: SubmissionType;
  title: string;
  url?: string | null;
  description?: string | null;
  suggestedTags?: string | null;
  relatedContentType?: string | null;
  relatedContentId?: string | null;
  submitterUserId: string;
}) {
  const [item] = await db()
    .insert(submission)
    .values({
      id: getUuid(),
      type,
      title,
      url: url || null,
      description: description || null,
      suggestedTags: suggestedTags || null,
      relatedContentType: relatedContentType || null,
      relatedContentId: relatedContentId || null,
      submitterUserId,
      status: 'pending',
    })
    .returning();

  return item;
}

export async function getSubmissions({
  status,
  page = 1,
  limit = 30,
}: {
  status?: string;
  page?: number;
  limit?: number;
} = {}) {
  const where = status ? eq(submission.status, status) : undefined;
  return db()
    .select()
    .from(submission)
    .where(where)
    .orderBy(desc(submission.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

export async function getSubmissionsCount(status?: string) {
  const [result] = await db()
    .select({ count: count() })
    .from(submission)
    .where(status ? eq(submission.status, status) : undefined);
  return result?.count || 0;
}

export async function updateSubmissionReview({
  id,
  status,
  adminNote,
}: {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'archived';
  adminNote?: string | null;
}) {
  const [item] = await db()
    .update(submission)
    .set({ status, adminNote: adminNote || null })
    .where(eq(submission.id, id))
    .returning();
  return item;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || 'resource';
}

export async function convertResourceSubmission(id: string) {
  return db().transaction(async (tx: any) => {
    const [item] = await tx
      .select()
      .from(submission)
      .where(and(eq(submission.id, id), eq(submission.type, 'resource')))
      .limit(1);
    if (!item) throw new Error('Resource submission not found');
    if (item.convertedContentId) throw new Error('Submission has already been converted');

    const baseSlug = slugify(item.title);
    let slug = baseSlug;
    let suffix = 2;
    while ((await tx.select({ id: resource.id }).from(resource).where(eq(resource.slug, slug)).limit(1))[0]) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const resourceId = getUuid();
    await tx.insert(resource).values({
      id: resourceId,
      slug,
      nameZh: item.title,
      websiteUrl: item.url || null,
      resourceType: 'tool',
      summaryZh: item.description || null,
      sourceNote: item.suggestedTags || null,
      status: 'draft',
      allowAiCitation: false,
    });
    await tx
      .update(submission)
      .set({
        status: 'converted',
        convertedContentType: 'resource',
        convertedContentId: resourceId,
      })
      .where(eq(submission.id, id));

    return { resourceId, slug };
  });
}

export async function convertCollectionSubmission(id: string) {
  return db().transaction(async (tx: any) => {
    const [item] = await tx
      .select()
      .from(submission)
      .where(and(eq(submission.id, id), eq(submission.type, 'collection')))
      .limit(1);
    if (!item) throw new Error('Collection submission not found');
    if (item.convertedContentId) throw new Error('Submission has already been converted');

    const baseSlug = slugify(item.title);
    let slug = baseSlug;
    let suffix = 2;
    while ((await tx.select({ id: collection.id }).from(collection).where(eq(collection.slug, slug)).limit(1))[0]) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const collectionId = getUuid();
    await tx.insert(collection).values({
      id: collectionId,
      slug,
      titleZh: item.title,
      titleEn: item.title,
      summaryZh: item.description || null,
      summaryEn: item.description || null,
      status: 'draft',
      allowAiCitation: false,
    });
    await tx.update(submission).set({
      status: 'converted',
      convertedContentType: 'collection',
      convertedContentId: collectionId,
    }).where(eq(submission.id, id));

    return { collectionId, slug };
  });
}

export async function convertArticleSubmission(id: string, adminUserId: string) {
  return db().transaction(async (tx: any) => {
    const [item] = await tx
      .select()
      .from(submission)
      .where(and(eq(submission.id, id), eq(submission.type, 'article')))
      .limit(1);
    if (!item) throw new Error('Article submission not found');
    if (item.convertedContentId) throw new Error('Submission has already been converted');

    const baseSlug = slugify(item.title);
    let slug = baseSlug;
    let suffix = 2;
    while ((await tx.select({ id: post.id }).from(post).where(eq(post.slug, slug)).limit(1))[0]) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const postId = getUuid();
    await tx.insert(post).values({
      id: postId,
      userId: adminUserId,
      slug,
      type: 'article',
      title: item.title,
      description: item.description || null,
      content: item.description || null,
      summaryZh: item.description || null,
      summaryEn: item.description || null,
      contentZh: item.description || null,
      contentEn: item.description || null,
      status: 'draft',
      allowAiCitation: false,
    });
    await tx.update(submission).set({
      status: 'converted',
      convertedContentType: 'post',
      convertedContentId: postId,
    }).where(eq(submission.id, id));

    return { postId, slug };
  });
}
