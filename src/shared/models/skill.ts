import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { skill, skillVersion } from '@/config/db/schema';

export type NewSkill = typeof skill.$inferInsert;
export type NewSkillVersion = typeof skillVersion.$inferInsert;
export type AdminSkill = typeof skill.$inferSelect;
export type AdminSkillVersion = typeof skillVersion.$inferSelect;

export async function createSkill(newSkill: NewSkill) {
  const [created] = await db().insert(skill).values(newSkill).returning();
  return created;
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

export async function getAdminSkills(): Promise<AdminSkill[]> {
  return db().select().from(skill).orderBy(asc(skill.name));
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

export async function findAvailableSkillVersionById(id: string, slug: string) {
  const [result] = await db()
    .select({ skill, version: skillVersion })
    .from(skillVersion)
    .innerJoin(skill, eq(skillVersion.skillId, skill.id))
    .where(and(eq(skillVersion.id, id), eq(skill.slug, slug)))
    .limit(1);
  return result;
}
