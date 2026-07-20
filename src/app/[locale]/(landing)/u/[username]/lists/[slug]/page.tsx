import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { CommunityContentActions } from '@/shared/blocks/community/content-actions';
import { getSignUser } from '@/shared/models/user';
import {
  getCommunityInteractionState,
  getPublicCommunityList,
} from '@/shared/services/community/interactions';

export async function generateMetadata() {
  return { robots: { index: false, follow: true } };
}

export default async function CommunityListPage({
  params,
}: {
  params: Promise<{ locale: string; username: string; slug: string }>;
}) {
  const { locale, username, slug } = await params;
  setRequestLocale(locale);
  const [row, currentUser] = await Promise.all([
    getPublicCommunityList(username, slug),
    getSignUser(),
  ]);
  if (!row) notFound();
  const interactionState = currentUser
    ? await getCommunityInteractionState({
        userId: currentUser.id,
        targetType: 'list',
        targetId: row.list.id,
      })
    : { liked: false, bookmarked: false };
  const zh = locale === 'zh';
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      <p className="text-muted-foreground text-sm">@{row.profile.username}</p>
      <h1 className="mt-2 text-4xl font-semibold">{row.list.title}</h1>
      {row.list.description && (
        <p className="text-muted-foreground mt-4">{row.list.description}</p>
      )}
      <p className="text-muted-foreground mt-3 text-xs">
        {zh
          ? '用户自定义内容夹，与平台行动专题相互独立。'
          : 'A user-created list, separate from platform collections.'}
      </p>
      {currentUser && (
        <CommunityContentActions
          targetId={row.list.id}
          targetType="list"
          initialBookmarked={interactionState.bookmarked}
          locale={locale}
        />
      )}
      <section className="mt-10 grid gap-4">
        {row.resources.map(
          (item: {
            id: string;
            slug: string;
            nameZh: string;
            nameEn: string | null;
          }) => (
            <a
              key={item.id}
              href={`/${locale}/resources/${item.slug}`}
              className="rounded-xl border p-4"
            >
              {zh ? item.nameZh : item.nameEn || item.nameZh}
            </a>
          )
        )}
        {row.collections.map(
          (item: {
            id: string;
            slug: string;
            titleZh: string;
            titleEn: string | null;
          }) => (
            <a
              key={item.id}
              href={`/${locale}/collections/${item.slug}`}
              className="rounded-xl border p-4"
            >
              {zh ? item.titleZh : item.titleEn || item.titleZh}
            </a>
          )
        )}
        {row.articles.map((item: { id: string; slug: string }) => (
          <a
            key={item.id}
            href={`/${locale}/blog/${item.slug}`}
            className="rounded-xl border p-4"
          >
            {item.slug}
          </a>
        ))}
      </section>
    </main>
  );
}
