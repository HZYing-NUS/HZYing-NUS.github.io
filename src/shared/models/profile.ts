import { and, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { profileContent } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

export async function getProfileByLocale(locale: string) {
  const [item] = await db()
    .select()
    .from(profileContent)
    .where(eq(profileContent.locale, locale))
    .limit(1);
  return item;
}

export async function getPublishedProfile(locale: string) {
  const [item] = await db()
    .select({ content: profileContent.content })
    .from(profileContent)
    .where(
      and(
        eq(profileContent.locale, locale),
        eq(profileContent.status, 'published'),
        eq(profileContent.allowAiCitation, true)
      )
    )
    .limit(1);
  return item?.content || null;
}

export async function saveProfile({
  locale,
  content,
  status,
  allowAiCitation,
}: {
  locale: string;
  content: Record<string, unknown>;
  status: string;
  allowAiCitation: boolean;
}) {
  const existing = await getProfileByLocale(locale);
  if (existing) {
    const [item] = await db()
      .update(profileContent)
      .set({ content, status, allowAiCitation })
      .where(eq(profileContent.id, existing.id))
      .returning();
    return item;
  }

  const [item] = await db()
    .insert(profileContent)
    .values({ id: getUuid(), locale, content, status, allowAiCitation })
    .returning();
  return item;
}
