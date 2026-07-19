import { generateId } from 'ai';
import { and, asc, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  chat,
  chatMessage,
  skill,
  skillVersion,
  usageLedger,
} from '@/config/db/schema';

export type NewSkill = typeof skill.$inferInsert;
export type NewSkillVersion = typeof skillVersion.$inferInsert;
export type AdminSkill = typeof skill.$inferSelect;
export type AdminSkillVersion = typeof skillVersion.$inferSelect;

export async function createSkill(newSkill: NewSkill) {
  const [created] = await db().insert(skill).values(newSkill).returning();
  return created;
}

export async function createSkillWithInitialVersion({
  skillRecord,
  versionRecord,
}: {
  skillRecord: NewSkill;
  versionRecord: Omit<NewSkillVersion, 'skillId'>;
}) {
  return db().transaction(async (tx: any) => {
    const [createdSkill] = await tx
      .insert(skill)
      .values(skillRecord)
      .returning();
    const [createdVersion] = await tx
      .insert(skillVersion)
      .values({ ...versionRecord, skillId: createdSkill.id })
      .returning();
    return { skill: createdSkill, version: createdVersion };
  });
}

export async function updateSkill(
  id: string,
  updates: Partial<Omit<NewSkill, 'id' | 'createdAt'>>
) {
  const [updated] = await db()
    .update(skill)
    .set(updates)
    .where(eq(skill.id, id))
    .returning();
  return updated;
}

export async function createSkillVersion(version: NewSkillVersion) {
  const [created] = await db().insert(skillVersion).values(version).returning();
  return created;
}

export async function createNextSkillVersion(skillId: string) {
  return db().transaction(async (tx: any) => {
    const [latest] = await tx
      .select()
      .from(skillVersion)
      .where(eq(skillVersion.skillId, skillId))
      .orderBy(desc(skillVersion.version))
      .limit(1);
    if (!latest) throw new Error('SKILL_VERSION_NOT_FOUND');
    const [created] = await tx
      .insert(skillVersion)
      .values({
        id: generateId().toLowerCase(),
        skillId,
        version: latest.version + 1,
        methodology: latest.methodology,
        methodologyEn: latest.methodologyEn,
        systemPrompt: latest.systemPrompt,
        systemPromptEn: latest.systemPromptEn,
        diagnosticSteps: latest.diagnosticSteps,
        diagnosticStepsEn: latest.diagnosticStepsEn,
        followUpQuestions: latest.followUpQuestions,
        followUpQuestionsEn: latest.followUpQuestionsEn,
        quickOutputFormat: latest.quickOutputFormat,
        quickOutputFormatEn: latest.quickOutputFormatEn,
        deepOutputFormat: latest.deepOutputFormat,
        deepOutputFormatEn: latest.deepOutputFormatEn,
        completionConditions: latest.completionConditions,
        completionConditionsEn: latest.completionConditionsEn,
        referenceMaterials: latest.referenceMaterials,
        auditMetadata: latest.auditMetadata,
        status: 'draft',
      })
      .returning();
    return created;
  });
}

export async function getAdminSkills(): Promise<AdminSkill[]> {
  return db().select().from(skill).orderBy(asc(skill.name));
}

export async function getAdminSkillById(id: string) {
  const [result] = await db()
    .select()
    .from(skill)
    .where(eq(skill.id, id))
    .limit(1);
  return result;
}

export async function getAdminSkillVersions(
  skillId: string
): Promise<AdminSkillVersion[]> {
  return db()
    .select()
    .from(skillVersion)
    .where(eq(skillVersion.skillId, skillId))
    .orderBy(desc(skillVersion.version));
}

export async function getAdminSkillVersionById(id: string) {
  const [result] = await db()
    .select({ skill, version: skillVersion })
    .from(skillVersion)
    .innerJoin(skill, eq(skillVersion.skillId, skill.id))
    .where(eq(skillVersion.id, id))
    .limit(1);
  return result;
}

export async function updateSkillVersion(
  id: string,
  updates: Partial<Omit<NewSkillVersion, 'id' | 'skillId' | 'createdAt'>>
) {
  const [updated] = await db()
    .update(skillVersion)
    .set(updates)
    .where(eq(skillVersion.id, id))
    .returning();
  return updated;
}

export async function publishSkillVersion(id: string) {
  return db().transaction(async (tx: any) => {
    const [target] = await tx
      .select()
      .from(skillVersion)
      .where(eq(skillVersion.id, id))
      .limit(1);
    if (!target) throw new Error('SKILL_VERSION_NOT_FOUND');
    await tx
      .update(skillVersion)
      .set({ status: 'archived' })
      .where(
        and(
          eq(skillVersion.skillId, target.skillId),
          eq(skillVersion.status, 'published'),
          ne(skillVersion.id, id)
        )
      );
    const [published] = await tx
      .update(skillVersion)
      .set({ status: 'published', publishedAt: new Date() })
      .where(eq(skillVersion.id, id))
      .returning();
    return published;
  });
}

