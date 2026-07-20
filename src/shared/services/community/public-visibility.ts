export function getCommunityArticleHttpStatus(
  article: {
    status: string;
    currentPublishedRevisionId: string | null;
    deletedAt: Date | null;
    restoreDeadlineAt: Date | null;
    archivedAt: Date | null;
  } | null,
  now = new Date()
) {
  if (!article) return 404;
  if (article.deletedAt)
    return article.restoreDeadlineAt && article.restoreDeadlineAt < now
      ? 410
      : 404;
  if (article.status === 'archived' || article.archivedAt) return 404;
  return article.currentPublishedRevisionId ? 200 : 404;
}

export function buildCommunityPermanentRedirectPath({
  localePrefix,
  type,
  target,
  search = '',
}: {
  localePrefix: string;
  type: 'article' | 'profile';
  target: string;
  search?: string;
}) {
  const encodedTarget = encodeURIComponent(target);
  const base =
    type === 'article'
      ? `${localePrefix}/blog/${encodedTarget}`
      : `${localePrefix}/u/${encodedTarget}`;
  return `${base}${search}`;
}

export function resolveCommunityVisibilityResponse(result: {
  ok: boolean;
  status?: unknown;
}) {
  if (!result.ok) return 503;
  return result.status === 200 || result.status === 404 || result.status === 410
    ? result.status
    : 503;
}

export function resolveCommunityRedirectLookupResponse(result: {
  ok: boolean;
  target?: unknown;
}) {
  if (!result.ok) return { status: 503 as const, target: null };
  return {
    status: 200 as const,
    target: typeof result.target === 'string' ? result.target : null,
  };
}
