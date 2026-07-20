import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import { communityFollow } from '@/config/db/schema';
import { CommunityProfileFollowButton } from '@/shared/blocks/community/profile-follow-button';
import { CommunityProfileReportButton } from '@/shared/blocks/community/profile-report-button';
import {
  findPublicCommunityProfile,
  getPublicCommunityProfileContent,
  getPublicCommunityProfileStats,
} from '@/shared/models/community';
import { getSignUser } from '@/shared/models/user';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  const profile = await findPublicCommunityProfile(username);
  if (!profile) return {};
  const stats = await getPublicCommunityProfileStats(profile.userId);
  const hasAbout = Boolean(profile.aboutZh || profile.aboutEn);
  const prefix = locale === envConfigs.locale ? '' : `/${locale}`;
  const canonical = `${envConfigs.app_url}${prefix}/u/${profile.username}`;
  const description =
    (locale === 'zh' ? profile.aboutZh : profile.aboutEn) ||
    profile.headline ||
    undefined;
  return {
    title: profile.displayName || `@${profile.username}`,
    description,
    alternates: {
      canonical,
      languages: {
        zh: `${envConfigs.app_url}/zh/u/${profile.username}`,
        en: `${envConfigs.app_url}/u/${profile.username}`,
      },
    },
    robots:
      stats.publishedArticles > 0 || hasAbout
        ? undefined
        : { index: false, follow: true },
  };
}

