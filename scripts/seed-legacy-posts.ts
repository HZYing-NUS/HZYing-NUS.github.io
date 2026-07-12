import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { post, user } from '../src/config/db/schema.postgres';
import { legacyPosts } from '../src/config/seed/legacy-content';

const args = new Set(process.argv.slice(2));
const envFile = [...args].find((arg) => arg.startsWith('--env='))?.replace('--env=', '');
const authorId = [...args].find((arg) => arg.startsWith('--author-id='))?.replace('--author-id=', '');
const apply = args.has('--apply');
const dryRun = args.has('--dry-run') || !apply;

if (!envFile || !authorId) {
  throw new Error('Usage: tsx scripts/seed-legacy-posts.ts --env=<file> --author-id=<user-id> --dry-run');
}
const confirmedAuthorId = authorId!;
config({ path: envFile, override: true });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
if (apply && process.env.CONFIRM_LEGACY_POSTS_SEED !== '1') {
  throw new Error('Writing requires CONFIRM_LEGACY_POSTS_SEED=1 and --apply.');
}

const client = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(client);

async function main() {
  try {
    const [author] = await db.select({ id: user.id }).from(user).where(eq(user.id, confirmedAuthorId)).limit(1);
    if (!author) throw new Error('The supplied author ID does not exist. No posts were written.');

    const bySlug = new Map<string, Array<(typeof legacyPosts)[number]>>();
    for (const item of legacyPosts) {
      const group = bySlug.get(item.slug) || [];
      group.push(item);
      bySlug.set(item.slug, group);
    }

    let created = 0;
    let skipped = 0;
    for (const [slug, translations] of bySlug) {
      const [existing] = await db.select({ id: post.id }).from(post).where(eq(post.slug, slug)).limit(1);
      if (existing) {
        skipped += 1;
        continue;
      }
      const zh = translations.find((item) => item.locale === 'zh');
      const en = translations.find((item) => item.locale === 'en');
      const primary = zh || en;
      if (!primary) continue;
      created += 1;
      if (!dryRun) {
        await db.insert(post).values({
          id: `legacy:post:${slug}`,
          userId: confirmedAuthorId,
          slug,
          type: 'article',
          title: primary.title,
          description: primary.summary,
          content: primary.content,
          summaryZh: zh?.summary || null,
          summaryEn: en?.summary || null,
          contentZh: zh?.content || null,
          contentEn: en?.content || null,
          authorName: '黄梓颖',
          status: 'published',
          locale: 'zh',
          translationGroup: slug,
          legacyFileName: `${slug}.md`,
          allowAiCitation: true,
          publishedAt: primary.publishedAt ? new Date(primary.publishedAt) : new Date(),
        });
      }
    }
    console.log(`created=${created} skipped=${skipped}`);
    console.log(dryRun ? 'Dry run completed. No database rows were written.' : 'Legacy posts seed applied.');
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
