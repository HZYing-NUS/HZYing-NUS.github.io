import 'server-only';

import type { UIMessage } from 'ai';

import { findAiFile, getFileChunks } from '@/shared/models/ai_file';
import { getGlobalMemories, getProjectMemories } from '@/shared/models/memory';
import { findAvailableSkillVersionById } from '@/shared/models/skill';
import { findUserById } from '@/shared/models/user';
import { retrieveAssistantSources } from '@/shared/services/resource-assistant';
import { getStorageService } from '@/shared/services/storage';

import { searchWeb, type ExternalSource } from './web-search';

type ProjectMemoryRecord = Awaited<
  ReturnType<typeof getProjectMemories>
>[number];
type FileChunkRecord = Awaited<ReturnType<typeof getFileChunks>>[number];
type GlobalMemoryRecord = Awaited<ReturnType<typeof getGlobalMemories>>[number];

export type AiSource = {
  type: 'resource' | 'collection' | 'article' | 'profile' | 'web' | 'file';
  title: string;
  url?: string;
  excerpt: string;
};

function getTextFromMessage(message: UIMessage) {
  return message.parts
    .filter(
      (
        part
      ): part is Extract<(typeof message.parts)[number], { type: 'text' }> =>
        part.type === 'text'
    )
    .map((part) => part.text)
    .join('\n')
    .trim();
}

function scoreText(text: string, query: string) {
  const terms =
    query.toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fff]{2,4}/g) || [];
  const haystack = text.toLowerCase();
  return terms.reduce(
    (total, term) => total + Number(haystack.includes(term)),
    0
  );
}

