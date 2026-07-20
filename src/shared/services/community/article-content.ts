import { createHash } from 'node:crypto';

export type CommunityArticleSourceLocale = 'zh' | 'en';

export type CommunityArticleDraftInput = {
  sourceLocale: CommunityArticleSourceLocale;
  title: string;
  summary: string;
  content: string;
  slug: string;
  coverImageUrl?: string | null;
  categorySlug?: string | null;
  tags?: string[];
};

export type CommunityArticleSlugOccupancy = {
  legacyPostId?: string | null;
  currentArticleId?: string | null;
  historyArticleId?: string | null;
};

const submittableArticleStatuses = new Set([
  'draft',
  'translation_failed',
  'changes_requested',
  'rejected',
  'revision_draft',
]);

export function canSubmitCommunityArticleStatus(status: string) {
  return submittableArticleStatuses.has(status);
}

export function getCommunityTranslationJobRecoveryAction(
  job: {
    status: string;
    attemptCount: number;
    maxAttempts: number;
    leaseExpiresAt: Date | null;
  },
  now = new Date()
) {
  const claimable =
    job.status === 'pending' ||
    (job.status === 'processing' &&
      Boolean(job.leaseExpiresAt && job.leaseExpiresAt <= now));
  if (!claimable) return 'ignore' as const;
  return job.attemptCount >= job.maxAttempts
    ? ('fail' as const)
    : ('claim' as const);
}

export function normalizeCommunityArticleSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

export function isCommunityArticleSlugAvailable({
  articleId,
  occupancy,
}: {
  articleId?: string;
  occupancy: CommunityArticleSlugOccupancy;
}) {
  if (occupancy.legacyPostId || occupancy.historyArticleId) return false;
  return (
    !occupancy.currentArticleId || occupancy.currentArticleId === articleId
  );
}

export function normalizeCommunityFeaturedReason(
  featured: boolean,
  reason?: string | null
) {
  const normalized = reason?.trim() || null;
  if (featured && !normalized)
    throw new Error('ARTICLE_FEATURED_REASON_REQUIRED');
  return featured ? normalized : null;
}

export function normalizeCommunityArticleInput(
  input: CommunityArticleDraftInput
) {
  const normalized = {
    sourceLocale: input.sourceLocale,
    title: input.title.trim(),
    summary: input.summary.trim(),
    content: input.content.replace(/\r\n/g, '\n').trim(),
    slug: normalizeCommunityArticleSlug(input.slug),
    coverImageUrl: input.coverImageUrl?.trim() || null,
    categorySlug: input.categorySlug?.trim().toLowerCase() || null,
    tags: Array.from(
      new Set(
        (input.tags || [])
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean)
      )
    ).slice(0, 10),
  };

  if (!normalized.slug) throw new Error('ARTICLE_SLUG_REQUIRED');
  if (!normalized.title) throw new Error('ARTICLE_TITLE_REQUIRED');
  if (!normalized.summary) throw new Error('ARTICLE_SUMMARY_REQUIRED');
  if (!normalized.content) throw new Error('ARTICLE_CONTENT_REQUIRED');
  if (normalized.title.length > 180) throw new Error('ARTICLE_TITLE_TOO_LONG');
  if (normalized.summary.length > 500)
    throw new Error('ARTICLE_SUMMARY_TOO_LONG');
  return normalized;
}

export function getCommunitySourceFields({
  sourceLocale,
  title,
  summary,
  content,
}: Pick<
  ReturnType<typeof normalizeCommunityArticleInput>,
  'sourceLocale' | 'title' | 'summary' | 'content'
>) {
  return sourceLocale === 'zh'
    ? {
        titleZh: title,
        summaryZh: summary,
        contentZh: content,
        titleEn: null,
        summaryEn: null,
        contentEn: null,
      }
    : {
        titleZh: null,
        summaryZh: null,
        contentZh: null,
        titleEn: title,
        summaryEn: summary,
        contentEn: content,
      };
}

export function getCommunityArticleSourceFingerprint(input: {
  sourceLocale: string;
  titleZh: string | null;
  titleEn: string | null;
  summaryZh: string | null;
  summaryEn: string | null;
  contentZh: string | null;
  contentEn: string | null;
  coverImageUrl: string | null;
  categorySlug: string | null;
  tags: unknown;
}) {
  const sourceIsZh = input.sourceLocale === 'zh';
  return createHash('sha256')
    .update(
      JSON.stringify({
        locale: input.sourceLocale,
        title: sourceIsZh ? input.titleZh : input.titleEn,
        summary: sourceIsZh ? input.summaryZh : input.summaryEn,
        content: sourceIsZh ? input.contentZh : input.contentEn,
        coverImageUrl: input.coverImageUrl,
        categorySlug: input.categorySlug,
        tags: input.tags,
      })
    )
    .digest('hex');
}

export function getCommunityArticleBilingualFingerprint(input: {
  titleZh: string | null;
  titleEn: string | null;
  summaryZh: string | null;
  summaryEn: string | null;
  contentZh: string | null;
  contentEn: string | null;
  coverImageUrl: string | null;
  categorySlug: string | null;
  tags: unknown;
}) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

export function hasCompleteCommunityArticleTranslation(input: {
  titleZh: string | null;
  titleEn: string | null;
  summaryZh: string | null;
  summaryEn: string | null;
  contentZh: string | null;
  contentEn: string | null;
}) {
  return Boolean(
    input.titleZh?.trim() &&
      input.titleEn?.trim() &&
      input.summaryZh?.trim() &&
      input.summaryEn?.trim() &&
      input.contentZh?.trim() &&
      input.contentEn?.trim()
  );
}
