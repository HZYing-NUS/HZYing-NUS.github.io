import 'server-only';

import { and, desc, eq, max, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  communityAuditLog,
  communityJob,
  communityProfileRevision,
  communityUserProfile,
} from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

import {
  CommunityProfileInput,
  getCommunityProfileFingerprint,
  normalizeCommunityProfileInput,
  shouldCreateCommunityProfileRevision,
} from './profile-content';

async function getOwnProfileRow(tx: any, userId: string) {
  const [profile] = await tx
    .select()
    .from(communityUserProfile)
    .where(eq(communityUserProfile.userId, userId))
    .limit(1);
  if (!profile) return null;
  const [revision] = await tx
    .select()
    .from(communityProfileRevision)
    .where(eq(communityProfileRevision.profileId, profile.id))
    .orderBy(desc(communityProfileRevision.version))
    .limit(1);
  return { profile, revision: revision || null };
}

export async function getOwnCommunityProfileDraft(userId: string) {
  return getOwnProfileRow(db(), userId);
}

export async function saveCommunityProfileDraft({
  userId,
  input,
}: {
  userId: string;
  input: CommunityProfileInput;
}) {
  const normalized = normalizeCommunityProfileInput(input);
  const fingerprint = getCommunityProfileFingerprint(normalized);
  return db().transaction(async (tx: any) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-profile:${userId}`}))`
    );
    const current = await getOwnProfileRow(tx, userId);
    if (!current) throw new Error('COMMUNITY_PROFILE_NOT_FOUND');
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-moderation:profile:${current.profile.id}`}))`
    );
    let revisionId = current.revision?.id;
    const createNewRevision = shouldCreateCommunityProfileRevision({
      revisionId: revisionId || null,
      publishedRevisionId: current.profile.currentPublishedRevisionId,
      moderationStatus: current.revision?.moderationStatus || null,
    });
    if (createNewRevision) {
      const [{ maxVersion }] = await tx
        .select({ maxVersion: max(communityProfileRevision.version) })
        .from(communityProfileRevision)
        .where(eq(communityProfileRevision.profileId, current.profile.id));
      revisionId = getUuid();
      await tx.insert(communityProfileRevision).values({
        id: revisionId,
        profileId: current.profile.id,
        version: Number(maxVersion || 0) + 1,
        ...normalized,
        contentFingerprint: fingerprint,
        moderationStatus: 'draft',
        createdBy: userId,
      });
    } else {
      if (current.revision?.moderationStatus !== 'draft')
        throw new Error('COMMUNITY_PROFILE_NOT_EDITABLE');
      await tx
        .update(communityProfileRevision)
        .set({
          ...normalized,
          contentFingerprint: fingerprint,
          moderationStatus: 'draft',
          moderationReviewId: null,
          submittedAt: null,
          publishedAt: null,
        })
        .where(eq(communityProfileRevision.id, revisionId));
    }
    await tx
      .update(communityUserProfile)
      .set({
        moderationStatus: 'draft',
        pendingRevisionId: null,
        updatedAt: new Date(),
      })
      .where(eq(communityUserProfile.id, current.profile.id));
    await tx.insert(communityAuditLog).values({
      id: getUuid(),
      actorId: userId,
      actorType: 'user',
      action: createNewRevision
        ? 'profile.revision_created'
        : 'profile.draft_saved',
      objectType: 'profile',
      objectId: current.profile.id,
      afterState: { revisionId, fingerprint },
    });
    return getOwnProfileRow(tx, userId);
  });
}

export async function submitCommunityProfile({
  userId,
  idempotencyKey,
}: {
  userId: string;
  idempotencyKey: string;
}) {
  if (!idempotencyKey.trim()) throw new Error('IDEMPOTENCY_KEY_REQUIRED');
  return db().transaction(async (tx: any) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-profile-submit:${userId}:${idempotencyKey}`}))`
    );
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-profile:${userId}`}))`
    );
    const current = await getOwnProfileRow(tx, userId);
    if (!current?.revision) throw new Error('COMMUNITY_PROFILE_DRAFT_REQUIRED');
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`community-moderation:profile:${current.profile.id}`}))`
    );
    const businessKey = `profile-submit:${userId}:${idempotencyKey}`;
    const [existingJob] = await tx
      .select()
      .from(communityJob)
      .where(
        and(
          eq(communityJob.type, 'moderate_content'),
          eq(communityJob.businessKey, businessKey)
        )
      )
      .limit(1);
    if (existingJob) {
      const payload = existingJob.payload as {
        objectId?: string;
        objectVersion?: string;
        fingerprint?: string;
      };
      if (
        payload.objectId !== current.profile.id ||
        payload.objectVersion !== current.revision.id ||
        payload.fingerprint !== current.revision.contentFingerprint
      )
        throw new Error('IDEMPOTENCY_KEY_REUSED');
      return { ...current, job: existingJob };
    }
    if (
      !['draft', 'blocked', 'pending_admin'].includes(
        current.revision.moderationStatus
      )
    )
      throw new Error('COMMUNITY_PROFILE_NOT_SUBMITTABLE');
    if (!current.revision.contentFingerprint)
      throw new Error('COMMUNITY_PROFILE_FINGERPRINT_REQUIRED');
    const now = new Date();
    const job = {
      id: getUuid(),
      type: 'moderate_content',
      businessKey,
      payload: {
        objectType: 'profile',
        objectId: current.profile.id,
        objectVersion: current.revision.id,
        fingerprint: current.revision.contentFingerprint,
      },
      status: 'pending',
      runAfter: now,
    };
    await tx.insert(communityJob).values(job);
    await tx
      .update(communityProfileRevision)
      .set({ moderationStatus: 'moderation_pending', submittedAt: now })
      .where(eq(communityProfileRevision.id, current.revision.id));
    await tx
      .update(communityUserProfile)
      .set({
        moderationStatus: 'moderation_pending',
        pendingRevisionId: current.revision.id,
        updatedAt: now,
      })
      .where(eq(communityUserProfile.id, current.profile.id));
    await tx.insert(communityAuditLog).values({
      id: getUuid(),
      actorId: userId,
      actorType: 'user',
      action: 'profile.submitted',
      objectType: 'profile',
      objectId: current.profile.id,
      afterState: { revisionId: current.revision.id },
      requestId: idempotencyKey,
    });
    return { ...current, job };
  });
}
