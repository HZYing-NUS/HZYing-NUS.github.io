import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { profileContent } from '../src/config/db/schema.postgres';
import { legacyProfileContent } from '../src/config/seed/legacy-content';

const args = new Set(process.argv.slice(2));
const envFile = [...args].find((arg) => arg.startsWith('--env='))?.replace('--env=', '');
const apply = args.has('--apply');
const overwrite = args.has('--overwrite');
const chineseOnly = args.has('--zh-only');
const dryRun = args.has('--dry-run') || !apply;

if (!envFile) throw new Error('Missing --env=<file>.');
config({ path: envFile, override: true });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
if (apply && process.env.CONFIRM_LEGACY_PROFILE_SEED !== '1') {
  throw new Error('Writing requires CONFIRM_LEGACY_PROFILE_SEED=1 and --apply.');
}

const client = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(client);
const profiles = [
  { id: 'legacy:profile:zh', locale: 'zh', content: legacyProfileContent },
  { id: 'legacy:profile:en', locale: 'en', content: legacyProfileContent },
].filter((profile) => !chineseOnly || profile.locale === 'zh');

async function main() {
  try {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    for (const profile of profiles) {
      const [existing] = await db.select({ id: profileContent.id }).from(profileContent).where(eq(profileContent.id, profile.id)).limit(1);
      if (existing && !overwrite) {
        skipped += 1;
        continue;
      }
      if (existing) {
        updated += 1;
      } else {
        created += 1;
      }
      if (!dryRun) {
        if (existing) {
          await db
            .update(profileContent)
            .set({
              content: profile.content,
              status: 'published',
              allowAiCitation: true,
            })
            .where(eq(profileContent.id, profile.id));
        } else {
          await db.insert(profileContent).values({
            id: profile.id,
            locale: profile.locale,
            content: profile.content,
            status: 'published',
            allowAiCitation: true,
          });
        }
      }
    }
    console.log(`created=${created} updated=${updated} skipped=${skipped}`);
    console.log(dryRun ? 'Dry run completed. No database rows were written.' : 'Legacy profile seed applied.');
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
