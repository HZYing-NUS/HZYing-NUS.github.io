import { and, asc, desc, eq, lte } from 'drizzle-orm';

import { db } from '@/core/db';
import { project } from '@/config/db/schema';

export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
export type UpdateProject = Partial<
  Omit<NewProject, 'id' | 'userId' | 'createdAt'>
>;

export async function createProject(newProject: NewProject) {
  const [created] = await db().insert(project).values(newProject).returning();
  return created;
}

export async function findProjectById(id: string, userId: string) {
  const [result] = await db()
    .select()
    .from(project)
    .where(and(eq(project.id, id), eq(project.userId, userId)));
  return result;
}

export async function getProjects(userId: string, status = 'active') {
  return db()
    .select()
    .from(project)
    .where(and(eq(project.userId, userId), eq(project.status, status)))
    .orderBy(desc(project.updatedAt));
}

export async function updateProject(
  id: string,
  userId: string,
  updates: UpdateProject
) {
  const [updated] = await db()
    .update(project)
    .set(updates)
    .where(and(eq(project.id, id), eq(project.userId, userId)))
    .returning();
  return updated;
}

export async function moveProjectToTrash(id: string, userId: string) {
  const deletedAt = new Date();
  const purgeAt = new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  return updateProject(id, userId, {
    status: 'deleted',
    deletedAt,
    purgeAt,
  });
}

export async function restoreProject(id: string, userId: string) {
  return updateProject(id, userId, {
    status: 'active',
    deletedAt: null,
    purgeAt: null,
  });
}

export async function permanentlyDeleteProject(id: string, userId: string) {
  const [deleted] = await db()
    .delete(project)
    .where(and(eq(project.id, id), eq(project.userId, userId)))
    .returning();
  return deleted;
}

export async function getExpiredProjects(limit = 25) {
  return db()
    .select()
    .from(project)
    .where(and(eq(project.status, 'deleted'), lte(project.purgeAt, new Date())))
    .orderBy(asc(project.purgeAt))
    .limit(limit);
}
