import { config } from 'dotenv';
import { and, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  communityProfileRevision,
  communityUserProfile,
  user,
} from '../src/config/db/schema.postgres';
import { legacyProfileContent } from '../src/config/seed/legacy-content';
import { getUuid } from '../src/shared/lib/hash';
import { mapLegacyAboutToCommunityProfile } from '../src/shared/services/community/legacy-about-migration';
import {
  getCommunityProfileFingerprint,
  normalizeCommunityProfileInput,
} from '../src/shared/services/community/profile-content';

const args = new Set(process.argv.slice(2));
const envFile = process.argv
  .find((arg) => arg.startsWith('--env='))
  ?.replace('--env=', '');
const userIdArg = process.argv
  .find((arg) => arg.startsWith('--user-id='))
  ?.replace('--user-id=', '');
const usernameArg = process.argv
  .find((arg) => arg.startsWith('--username='))
  ?.replace('--username=', '');
const apply = args.has('--apply');

if (!envFile || !userIdArg || !usernameArg) {
  throw new Error(
    'Usage: --env=<file> --user-id=<id> --username=<public-username> [--apply]'
  );
}
const userId = userIdArg;
const username = usernameArg;
config({ path: envFile, override: true });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
if (apply && process.env.CONFIRM_LEGACY_ABOUT_MIGRATION !== '1') {
  throw new Error(
    'Writing requires CONFIRM_LEGACY_ABOUT_MIGRATION=1 and --apply.'
  );
}

const client = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(client);

async function main() {
  try {
    const requiredColumns = await client`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name in ('community_user_profile', 'community_profile_revision')
        and column_name in ('works', 'focus_areas')
    `;
    const [progressTable] = await client`
      select 1
      from information_schema.tables
      where table_schema = 'public' and table_name = 'collection_step_progress'
      limit 1
    `;
    if (requiredColumns.length < 4 || !progressTable) {
      throw new Error(
        'TARGET_DATABASE_SCHEMA_NOT_MIGRATED: apply migrations 0013_creator_works_focus_areas.sql and 0014_collection_step_progress.sql before migrating About.'
      );
    }
    const [target] = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (!target) throw new Error('TARGET_USER_NOT_FOUND');

    const [profile] = await db
      .select()
      .from(communityUserProfile)
      .where(
        and(
          eq(communityUserProfile.userId, userId),
          eq(communityUserProfile.username, username)
        )
      )
      .limit(1);
    if (!profile)
      throw new Error('TARGET_PROFILE_NOT_FOUND_OR_USERNAME_MISMATCH');

    const normalized = normalizeCommunityProfileInput(
      mapLegacyAboutToCommunityProfile(legacyProfileContent, 'zh')
    );
    const fingerprint = getCommunityProfileFingerprint(normalized);
    const [latest] = await db
      .select({ version: communityProfileRevision.version })
      .from(communityProfileRevision)
      .where(eq(communityProfileRevision.profileId, profile.id))
      .orderBy(desc(communityProfileRevision.version))
      .limit(1);
    const summary = {
      targetUser: target,
      username: profile.username,
      revisionVersion: Number(latest?.version || 0) + 1,
      fingerprint,
      aboutZhLength: normalized.aboutZh?.length || 0,
      aboutEnLength: normalized.aboutEn?.length || 0,
      experienceCount: Array.isArray(normalized.experience)
        ? normalized.experience.length
        : 0,
      worksCount: Array.isArray(normalized.works) ? normalized.works.length : 0,
    };
    console.log(JSON.stringify(summary, null, 2));
    if (!apply) {
      console.log('Dry run completed. No database rows were written.');
      return;
    }

    const revisionId = getUuid();
    await db.transaction(async (tx) => {
      await tx.insert(communityProfileRevision).values({
        id: revisionId,
        profileId: profile.id,
        version: summary.revisionVersion,
        ...normalized,
        contentFingerprint: fingerprint,
        moderationStatus: 'draft',
        createdBy: userId,
      });
      await tx
        .update(communityUserProfile)
        .set({
          moderationStatus: 'draft',
          pendingRevisionId: revisionId,
          updatedAt: new Date(),
        })
        .where(eq(communityUserProfile.id, profile.id));
    });
    console.log(
      `Created draft revision ${revisionId}. Review it in /settings/profile, then submit it for moderation.`
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