export async function archiveSkillVersion(id: string) {
  return updateSkillVersion(id, { status: 'archived' });
}

export async function getSkillVersionReferenceCount(id: string) {
  const [chatCount, messageCount, usageCount] = await Promise.all([
    db()
      .select({ value: count() })
      .from(chat)
      .where(eq(chat.skillVersionId, id)),
    db()
      .select({ value: count() })
      .from(chatMessage)
      .where(eq(chatMessage.skillVersionId, id)),
    db()
      .select({ value: count() })
      .from(usageLedger)
      .where(eq(usageLedger.skillVersionId, id)),
  ]);
  return (
    Number(chatCount[0]?.value || 0) +
    Number(messageCount[0]?.value || 0) +
    Number(usageCount[0]?.value || 0)
  );
}

export async function deleteSkillVersion(id: string) {
  const version = await getAdminSkillVersionById(id);
  if (!version || version.version.status !== 'draft') {
    throw new Error('ONLY_UNUSED_DRAFT_VERSION_CAN_BE_DELETED');
  }
  if ((await getSkillVersionReferenceCount(id)) > 0) {
    throw new Error('SKILL_VERSION_IN_USE');
  }
  const [deleted] = await db()
    .delete(skillVersion)
    .where(eq(skillVersion.id, id))
    .returning();
  return deleted;
}

export async function deleteSkill(id: string) {
  const item = await getAdminSkillById(id);
  if (!item || item.status !== 'draft') {
    throw new Error('ONLY_UNUSED_DRAFT_SKILL_CAN_BE_DELETED');
  }
  const versions = await getAdminSkillVersions(id);
  if (
    versions.some((version) => version.status !== 'draft') ||
    (await Promise.all(
      versions.map((version) => getSkillVersionReferenceCount(version.id))
    )).some((references) => references > 0)
  ) {
    throw new Error('SKILL_IN_USE');
  }
  const [deleted] = await db().delete(skill).where(eq(skill.id, id)).returning();
  return deleted;
}

export async function getPublishedSkills() {
  const publishedVersions = db()
    .select({
      skillId: skillVersion.skillId,
      version: sql<number>`max(${skillVersion.version})`.as('version'),
    })
    .from(skillVersion)
    .where(eq(skillVersion.status, 'published'))
    .groupBy(skillVersion.skillId)
    .as('published_versions');

  return db()
    .select({ skill, version: skillVersion })
    .from(skill)
    .innerJoin(publishedVersions, eq(publishedVersions.skillId, skill.id))
    .innerJoin(
      skillVersion,
      and(
        eq(skillVersion.skillId, skill.id),
        eq(skillVersion.version, publishedVersions.version)
      )
    )
    .where(and(eq(skill.status, 'published'), eq(skill.userEnabled, true)))
    .orderBy(asc(skill.name));
}

export async function findPublishedSkill(slug: string) {
  const [result] = await db()
    .select({ skill, version: skillVersion })
    .from(skill)
    .innerJoin(skillVersion, eq(skillVersion.skillId, skill.id))
    .where(
      and(
        eq(skill.slug, slug),
        eq(skill.status, 'published'),
        eq(skill.userEnabled, true),
        eq(skillVersion.status, 'published')
      )
    )
    .orderBy(desc(skillVersion.version))
    .limit(1);
  return result;
}

export async function findAvailableSkillVersionById(id: string) {
  const [result] = await db()
    .select({ skill, version: skillVersion })
    .from(skillVersion)
    .innerJoin(skill, eq(skillVersion.skillId, skill.id))
    .where(eq(skillVersion.id, id))
    .limit(1);
  return result;
}

export async function getSkillUsageRecords(limit = 50) {
  const rows = await db()
    .select({
      chatId: chat.id,
      chatTitle: chat.title,
      userId: chat.userId,
      createdAt: chat.createdAt,
      skillDisabledAt: chat.skillDisabledAt,
      skillName: skill.name,
      skillNameEn: skill.nameEn,
      skillSlug: skill.slug,
      version: skillVersion.version,
      versionId: skillVersion.id,
    })
    .from(chat)
    .innerJoin(skillVersion, eq(chat.skillVersionId, skillVersion.id))
    .innerJoin(skill, eq(skillVersion.skillId, skill.id))
    .orderBy(desc(chat.createdAt))
    .limit(limit);
  if (!rows.length) return rows;
  const messageCounts = await db()
    .select({
      chatId: chatMessage.chatId,
      value: count(),
    })
    .from(chatMessage)
    .where(inArray(chatMessage.chatId, rows.map((row) => row.chatId)))
    .groupBy(chatMessage.chatId);
  const counts = new Map(
    messageCounts.map((item) => [item.chatId, Number(item.value)])
  );
  return rows.map((row) => ({ ...row, messageCount: counts.get(row.chatId) || 0 }));
}