export async function buildAiContext({
  userId,
  projectId,
  chatId,
  skillVersionId,
  skillDisabled,
  webSearchEnabled,
  locale,
  message,
  fileIds,
  includeWebSearch = true,
}: {
  userId: string;
  projectId?: string | null;
  chatId: string;
  skillVersionId?: string | null;
  skillDisabled: boolean;
  webSearchEnabled: boolean;
  locale: string;
  message: UIMessage;
  fileIds: string[];
  includeWebSearch?: boolean;
}) {
  const question = getTextFromMessage(message);
  const siteSources = await retrieveAssistantSources(question, locale);
  let externalSources: ExternalSource[] = [];
  let webSearchExecuted = false;
  if (webSearchEnabled && includeWebSearch) {
    const webSearch = await searchWeb(question);
    externalSources = webSearch.sources;
    webSearchExecuted = webSearch.executed;
  }

  const projectMemories = projectId
    ? (await getProjectMemories(userId, projectId))
        .filter(
          (memory: ProjectMemoryRecord) =>
            memory.type === 'fixed' || scoreText(memory.content, question) > 0
        )
        .slice(0, 12)
    : [];
  const memoryOwner = await findUserById(userId);
  const globalMemories = (
    memoryOwner?.globalMemoryEnabled ? await getGlobalMemories(userId) : []
  )
    .map((memory: GlobalMemoryRecord) => ({
      ...memory,
      score: scoreText(memory.content, question),
    }))
    .filter(
      (memory: GlobalMemoryRecord & { score: number }) => memory.score > 0
    )
    .sort(
      (left: { score: number }, right: { score: number }) =>
        right.score - left.score
    )
    .slice(0, 10);

  const fileSources: AiSource[] = [];
  const imageParts: Array<{
    type: 'file';
    url: string;
    mediaType: string;
    filename: string;
  }> = [];
  for (const fileId of fileIds.slice(0, 10)) {
    const file = await findAiFile(fileId, userId);
    if (!file) throw new Error('FILE_NOT_FOUND');
    const belongsToContext = projectId
      ? file.projectId === projectId || file.chatId === chatId
      : file.chatId === chatId;
    if (!belongsToContext) {
      throw new Error('FILE_NOT_AVAILABLE_IN_CHAT');
    }
    if (file.mimeType.startsWith('image/')) {
      const object = await (
        await getStorageService()
      ).getObject({ key: file.objectKey });
      imageParts.push({
        type: 'file',
        url: `data:${file.mimeType};base64,${Buffer.from(object.body).toString('base64')}`,
        mediaType: file.mimeType,
        filename: file.originalName,
      });
      fileSources.push({
        type: 'file',
        title: file.originalName,
        excerpt: '[Image supplied to the selected vision model]',
      });
      continue;
    }
    const chunks = (await getFileChunks(userId, file.id))
      .map((chunk: FileChunkRecord) => ({
        ...chunk,
        score: scoreText(chunk.content, question),
      }))
      .filter((chunk: FileChunkRecord & { score: number }) => chunk.score > 0)
      .sort(
        (
          left: FileChunkRecord & { score: number },
          right: FileChunkRecord & { score: number }
        ) => right.score - left.score
      )
      .slice(0, 6);
    for (const chunk of chunks) {
      fileSources.push({
        type: 'file',
        title: file.originalName,
        excerpt: chunk.content,
      });
    }
  }

  let skillContext = '';
  if (skillVersionId && !skillDisabled) {
    const published = await findAvailableSkillVersionById(
      skillVersionId,
      'product-idea-diagnosis'
    );
    if (!published) {
      throw new Error('SKILL_VERSION_NOT_AVAILABLE');
    }
    skillContext =
      locale === 'en'
        ? [
            'The reference methodology may contain Chinese source material. Translate and answer entirely in English.',
            `Methodology: ${published.version.methodology}`,
            `Diagnostic steps: ${JSON.stringify(published.version.diagnosticSteps)}`,
            `Follow-up questions: ${JSON.stringify(published.version.followUpQuestions)}`,
            `Quick output format: ${published.version.quickOutputFormat}`,
            `Deep output format: ${published.version.deepOutputFormat}`,
            `Completion conditions: ${published.version.completionConditions}`,
          ].join('\n\n')
        : [
            published.version.systemPrompt,
            published.version.methodology,
            `固定诊断步骤：${JSON.stringify(published.version.diagnosticSteps)}`,
            `追问问题：${JSON.stringify(published.version.followUpQuestions)}`,
            `快速输出格式：${published.version.quickOutputFormat}`,
            `深度输出格式：${published.version.deepOutputFormat}`,
            `结束条件：${published.version.completionConditions}`,
          ].join('\n\n');
  }

  const allSources: AiSource[] = [
    ...siteSources,
    ...externalSources,
    ...fileSources,
  ];
  const contextSections = [
    globalMemories.length
      ? `${locale === 'en' ? 'Confirmed global memory' : '已确认全局记忆'}：\n${globalMemories.map((item: GlobalMemoryRecord) => `- ${item.content}`).join('\n')}`
      : '',
    projectMemories.length
      ? `${locale === 'en' ? 'Project memory' : '项目记忆'}：\n${projectMemories.map((item: ProjectMemoryRecord) => `- ${item.content}`).join('\n')}`
      : '',
    allSources.length
      ? `${locale === 'en' ? 'Citable sources' : '可引用来源'}：\n${allSources
          .map(
            (source, index) =>
              `[${index + 1}] ${source.type}｜${source.title}${source.url ? `｜${source.url}` : ''}\n${source.excerpt}`
          )
          .join('\n\n')}`
      : locale === 'en'
        ? 'No reliable source reached the relevance threshold. Do not invent sources.'
        : '本次未检索到达到相关性阈值的可靠来源，不要编造来源。',
    skillContext
      ? `${locale === 'en' ? 'Current Skill: Product idea diagnosis' : '当前 Skill：产品想法诊断'}\n${skillContext}`
      : '',
  ].filter(Boolean);

  return {
    question,
    sources: allSources,
    imageParts,
    webSearchExecuted,
    system: [
      locale === 'en'
        ? 'You are the WebTools AI assistant. Help users build their first Web product.'
        : '你是 WebTools AI 助手，目标是帮助用户把第一个 Web 产品做出来。',
      locale === 'en'
        ? 'Separate facts, inferences, and unverified information. Cite sources by number.'
        : '回答必须区分事实、推断和未验证信息；引用资料时使用来源编号。',
      ...contextSections,
    ].join('\n\n'),
  };
}
