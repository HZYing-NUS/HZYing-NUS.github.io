import { createHash } from 'node:crypto';
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  communityAuditLog,
  communityProfileRevision,
  communityUserProfile,
  user,
} from '../src/config/db/schema.postgres';
import { legacyProfileContent } from '../src/config/seed/legacy-content';
import { getUuid } from '../src/shared/lib/hash';

type Content = Record<string, unknown>;
const args = new Map(
  process.argv.slice(2).map((item) => {
    const [key, ...value] = item.split('=');
    return [key, value.join('=')];
  })
);
const envFile = args.get('--env');
const requestedUserId = args.get('--user-id');
const requestedEmail = args.get('--email');
const apply = args.has('--apply');
if (!envFile || (!requestedUserId && !requestedEmail))
  throw new Error(
    'Require --env=<file> and --user-id=<id> or --email=<email>.'
  );
config({ path: envFile, override: true });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
if (apply && process.env.CONFIRM_COMMUNITY_ABOUT_MIGRATION !== '1')
  throw new Error(
    'Writing requires --apply and CONFIRM_COMMUNITY_ABOUT_MIGRATION=1.'
  );

function localized(value: unknown, locale: 'zh' | 'en') {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object')
    return String((value as Content)[locale] || '').trim();
  return '';
}
function localizedRecords(items: unknown) {
  return Array.isArray(items)
    ? items.map((item) => {
        const row = item as Content;
        return {
          periodZh: localized(row['时间'], 'zh'),
          periodEn: localized(row['时间'], 'en'),
          titleZh: localized(
            row['标题'] || row['学校'] || row['公司'] || row['论文标题'],
            'zh'
          ),
          titleEn: localized(
            row['标题'] || row['学校'] || row['公司'] || row['论文标题'],
            'en'
          ),
          roleZh: localized(
            row['职位'] || row['学位'] || row['角色'] || row['作者身份'],
            'zh'
          ),
          roleEn: localized(
            row['职位'] || row['学位'] || row['角色'] || row['作者身份'],
            'en'
          ),
          descriptionZh: localized(
            row['描述'] || row['摘要'] || row['职责与成果'],
            'zh'
          ),
          descriptionEn: localized(
            row['描述'] || row['摘要'] || row['职责与成果'],
            'en'
          ),
          url: typeof row['链接'] === 'string' ? row['链接'] : '',
          images: Array.isArray(row['证明图片']) ? row['证明图片'] : [],
        };
      })
    : [];
}

const client = postgres(process.env.DATABASE_URL, { max: 1 });
const database = drizzle(client);
async function main() {
  try {
    const [byId] = requestedUserId
      ? await database
          .select()
          .from(user)
          .where(eq(user.id, requestedUserId))
          .limit(1)
      : [];
    const [byEmail] = requestedEmail
      ? await database
          .select()
          .from(user)
          .where(eq(user.email, requestedEmail))
          .limit(1)
      : [];
    if (
      requestedUserId &&
      requestedEmail &&
      (!byId || !byEmail || byId.id !== byEmail.id)
    )
      throw new Error('--user-id and --email must identify the same user.');
    const account = byId || byEmail;
    if (!account) throw new Error('Target user not found.');
    const [profile] = await database
      .select()
      .from(communityUserProfile)
      .where(eq(communityUserProfile.userId, account.id))
      .limit(1);
    if (!profile) throw new Error('Community profile not found.');
    const source = legacyProfileContent as Content;
    const experience = [
      ...localizedRecords(source['教育列表']),
      ...localizedRecords(source['经历列表']),
      ...localizedRecords(source['作品列表']),
      ...localizedRecords(source['论文列表']),
      ...localizedRecords(source['奖项列表']),
    ];
    const skills = [
      ...new Set(
        experience
          .flatMap((item) => `${item.roleZh} ${item.roleEn}`.split(/[·,/]/))
          .map((item) => item.trim())
          .filter(Boolean)
      ),
    ].slice(0, 30);
    const socialLinks = [
      typeof source['GitHub'] === 'string'
        ? { label: 'GitHub', url: source['GitHub'] }
        : null,
    ].filter(Boolean);
    const snapshot = {
      displayName: localized(source['名字'], 'zh') || account.name,
      avatarUrl:
        typeof source['头像图片'] === 'string'
          ? source['头像图片']
          : profile.avatarUrl,
      headline: localized(source['一句话标签'] || source['身份说明'], 'zh'),
      aboutZh: localized(source['自我介绍'] || source['个人介绍'], 'zh'),
      aboutEn: localized(source['自我介绍'] || source['个人介绍'], 'en'),
      experience,
      skills,
      region: 'Hangzhou / Nanjing',
      websiteUrl:
        typeof source['GitHub'] === 'string' ? source['GitHub'] : null,
      socialLinks,
    };
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(snapshot))
      .digest('hex');
    const revisionId = `legacy-about:${profile.id}:${fingerprint.slice(0, 16)}`;
    console.log(
      JSON.stringify(
        {
          userId: account.id,
          email: account.email,
          username: profile.username,
          fingerprint,
          apply,
        },
        null,
        2
      )
    );
    if (!apply) return;
    await database.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: communityProfileRevision.id })
        .from(communityProfileRevision)
        .where(eq(communityProfileRevision.id, revisionId))
        .limit(1);
      if (!existing)
        await tx.insert(communityProfileRevision).values({
          id: revisionId,
          profileId: profile.id,
          version: 1,
          ...snapshot,
          contentFingerprint: fingerprint,
          moderationStatus: 'published',
          createdBy: account.id,
          submittedAt: new Date(),
          publishedAt: new Date(),
        });
      await tx
        .update(communityUserProfile)
        .set({
          displayName: snapshot.displayName,
          avatarUrl: snapshot.avatarUrl,
          headline: snapshot.headline,
          aboutZh: snapshot.aboutZh,
          aboutEn: snapshot.aboutEn,
          experience,
          skills,
          region: snapshot.region,
          websiteUrl: snapshot.websiteUrl,
          socialLinks,
          currentPublishedRevisionId: revisionId,
          moderationStatus: 'published',
          allowAiCitation: false,
        })
        .where(eq(communityUserProfile.id, profile.id));
      await tx
        .insert(communityAuditLog)
        .values({
          id: `legacy-about-audit:${profile.id}:${fingerprint.slice(0, 16)}`,
          actorId: account.id,
          actorType: 'system',
          action: 'profile.legacy_about_migrated',
          objectType: 'profile',
          objectId: profile.id,
          afterState: { revisionId, fingerprint },
          metadata: {
            source: 'legacyProfileContent',
            seo: {
              mapped: false,
              reason:
                'Legacy SEO metadata has no dedicated community profile fields.',
            },
          },
        })
        .onConflictDoNothing();
    });
  } finally {
    await client.end({ timeout: 5 });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
