import 'server-only';

import type { UIMessage } from 'ai';

import { findAiFile, getFileChunks } from '@/shared/models/ai_file';
import { getGlobalMemories, getProjectMemories } from '@/shared/models/memory';
import { findUserById } from '@/shared/models/user';
import { retrieveAssistantSources } from '@/shared/services/resource-assistant';
import { getStorageService } from '@/shared/services/storage';

import { getRuntimeSkillContext } from './skill-context';
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
  allowParsing = false,
  allowBinaryLoading = true,
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
  allowParsing?: boolean;
  allowBinaryLoading?: boolean;
}) {
  const question = getTextFromMessage(message);
  const siteSources = await retrieveAssistantSources(question, locale);
  let externalSources: ExternalSource[] = [];
  let webSearchExecuted = false;
  let webSearchProviderCredits = 0;
  let webSearchDepth: 'basic' | 'advanced' | undefined;
  if (webSearchEnabled && includeWebSearch) {
    const webSearch = await searchWeb(question);
    externalSources = webSearch.sources;
    webSearchExecuted = webSearch.executed;
    webSearchProviderCredits = webSearch.providerCredits;
    webSearchDepth = webSearch.searchDepth;
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
  let fileContextTokens = 0;
  const imageParts: Array<{
    type: 'file';
    url: string;
    mediaType: string;
    filename: string;
  }> = [];
  for (const fileId of fileIds.slice(0, 10)) {
    let file = await findAiFile(fileId, userId);
    if (!file) throw new Error('FILE_NOT_FOUND');
    const belongsToContext = projectId
      ? file.projectId === projectId || file.chatId === chatId
      : file.chatId === chatId;
    if (!belongsToContext) {
      throw new Error('FILE_NOT_AVAILABLE_IN_CHAT');
    }
    if (file.mimeType.startsWith('image/')) {
      if (!allowBinaryLoading) {
        imageParts.push({
          type: 'file',
          url: '',
          mediaType: file.mimeType,
          filename: file.originalName,
        });
        continue;
      }
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
    if (file.parseStatus !== 'parsed') {
      if (!allowParsing) continue;
      throw new Error('FILE_PARSE_REQUIRED');
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
      fileContextTokens += chunk.tokenCount;
      fileSources.push({
        type: 'file',
        title: file.originalName,
        excerpt: chunk.content,
      });
    }
  }

  let skillContext = '';
  let skillName = '';
  if (skillVersionId && !skillDisabled) {
    const runtimeSkill = await getRuntimeSkillContext(
      skillVersionId,
      locale === 'en' ? 'en' : 'zh',
      question
    );
    skillName = runtimeSkill.name;
    skillContext = runtimeSkill.system;
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
      ? `${locale === 'en' ? `Current Skill: ${skillName}` : `当前 Skill：${skillName}`}\n${skillContext}`
      : '',
  ].filter(Boolean);
  const memoryContextTokens = [...globalMemories, ...projectMemories].reduce(
    (total, memory) =>
      total + Math.max(1, Math.ceil(memory.content.length / 3)),
    0
  );

  return {
    question,
    sources: allSources,
    imageParts,
    webSearchExecuted,
    webSearchProviderCredits,
    webSearchDepth,
    fileContextTokens,
    memoryContextTokens,
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
