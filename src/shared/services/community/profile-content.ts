import { createHash } from 'node:crypto';

export type CommunityProfileInput = {
  displayName: string;
  avatarUrl?: string | null;
  headline?: string | null;
  aboutZh?: string | null;
  aboutEn?: string | null;
  experience?: unknown;
  skills?: unknown;
  region?: string | null;
  websiteUrl?: string | null;
  socialLinks?: unknown;
};

function optionalText(value: unknown, maxLength: number) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (normalized.length > maxLength)
    throw new Error('COMMUNITY_PROFILE_FIELD_TOO_LONG');
  return normalized || null;
}

function safeExternalUrl(value: unknown) {
  const normalized = optionalText(value, 2000);
  if (!normalized) return null;
  const url = new URL(normalized);
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('COMMUNITY_PROFILE_URL_INVALID');
  return url.toString();
}

export function normalizeCommunityProfileInput(input: CommunityProfileInput) {
  const displayName = optionalText(input.displayName, 120);
  if (!displayName) throw new Error('COMMUNITY_PROFILE_NAME_REQUIRED');
  const skills = Array.isArray(input.skills)
    ? [...new Set(input.skills.map(String).map((item) => item.trim()))]
        .filter(Boolean)
        .slice(0, 30)
    : [];
  const experience = Array.isArray(input.experience)
    ? input.experience.slice(0, 50)
    : [];
  const socialLinks = Array.isArray(input.socialLinks)
    ? input.socialLinks.slice(0, 5).map((item) => {
        const record = item as { label?: unknown; url?: unknown };
        return {
          label: optionalText(record.label, 80) || '',
          url: safeExternalUrl(record.url),
        };
      })
    : [];
  if (socialLinks.some((item) => !item.url))
    throw new Error('COMMUNITY_PROFILE_URL_INVALID');
  return {
    displayName,
    avatarUrl: safeExternalUrl(input.avatarUrl),
    headline: optionalText(input.headline, 240),
    aboutZh: optionalText(input.aboutZh, 20_000),
    aboutEn: optionalText(input.aboutEn, 20_000),
    experience,
    skills,
    region: optionalText(input.region, 160),
    websiteUrl: safeExternalUrl(input.websiteUrl),
    socialLinks,
  };
}

export function getCommunityProfileFingerprint(
  input: ReturnType<typeof normalizeCommunityProfileInput>
) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

export function canPublishCommunityProfileRevision({
  latestRevisionId,
  revisionId,
  currentFingerprint,
  expectedFingerprint,
}: {
  latestRevisionId: string | null;
  revisionId: string;
  currentFingerprint: string | null;
  expectedFingerprint?: string;
}) {
  return (
    latestRevisionId === revisionId &&
    Boolean(
      currentFingerprint &&
        (!expectedFingerprint || currentFingerprint === expectedFingerprint)
    )
  );
}

export function shouldCreateCommunityProfileRevision({
  revisionId,
  publishedRevisionId,
  moderationStatus,
}: {
  revisionId: string | null;
  publishedRevisionId: string | null;
  moderationStatus: string | null;
}) {
  return (
    !revisionId ||
    revisionId === publishedRevisionId ||
    ['moderation_pending', 'pending_admin', 'blocked', 'failed'].includes(
      moderationStatus || ''
    )
  );
}
