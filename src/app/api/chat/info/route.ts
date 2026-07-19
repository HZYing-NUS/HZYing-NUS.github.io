import { respData, respErr } from '@/shared/lib/resp';
import { findChatById, toPublicChat } from '@/shared/models/chat';
import { getProjectMemories } from '@/shared/models/memory';
import { findProjectById } from '@/shared/models/project';
import { findAvailableSkillVersionById } from '@/shared/models/skill';
import { getUserInfo } from '@/shared/models/user';

export async function POST(req: Request) {
  try {
    const { chatId, locale } = (await req.json()) as {
      chatId?: string;
      locale?: string;
    };
    if (!chatId) {
      return respErr('chatId is required');
    }

    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const chat = await findChatById(chatId, user.id);
    if (!chat) {
      return respErr('chat not found');
    }

    if (chat.userId !== user.id) {
      return respErr('no permission to access this chat');
    }

    const project = chat.projectId
      ? await findProjectById(chat.projectId, user.id)
      : undefined;
    const projectMemories = chat.projectId
      ? await getProjectMemories(user.id, chat.projectId)
      : [];
    const selectedSkill = chat.skillVersionId
      ? await findAvailableSkillVersionById(chat.skillVersionId)
      : undefined;
    return respData({
      ...toPublicChat(chat),
      skill: selectedSkill
        ? {
            slug: selectedSkill.skill.slug,
            name:
              locale === 'en'
                ? selectedSkill.skill.nameEn || selectedSkill.skill.name
                : selectedSkill.skill.name,
            version: selectedSkill.version.version,
            versionId: selectedSkill.version.id,
          }
        : null,
      projectSummary: project
        ? {
            name: project.name,
            description: project.description,
            stage: project.stage,
            completedItems: project.completedItems,
            currentProblem: project.currentProblem,
            nextSteps: project.nextSteps,
            recentMemories: projectMemories
              .slice(0, 3)
              .map(
                (memory: {
                  id: string;
                  content: string;
                  sourceChatId: string | null;
                  sourceMessageId: string | null;
                }) => ({
                  id: memory.id,
                  content: memory.content,
                  sourceChatId: memory.sourceChatId,
                  sourceMessageId: memory.sourceMessageId,
                })
              ),
          }
        : null,
    });
  } catch (e: any) {
    console.log('get chat info failed:', e);
    return respErr(`get chat info failed: ${e.message}`);
  }
}