export default async function CommunityProfilePage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  setRequestLocale(locale);
  const profile = await findPublicCommunityProfile(username);
  if (!profile) notFound();
  const currentUser = await getSignUser();
  const [t, stats, content, following] = await Promise.all([
    getTranslations('community.profile'),
    getPublicCommunityProfileStats(profile.userId),
    getPublicCommunityProfileContent(profile.userId),
    currentUser && currentUser.id !== profile.userId
      ? db()
          .select({ followerId: communityFollow.followerId })
          .from(communityFollow)
          .where(
            and(
              eq(communityFollow.followerId, currentUser.id),
              eq(communityFollow.followedId, profile.userId)
            )
          )
          .limit(1)
      : Promise.resolve([]),
  ]);
  const about = locale === 'en' ? profile.aboutEn : profile.aboutZh;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <section className="border-b pb-10">
        <div className="flex items-center gap-5">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-20 w-20 rounded-full border object-cover"
            />
          ) : null}
          <div>
            <p className="text-muted-foreground text-sm">@{profile.username}</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              {profile.displayName}
            </h1>
          </div>
        </div>
        {profile.headline ? (
          <p className="text-muted-foreground mt-4 text-lg">
            {profile.headline}
          </p>
        ) : null}
        {currentUser && currentUser.id !== profile.userId && (
          <>
            <CommunityProfileFollowButton
              userId={profile.userId}
              initialFollowing={following.length > 0}
              locale={locale}
            />
            <CommunityProfileReportButton
              profileId={profile.id}
              locale={locale}
            />
          </>
        )}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat label={t('articles')} value={stats.publishedArticles} />
          <Stat label={t('likes')} value={stats.receivedLikes} />
          <Stat label={t('lists')} value={stats.publicLists} />
        </div>
      </section>
      {Array.isArray(profile.experience) && profile.experience.length > 0 && (
        <section className="border-t py-8">
          <h2 className="text-2xl font-semibold">
            {locale === 'zh' ? '经历' : 'Experience'}
          </h2>
          <div className="mt-5 space-y-4">
            {(profile.experience as unknown[]).map((item, index) => {
              const record = item as Record<string, unknown>;
              const title = String(
                locale === 'zh'
                  ? record.titleZh || record.roleZh || record.title || ''
                  : record.titleEn || record.roleEn || record.title || ''
              );
              const role = String(
                locale === 'zh'
                  ? record.roleZh || record.organizationZh || ''
                  : record.roleEn || record.organizationEn || ''
              );
              const period = String(
                locale === 'zh' ? record.periodZh || '' : record.periodEn || ''
              );
              const description = String(
                locale === 'zh'
                  ? record.descriptionZh || ''
                  : record.descriptionEn || ''
              );
              const itemTitle = title || role || period;
              return (
                <div
                  key={`${itemTitle}-${index}`}
                  className="rounded-xl border p-4"
                >
                  <p className="font-medium">{itemTitle}</p>
                  {title && role ? (
                    <p className="text-muted-foreground mt-1 text-sm">{role}</p>
                  ) : null}
                  {period ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {period}
                    </p>
                  ) : null}
                  {description ? (
                    <p className="mt-3 text-sm leading-6">{description}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      )}
      <section className="py-10">
        <h2 className="text-2xl font-semibold">{t('about')}</h2>
        <p className="text-muted-foreground mt-4 leading-7 whitespace-pre-wrap">
          {about || t('emptyAbout')}
        </p>
      </section>
      {(profile.region || profile.websiteUrl) && (
        <section className="border-t py-8">
          <p className="text-muted-foreground">{profile.region}</p>
          {profile.websiteUrl && (
            <a
              href={profile.websiteUrl}
              target="_blank"
              rel="ugc nofollow noreferrer"
              className="text-primary mt-2 inline-block"
            >
              {profile.websiteUrl}
            </a>
          )}
        </section>
      )}
      {Array.isArray(profile.skills) && profile.skills.length > 0 && (
        <section className="border-t py-8">
          <div className="flex flex-wrap gap-2">
            {(profile.skills as unknown[]).map((skill: unknown) => (
              <span
                key={String(skill)}
                className="rounded-full border px-3 py-1 text-sm"
              >
                {String(skill)}
              </span>
            ))}
          </div>
        </section>
      )}
      {Array.isArray(profile.socialLinks) && profile.socialLinks.length > 0 && (
        <section className="border-t py-8">
          <div className="flex flex-wrap gap-4">
            {(profile.socialLinks as unknown[])
              .slice(0, 5)
              .map((item: unknown, index: number) => {
                const link = item as { label?: string; url?: string };
                return link.url ? (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="ugc nofollow noreferrer"
                    className="text-primary text-sm"
                  >
                    {link.label || link.url}
                  </a>
                ) : null;
              })}
          </div>
        </section>
      )}
      <section className="border-t py-10">
        <h2 className="text-2xl font-semibold">{t('articles')}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {content.articles.map(({ article, revision }) => (
            <a
              key={article.id}
              href={`/${locale}/blog/${article.slug}`}
              className="rounded-xl border p-5"
            >
              <h3 className="font-semibold">
                {locale === 'zh' ? revision.titleZh : revision.titleEn}
              </h3>
              <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                {locale === 'zh' ? revision.summaryZh : revision.summaryEn}
              </p>
            </a>
          ))}
        </div>
      </section>
      <section className="text-muted-foreground border-t py-8 text-sm">
        <p>
          {content.following} following · {content.followers} followers
        </p>
        <p>
          {content.privacy?.showFollowingList
            ? 'Following list is public.'
            : 'Following list is private.'}
        </p>
        <p>
          {content.privacy?.showFollowerList
            ? 'Follower list is public.'
            : 'Follower list is private.'}
        </p>
        <p>
          {content.privacy?.showLikes
            ? 'Likes are public.'
            : 'Likes are private.'}
        </p>
      </section>
      {content.publicLists.length > 0 && (
        <section id="lists" className="border-t py-8">
          <h2 className="text-xl font-semibold">
            {locale === 'zh' ? '公开内容夹' : 'Public lists'}
          </h2>
          {content.publicLists.map(
            (list: (typeof content.publicLists)[number]) => (
              <a
                key={list.id}
                href={`/${locale}/u/${profile.username}/lists/${list.slug}`}
                className="mt-3 block rounded-xl border p-4"
              >
                <p className="font-medium">{list.title}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {list.description}
                </p>
              </a>
            )
          )}
        </section>
      )}
      {content.privacy?.showLikes && (
        <section className="border-t py-8 text-sm">
          <h2 className="font-semibold">
            {locale === 'zh' ? '公开点赞' : 'Public likes'}
          </h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {content.articleLikes.map((item: any) => (
              <a
                key={`article-${item.articleId}`}
                href={`/${locale}/blog/${item.slug}`}
                className="rounded-lg border p-3"
              >
                {locale === 'zh' ? item.titleZh : item.titleEn || item.titleZh}
              </a>
            ))}
            {content.commentLikes.map((item: any) => (
              <a
                key={`comment-${item.commentId}`}
                href={`/${locale}/blog/${item.slug}`}
                className="rounded-lg border p-3"
              >
                <span className="text-muted-foreground mr-2 text-xs">
                  {locale === 'zh' ? '评论' : 'Comment'}
                </span>
                {item.content}
              </a>
            ))}
          </div>
        </section>
      )}
      {content.privacy?.showBookmarks && content.bookmarks.length > 0 && (
        <section className="border-t py-8 text-sm">
          <h2 className="font-semibold">
            {locale === 'zh' ? '公开收藏' : 'Public bookmarks'}
          </h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {content.bookmarks.map((item: any) => {
              const href =
                item.type === 'list'
                  ? `/${locale}/u/${item.username}/lists/${item.slug}`
                  : `/${locale}/${item.type === 'article' ? 'blog' : item.type === 'resource' ? 'resources' : 'collections'}/${item.slug}`;
              return (
                <a
                  key={`${item.type}-${item.id}`}
                  href={href}
                  className="rounded-lg border p-3"
                >
                  {locale === 'zh' ? item.title : item.titleEn || item.title}
                </a>
              );
            })}
          </div>
        </section>
      )}
      {content.privacy?.showFollowingList &&
        content.followingProfiles.length > 0 && (
          <section className="border-t py-8">
            <h2 className="font-semibold">
              {locale === 'zh' ? '关注' : 'Following'}
            </h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {content.followingProfiles.map(
                (item: (typeof content.followingProfiles)[number]) => (
                  <a
                    key={item.username}
                    href={`/${locale}/u/${item.username}`}
                    className="rounded-full border px-3 py-1 text-sm"
                  >
                    {item.displayName}
                  </a>
                )
              )}
            </div>
          </section>
        )}
      {content.privacy?.showFollowerList &&
        content.followerProfiles.length > 0 && (
          <section className="border-t py-8">
            <h2 className="font-semibold">
              {locale === 'zh' ? '粉丝' : 'Followers'}
            </h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {content.followerProfiles.map(
                (item: (typeof content.followerProfiles)[number]) => (
                  <a
                    key={item.username}
                    href={`/${locale}/u/${item.username}`}
                    className="rounded-full border px-3 py-1 text-sm"
                  >
                    {item.displayName}
                  </a>
                )
              )}
            </div>
          </section>
        )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-muted-foreground mt-1 text-sm">{label}</p>
    </div>
  );
}
